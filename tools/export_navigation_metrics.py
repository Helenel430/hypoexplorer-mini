"""Export all mapped genes as lazy-loadable navigation metric shards (no C25).

Run from the repository root: python3 tools/export_navigation_metrics.py
"""
from __future__ import annotations

import argparse
import gc
import gzip
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import load_npz

from gene_harmonization_lib import DATASETS, load_gene_source_indexes


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def write_json(root, name, value):
    payload = json.dumps(value, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()
    compressed = gzip.compress(payload, compresslevel=9, mtime=0)
    (root / name).write_bytes(compressed)
    return {'path': name, 'bytes': len(compressed), 'uncompressed_bytes': len(payload),
            'sha256': hashlib.sha256(compressed).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out-dir', type=Path, default=Path('navigation_export'))
    parser.add_argument('--processed-dir', type=Path, default=Path('processed'))
    parser.add_argument('--shard-size', type=int, default=256)
    args = parser.parse_args()
    if args.shard_size < 1:
        raise ValueError('shard size must be positive')
    root = args.out_dir
    if (root / 'manifest.json').exists():
        raise ValueError('Use a new output directory to avoid mixing export versions')
    root.mkdir(parents=True, exist_ok=True)
    (root / 'load.mjs').write_bytes(Path(__file__).with_name('navigation_export_client.mjs').read_bytes())
    harmonization = Path('gene_harmonization/gene_harmonization.csv')
    table = pd.read_csv(harmonization, dtype=str).fillna('')
    source, current, aliases = load_gene_source_indexes(Path('gene_harmonization/mgi_source'))
    ids = sorted(set(table.canonical_gene_id), key=lambda i: (source[i].canonical_symbol.casefold(), i))
    position = {value: i for i, value in enumerate(ids)}
    cells_by_dataset = {}
    regions = set()
    for ds in DATASETS:
        cells = pd.read_csv(args.processed_dir / ds / 'cells.csv', dtype=str).fillna('')
        cells['hypomap_region'] = cells.hypomap_region.str.strip()
        cells['hypomap_C7'] = cells.hypomap_C7.str.strip()
        cells_by_dataset[ds] = cells
        regions.update(cells.hypomap_region[cells.hypomap_region != ''])
    contexts = ['Whole hypothalamus', *sorted(regions), 'No HypoMap region']
    c7_labels = sorted({v for c in cells_by_dataset.values() for v in c.hypomap_C7 if v})
    c7_labels.append('Unannotated C7')
    # Slot order is dataset, then context. Null mapping slots remain unavailable.
    counts = np.zeros((len(ids), len(DATASETS), len(contexts)), dtype=np.uint32)
    sums = np.zeros(counts.shape, dtype=np.float64)
    mappings = [[None for _ in DATASETS] for _ in ids]
    denominators, c7_denominators, provenance, stats = {}, {}, {}, {}
    for ds_index, ds in enumerate(DATASETS):
        folder = args.processed_dir / ds
        cells = cells_by_dataset[ds]
        genes = pd.read_csv(folder / 'genes.csv', dtype=str).fillna('')
        native = {(r.gene_id, r.gene_symbol): i for i, r in enumerate(genes.itertuples())}
        if len(native) != len(genes):
            raise ValueError(f'{ds}: duplicate native gene keys')
        log_metadata = json.loads((folder / 'expression_metadata_lognormalized.json').read_text())
        if (log_metadata.get('verification_status') != 'passed' or
                log_metadata.get('normalization_method') != 'Seurat LogNormalize' or
                log_metadata.get('scale_factor') != 10000):
            raise ValueError(f'{ds}: unsupported or unverified normalization')
        raw_hash = digest(folder / 'expression_matrix.npz')
        if log_metadata['source_matrix_checksum'] != 'sha256:' + raw_hash:
            raise ValueError(f'{ds}: normalized layer references different raw input')
        provenance[ds] = {name: digest(folder / name) for name in
                          ['genes.csv', 'cells.csv', 'expression_matrix_lognormalized.npz',
                           'expression_metadata_lognormalized.json']}
        provenance[ds]['expression_matrix.npz'] = raw_hash
        print(f'{ds}: loading sparse matrices', flush=True)
        raw = load_npz(folder / 'expression_matrix.npz').tocsc()
        log = load_npz(folder / 'expression_matrix_lognormalized.npz').tocsc()
        if raw.shape != (len(cells), len(genes)) or log.shape != raw.shape:
            raise ValueError(f'{ds}: matrix/metadata shape mismatch')
        raw.sort_indices()
        log.sort_indices()
        if not np.array_equal(raw.indptr, log.indptr) or not np.array_equal(raw.indices, log.indices):
            raise ValueError(f'{ds}: raw and normalized sparse support differs')
        region_codes = np.array([contexts.index(v) if v else len(contexts)-1
                                 for v in cells.hypomap_region], dtype=np.int32)
        denominators[ds] = [len(cells), *np.bincount(region_codes, minlength=len(contexts))[1:].tolist()]
        c7_denominators[ds] = [int((cells.hypomap_C7 == label).sum()) if label != 'Unannotated C7'
                               else int((cells.hypomap_C7 == '').sum()) for label in c7_labels]
        mapped = duplicates = 0
        subset = table[table.dataset_id == ds]
        for canonical_id, group in subset.groupby('canonical_gene_id', sort=False):
            i = position[canonical_id]
            if len(group) != 1:
                mappings[i][ds_index] = {'state': 'duplicate_dataset_mapping',
                                        'candidates': group[['dataset_gene_id', 'dataset_gene_symbol']].values.tolist()}
                duplicates += 1
                continue
            row = group.iloc[0]
            column = native[(row.dataset_gene_id, row.dataset_gene_symbol)]
            mappings[i][ds_index] = [row.dataset_gene_id, row.dataset_gene_symbol, row.match_type]
            start, stop = raw.indptr[column:column+2]
            positive = raw.data[start:stop] >= 1
            indices = raw.indices[start:stop][positive]
            values = log.data[start:stop][positive].astype(np.float64)
            if not np.isfinite(values).all() or (values < 0).any():
                raise ValueError(f'{ds}: invalid normalized values')
            counts[i, ds_index, 0] = len(indices)
            sums[i, ds_index, 0] = values.sum(dtype=np.float64)
            counts[i, ds_index, 1:] = np.bincount(region_codes[indices], minlength=len(contexts))[1:]
            sums[i, ds_index, 1:] = np.bincount(region_codes[indices], weights=values,
                                              minlength=len(contexts))[1:]
            mapped += 1
        if (counts[:, ds_index] > np.array(denominators[ds])).any():
            raise ValueError(f'{ds}: positive count exceeds eligible count')
        if not np.array_equal(counts[:, ds_index, 0], counts[:, ds_index, 1:].sum(axis=1)):
            raise ValueError(f'{ds}: region counts do not partition whole dataset')
        if not np.allclose(sums[:, ds_index, 0], sums[:, ds_index, 1:].sum(axis=1), rtol=1e-12, atol=1e-9):
            raise ValueError(f'{ds}: region expression sums do not partition whole dataset')
        stats[ds] = {'native_features': len(genes), 'resolved_canonical_genes': mapped,
                     'duplicate_canonical_mappings': duplicates,
                     'unmapped_native_features': len(genes) - len(subset)}
        print(f'{ds}: {mapped} genes summarized; {duplicates} duplicate mappings withheld', flush=True)
        del raw, log
        gc.collect()
    # Independent regression against the existing measured five-gene export.
    reference = json.loads(Path('fvp_export/gene_metrics_vertical_slice.json').read_text())
    checked = 0
    for gene in reference['genes']:
        i = position[gene['resolver']['canonical_gene']['canonical_gene_id']]
        for d, ds in enumerate(DATASETS):
            existing = gene['metrics']['datasets'][ds]
            for label, metric in [('Whole hypothalamus', existing['whole_dataset']),
                                  *existing['by_hypomap_region'].items()]:
                c = contexts.index(label)
                if counts[i, d, c] != metric['positive_cells'] or denominators[ds][c] != metric['eligible_cells']:
                    raise ValueError(f'{gene["query"]}/{ds}/{label}: reference count mismatch')
                if not np.isclose(sums[i, d, c], metric['sum_log_expression_positive'], rtol=1e-12, atol=1e-9):
                    raise ValueError(f'{gene["query"]}/{ds}/{label}: reference sum mismatch')
                checked += 1
    index = {'genes': [[i, source[i].canonical_symbol, source[i].marker_name,
                        source[i].ensembl_gene_id] for i in ids],
             'current_symbols': {k: [position[i] for i in sorted(v) if i in position]
                                 for k, v in current.items()},
             'aliases': {k: [position[i] for i in sorted(v) if i in position]
                         for k, v in aliases.items() if any(i in position for i in v)}}
    # Preserve candidates outside the export so ambiguous aliases never become unambiguous.
    index['outside_export_candidates'] = {
        k: [source[i].as_candidate() for i in sorted(v) if i not in position]
        for k, v in {**aliases, **current}.items() if any(i not in position for i in v)
    }
    files = [write_json(root, 'search-index.json.gz', index)]
    cards = pd.read_csv('HypoMap_study_display_card.csv', dtype=str).fillna('')
    files.append(write_json(root, 'metadata.json.gz', {
        'datasets': DATASETS, 'contexts': contexts, 'eligible_cells': denominators,
        'c7_labels': c7_labels, 'c7_eligible_cells': c7_denominators,
        'study_cards': cards[cards.GEO_Acc.isin(DATASETS)].to_dict('records'),
        'annotation_coverage': {ds: {
            'total_cells': len(cells),
            'blank_hypomap_region': int(cells.hypomap_region.eq('').sum()),
            'blank_hypomap_C7': int(cells.hypomap_C7.eq('').sum()),
            'blank_sample_id': int(cells.sample_id.str.strip().eq('').sum()),
        } for ds, cells in cells_by_dataset.items()}}))
    for start in range(0, len(ids), args.shard_size):
        records = []
        for i in range(start, min(start + args.shard_size, len(ids))):
            records.append([i, mappings[i], [[counts[i, d].tolist(), sums[i, d].tolist()]
                                             if isinstance(mappings[i][d], list) else None
                                             for d in range(len(DATASETS))]])
        files.append(write_json(root, f'genes-{start // args.shard_size:04d}.json.gz', records))
    manifest = {
        'schema_version': 1, 'generated_at': datetime.now(timezone.utc).isoformat(),
        'gene_count': len(ids), 'shard_size': args.shard_size,
        'record_layout': ['gene_index', 'dataset_mappings', 'dataset_statistics'],
        'statistics_layout': ['positive_cells_by_context', 'sum_log_expression_positive_by_context'],
        'mapping_layout': ['native_gene_id', 'native_gene_symbol', 'match_type'],
        'missing_mapping': 'null means gene_not_found; duplicate objects are unsupported',
        'metric_contract': {'positivity': 'raw count >= 1', 'normalization': 'Seurat LogNormalize, scale 10000',
                            'region_grouping': 'hypomap_region', 'coexpression_grouping': 'hypomap_C7',
                            'blank_regions': 'retained in Whole hypothalamus and No HypoMap region'},
        'recommendations': {'state': 'not_exported', 'reason': 'ranking requires an approved definition'},
        'coexpression': {'state': 'requires_on_demand_backend', 'pair_tables_exported': False,
                         'c7_values': 'only shared eligible-cell counts; no measured C7 pair results'},
        'dataset_resolution': stats, 'files': files,
        'compressed_payload_bytes': sum(f['bytes'] for f in files),
        'validation': {'reference_metric_blocks_checked': checked, 'count_bounds': 'passed',
                       'region_partitions': 'passed', 'normalized_raw_support': 'passed'},
        'source_sha256': {'harmonization': digest(harmonization), 'datasets': provenance,
                          'mgi_markers': digest(Path('gene_harmonization/mgi_source/MRK_List1.rpt.gz')),
                          'mgi_coordinates': digest(Path('gene_harmonization/mgi_source/MGI_Gene_Model_Coord.rpt')),
                          'study_card': digest(Path('HypoMap_study_display_card.csv'))},
    }
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'genes': len(ids), 'compressed_MB': manifest['compressed_payload_bytes'] / 1e6,
                      'reference_checks': checked}), flush=True)


if __name__ == '__main__':
    main()
