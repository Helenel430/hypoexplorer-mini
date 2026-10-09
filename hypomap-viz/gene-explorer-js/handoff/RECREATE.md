# ARC Gene Explorer — recreation package

Everything needed to rebuild the frozen Gene Explorer FVP, with **no proprietary
runtime and no build step**. Open `ARC_Gene_Explorer.html` in any browser to see
the exact page; read it top-to-bottom to understand or re-derive the product.

```
handoff/
  ARC_Gene_Explorer.html   self-contained recreation (HTML + one vanilla-JS module)
  RECREATE.md              this file
```

## 1. What this is

`ARC_Gene_Explorer.html` is a portable twin of `ARC Gene Explorer - FVP.dc.html`.
The product source is a Design Component that requires a runtime to render; this
file reproduces the same UI and the same logic in plain HTML/CSS/JS so it can be
opened, diffed, and ported anywhere. There are **no external requests, no CDN,
no dependencies**.

It reproduces, pixel-for-pixel, the five-page FVP:

| Tab | Purpose | Source of truth |
|---|---|---|
| **Overview** | Anatomy map + summary metric cards, gene blurb | coverage + context math |
| **Cell Identity** | C7→C465 lineage tree + cluster abundance table | `TREE`, `C7`, `C25`, `RES` |
| **Expression** | % expressing / positive / mean + histogram | context math (modeled) |
| **Reproducibility** | per-dataset agreement bars + pooled % | `DSMULT`, coverage |
| **Context** | reserved for coexpression (Next) | static |

Shared global context — gene, annotation source (Native/HypoMap), selected
deposits, single-select nucleus, cluster resolution — is held once in `state`
and read by every tab, exactly as in the product.

## 2. File anatomy

The single `<script>` is split by banner comments; search for them:

- `[DATA]` — every value the page renders, as plain JS literals. This is the
  only section you touch to change what the page shows.
- `[STATE]` — the `state` object (current tab, source, dataset toggles, region,
  resolution, expanded tree nodes, hover, two display tweaks).
- `[LOGIC]` — pure functions. `derive()` returns everything the views need and
  contains no DOM access. It is a 1:1 port of the DC's `renderVals()`.
- `[VIEW]` — one `view*()` function per tab, each returning an HTML string.
  Clickable elements carry `data-act` / `data-v` attributes.
- `[SHELL]` — `render()` (rebuilds `#app` innerHTML from state) plus one
  delegated `click`/`mouseover` handler that maps `data-act` → state mutation →
  `render()`.

Rendering model: **state → derive() → view strings → innerHTML → delegated
events → mutate state → render() again.** No framework; no partial updates.

## 3. Data model ([DATA] section)

| Symbol | Shape | Meaning |
|---|---|---|
| `DS` | array | Deposits. `native` / `hypomap` / `hypoRegion` = cells annotated at each level; `color` for charts. |
| `REGIONS` | `[label, count][]` | Nucleus cell counts (HypoMap `hypomap_region`). |
| `ABBR` | map | Region label → map abbreviation (ARC, PVN, …). |
| `FRAC` | map | **MODELED** positive fraction per region. Placeholder until the expression pass. |
| `RES` | `[level, n][]` | Cluster hierarchy resolutions C7…C465. |
| `C7`, `C25` | `[label, count][]` | Cluster abundance at the two listable resolutions. |
| `TREE` | nested | Lineage C7→C25→C66; `mark:true` = carries the queried gene. |
| `DSMULT` | map | **MODELED** per-dataset consistency multiplier for the reproducibility bars. |
| `NUCLEI` | array | Nucleus placement on the coronal SVG (one hemisphere; mirrored at render). |
| `GENE`, `GENE_BLURB` | — | Queried gene identity + description. |

### Real vs. modeled (matches the product's honesty rules)

- **Structural / real:** cell counts, coverage percentages, cluster abundance,
  dataset membership, the C7→C465 hierarchy.
- **Modeled placeholders (flagged "modeled" in the UI):** `% expressing`,
  `positive cells`, `mean expression`, the histogram shape, and the
  reproducibility multipliers. These come from `FRAC` / `DSMULT` and the
  `derive()` formulas, **not** from a real expression matrix yet.

## 4. Logic ported from the FVP ([LOGIC] section)

`derive()` mirrors `renderVals()`:

1. **Coverage aggregation** — sum `total` / `regionAssigned` / `annotNoRegion` /
   `notCovered` / `nativeAnnot` across the *selected* deposits, branching on the
   active annotation source. No cells are dropped for being unannotated.
2. **Context resolution** — `contextIsNucleus` when a region is selected;
   otherwise whole hypothalamus. `contextTotal`, `positive`, `fracContext`,
   `pctExpr`, `meanExpr` follow from there.
3. **Region enable gate** — nucleus placement/tree require HypoMap
   (`hypomap_region`); native-only selections show the "needs HypoMap" state.

The metric formulas (`pctExpr = fracContext*100`, `meanExpr = 0.2 +
fracContext*15`, histogram shape/scale, `DSMULT` bars) are the **modeled**
stand-ins. Their **real** definitions are specified in `docs/METRIC_SPEC.md`
(positivity = `raw_count >= 1`; `%expressing = positive/eligible*100`; mean =
mean Seurat LogNormalize among positives; etc.).

## 5. Wiring real data later (optional, not done here)

This package is intentionally self-contained with modeled values. When you want
real numbers, the pipeline already produces them:

- Regenerate the metric export:
  `python3 tools/export_fvp_metrics.py --genes Pomc Agrp Ccn1 Fam237b Npy`
  → `fvp_export/gene_metrics_vertical_slice.json`.
- That JSON keys metrics by real `hypomap_region` and `hypomap_C25` labels, per
  dataset, with `cross_dataset` pooled/average modes and expression histograms
  (`bin_edges` + `counts`) — a direct replacement for `FRAC`, `DSMULT`, the
  histogram shape, and the summary/repro numbers.
- To make this file data-driven, `fetch()` that JSON in `[SHELL]` and replace
  the `[DATA]` literals + the modeled formulas in `derive()` with lookups into
  it. The `[VIEW]`/`[SHELL]` layers do not change.
- Schema and metric contracts: `docs/SHARED_SCHEMA.md`, `docs/METRIC_SPEC.md`.

## 6. Provenance of the numbers shown

- Deposits: GSE207736 (Dowsett10xnuc, 10x snRNA-seq), GSE172461 (10x, per-cell
  meta), GSE93374 (Campbell 2017, Drop-seq).
- Annotation source: HypoMap atlas · CZ CELLxGENE d86517f0 · Steuernagel et al.
  2022 — 35,945 / 39,953 cells matched, 26,536 with a nucleus assignment.
- Expression matrix quoted in the footer: 39,953 × 55,399.
