"""Build a provenance-checked, memory-mappable raw detection index (outside importer)."""
import argparse
import gzip
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import load_npz
from export_navigation_metrics import digest


def build(export_dir, processed_dir, output):
    output.mkdir(parents=True, exist_ok=False)
    manifest = json.loads((export_dir / 'manifest.json').read_text())
    metadata = json.loads(gzip.decompress((export_dir / 'metadata.json.gz').read_bytes()))
    search = json.loads(gzip.decompress((export_dir / 'search-index.json.gz').read_bytes()))
    records = sorted((r for f in manifest['files'] if f['path'].startswith('genes-')
                      for r in json.loads(gzip.decompress((export_dir / f['path']).read_bytes()))), key=lambda r: r[0])
    info = {'schema_version': 1, 'genes': search['genes'], 'datasets': [],
            'source_export_manifest_sha256': digest(export_dir / 'manifest.json'),
            'positivity': 'raw_count >= 1', 'bitorder': 'little'}
    if [r[0] for r in records] != list(range(len(search['genes']))):
        raise ValueError('Noncontiguous gene records')
    for d, dataset in enumerate(metadata['datasets']):
        folder = processed_dir / dataset
        sources = {}
        for name in ('expression_matrix.npz', 'genes.csv', 'cells.csv'):
            sources[name] = digest(folder / name)
            if sources[name] != manifest['source_sha256']['datasets'][dataset][name]:
                raise ValueError(f'{dataset}/{name}: changed since navigation export')
        genes = pd.read_csv(folder / 'genes.csv', dtype=str).fillna('')
        cells = pd.read_csv(folder / 'cells.csv', dtype=str, keep_default_na=False)
        raw = load_npz(folder / 'expression_matrix.npz').tocsc()
        if raw.shape != (len(cells), len(genes)) or not cells.cell_id.is_unique:
            raise ValueError('Input shape/identity mismatch')
        if np.any(~np.isfinite(raw.data)) or np.any(raw.data < 0) or np.any(raw.data != np.floor(raw.data)):
            raise ValueError('Invalid raw counts')
        native = {(r.gene_id, r.gene_symbol): i for i, r in enumerate(genes.itertuples())}
        bits = np.lib.format.open_memmap(output / f'{dataset}.npy', mode='w+', dtype=np.uint8,
                                         shape=(len(records), (len(cells) + 7) // 8))
        states, c7, regions = [], {}, {}
        flags = np.zeros(len(cells), dtype=np.uint8)
        print(f'{dataset}: indexing {len(cells)} cells', flush=True)
        for i, mappings, statistics in records:
            mapping = mappings[d]
            states.append('supported' if isinstance(mapping, list) else
                          'gene_not_found' if mapping is None else 'duplicate_dataset_mapping')
            if not isinstance(mapping, list):
                bits[i] = 0
                continue
            column = native[tuple(mapping[:2])]
            start, stop = raw.indptr[column:column+2]
            rows = raw.indices[start:stop][raw.data[start:stop] >= 1]
            flags.fill(0)
            flags[rows] = 1
            if int(flags.sum()) != statistics[d][0][0]:
                raise ValueError(f'{dataset}/{i}: marginal mismatch')
            bits[i] = np.packbits(flags, bitorder='little')
        bits.flush()
        for column, destination, blank in [('hypomap_C7', c7, 'Unannotated C7'),
                                             ('hypomap_region', regions, 'No HypoMap region')]:
            labels = cells[column].replace('', blank)
            for label in sorted(labels.unique()):
                destination[label] = np.packbits((labels == label).to_numpy(), bitorder='little').tobytes().hex()
        (output / f'{dataset}.json').write_text(json.dumps({'states': states, 'c7': c7, 'regions': regions}))
        info['datasets'].append({'id': dataset, 'n_cells': len(cells), 'source_sha256': sources,
                                  'bits_sha256': digest(output / f'{dataset}.npy'),
                                  'metadata_sha256': digest(output / f'{dataset}.json')})
        del raw, bits
    (output / 'manifest.json').write_text(json.dumps(info))
    print(f'Complete: {sum(p.stat().st_size for p in output.iterdir()):,} bytes', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export-dir', type=Path, default=Path('navigation_export'))
    parser.add_argument('--processed-dir', type=Path, default=Path('processed'))
    parser.add_argument('--out-dir', type=Path, default=Path('processed/comparison_index'))
    args = parser.parse_args()
    build(args.export_dir, args.processed_dir, args.out_dir)
