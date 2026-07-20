# Gene Harmonization Artifacts

Generated MGI-backed cross-dataset gene alias layer for the current target
datasets:

- `GSE207736`
- `GSE172461`
- `GSE93374`

The layer preserves every dataset's imported `processed/<dataset>/genes.csv`
unchanged. It maps dataset-native gene rows to canonical MGI genes in a separate
table.

## Inputs

Official MGI reports downloaded 2026-07-20:

- `mgi_source/MRK_List1.rpt.gz`
- `mgi_source/MGI_Gene_Model_Coord.rpt`

## Outputs

- `gene_harmonization.csv`
- `gene_harmonization.provenance.json`

## Regenerate

```bash
python3 tools/build_gene_harmonization.py
```

## Resolve A Query

```bash
python3 tools/resolve_gene_query.py Ccn1
python3 tools/resolve_gene_query.py Cyr61
```

Resolver states:

- `resolved`: safe to compute metrics for mapped dataset rows.
- `disambiguation_required`: stop and show candidate official symbols and stable
  IDs; do not guess.
- `gene_not_found`: unresolved query or dataset mapping; do not treat as zero
  expression.
- `duplicate_dataset_mapping`: stop until a documented dataset-specific rule
  exists.
