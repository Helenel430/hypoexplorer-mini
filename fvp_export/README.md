# FVP Metric Export

Static vertical-slice export for the frozen Gene Explorer FVP.

Generated file:

```text
gene_metrics_vertical_slice.json
```

Regenerate:

```bash
python3 tools/export_fvp_metrics.py --genes Pomc Agrp Ccn1 Fam237b Npy
```

The export currently covers:

- `Pomc`
- `Agrp`
- `Ccn1`, resolved to `Cyr61` in `GSE172461` and `GSE93374`
- `Fam237b`, resolved to the native `Gm8773` feature in all three datasets
- `Npy`, resolved directly in all three datasets
- all ten pairs among `Pomc`, `Agrp`, `Ccn1`, `Fam237b`, and `Npy` across Whole
  hypothalamus and every nonblank `hypomap_region` (16 contexts total)

Metric sources:

- positivity, positive cells, `%Expressing`, and dataset detection: raw counts
- mean expression and distributions: verified Seurat LogNormalize matrices
- spatial groups: `hypomap_region`
- cell-type groups: `hypomap_C25`
- region-scoped cell-type groups: `hypomap_C25` within each `hypomap_region`
- coexpression: raw-count four-way quadrants, exported as integer counts per
  dataset and cell-pooled across the selected datasets

Coexpression uses one context population at a time. The selected region is
carried over from the Overview map; Whole hypothalamus is the fresh-session
default. Exact denominator rules are defined in `docs/METRIC_SPEC.md`.

Blank annotation buckets are explicit when present:

- `No HypoMap region`
- `Unannotated C25`
- `Missing sample identity`

In the current regenerated slice, `Missing sample identity` is only the standard
fallback label in the metric contract; all three target datasets have
`blank_sample_id = 0`.

Unresolved or ambiguous genes must not be treated as zero expression. Use
`tools/resolve_gene_query.py` before computing metrics.
