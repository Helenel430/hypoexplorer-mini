"""Validate deployed gzip files, all record states, bounds, and recommendation links."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', type=Path, default=Path('navigation_export'))
    args = parser.parse_args()
    root = args.directory
    manifest = json.loads((root / 'manifest.json').read_text())
    values = {}
    for file in manifest['files']:
        payload = (root / file['path']).read_bytes()
        assert len(payload) == file['bytes'], file['path']
        assert hashlib.sha256(payload).hexdigest() == file['sha256'], file['path']
        decompressed = gzip.decompress(payload)
        assert len(decompressed) == file['uncompressed_bytes'], file['path']
        values[file['path']] = json.loads(decompressed)
    metadata = values['metadata.json.gz']
    records = [r for f in manifest['files'] if f['path'].startswith('genes-') for r in values[f['path']]]
    assert [r[0] for r in records] == list(range(manifest['gene_count']))
    assert len(values['search-index.json.gz']['genes']) == len(records)
    for ds in metadata['datasets']:
        eligible = metadata['eligible_cells'][ds]
        assert sum(eligible[1:]) == eligible[0]
        assert sum(metadata['c7_eligible_cells'][ds]) == eligible[0]
    for _, mappings, stats in records:
        for d, ds in enumerate(metadata['datasets']):
            assert (stats[d] is not None) == isinstance(mappings[d], list)
            if stats[d] is None:
                continue
            counts, sums = stats[d]
            assert len(counts) == len(sums) == len(metadata['contexts'])
            assert all(0 <= count <= eligible for count, eligible in zip(counts, metadata['eligible_cells'][ds]))
            assert sum(counts[1:]) == counts[0]
            assert all(value >= 0 for value in sums)
            assert abs(sum(sums[1:]) - sums[0]) <= max(1e-9, sums[0] * 1e-12)
    assert manifest['recommendations']['state'] == 'exported'
    recommendations = values[manifest['recommendations']['path']]
    assert len(recommendations) == len(records)
    for i, (gene_index, datasets, positive, partners) in enumerate(recommendations):
        assert gene_index == i
        expected_datasets = [d for d, mapping in enumerate(records[i][1]) if isinstance(mapping, list)]
        assert datasets == expected_datasets
        assert positive == sum(records[i][2][d][0][0] for d in datasets)
        assert len(partners) <= 5
        assert len({p[0] for p in partners}) == len(partners)
        keys = []
        for j, both in partners:
            assert j != i and 0 <= j < len(records)
            assert all(isinstance(records[j][1][d], list) for d in datasets)
            partner_positive = sum(records[j][2][d][0][0] for d in datasets)
            assert 0 < both <= min(positive, partner_positive)
            keys.append((both, partner_positive, -j))
        assert keys == sorted(keys, reverse=True)
        if positive == 0:
            assert not partners
    result = {'status': 'passed', 'files_checked': len(manifest['files']),
              'gene_records_checked': len(records), 'recommendation_records_checked': len(recommendations),
              'compressed_payload_bytes': sum(f['bytes'] for f in manifest['files'])}
    assert result['compressed_payload_bytes'] == manifest['compressed_payload_bytes']
    (root / 'validation.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
