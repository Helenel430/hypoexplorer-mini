# gene-explorer-js

JavaScript/Vite static Gene Explorer for the HypoMap/HypoExplorer vertical slice,
built so it can be deployed on Vercel instead of requiring an R server.

Plain HTML/CSS/JS — no UI framework, no runtime dependencies. The app reads a
precomputed static JSON file; there is no backend.

## Regenerating the data

The current FVP vertical slice reads:

```text
public/data/gene_metrics_vertical_slice.json
```

Regenerate it from the repository root:

```bash
python3 tools/export_fvp_metrics.py --genes Pomc Agrp Ccn1 Fam237b
cp fvp_export/gene_metrics_vertical_slice.json hypomap-viz/gene-explorer-js/public/data/gene_metrics_vertical_slice.json
```

The older Romanov-only JSON export remains available for provenance:

```
Rscript scripts/export_gene_stats.R
```

This requires R with the `jsonlite` package installed. It writes
`public/data/gene_stats.json`.

## Develop

```
npm install
npm run dev
```

## Build / deploy

```
npm run build     # outputs static site to dist/
npm run preview   # sanity-check the production build locally
```

On Vercel: create a project pointed at this repo, set **Root Directory** to
`hypomap-viz/gene-explorer-js`. Framework preset "Vite" is auto-detected
(build command `vite build`, output directory `dist`) — no other config needed.

## Status

Currently wires the frozen `ARC_Gene_Explorer.html` handoff to real computed
values for `Pomc`, `Agrp`, `Ccn1` / `Cyr61`, and `Fam237b` / `Gm8773`. The app defaults to
`GSE207736` / Dowsett10xnuc only, while keeping the dataset selector and
aggregation logic ready for `GSE172461` and `GSE93374`.

Implemented:

- dynamic gene search with a filtered type-ahead dropdown, keyboard navigation,
  and alias resolution from the static export (`Cyr61` resolves to canonical
  `Ccn1`; `Gm8773` resolves to canonical `Fam237b`)
- selectable dataset rows, defaulting to Dowsett10xnuc only
- dataset-average and cell-pooled aggregation modes, revealed only when more
  than one dataset is selected
- Whole / ARC / PVN / VMH / DMH context selector
- five-tab structure: Overview, Cell Identity, Aggregate, By dataset, and Context
- count-led Aggregate view with a live expressing-cell donut, across-dataset
  percentage, positive-cell mean expression, metric explainers, detection count,
  and a dataset-average versus cell-pooled calculation switch
- By dataset view with selectable dataset chips, a fixed 0–100% bar chart, and
  per-dataset expression detail cards
- Overview and Aggregate metric cards backed by raw-count and verified Seurat
  LogNormalize metrics defined in `docs/METRIC_SPEC.md`
- region-scoped `hypomap_C25` grouping for the Cell Identity tab
- explicit provenance and annotation-coverage reporting, including unsupported
  source/region states instead of silently treating missing annotations as zero

Not implemented yet:

- coexpression values. The Context tab is present, but it intentionally shows a
  metric-definition-needed state until the canonical coexpression denominator
  and quadrant formulas are specified.
- C7, C66/C185, and C286 cell-identity rows are still structural handoff
  placeholders. The current export provides validated `hypomap_C25` groups only.
