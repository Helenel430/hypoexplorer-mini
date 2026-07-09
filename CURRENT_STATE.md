# Current State

Live working status. Update as work proceeds. *(Not intended for Claude Project knowledge —
it changes often; the stable docs are PROJECT_OVERVIEW / DATASET_SUMMARIES / DESIGN_SPEC.)*

_Last updated: 2026-07-09_

This file merges the two working tracks. **Claude Design** owns UX/spec sections; **Claude
Code** owns data, importer, and app-implementation sections. Keep edits within your track's
sections.

---

# Claude Design

## Current Goal
<!-- Owned by Claude Design -->
Translate the approved ARC Gene Explorer UX prototype into a canonical design spec
(`DESIGN_SPEC.md`) for the real HypoMap visualizer in `hypomap-viz/`. The prototype itself is a
design artifact, not the implementation target — it lives outside this repo's codebase
intentionally, so design can keep iterating without being constrained by `hypomap-viz/`'s
current code.

## Design Status
<!-- Owned by Claude Design -->
Approved prototype: `ARC Gene Explorer.dc.html`, turn `t1` / option `1a` (the "Publication
clean" variant — the only variant meant for implementation; turn `t2`'s 2a/2b/2c are superseded
exploration, kept for rationale only). `DESIGN_SPEC.md` (repo root) is now the canonical
write-up of page hierarchy, layout, navigation, filters, per-tab visualization organization,
metadata presentation, hover/comparison workflows, and rationale — extracted from that
prototype. Explicitly flagged as NOT yet designed: accessibility, responsiveness, and
empty/loading/error states (see spec §10–12) — do not implement placeholder behavior for these
without a follow-up design pass.

## Notes for Claude Code
<!-- Owned by Claude Design -->
- **Read `DESIGN_SPEC.md` first, then `ARC Gene Explorer.dc.html`** (the design project's copy —
  ask design for a current export if you need the live file; it is not part of this repo's
  tree). Spec = behavior + rationale. HTML file = exact pixel/color/type truth where the spec
  doesn't spell it out.
