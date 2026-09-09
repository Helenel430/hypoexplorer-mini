# HypoMap Visualizer — Design Specification

Canonical UI/UX spec for the HypoMap gene-expression visualizer, extracted from the
`ARC Gene Explorer` HTML design prototype. This document is the source of truth for
*experience* decisions; the prototype file is the source of truth for exact visual
detail (spacing, type scale, color values) when this doc is ambiguous.

Last updated: 2026-09-09

**Do not treat this as a rewrite target for `hypomap-viz/`'s existing code.** It describes
intended behavior; implementation approach (React/Shiny/vanilla JS, state management,
data-fetching layer) is Claude Code's call inside `hypomap-viz/`.

---

## 1. Page hierarchy

```
Gene Explorer (single page, tab-based — no routing between tabs)
├── Sidebar (persistent, left)
│   ├── Gene search box + "Look up" action
│   └── Dataset list (selectable, filters everything to the right)
└── Main panel (persistent header + tab body)
    ├── Header: gene symbol + full name + nucleus/region selector
    ├── Tab bar: Overview | By dataset | By cell type | Coexpression
    └── Active tab body (one of the four views below)
```

There is exactly one screen. Switching tabs or toggling datasets never navigates away
or reloads the page — everything is a client-side state change against the same
gene + region + dataset-selection context.

## 2. Layout

- Two-column shell: fixed-width sidebar (~236px) + fluid main content.
- Sidebar has a distinct, slightly-off-white background from the main panel to read as
  a persistent control rail, not page content.
- Main panel header is a flex row: gene identity (left) vs. region/nucleus switcher
  (right), so identity and scope-of-view are visually separated.
- Tab bar sits directly under the header, full-width, standard underline-tab pattern.
- Tab bodies use generous whitespace and consistent card treatment (1px hairline
  border, ~8–10px radius, no heavy shadows) — a "publication figure" aesthetic, not a
  dashboard-dense one.

## 3. Navigation

- **One navigation surface for a given concern.** Earlier iterations had two ways to
  reach Coexpression (a sidebar link + a tab); this was corrected — **the tab bar is
  the single, authoritative way to switch views.** Do not reintroduce a second entry
  point to any tab.
- Tabs are plain click targets (not links/URLs) — no deep-linking requirement was
  specified. If deep-linking is wanted later (e.g. shareable URL per tab/gene), that's
  an open question for the user, not an assumed requirement.
- The region/nucleus selector (ARC / PVN / VMH / DMH) is a segmented control in the
  header. Only ARC is wired in the prototype; the others are visual placeholders for
  future regions.

## 4. Search behavior

- Single text field pre-filled with the current gene symbol, plus an explicit
  "Look up" button (Enter should also submit — implement as standard form behavior).
- Helper text under the field models the expected input: `Search a gene (e.g. Agrp)`.
- No autocomplete/typeahead was designed. If genes need disambiguation (aliases,
  case-insensitivity), surface that as a question before implementing — not specified.

## 5. Dataset filter (selectable dataset chips)

This is the most important interaction pattern in the spec — it replaced a passive
legend:

- Each dataset in the sidebar is a **clickable row**, not read-only. It shows:
  a colored selection swatch (filled + ✓ when included, outlined/empty when excluded),
  the dataset name, and its total cell count.
- Clicking anywhere in the row toggles that dataset's inclusion. Hover state
  (subtle background tint) signals the whole row is clickable.
- Excluded datasets drop to ~45% opacity to read as "off" without disappearing —
  users can still see what they excluded and re-include it.
- **Every dataset-scoped stat and chart on every tab must react live to this
  selection**: the Overview aggregate %, the "Detected in N / 3 datasets" chip, and
  the By-dataset detection chart all filter/recompute from the selected set. (Per-dataset
  detail cards and the cell-type table in the current prototype show fixed
  per-dataset values, not yet filtered — extending the filter to those is reasonable
  scope for implementation, but confirm with design before assuming which other
  elements should react.)
- This selection is the one piece of client state that spans tabs — it must persist
  as the user switches tabs, not reset.

## 6. Visualization organization (per tab)

### Overview tab
Goal: one glance answers "is this gene expressed here, and how much."
- **Donut (primary figure, left)**: cells expressing vs. not, titled
  "Cells expressing — all datasets", with a centered legend (+/− swatches and %)
  **above** the donut, and the donut itself showing the absolute count
  (`nExpressing of nTotal`) at its center — not a percentage. Percentage lives in the
  legend line above.
- **Two stat cards (right)**, deliberately non-redundant with the donut:
  1. **% {gene}+ across datasets** — the cross-dataset average of %Expressing over
     *selected* datasets only.
  2. **Mean expr. (when on)** — mean log-normalized expression among expressing
     cells, with a max-scale reference and progress bar.
