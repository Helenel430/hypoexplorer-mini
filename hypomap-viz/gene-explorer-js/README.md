# gene-explorer-js

JavaScript/Vite static Gene Explorer for the HypoMap/HypoExplorer vertical slice,
built so it can be deployed on Vercel instead of requiring an R server.

Plain HTML/CSS/JS — no UI framework, no runtime dependencies. The FVP reads one precomputed JSON file; the standalone navigation route loads
a static index and gene shards. Neither route requires a runtime backend.

## Regenerating the data

The current FVP vertical slice reads:

```text
public/data/gene_metrics_vertical_slice.json
```

Regenerate it from the repository root:

```bash
python3 tools/export_fvp_metrics.py --genes Pomc Agrp Ccn1 Fam237b Npy
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

### Standalone navigation prototype

The user-directed navigation route is at `public/navigation-prototype.html`, separate
from the four-tab FVP app at `/`. As of checkpoint 5 (2026-10-09), its search, expression, and
Top 5 recommendation panels use the all-gene `navigation_export/` at the repository root.
Serve it through Vite; ES modules and exported gzip data require HTTP access.

Run `npm run dev`, then open `http://localhost:5173/navigation-prototype.html`. The
flow is landing gene search → gene page (spatial schematic, whole-hypothalamus metrics,
gene-specific top-five co-expression card) → **By dataset breakdown**. The breakdown
shows `% expressing` and mean-expression charts; selecting points adds individual dataset
metric cards in click order. See the root
[`docs/NAVIGATION_PROTOTYPE_SPEC.md`](../../docs/NAVIGATION_PROTOTYPE_SPEC.md) for
metric formulas, popovers, point-selection behavior, and visual hierarchy.

The index resolves current symbols before aliases, ignores case, and presents every
candidate for ambiguous queries, including unavailable outside-export candidates.
Selecting a gene fetches its 256-gene shard; the loader caches successful requests
and evicts failed requests for retry. It handles both raw gzip bytes and server
Content-Encoding decompression.

Whole-hypothalamus count, detection percentage, and positive-cell mean are
cell-pooled across datasets with unique gene mappings. Spatial shading uses the
same positive-cell mean for each exported `hypomap_region`, scaled against the
highest mean among the seven mapped nuclei for the current gene. Nucleus tooltips
include counts, detection percentage, and mean. ME is unavailable because the export
has no separate ME context. Blank-region cells stay in whole denominators; mapping
and annotation-coverage disclosures are below the main panels.

By dataset uses exact exported counts and equal-weight dataset means ± SEM.
Unsupported mappings are excluded and disclosed; zero-detection datasets contribute
0% but have undefined expression means. Point selections open cards in click order.

`vite.config.js` serves the root export at `/navigation_export/` during development
and copies it into `dist/navigation_export/` during builds. The root export must
exist on the build machine; generated shards remain outside source control. A fresh clone must regenerate or
receive the validated export before running the integration checks or build; see
[`navigation_export/README.md`](../../navigation_export/README.md).
`public/navigation-export-client.mjs` mirrors `tools/navigation_export_client.mjs`;
keep them synchronized when modifying loader behavior.

Run integration checks from this app directory:

```sh
node tests/navigation.test.mjs
npm run build
```

Checkpoint 3 is complete: the recommendation payload loads when a gene page opens
and is cached. Compact Top 5 buttons show the partner and conditional percentage;
exact both/query-positive counts are available in tooltips and accessible labels.
The `?` popover explains the formula, contributing datasets, and interpretation:
scores are directional raw-count co-detection, and broadly expressed genes can rank
highly. Partner identities come from the initial index. Selecting a button opens
its comparison directly and loads the cached partner shard for exact quadrants.
Both-positive comes from the recommendation; query-only, partner-only, and neither
use the marginals over the same dataset population. Quadrant percentages use all
eligible cells; conditional scores use query-positive cells.

The partner search supports canonical symbols, aliases, and explicit ambiguity.
Pairs outside Top 5 have unavailable scores. Short/empty recommendation lists,
loading/retry states, and stale-response guards are implemented. The comparison
uses one population selector, count-centered donut, legend, and quadrant matrix;
C7 availability is described below.

Checkpoint 4 is complete. The initial index, selected-gene shard, and recommendation
panel expose loading states with busy announcements; a reduced-motion-aware indicator
accompanies gene loading. Search preserves the entered query and allows correction
while loading. Index/shard failures provide Retry without requiring a page reload;
failed index initialization is discarded so retry makes a fresh request. Delayed
responses cannot overwrite newer searches, including missing-gene results.

Missing queries show **Gene not found** with input guidance and no expression
metrics. Missing dataset mappings are disclosed separately from supported zero
detection. **No expression detected** keeps the 0% value and supported eligible
count, labels the mean **Not detected**, and explains that the mean and conditional
score are undefined. This also applies to dataset cards and empty mean charts.
Unshaded map labels remain readable for zero-detection regions; unavailable regional
metrics have explicit tooltip reasons.