- **Implementation target:** the visualizer under `hypomap-viz/` (`gene-explorer/`,
  `gene-explorer-js/`, and/or `shinyApp/` — whichever stack you're building out). The
  prototype's markup/JS is not production code and should not be copy-pasted in; re-implement
  the behavior in that stack idiomatically.
- **Do not change without design sign-off:** tab structure (Overview/By dataset/By cell
  type/Coexpression) and the fact there is exactly one navigation surface per tab;
  donut-leads-with-count layout on Overview; dataset rows as the single live filter (color +
  selection state shared across every tab); the "?" info-popover pattern and its exact formula
  copy; the by-dataset bar chart's axis scale (0–100, 25-increments), color ramp, and
  label-rotation/anchor behavior.
- **Open for implementation flexibility:** real data wiring (prototype uses hardcoded
  placeholder arrays), state-management/routing approach, whether tab state becomes
  URL-addressable, exact colors if a brand palette supersedes the prototype's red, and
  extending the live dataset-filter to the per-dataset detail cards / cell-type table
  (currently only the Overview aggregate, chip, and bar chart react to selection in the
  prototype — confirm scope before assuming those other views should filter too).
- **Priority order suggested:** (1) Overview tab incl. dataset filter + info popovers, (2) By
  dataset tab incl. Prism chart, (3) By cell type tab, (4) Coexpression tab (depends on a
  gene-pair picker that isn't designed yet — flag that as a blocker/question rather than
  guessing).
- Before building empty/loading/error states or accessibility/responsive behavior, come back to
  design — these are explicitly open, not implicitly "use your judgment."

---

# Claude Code

## Implementation Status
<!-- Owned by Claude Code -->

**Metadata curation — done.**
- ✅ Per-study display card `HypoMap_study_display_card.csv`, validated against the paper's
  Supplementary Table 1 (cell counts sum to 384,925).
- ✅ Per-sample CSVs (`<ACC>_sample_metadata.csv`) with harmonized `HM_*` columns, in `archive/`.
- ✅ Accession → HypoMap-label mapping (`archive/HypoMap_rawdata_classification.csv`).
- ✅ Embryonic classification resolved: no embryonic cells in HypoMap; Dev datasets are P45 /
  P23 only.
- ✅ Kim10x identified as the 18th dataset (Mendeley, not GEO).

**Importer — done (core), 3 / 18 datasets imported.**
- ✅ Importer package built and verified (2026-07-06) on the 3 representative formats:
  **GSE207736** (multi-sample 10x MTX), **GSE172461** (merged 10x + per-cell metadata),
  **GSE93374** (dense Drop-seq DGE + per-cell metadata). Output in `processed/`.
- ✅ Genome build checked — all three are mm10, differing annotation releases (see
  [DATASET_SUMMARIES.md](DATASET_SUMMARIES.md)).
- ⏳ Remaining 15 datasets not yet run through the importer — each new on-disk layout may need a
  loader tweak plus a `DatasetConfig` in `importer/registry.py`.

**hypomap-viz app — in progress.** Interactive explorer for the **Romanov_10x** dataset (GEO
GSE132730, Romanov et al. 2020; mouse 10x, E15.5–P23). Its own git repo at `hypomap-viz/`
(GitHub `Helenel430/hypomap-viz`). Three stacks currently coexist:

- **`shinyApp/`** — full ShinyCell app generated from the Seurat `.rds` via `prepare_app.R`
  (`server.R` / `ui.R`). Runs locally in R; the ~1.75 GB `.rds` and generated files are
  gitignored and regenerated per-user.
- **`gene-explorer/`** — lightweight R/Shiny gene-lookup app (`app.R` + precomputed
  `gene_stats.rds` from `compute_gene_stats.R`). Type a gene → % of cells expressing (global
  and per cell type), mean log-normalized expression, bar charts.
- **`gene-explorer-js/`** — ⭐ new JS/Vite port of `gene-explorer` for static deployment on
  **Vercel** (no R server). Plain HTML/CSS/JS, no framework; reads a precomputed
  `public/data/gene_stats.json` (~3.3 MB, exported via `scripts/export_gene_stats.R`).
  `js-refactor` branch merged into `main`. **Ported:** gene search/suggestions, global summary
  stats, by-cell-type table + bar charts. **Not yet ported:** "About the dataset" details panel
  and citation links.

Note: `gene-explorer-js` currently reflects the older lightweight lookup UI, **not** the newer
`DESIGN_SPEC.md` four-tab design (Overview / By dataset / By cell type / Coexpression). Building
out the spec'd design against real data is the main open app task — see Design's priority order
above.

## Files Modified
<!-- Owned by Claude Code -->
Deliverables authored / maintained by the Code track (source-controlled; regenerated outputs
excluded):

- **Importer package** — `importer/` (`cli.py`, `registry.py`, `study_card.py`, `writer.py`,
  `validate.py`, `schema.py`, `loaders/`) + `importer/README.md`.
- **Authoritative metadata** — `HypoMap_study_display_card.csv` (repo root).
- **Per-sample metadata & provenance** — `archive/` (`*_sample_metadata.csv/.txt`,
  `HypoMap_rawdata_classification.csv`, `HypoMap_cellcount_vs_original.csv`, SOFT dumps).
- **Generated importer output** — `processed/GSE207736|GSE172461|GSE93374/` (gitignored,
  regenerable).
- **Visualizer** — `hypomap-viz/` (separate git repo): `shinyApp/`, `gene-explorer/`,
  `gene-explorer-js/`, `prepare_app.R`, `compute_gene_stats.R`.
- **Data/status docs** — `DATASET_SUMMARIES.md` and the Code-owned half of this file.

## Known Bugs
<!-- Owned by Claude Code -->
No open correctness bugs. Behavioral watch-outs and constraints to respect:

- The raw GEO downloads (~820 MB) and `processed/` (~600 MB) are **gitignored** — regenerable,
  do not commit. Keep raw inputs locally to re-run the importer.
- `HypoMap_study_display_card.csv` must stay at the repo root (importer default `--card` path).
- In `hypomap-viz/`, the Seurat `.rds` (~1.75 GB) and generated app/expression files exceed
  GitHub's 100 MB cap and are gitignored — each user regenerates them locally.
- **GSE207736 `condition`** currently carries the study-level "fed vs fasted" for all 6 samples;
  the true per-sample split lives in `archive/`, not the source files. Supply a `--sample-sheet`
  CSV (`sample_id,condition`) to split it. Not a bug — a documented data-source limitation.
- **GSE172461** annotates only 36,523 of 41,156 cells (published subset) — expected; the
  importer warns, does not fail (use `--strict` to make it fail).

## Next Development Task
<!-- Owned by Claude Code -->
Primary next tasks (pick per Design's priority order above):

1. **Build the spec'd four-tab explorer** (`DESIGN_SPEC.md`) — start with the Overview tab; flag
   the Coexpression gene-pair picker as an unresolved design dependency (blocker/question, not a
   guess).
2. **Finish the JS port** — port the dataset details panel + citation links; wire real data in
   place of placeholder arrays.
3. **Batch-run the importer** across the remaining 15 datasets.
4. **UI export** — convert the display card (and optionally per-sample CSVs) to whatever the
   exploration tool consumes (likely JSON). Do this last, after the data is locked.

Optional / on-request only:
- Per-sample condition sheet for GSE207736 (fed/fasted split via `--sample-sheet`).
- Normalized / log matrices — the importer currently emits `raw_counts` only.
- Single combined all-samples table with harmonized columns (user declined once — revisit only
  if asked).
- Map region values to a controlled vocabulary / ontology for faceted UI search.
- Cross-dataset gene-symbol harmonization / alias reconciliation (needed because only GSE207736
  carries Ensembl IDs).