- **One context chip** below the cards: "Detected in N / 3 datasets" (N = selected
  count) — kept because it's an unambiguous, non-redundant fact. A prior "Top type ·
  X 82.1%" chip was **removed** for being non-obvious/unclear at a glance; don't
  reintroduce that exact pattern without clearer labeling (e.g. spell out "Most
  expressing cell type").
- Design rule established through iteration: **never show the same number twice**
  across the donut and the cards. If a future stat duplicates an existing figure,
  replace or reframe it rather than adding it.

### By dataset tab
- **Mean-detection bar with error bars** at the top: one pale summary bar represents
  the arithmetic mean of `%Expressing` across the *selected* datasets. A centered
  vertical error bar shows mean ± SEM, where SEM is the sample standard deviation of
  the selected dataset percentages divided by the square root of the selected dataset
  count. With one selected dataset, SEM is displayed as 0.
- **Individual dataset points are overlaid on the bar.** Each point keeps the dataset's
  established light-to-dark red identity color. Hovering or keyboard-focusing a point
  reveals the dataset name and exact `%Expressing` value; dataset names are not printed
  permanently on the x-axis.
- The y-axis begins at 0 and uses a padded, rounded upper bound derived from the larger
  of the maximum dataset value or the upper SEM cap. Tick intervals adapt to the range
  so low detection percentages remain legible; the upper bound never exceeds 100%.
- Chart title ("{context} {gene}+ detection") is centered over the plot area (offset to
  account for the y-axis-label gutter), and the y-axis title ("% {gene}+") is
  centered vertically alongside the numeric ticks, rotated 180° reading top-to-bottom.
- **Per-dataset detail cards below**, one per dataset, each with: a small donut
  (%expressing), and a two-column mini-stat block (Cells expr. `n/total`, Mean expr.).

### By cell type tab
- **Ranked table**: cell type name, %Expressing (inline mini progress bar + number),
  #Expr, Mean expr. — sorted by prevalence (most-expressing cell type first was the
  input order used; confirm real sort should be descending %Expressing).
- **Cell type × dataset dot matrix** below the table: rows = cell types (same order),
  columns = the 3 datasets, dot **size encodes %Expressing** for that
  cell-type/dataset pair (not color — color is fixed per dataset, matching that
  dataset's swatch color from the sidebar/bar chart, so the same dataset reads as the
  same color everywhere in the UI). Legend explicitly states "dot size = %expressing"
  plus 3 reference dot sizes.

### Coexpression tab
- Built for a **gene-pair** comparison (distinct from the single-gene tabs above):
  header shows "Coexpression · {geneA} × {geneB}" plus two italic gene-name inputs
  with an "×" between them (visual placeholder for a pair-picker interaction — pair
  selection isn't wired in the prototype).
- **Donut** showing the 4-way split (both+, A-only+, B-only+, neither) — 4 arbitrary
  categorical colors (not the red-ramp from other tabs — coexpression state is
  categorical, not ordinal, hence a distinct palette).
- **Legend list to the right of the donut**: swatch + italic label + right-aligned %,
  one row per quadrant, in the same order as the donut's arc order (both+, A-only,
  B-only, neither).
- **Quadrant matrix below**: 2×2 grid (rows = geneA +/−, cols = geneB +/−), each cell
  a colored tile with its % value; **color intensity of each tile scales with its own
  value relative to the largest quadrant** (single-hue heatmap, not diverging) —
  reinforces the donut without repeating its exact visual form.
- Every % in this tab is scoped to "among ARC {gene}+ cells" (the tab is nested
  *within* the currently-selected single gene's positive population, not the whole
  dataset) — this scoping must be preserved and should probably be made more
  explicit in a real build (e.g. as a subtitle) since it's easy to misread as
  "all ARC cells."

## 7. Metadata presentation

- Gene identity: large bold symbol + italicized-in-context usage elsewhere, full gene
  name and region spelled out underneath in regular weight — symbol is always the
  visually dominant element, full name is supporting text.
- Dataset identity is consistent system-wide: same name string, same color swatch,
  wherever a dataset appears (sidebar, detection-chart points, per-dataset cards, dot matrix
  columns). Never reassign a dataset's color between views.
- Every derived/aggregate statistic that isn't self-evident gets a **"?" info
  affordance** (see §9) rather than a permanent inline caption — keeps the primary
  view clean while making methodology fully inspectable on demand.

## 8. Hover interactions

- Sidebar dataset rows: background tint on hover (signals clickability of the whole
  row, not just the swatch).