Checkpoint 5 is complete: all five pilot genes pass a 255-block comparison against
the existing FVP export, all 25 Top 5 quadrants pass count/scope checks, and all 158
built export payloads match root bytes. Browser values for the five genes and both
aliases match expectations. Re-run with `npm run build`, `node tests/navigation.test.mjs`,
and `node tests/navigation-audit.mjs`. Final results and preview are recorded in
[`docs/NAVIGATION_VALIDATION.md`](../../docs/NAVIGATION_VALIDATION.md).

## Build / deploy

```
npm run build     # outputs static site to dist/
npm run preview   # sanity-check the production build locally
```

On Vercel: create a project pointed at this repo, set **Root Directory** to
`hypomap-viz/gene-explorer-js`. Framework preset "Vite" is auto-detected
(build command `vite build`, output directory `dist`). The build environment must
also contain the validated root `navigation_export/`, including its manifest and
158 payloads. Those generated assets are excluded from Git; pushing this source
commit alone does not provision a fresh Vercel build. Build locally with the export
present and deploy the resulting `dist/`, or provision the export before the hosted
build. The shared description module is copied automatically.

## Status

Currently wires the frozen `ARC_Gene_Explorer.html` handoff to real computed
values for `Pomc`, `Agrp`, `Ccn1` / `Cyr61`, `Fam237b` / `Gm8773`, and `Npy`. The app defaults to
all three target datasets selected and the Whole hypothalamus context. Dataset
and Overview-map region selections persist while moving between tabs.

Implemented:

- dynamic gene search with a filtered type-ahead dropdown, keyboard navigation,
  and alias resolution from the static export (`Cyr61` resolves to canonical
  `Ccn1`; `Gm8773` resolves to canonical `Fam237b`)
- selectable dataset rows, defaulting to all three datasets
- dataset-average and cell-pooled aggregation modes, revealed only when more
  than one dataset is selected
- Whole / ARC / PVN / VMH / DMH context selector
- four-tab structure: Overview, Cell Identity, By dataset, and Coexpression
- coherent blue visual system across controls, anatomy intensity, dataset identities,
  aggregate charts, and coexpression quadrants
- count-led Aggregate view with a live expressing-cell donut, across-dataset
  percentage, positive-cell mean expression, metric explainers, detection count,
  and a dataset-average versus cell-pooled calculation switch
- By dataset view with selectable dataset chips and side-by-side `% expressing` and
  positive-cell mean-expression plots. Both show a dynamically scaled mean bar,
  ±SEM, vertically aligned hoverable dataset points, and explicit units; per-dataset
  expression detail cards sit below them.
- Overview and Aggregate metric cards backed by raw-count and verified Seurat
  LogNormalize metrics defined in `docs/METRIC_SPEC.md`
- region-scoped `hypomap_C25` grouping for the Cell Identity tab
- flexible coexpression pilot for any two of `Pomc`, `Agrp`, `Ccn1`,
  `Fam237b`, and `Npy`: the gene being browsed stays fixed as the first gene, while an
  alias-aware autocomplete selects a different vertical-slice partner. The view
  contains one context card whose region follows the remembered Overview map
  selection (fresh-session default: Whole hypothalamus). Its donut, legend, and
  quadrant matrix share one horizontal row; four-way counts and percentages
  update from exact per-dataset counts when dataset selections change
- explicit provenance and annotation-coverage reporting, including unsupported
  source/region states instead of silently treating missing annotations as zero

Not implemented yet:

- arbitrary atlas-wide gene-pair selection. Pair selection is currently limited
  to the five validated vertical-slice genes.
- C7, C66/C185, and C286 cell-identity rows are still structural handoff
  placeholders. The current export provides validated `hypomap_C25` groups only.

## Gene descriptions and dataset details

Both the FVP Overview and standalone navigation gene page show the previous
version's curated protein-function summaries and direct mouse UniProtKB links.
The shared source is `gene-descriptions.mjs`; Vite bundles it into the FVP and copies
it beside the standalone route in production builds. No external API is called.
The navigation page places “About this gene” beneath the gene heading, before the
spatial map. Canonical resolution ensures aliases receive the same description.
Only genes with an existing curated summary receive this block.
Current accessions are Pomc `P01193`, Agrp `P56473`, Ccn1 `P18406`, Fam237b
`Q3UQ24`, and Npy `P57774`.

In **By dataset**, select a point on either plot to open that dataset's detail
card. Cards appear beside one another as points are selected and can be closed
individually. The points also work with the keyboard.

## Coexpression formatting and C7 scope

The comparison uses one card: partner input, compact Top 5 score buttons, selected
pair, one population selector, donut/legend, and quadrant matrix. Selecting a Top 5
partner opens the measured comparison directly; Compare genes submits typed queries.
Exact conditional counts remain in tooltips/accessibility labels. Dismissible `?`
popovers explain formulas, denominators, dataset scope, and interpretation limits.

C7 population totals are measured over the pair's recommendation datasets and include
Unannotated C7. The population selector displays those totals. Measured C7 pair
values are absent: selecting C7 shows one compact unavailable state; clicking a
whole-population quadrant shows its count with one C7 availability message. The
previous duplicated population navigation and unavailable rows have been removed.
