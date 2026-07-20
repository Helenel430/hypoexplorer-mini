# FVP Metric Export

Static vertical-slice export for the frozen Gene Explorer FVP.

Generated file:

```text
gene_metrics_vertical_slice.json
```

Regenerate:

```bash
python3 tools/export_fvp_metrics.py --genes Pomc Agrp Ccn1
```

The export currently covers:

- `Pomc`
- `Agrp`
- `Ccn1`, resolved to `Cyr61` in `GSE172461` and `GSE93374`

Metric sources:

- positivity, positive cells, `%Expressing`, and dataset detection: raw counts
- mean expression and distributions: verified Seurat LogNormalize matrices
- spatial groups: `hypomap_region`
- cell-type groups: `hypomap_C25`
- region-scoped cell-type groups: `hypomap_C25` within each `hypomap_region`

Blank annotation buckets are explicit when present:

- `No HypoMap region`
- `Unannotated C25`
- `Missing sample identity`

In the current regenerated slice, `Missing sample identity` is only the standard
fallback label in the metric contract; all three target datasets have
`blank_sample_id = 0`.

Unresolved or ambiguous genes must not be treated as zero expression. Use
`tools/resolve_gene_query.py` before computing metrics.