- By-dataset points: enlarge slightly and reveal a compact label containing dataset
  name and exact `%Expressing` value on hover or keyboard focus.
- Other chart-level hover/tooltip behavior remains undesigned. If exact numeric
  readout is wanted elsewhere, that is additional scope to confirm with design.

## 9. Comparison / explain-yourself workflows

Two comparison-adjacent patterns are finalized:

1. **Info popovers ("?" buttons).** Both Overview stat cards carry a small circular
   "?" in their top-right corner. Clicking opens an anchored popover (not a modal —
   no backdrop, dismissible via its own "×" or by re-clicking the "?") that shows:
   - the formula, typeset as a real fraction (numerator/denominator with a rule,
     not "a/b" text) — e.g. `%Expressing = #Expressing⁄#Cells × 100`,
   - plain-language definitions of each term,
   - for the cross-dataset % card specifically, an explicit note that the headline
     number is an *average of %Expressing across the selected datasets* (this
     sentence was added specifically so the aggregate math is never ambiguous).
   Only one popover is open at a time (opening one closes the other). This pattern
   should be reused for any future non-obvious statistic rather than inventing a new
   explain-it affordance.
2. **Cell type × dataset comparison** and **gene-pair coexpression quadrant** (§6)
   are the two built-in "compare across N things" workflows — one compares a cell
   type across datasets, the other compares two genes' joint expression state. Both
   use a matrix/grid rather than overlaid charts, which was the deliberate choice
   over e.g. small multiples or a stacked bar.

There is no cross-gene comparison (comparing Pomc vs. another single gene side by
side) designed yet — only the two patterns above. If that's wanted, it needs its own
design pass.

## 10. Accessibility considerations

Not yet addressed in the prototype and flagged here as **open work for design**,
not something Code should invent unilaterally:
- Color is a primary channel for dataset identity and coexpression quadrants with no
  redundant text/pattern encoding beyond the legend — needs a contrast/colorblind-
  safety pass (the red ramp in particular has to remain distinguishable at all 3
  steps for red-green color deficiency).
- The "?" info buttons and dataset toggle rows are `<span onClick>`/`<div onClick>`
  in the prototype (mouse-only affordances) — a real build must make these real
  buttons/checkboxes with keyboard focus, `aria-pressed`/`aria-expanded`, and visible
  focus rings.
- No screen-reader-only text describing what a donut/bar/dot encodes — charts are
  purely visual right now.

## 11. Responsiveness

Not designed — the prototype is a fixed ~1040px card sized for desktop review. Before
implementation, confirm with the user what breakpoints/devices the real visualizer
must support (this repo's `gene-explorer-js` vs. `shinyApp` targets may have very
different constraints here).

## 12. Empty / loading / error states

Not designed in the prototype (which only ever shows one fully-populated placeholder
dataset). None of the following exist yet and must be designed, not assumed, before
implementation:
- No gene found for a search term.
- A dataset with zero expressing cells for the searched gene (donut/bars at 0%).
- All datasets deselected (every downstream stat/chart currently has no defined
  "all excluded" treatment — decide whether to show 0%, a placeholder message, or
  disable the tabs).
- Data still loading (initial page load, or after a new gene search) — no skeleton/
  spinner treatment specified.
- Backend/network error on lookup.

## 13. Rationale log (why, not just what)

- **Donut leads with the count, not the percentage**, because the percentage is
  already the headline of the adjacent stat card — putting the same number in both
  places was identified as redundant and removed.
- **Dataset legend became a real filter control** because a read-only color key
  provided no interaction value once the app already had per-dataset data to filter
  by — reusing it as a toggle turns passive information into active exploration
  at no added visual cost.
- **The By-dataset scale follows the observed range**, rather than always extending to
  100%, so differences among low detection percentages remain readable. Dataset labels
  move into point tooltips to keep the summary plot compact and uncluttered.
- **"Top type" chip removed**, not merely reworded, because usability review (the
  user, directly) found the phrase not self-explanatory even with a real value next
  to it — the lesson for future stats is: a metric needs either an obvious label or
  a "?" explainer before shipping, not after.
- **Single-hue heatmap (not diverging) for the coexpression quadrant matrix** because
  quadrant values are all "share of {gene}+ cells," a single ordered scale, not a
  positive/negative divergence.

---

## Appendix: source of truth for exact values

For pixel-level detail this document doesn't cover explicitly (exact spacing, font
sizes, hex colors, border-radii), treat `ARC Gene Explorer.dc.html` (design project,
turn `t1`, option `1a`) as authoritative. This spec describes *behavior and rationale*;
the HTML file describes *exact appearance*. Where they conflict, ask design before
picking one.
