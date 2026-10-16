"""Independently check measured pair/C7 API against raw matrix columns."""
import gzip
from itertools import combinations
import json
from pathlib import Path
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import urlopen

import numpy as np
import pandas as pd
from scipy.sparse import load_npz

ROOT = Path(__file__).resolve().parents[1]
API = 'http://127.0.0.1:8765'


def request(a, b, datasets=None, region=None):
    params = {'a': a, 'b': b}
    if datasets is not None:
        params['datasets'] = ','.join(datasets)
    if region:
        params['region'] = region
    with urlopen(API + '/api/compare?' + urlencode(params)) as response:
        return json.load(response)


def main():
    search = json.loads(gzip.decompress((ROOT / 'navigation_export/search-index.json.gz').read_bytes()))
    ids = {g[1]: g[0] for g in search['genes']}
    pilots = ['Pomc', 'Agrp', 'Ccn1', 'Fam237b', 'Npy']
    pairs = list(combinations(pilots, 2)) + [('Pomc', 'Malat1'), ('Pomc', 'Meg3'), ('Platr11', 'Pomc'), ('Kiss1', 'Gnrh1')]
    results = {(a, b): request(ids[a], ids[b]) for a, b in pairs}
    index = json.loads((ROOT / 'processed/comparison_index/manifest.json').read_text())
    records = {r[0]: r for path in sorted((ROOT / 'navigation_export').glob('genes-*.json.gz'))
               for r in json.loads(gzip.decompress(path.read_bytes()))}
    by_id = {g[0]: i for i, g in enumerate(search['genes'])}
    checked = 0
    for d, ds in enumerate(index['datasets']):
        name = ds['id']
        folder = ROOT / 'processed' / name
        raw = load_npz(folder / 'expression_matrix.npz').tocsc()
        genes = pd.read_csv(folder / 'genes.csv', dtype=str).fillna('')
        cells = pd.read_csv(folder / 'cells.csv', dtype=str, keep_default_na=False)
        native = {(r.gene_id, r.gene_symbol): i for i, r in enumerate(genes.itertuples())}
        labels = cells.hypomap_C7.replace('', 'Unannotated C7').to_numpy()
        for (a, b), result in results.items():
            mapping_a = records[by_id[ids[a]]][1][d]
            mapping_b = records[by_id[ids[b]]][1][d]
            if not isinstance(mapping_a, list) or not isinstance(mapping_b, list):
                assert name in [r['dataset'] for r in result['unsupported']]
                continue
            # Independent dense boolean vectors from source sparse columns.
            av = np.asarray(raw[:, native[tuple(mapping_a[:2])]].toarray()).ravel() >= 1
            bv = np.asarray(raw[:, native[tuple(mapping_b[:2])]].toarray()).ravel() >= 1
            row = next(r for r in result['datasets'] if r['dataset'] == name)
            populations = [(row, np.ones(len(cells), dtype=bool))] + [(group, labels == group['label']) for group in row['c7']]
            for metric, mask in populations:
                expected = {'both': int(np.sum(av & bv & mask)), 'queryOnly': int(np.sum(av & ~bv & mask)),
                            'partnerOnly': int(np.sum(~av & bv & mask)), 'neither': int(np.sum(~av & ~bv & mask))}
                assert metric['counts'] == expected, (name, a, b, metric, expected)
                assert metric['eligible'] == int(mask.sum())
                checked += 1
            subset = request(ids[a], ids[b], [name])
            assert subset['whole']['counts'] == row['counts']
            arc = request(ids[a], ids[b], [name], 'Arcuate hypothalamic nucleus')
            mask = cells.hypomap_region.to_numpy() == 'Arcuate hypothalamic nucleus'
            assert arc['whole']['counts']['both'] == int(np.sum(av & bv & mask))
            assert arc['whole']['eligible'] == int(mask.sum())
        del raw
    for (a, b), result in results.items():
        reverse = request(ids[b], ids[a])
        forward, back = result['whole']['counts'], reverse['whole']['counts']
        assert forward['both'] == back['both'] and forward['neither'] == back['neither']
        assert forward['queryOnly'] == back['partnerOnly']
        for key in forward:
            assert forward[key] == sum(r['counts'][key] for r in result['datasets'])
            assert forward[key] == sum(r['counts'][key] for r in result['c7'])
    for params in [{'a': ids['Pomc'], 'b': ids['Pomc']}, {'a': 'bad', 'b': ids['Pomc']},
                   {'a': ids['Pomc'], 'b': ids['Agrp'], 'datasets': 'invalid'},
                   {'a': ids['Pomc'], 'b': ids['Agrp'], 'region': 'invalid'}]:
        try:
            urlopen(API + '/api/compare?' + urlencode(params))
            raise AssertionError('Invalid request accepted')
        except HTTPError as error:
            assert error.code == 400
    start = time.perf_counter()
    for _ in range(20):
        request(ids['Pomc'], ids['Agrp'])
    latency = (time.perf_counter() - start) / 20 * 1000
    fixtures = {a+'|'+b: r for (a, b), r in results.items()}
    # UI fixtures are captured only after independent raw-matrix checks pass.
    fixture_path = ROOT / 'hypomap-viz/gene-explorer-js/tests/fixtures/comparisons.json'
    fixture_path.parent.mkdir(exist_ok=True)
    fixture_path.write_text(json.dumps(fixtures))
    report = {'state': 'passed', 'raw_population_blocks': checked, 'pairs': len(pairs),
              'datasets': [d['id'] for d in index['datasets']], 'mean_cached_http_ms': latency,
              'index_bytes': sum(p.stat().st_size for p in (ROOT / 'processed/comparison_index').iterdir())}
    (ROOT / 'docs/comparison_validation_results.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
