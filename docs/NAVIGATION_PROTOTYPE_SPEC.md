# Gene Explorer Navigation Prototype

Current UX and interaction specification for the lightweight navigation
prototype at `hypomap-viz/gene-explorer-js/public/navigation-prototype.html`.

Last updated: 2026-10-09

This route is a separate review prototype. It does not replace the data-backed FVP
application at `/` or change its tab structure. The approved page flow for this
prototype is landing → one gene page → optional By dataset breakdown. Moving between
these views must preserve that relationship; do not add tabs or alternate navigation
surfaces.

## 1. Landing page

- Show the HypoMap mark, a concise “Explore the hypothalamus” heading, and one primary
  gene-search field with an Explore gene action.
- Keep the example gene links (`Pomc`, `Agrp`, `Npy`) as direct routes into their gene
  pages. The search form accepts Enter and provides a query-string route fallback so
  the examples and search still work if in-page navigation is unavailable.
- Do not show the co-expression recommendations on the landing page. They belong to
  the selected gene's page and must be specific to that gene.

## 2. Gene page

- The header identifies the selected gene by symbol and full name.
- Under the header, restore the previous “About this gene” block with the curated
  protein-function summary and direct UniProtKB accession link. The shared
  `gene-descriptions.mjs` contains existing summaries for Pomc, Agrp, Ccn1,
  Fam237b, and Npy. Aliases use their resolved canonical gene; omit the block for
  genes without a curated summary.
- The primary content is a two-column spatial-expression and whole-hypothalamus
  metrics layout. The spatial panel uses the original coronal HypoMap schematic:
  mirrored nuclei on the original brain outline, nucleus labels, and a blue intensity
  scale. Keep the schematic balanced and large enough to read.
- The metrics panel shows:
  - **Cells expressing**: a count-centered donut (`expressing / eligible`), with the
    expressing and not-expressing percentages beside it.
  - **Mean expression when detected**: the numeric value and the unit
    `ln(1 + counts per 10k)`.
- Explanatory sentences do not sit under the metrics. Each metric has a `?` button
  that opens its formula and definitions in a readable, dismissible popover.
- Below the spatial/metric row, show a gene-specific **Top 5 co-expressed genes** card.
  Put the secondary-gene search at the top of this card, followed by compact gene +
  conditional-score buttons. A recommendation selects the partner and opens its
  comparison inside the same card in one click. Compare genes submits typed queries.
  Formula and provenance details live behind `?`. Keep this card off the landing page.
- The only navigation action from the main content to another analysis view is
  **By dataset breakdown**. The breakdown view has a **Spatial view** return action.

## 3. By dataset breakdown

- Show two side-by-side charts: `% expressing` and `Mean expression when detected`.
- Each chart has a dataset mean bar and a mean ± SEM error bar. Use the individual
  dataset values as points aligned on one vertical x position. Keep dataset colors
  consistent across both charts and their legend.
- Hover or keyboard focus exposes the dataset and value. Clicking a point selects
  that dataset and adds its detail card below the charts. Cards accumulate in click
  order; selecting another point does not replace an open card. Clicking a selected
  point again closes its card.
- A selected point keeps its dataset color and receives a tight, translucent,
  highlighter-yellow halo (`rgba(255, 255, 0, .7)`) with no outline.
- Each dataset card uses the gene-page metric presentation: expressing-cell donut and
  percentages, plus mean expression and its unit. Each value has its own `?` formula
  popover. Use enough width for legible text while keeping the card capped so its
  contents do not spread across a large empty row.

## 4. Metric formulas and `?` popovers

Use real numerator/denominator fractions with a horizontal rule, not slash-separated
formula text. Popovers are click-open, show one at a time, have a close button, and
must stay inside the viewport rather than clipping at a card or screen edge.

### Percentage expressing

\[
\%\text{ expressing} =
\frac{\text{cells with raw count} \ge 1}{\text{eligible cells}} \times 100
\]

Define expressing cells as cells with at least one raw count for the gene. Eligible
cells are the cells included in the displayed scope.

### Mean expression when detected

\[
\text{mean expression} =
\frac{\sum \text{log-normalized expression in expressing cells}}
     {\text{number of expressing cells}}
\]

Per-cell log-normalization is Seurat LogNormalize:

\[
\ln\!\left(1 +
  \frac{\text{raw counts in the cell}}{\text{total counts in the cell}}
  \times 10{,}000\right)
\]

Clarify that the mean is taken over cells with at least one raw count. Keep the
formula and definitions in the popover, not as permanent small-print beneath the
metric.

## 5. Type and spacing

- Favor compact, content-led cards over full-width rows with large empty gaps.
- Keep labels, units, chart legends, and supporting copy at a readable size and dark
  enough contrast. Preserve a clear hierarchy: gene/page title, metric value, metric
  label, then supporting unit or legend.
- Keep dataset names and their identity colors stable between charts and detail cards.
- Place `?` controls next to the metric label they explain. Popovers should use
  readable body copy, a visually stacked fraction, and enough padding to distinguish
  formula, definitions, and unit details.

