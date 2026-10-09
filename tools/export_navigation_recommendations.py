"""Exact Top 5 whole-hypothalamus conditional co-detection recommendations.

Uses temporary in-memory positivity bitsets and provable marginal-count bounds;
does not emit all-pair tables. Run after export_navigation_metrics.py.
"""
from __future__ import annotations

import argparse
import gc
import gzip
import heapq
import json
from pathlib import Path

import numpy as np
from scipy.sparse import csr_matrix, load_npz, vstack

from export_navigation_metrics import digest, write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export-dir', type=Path, default=Path('navigation_export'))
    parser.add_argument('--processed-dir', type=Path, default=Path('processed'))
    args = parser.parse_args()
    root = args.export_dir
    manifest = json.loads((root / 'manifest.json').read_text())
    if manifest['recommendations']['state'] == 'exported':
        raise ValueError('Recommendations already exist')
    metadata = json.loads(gzip.decompress((root / 'metadata.json.gz').read_bytes()))
    datasets = metadata['datasets']
    records = [record for f in manifest['files'] if f['path'].startswith('genes-')
               for record in json.loads(gzip.decompress((root / f['path']).read_bytes()))]
    n = len(records)
    marginal = np.zeros((n, len(datasets)), dtype=np.int64)
    support = np.zeros(n, dtype=np.int32)
    bits = [0] * n
    row_matrices = []
    offset = 0
    for d, ds in enumerate(datasets):
        folder = args.processed_dir / ds
        if digest(folder / 'expression_matrix.npz') != manifest['source_sha256']['datasets'][ds]['expression_matrix.npz']:
            raise ValueError(f'{ds}: raw input changed since metric export')
        import pandas as pd
        genes = pd.read_csv(folder / 'genes.csv', dtype=str).fillna('')
        native = {(r.gene_id, r.gene_symbol): i for i, r in enumerate(genes.itertuples())}
        print(f'{ds}: building positivity bitsets', flush=True)
        raw = load_npz(folder / 'expression_matrix.npz').tocsc()
        flags = np.zeros(raw.shape[0], dtype=np.uint8)
        selected_genes, selected_columns = [], []
        for i, mappings, statistics in records:
            if not isinstance(mappings[d], list):
                continue
            support[i] |= 1 << d
            marginal[i, d] = statistics[d][0][0]
            column = native[tuple(mappings[d][:2])]
            selected_genes.append(i)
            selected_columns.append(column)
            start, stop = raw.indptr[column:column+2]
            rows = raw.indices[start:stop][raw.data[start:stop] >= 1]
            flags.fill(0)
            flags[rows] = 1
            bits[i] |= int.from_bytes(np.packbits(flags, bitorder='little').tobytes(), 'little') << offset
        binary = (raw[:, selected_columns] >= 1).astype(np.uint8).tocsr()
        global_indices = np.asarray(selected_genes, dtype=np.int32)[binary.indices]
        row_matrices.append(csr_matrix((binary.data, global_indices, binary.indptr),
                                       shape=(raw.shape[0], n)))
        offset += raw.shape[0]
        del raw, binary, global_indices
        gc.collect()
    cell_gene = vstack(row_matrices, format='csr')
    del row_matrices
    gc.collect()
    rankings = {}
    for mask in range(1, 1 << len(datasets)):
        ds_indices = [d for d in range(len(datasets)) if mask & (1 << d)]
        totals = marginal[:, ds_indices].sum(axis=1)
        candidates = [i for i in range(n) if support[i] & mask == mask and totals[i] > 0]
        candidates.sort(key=lambda i: (-int(totals[i]), i))
        rankings[mask] = (totals, candidates)
    recommendations = []
    comparisons = 0
    for i in range(n):
        mask = int(support[i])
        if not mask:
            recommendations.append([i, [], 0, []])
            continue
        totals, candidates = rankings[mask]
        positive = int(totals[i])
        heap = []
        if 0 < positive <= 5000:
            # For sparse query genes, accumulate candidates through positive cells;
            # this is exact and avoids scanning thousands of large bitsets.
            flags = np.unpackbits(np.frombuffer(bits[i].to_bytes((offset + 7) // 8, 'little'),
                                               dtype=np.uint8), bitorder='little')[:offset]
            positive_rows = np.flatnonzero(flags)
            co_counts = np.asarray(cell_gene[positive_rows].sum(axis=0, dtype=np.int64)).ravel()
            eligible = np.asarray(candidates, dtype=np.int32)
            eligible = eligible[(eligible != i) & (co_counts[eligible] > 0)]
            ordered = np.lexsort((eligible, -totals[eligible], -co_counts[eligible]))[:5]
            heap = [(int(co_counts[j]), int(totals[j]), -int(j)) for j in eligible[ordered]]
        elif positive:
            for j in candidates:
                if j == i:
                    continue
                upper = min(positive, int(totals[j]))
                # Candidates descend by tie priority, so equality cannot displace a visited result.
                if len(heap) == 5 and upper <= heap[0][0]:
                    break
                both = (bits[i] & bits[j]).bit_count()
                comparisons += 1
                if both:
                    item = (both, int(totals[j]), -j)
                    if len(heap) < 5:
                        heapq.heappush(heap, item)
                    elif item > heap[0]:
                        heapq.heapreplace(heap, item)
        selected = [[-j, both] for both, _, j in sorted(heap, reverse=True)]
        recommendations.append([i, [d for d in range(len(datasets)) if mask & (1 << d)], positive, selected])
        if i % 1000 == 0:
            print(f'{i}/{n}: {comparisons} intersections evaluated', flush=True)
    # Exhaustively validate pruning on pilot anchors using the same bitsets.
    index = json.loads(gzip.decompress((root / 'search-index.json.gz').read_bytes()))
    checked = 0
    for symbol in ['Pomc', 'Agrp', 'Ccn1', 'Fam237b', 'Npy']:
        i = next(i for i, gene in enumerate(index['genes']) if gene[1] == symbol)
        totals, candidates = rankings[int(support[i])]
        exact = sorted(((bits[i] & bits[j]).bit_count(), int(totals[j]), -j)
                       for j in candidates if j != i)
        expected = [[-j, both] for both, _, j in reversed(exact[-5:]) if both]
        if expected != recommendations[i][3]:
            raise ValueError(f'{symbol}: pruned ranking differs from exhaustive ranking')
        checked += len(candidates) - 1
    file = write_json(root, 'recommendations.json.gz', recommendations)
    manifest['files'].append(file)
    manifest['compressed_payload_bytes'] += file['bytes']
    manifest['recommendations'] = {
        'state': 'exported', 'path': file['path'], 'population': 'Whole hypothalamus',
        'score': 'both_positive / queried_gene_positive', 'top_k': 5,
        'record_layout': ['gene_index', 'dataset_indices', 'queried_gene_positive', 'partners'],
        'partner_layout': ['gene_index', 'both_positive'],
        'eligibility': 'partner must resolve uniquely in every dataset supporting the queried gene',
        'pooling': 'sum cells across datasets supporting the queried gene',
        'ties': 'larger partner positive-cell count, then earlier canonical gene index',
        'zero_detection': 'empty recommendations',
        'annotation_scope': 'no C25 or C7 stratification; C7 pair comparisons remain on demand',
        'validation': {'exhaustive_pilot_comparisons': checked, 'evaluated_intersections': comparisons},
    }
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'compressed_MB': manifest['compressed_payload_bytes'] / 1e6,
                      'recommendations_MB': file['bytes'] / 1e6}), flush=True)


if __name__ == '__main__':
    main()