## 6. Implementation status and data contract

Updated 2026-10-09 following the user's staged integration request. The approved
page flow and visual layout above remain the reference. The standalone route now
uses ES modules and requires an HTTP server rather than direct file opening.

- **Checkpoint 1 complete:** current-symbol and alias searches use the exported
  index, are case-insensitive, and require explicit selection for ambiguous queries.
  Outside-export candidates remain visible as unavailable choices.
- **Checkpoint 2 complete:** selected genes load cached expression shards.
  Whole-hypothalamus metrics are cell-pooled across datasets with unique mappings.
  The spatial schematic shades PVN, ZI, LHA, DMH, VMH, PVp, and ARC by regional
  positive-cell mean, relative to the current gene's maximum across those regions.
  Tooltips disclose regional counts and values. ME has no separate exported context
  and is labeled unavailable. Gray regions are unavailable; unshaded regions have
  no detected expression. Dataset charts and cards use exact exported counts;
  equal-weight means and SEM exclude unavailable values and undefined expression
  means. Dataset mappings and blank-region counts are disclosed.
- **Checkpoint 3 complete:** measured Top 5 conditional co-detection recommendations
  load on the selected gene page. Each row shows the directional percentage of
  query-positive cells also detecting the partner and the exact both/query-positive
  counts in accessible labels/tooltips. The `?` popover discloses contributing
  datasets, raw-count detection ≥ 1, cell pooling, and interpretation limits. Partners use the initial index rather
  than downloading expression shards. A recommendation fills the secondary search
  and shows the measured conditional summary. Secondary search handles aliases and
  explicit ambiguity. Pairs outside Top 5 show unavailable scores; arbitrary pair
  intersections require a separate backend. Short/empty lists remain short/empty.
  Failed requests have Retry; delayed responses cannot overwrite newer selections.
- **Checkpoint 4 complete:** initial index, gene shards, and recommendations have
  explicit loading states and busy announcements. Search input is preserved while
  loading or recovering from errors. Index/shard failures expose Retry and can
  recover without reloading the page. Missing queries show **Gene not found** with
  search guidance and no expression metrics. Zero-positive supported genes show
  **No expression detected**, exact eligible counts, 0% detection, and a **Not
  detected** mean with an explanation that the mean and conditional score are
  undefined. Dataset cards and empty mean charts use the same distinction.
  Missing/duplicate dataset mappings are reported separately and excluded from
  pooled denominators. Unshaded map labels remain readable; unavailable region
  tooltips do not imply zero expression. Late responses cannot replace a newer
  query, including its missing-gene state.
- **Checkpoint 5 complete:** final validation checks five pilot genes in 255
  dataset/context metric blocks, all 25 Top 5 quadrant reconstructions, and all 158
  production payloads. Integration tests and build pass. Browser values for all
  five genes and both aliases match; no warnings/errors were logged. The local
  production preview is open. Results are in `docs/NAVIGATION_VALIDATION.md`.

The user's instruction is to stop after each checkpoint. Export schema, metric
pooling, and missing-mapping rules are documented in `navigation_export/README.md`.
For development, run Vite from `hypomap-viz/gene-explorer-js/` and open
`/navigation-prototype.html`.

## 7. Compact co-expression comparison

Updated 2026-10-09 following the user's feedback about heavy text and convoluted
navigation. The earlier Coexpression view in `src/main.js` is the reference for a
single population selector and donut + legend + quadrant matrix.

- Use one Co-expression card for the partner form, Top 5 buttons, and selected pair.
  Top 5 buttons show only the gene and conditional percentage. Exact both/query
  counts remain in accessible labels and tooltips.
- A recommendation click opens the pair in this card without a second confirmation.
  Typed partners use Compare genes and retain alias/ambiguity handling.
- Use a short pair heading and conditional-score badge. Show formulas, denominator
  distinctions, dataset names, and interpretation limits only in dismissible `?`
  popovers; do not repeat explanatory paragraphs above and below the chart.
- Preserve measured whole-population donut, four-row legend, and clickable matrix.
  Rows represent query-positive/negative; columns represent partner-positive/negative.
  Counts and percentages remain unchanged.
- Use one Cell population selector. Its C7 options include measured population
  counts, including Unannotated C7. Remove the additional population-expansion list
  and navigation links from quadrant rows.
- The export has no measured C7 pair profiles. Selecting a C7 class shows one concise
  unavailable state with its eligible size, rather than an empty donut/legend/matrix
  repeating unavailable values. Hide the whole-population conditional badge in that
  C7 view. The selector is the single way to change or return to Whole hypothalamus.
- Clicking a whole-population quadrant expands its C7 split inline. Until C7 pair
  counts are exported, show the quadrant count and one short availability message;
  do not repeat eight unavailable rows or substitute eligible population counts.
- Loading and failure/retry states remain inside the comparison card. No new tabs
  or pages are added. Top 5 intersections plus partner shards still supply measured
  whole-population quadrants; arbitrary pairs remain unavailable.
