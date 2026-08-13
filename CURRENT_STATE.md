# Current State

Live working status. Update as work proceeds. *(Not intended for Claude Project knowledge —
it changes often; the stable docs are PROJECT_OVERVIEW / DATASET_SUMMARIES / DESIGN_SPEC.)*

_Last updated: 2026-08-10_

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
- ✅ **First production import — GSE207736 (2026-07-09, branch `importer-first-dataset`).**
  Re-ran `python -m importer GSE207736` end-to-end (~93 s). Output: 6 files in
  `processed/GSE207736/`; matrix **39,953 cells × 55,399 genes**, CSR `int64`, nnz
  120,130,850, `raw_counts`. All four validation checks pass; one expected WARN (109 duplicate
  gene symbols resolved R-style). Standalone reload cross-check confirmed matrix dims ==
  `cells.csv`/`genes.csv` row counts == `expression_metadata.json`, unique cell/gene ids, all 6
  samples covered, counts ≥ 0, and column schemas match the README exactly.
- 🔧 Hardened `loaders/tenx_mtx.py` `_discover_matrices` to skip macOS `._*` AppleDouble sidecar
  files (they share the real file's name and matched the `*matrix.mtx.gz` glob, then failed as
  non-gzip). These accumulate on this macOS/SanDisk tree, so the fix benefits every 10x dataset.
- ✅ Genome build checked — all three are mm10, differing annotation releases (see
  [DATASET_SUMMARIES.md](DATASET_SUMMARIES.md)).
- ⏳ Remaining 15 datasets not yet run through the importer — each new on-disk layout may need a
  loader tweak plus a `DatasetConfig` in `importer/registry.py`.
- ✅ **External annotation strategy validated & documented (2026-07-13).** For raw-only deposits
  (GEO ships counts but no per-cell annotation, e.g. GSE207736/Dowsett10xnuc), fine labels are
  sourced from the integrated HypoMap atlas and mapped via an optional sidecar + enrichment
  function — never regenerated by the importer. Join validated against the atlas (CZ CELLxGENE)
  metadata: 35,945 / 39,953 imported cells matched (4,008 unmatched = HypoMap QC-dropped, warns
  not fails), sample crosswalk AA3→adlib3 / AB3→adlib4 / AC3→fasted1 / AD3→fasted2 / AG8→adlib1 /
  AH8→adlib2 confirmed by barcode-set overlap; key = (sample, barcode). Design captured in
  [EXTERNAL_ANNOTATION_STRATEGY.md](EXTERNAL_ANNOTATION_STRATEGY.md).
- ✅ **GSE207736 (Dowsett10xnuc) enrichment implemented & validated (2026-07-13, branch
  `importer-first-dataset`).** Optional HypoMap-atlas annotation layer now live end-to-end:
  - `tools/build_gse207736_sidecar.py` builds a reproducible sidecar
    (`GSE207736_RAW/GSE207736_hypomap_sidecar.csv.gz` + `.provenance.json`) from the atlas **obs
    table only** (`dowsett_obs.csv`, the `Dataset==Dowsett10xnuc` obs slice of `hypomap.h5ad`,
    CZ CELLxGENE `d86517f0-fa7e-4266-b82e-a521350d6d36`) — expression values never read. Applies
    the validated token→sample crosswalk to key each row to the importer `cell_id`.
  - `_enrich_gse207736` in `registry.py` (wired into the GSE207736 entry) joins the sidecar on
    `cell_id` and adds nine `hypomap_*` columns
    (`hypomap_included`, `hypomap_region`, `hypomap_author_cell_type`, `hypomap_C7/C25/C66/C185/C286/C465`).
    Strictly additive: native columns are untouched, `has_cell_metadata` stays `False` (so
    `region` keeps the study-level `Hypothalamus`), and it returns early (base import unchanged)
    when the sidecar is absent. `writer.py`/`schema.py` now emit canonical `hypomap_*` columns
    consistently so missing external annotations are explicit.
  - Re-ran `python -m importer GSE207736` (~95 s). Join: **35,945/39,953 cells annotated, 4,008
    unmatched retained as `hypomap_included=False`, 0 unmatched atlas cells, 0 duplicate composite
    keys.** Matrix unchanged (39,953 × 55,399, CSR int64, nnz 120,130,850, `raw_counts`); cells.csv
    row count and row ordering unchanged; native annotation columns preserved. `hypomap_region` is
    empty for 9,409 matched cells (26.2%, atlas `NA` — expected). Optional/no-sidecar and
    with-sidecar contracts unit-checked.
- ✅ **HypoMap spatial sidecars expanded to GSE172461 and GSE93374 (2026-07-17).** Added
  `tools/build_hypomap_sidecar.py`, a general atlas-obs sidecar builder that reads only
  `/Volumes/SanDisk/hypomap_download/hypomap.h5ad` `obs` metadata and maps
  `Region_summarized`, author cell type, and C7→C465 cluster hierarchy onto importer
  `cell_id`s. Re-ran imports:
  - **GSE172461 / Rupp10x:** 33,306 / 41,156 imported cells annotated from 33,502 atlas cells;
    7,850 imported cells retained as `hypomap_included=False`. Join uses the atlas
    SRR token → Cell Ranger aggregate barcode suffix crosswalk.
  - **GSE93374 / CampbellDropseq:** 14,286 / 21,086 imported cells annotated from 20,889 atlas
    cells; 6,800 imported cells retained as `hypomap_included=False`. Exact barcode joins only;
    no wildcard matching for Drop-seq barcodes containing `N`.
  - Spatial raw-count metrics for `Pomc` / `Agrp` now compute by `hypomap_region` for all three
    datasets where region is populated. Mean expression / distributions remain blocked pending a
    log-normalized layer.
- ✅ **Phase 2 shared schema locked (2026-07-17).** Added
  `docs/SHARED_SCHEMA.md` as the canonical processed-data contract for `dataset.json`,
  `samples.csv`, `cells.csv`, `genes.csv`, `expression_metadata.json`, and
  `expression_matrix.npz`. `cells.csv` now has a stable schema containing identity/sample
  context, native annotations, and external `hypomap_*` annotation columns for every dataset;
  missing annotations are represented as blank values or `hypomap_included=False`, not by
  dropping cells or columns. Strengthened `validate.py` to check recognized value types,
  nonempty/unique cell/sample/gene identifiers, cell→sample references, nonnegative matrix values,
  and integer-like raw counts. Re-ran `python -m importer GSE207736`, `GSE172461`, and `GSE93374`;
  all pass the strengthened validation (Rupp retains expected warnings for partial native metadata).
- ✅ **GSE172461 sample identity repaired with provenance (2026-07-20).** Validated the Cell
  Ranger aggregate barcode suffix map against `GSE172461_metadata.csv.gz`,
  `GSE172461_barcodes.tsv.gz`, and `archive/GSE172461_sample_metadata.csv`; documented the full
  evidence trail in `docs/GSE172461_SAMPLE_ID_REPAIR.md`. The importer now fills only
  `sample_id` and inherited `condition` for the 4,633 matrix cells that lacked source metadata,
  after checking that suffix→Sample and Sample→Treatment maps are one-to-one. Native
  `major_cell_type`, `cell_type`, and `cluster_id` remain blank for those cells. Re-ran
  `python3 -m importer GSE172461`; blank `sample_id` is now 0, while the expected warning remains:
  4,633 matrix cells have no metadata row.
- ✅ **Phase 3 metric math specified, not wired (2026-07-17).** `docs/METRIC_SPEC.md` now defines
  the ordered metric filter pipeline, expression-layer requirements, total eligible cells,
  positive cells, `%Expressing`, dataset detection, Mode A dataset-average summaries, Mode B
  cell-pooled summaries, cross-dataset mean-expression formulas, selected-dataset filtering, and
  selected-nucleus denominators using `hypomap_region`. By cell type grouping is now specified as
  `hypomap_C25` by default; native `cell_type`, `hypomap_author_cell_type`, and other `hypomap_C*`
  levels remain separate annotation/provenance fields unless a future spec changes the grouping
  axis.
- ✅ **Log-normalization method selected (2026-07-20).** Mean expression and expression
  distributions will use Seurat `LogNormalize` semantics from raw counts:
  `ln(1 + raw_count / cell_library_size * 10000)`. Positivity, `%Expressing`, and dataset
  detection still use raw counts only. The derived log-normalized matrices still need to be
  generated and validated before mean-expression/distribution app wiring. Metadata must record
  enough provenance to independently regenerate the layer (`value_type=log_normalized`,
  source raw matrix, Seurat LogNormalize, scale factor 10000, `log1p`, natural log, source
  checksum, and verification tolerances/status). Keep this as a separate derived layer from the
  importer so normalization remains reproducible and auditable.
- ✅ **Seurat LogNormalize derived layer generated and verified (2026-07-20).** Added
  `tools/build_lognormalized_layer.py` and generated separate derived files beside the raw-count
  importer outputs:
  - `processed/GSE207736/expression_matrix_lognormalized.npz`: 39,953 x 55,399, nnz 120,130,850,
    `float32`; independent regeneration verification passed, max abs/rel diff 0.0.
  - `processed/GSE172461/expression_matrix_lognormalized.npz`: 41,156 x 31,053, nnz 120,966,482,
    `float32`; independent regeneration verification passed, max abs/rel diff 0.0.
  - `processed/GSE93374/expression_matrix_lognormalized.npz`: 21,086 x 26,774, nnz 40,695,355,
    `float32`; independent regeneration verification passed, max abs/rel diff 0.0.
  Each dataset also has `expression_metadata_lognormalized.json` recording source raw matrix,
  source checksum, Seurat LogNormalize parameters, library-size range, tolerances, and
  `verification_status=passed`.
- ✅ **Cross-dataset gene alias harmonization implemented (2026-07-20).** Added MGI-backed
  harmonization as a separate post-import artifact, preserving each dataset's `genes.csv`
  unchanged:
  - source reports: `gene_harmonization/mgi_source/MRK_List1.rpt.gz` and
    `gene_harmonization/mgi_source/MGI_Gene_Model_Coord.rpt`
  - generated table: `gene_harmonization/gene_harmonization.csv` with 93,809 dataset mappings
    across 39,583 canonical MGI genes
  - provenance: `gene_harmonization/gene_harmonization.provenance.json`
  - tools: `tools/build_gene_harmonization.py`, `tools/resolve_gene_query.py`, and shared
    `tools/gene_harmonization_lib.py`
  Validation examples passed: `Pomc` and `Agrp` resolve exactly across all three datasets;
  `Ccn1` resolves to Dowsett `Ccn1` plus Rupp/Campbell `Cyr61`; `Cyr61` resolves as an alias of
  canonical `Ccn1`; ambiguous alias `linc1405` returns `disambiguation_required`; a nonsense
  query returns `gene_not_found`. Unresolved genes are never treated as zero expression.
- ✅ **Annotation coverage reporting implemented (2026-07-20).** Added
  `tools/build_annotation_coverage_report.py` and generated `annotation_coverage_report.json` so
  missing annotations are explicit:
  - Blank `hypomap_region`: GSE207736 13,417; GSE172461 21,602; GSE93374 12,938. These cells are
    retained in whole-dataset denominators, excluded from named selected-nucleus denominators, and
    reported as unannotated/out of scope.
  - Blank `hypomap_C25`: GSE207736 4,008; GSE172461 7,850; GSE93374 6,800. These cells are
    retained in parent denominators and excluded only from named By cell type rows.
  - Blank `sample_id`: 0 for all three target datasets after the GSE172461 suffix-based repair.
    The 4,633 repaired GSE172461 cells remain explicitly documented as source-missing for native
    cell type/cluster annotations.
- ✅ **FVP metric vertical-slice export generated (2026-07-20).** Added
  `tools/export_fvp_metrics.py` and generated
  `fvp_export/gene_metrics_vertical_slice.json` for `Pomc`, `Agrp`, and `Ccn1` / `Cyr61`.
  The export includes resolver state, dataset-native gene mappings, whole-dataset metrics,
  cross-dataset Mode A / Mode B summaries, dataset detection, mean expression from verified
  Seurat LogNormalize matrices, positive-cell expression histograms, `hypomap_region` groups,
  `hypomap_C25` groups, explicit current unannotated buckets (`No HypoMap region`,
  `Unannotated C25`), and the standard fallback label for future blank sample IDs
  (`Missing sample identity`). Summary whole-dataset pooled / dataset-average
  `%Expressing`: `Pomc` 16.442 / 17.024; `Agrp` 28.838 / 26.943; `Ccn1` 4.472 / 6.781.
  `Ccn1` resolves to Dowsett `Ccn1` and Rupp/Campbell `Cyr61`.
- ✅ **FVP vertical slice wired in `gene-explorer-js` (2026-07-20).** Replaced the older
  Romanov-only lookup surface and temporary four-tab shell with the frozen
  `ARC_Gene_Explorer.html` handoff, backed by
  `public/data/gene_metrics_vertical_slice.json`. Implemented gene lookup for `Pomc`, `Agrp`,
  and `Ccn1`/`Cyr61`, defaulting to Dowsett10xnuc / `GSE207736` only. Additional target datasets
  (`GSE172461`, `GSE93374`) remain selectable for multi-dataset analysis, and dataset-average vs
  cell-pooled aggregation controls are revealed only when more than one dataset is selected.
  Whole/ARC/PVN/VMH/DMH context switching and the five-view shell were implemented from the
  handoff. Extended `tools/export_fvp_metrics.py` to
  include `hypomap_C25` groups within each `hypomap_region`, so the Cell Identity tab uses
  region-scoped values when ARC/PVN/VMH/DMH is selected. Context/coexpression is intentionally a
  metric-definition-needed state; no quadrant values are computed or substituted until the
  canonical coexpression denominator/formulas are specified.
- ✅ **Dynamic gene autocomplete added to `gene-explorer-js` (2026-08-10).** The header search
  now filters the genes present in the loaded metric export as the user types, exposes canonical
  names and dataset aliases in a dropdown, supports mouse and arrow-key/Enter selection, and
  retains alias resolution (for example, `Cyr61` selects canonical `Ccn1`).
- ✅ **Aggregate and By dataset views added to `gene-explorer-js` (2026-08-10).** Replaced the
  Expression and Reproducibility tabs at the user's direction. Aggregate now presents the
  count-led expressing-cell donut, across-dataset average, positive-cell mean with scale, formula
  popovers, and detection chip. By dataset now presents the specified 0–100% bar chart with
  25-point gridlines, dataset color ramp, 52° labels, live dataset toggles, and per-dataset
  expression detail cards. All values react to the active gene, context, annotation source, and
  selected datasets.
- ✅ **Aggregate calculation switch added (2026-08-12).** The Aggregate page now exposes
  dataset-average (each dataset weighted equally) versus cell-pooled (each cell weighted equally)
  calculation modes. Both the percentage and positive-cell mean update with the selected mode;
  the donut remains an explicitly labeled pooled absolute cell count.
- ✅ **Fam237b vertical slice added (2026-08-13).** Expanded the static metric export and
  `gene-explorer-js` lookup from three to four canonical genes. `Fam237b` resolves through
  MGI:3646213 to the native `Gm8773` feature in GSE207736, GSE172461, and GSE93374; both symbols
  are searchable and lead to the same record. Whole-dataset detection is 3/3 datasets (1,224 /
  102,195 pooled expressing cells, 1.198%).

**hypomap-viz app — in progress.** Interactive explorer for the **Romanov_10x** dataset (GEO
GSE132730, Romanov et al. 2020; mouse 10x, E15.5–P23). Its own git repo at `hypomap-viz/`
(GitHub `Helenel430/hypomap-viz`). Three stacks currently coexist:

- **`shinyApp/`** — full ShinyCell app generated from the Seurat `.rds` via `prepare_app.R`
  (`server.R` / `ui.R`). Runs locally in R; the ~1.75 GB `.rds` and generated files are
  gitignored and regenerated per-user.
- **`gene-explorer/`** — lightweight R/Shiny gene-lookup app (`app.R` + precomputed
  `gene_stats.rds` from `compute_gene_stats.R`). Type a gene → % of cells expressing (global
  and per cell type), mean log-normalized expression, bar charts.
- **`gene-explorer-js/`** — JS/Vite static Gene Explorer for the current FVP vertical slice.
  Plain HTML/CSS/JS, no framework; reads
  `public/data/gene_metrics_vertical_slice.json`. Current scope: `Pomc`, `Agrp`,
  `Ccn1`/`Cyr61`, and `Fam237b`/`Gm8773`, defaulting to Dowsett10xnuc while allowing the three
  target datasets to be selected. The five-tab app is wired to real metric exports where
  supported: Overview, Aggregate, By dataset, and `hypomap_C25` Cell Identity values.
  Context/coexpression and non-C25 cell-identity hierarchy levels remain blocked on metric/export
  definitions rather than filled with modeled values.

## Files Modified
<!-- Owned by Claude Code -->
Deliverables authored / maintained by the Code track (source-controlled; regenerated outputs
excluded):

- **Importer package** — `importer/` (`cli.py`, `registry.py`, `study_card.py`, `writer.py`,
  `validate.py`, `schema.py`, `loaders/`) + `importer/README.md`. (Branch
  `importer-first-dataset`: `loaders/tenx_mtx.py` skips `._*` AppleDouble files during matrix
  discovery; `registry.py` adds HypoMap sidecar enrichment; `schema.py` defines the locked shared
  schema; `writer.py` emits canonical native + external annotation columns.)
- **Sidecar builder (tracked source tool)** — `tools/build_gse207736_sidecar.py`. Repo-level
  tooling, kept outside the importer package to preserve its convert-and-validate scope.
  Deterministically regenerates the GSE207736 HypoMap sidecar + provenance from the atlas obs
  export. This is the source-controlled deliverable.
- **General HypoMap sidecar builder (tracked source tool)** — `tools/build_hypomap_sidecar.py`.
  Builds optional `*_hypomap_sidecar.csv.gz` files for GSE207736, GSE172461, and GSE93374 directly
  from the local HypoMap `h5ad` obs table; records per-dataset join coverage in provenance JSON.
- **Seurat LogNormalize derived-layer builder (tracked source tool)** —
  `tools/build_lognormalized_layer.py`. Generates `expression_matrix_lognormalized.npz` and
  `expression_metadata_lognormalized.json` from raw-count processed outputs, then independently
  regenerates and compares the matrix before marking verification passed.
- **MGI gene harmonization tools (tracked source tools)** —
  `tools/build_gene_harmonization.py`, `tools/resolve_gene_query.py`, and
  `tools/gene_harmonization_lib.py`. Generate and query `gene_harmonization/gene_harmonization.csv`
  from MGI marker/coordinate reports without rewriting dataset-native `genes.csv`.
- **Annotation coverage report tool (tracked source tool)** —
  `tools/build_annotation_coverage_report.py`. Generates `annotation_coverage_report.json` with
  retained blank `hypomap_region`, blank `hypomap_C25`, and blank `sample_id` counts and handling
  rules for metric/UI code.
- **FVP static metric export tool (tracked source tool)** — `tools/export_fvp_metrics.py`.
  Generates `fvp_export/gene_metrics_vertical_slice.json` for the lightweight
  `Pomc`/`Agrp`/`Ccn1`/`Fam237b` vertical slice using raw counts, verified LogNormalize matrices, MGI
  resolver mappings, annotation coverage buckets, and region-scoped `hypomap_C25` groups.
- **FVP static app data (generated, tracked if app deployment needs it)** —
  `hypomap-viz/gene-explorer-js/public/data/gene_metrics_vertical_slice.json`, copied from
  `fvp_export/gene_metrics_vertical_slice.json` after regeneration.
- **FVP static app UI** — `hypomap-viz/gene-explorer-js/src/main.js` and `src/style.css`, including
  dynamic gene autocomplete sourced from the loaded metric export, canonical/alias labels, and
  keyboard selection behavior.
- **ARC Gene Explorer handoff (Design source copied into app workspace)** —
  `hypomap-viz/gene-explorer-js/handoff/ARC_Gene_Explorer.html` and
  `hypomap-viz/gene-explorer-js/handoff/RECREATE.md`, extracted from
  `/Volumes/SanDisk/# ARC Gene Explorer redesign.zip` and used as the frozen visual baseline for
  the static JS implementation.
- **GSE207736 enrichment sidecar (local gitignored artifacts)** — `GSE207736_RAW/`
  `GSE207736_hypomap_sidecar.csv.gz` (the sidecar) and `GSE207736_hypomap_sidecar.provenance.json`
  (its provenance record). **Not** source-controlled — generated by the builder above and
  gitignored alongside the raw deposit; regenerate locally, do not commit.
- **Authoritative metadata** — `HypoMap_study_display_card.csv` (repo root).
- **Per-sample metadata & provenance** — `archive/` (`*_sample_metadata.csv/.txt`,
  `HypoMap_rawdata_classification.csv`, `HypoMap_cellcount_vs_original.csv`, SOFT dumps).
- **Generated importer output** — `processed/GSE207736|GSE172461|GSE93374/` (gitignored,
  regenerable).
- **Visualizer** — `hypomap-viz/` (separate git repo): `shinyApp/`, `gene-explorer/`,
  `gene-explorer-js/`, `prepare_app.R`, `compute_gene_stats.R`.
- **Data/status docs** — `DATASET_SUMMARIES.md`, `EXTERNAL_ANNOTATION_STRATEGY.md`, and the
  Code-owned half of this file.

## Known Bugs
<!-- Owned by Claude Code -->
No open correctness bugs. Behavioral watch-outs and constraints to respect:

- The raw GEO downloads (~820 MB) and `processed/` (~600 MB) are **gitignored** — regenerable,
  do not commit. Keep raw inputs locally to re-run the importer.
- macOS `._*` AppleDouble sidecar files in `GSE207736_RAW/` previously broke 10x matrix
  discovery (globbed as `*matrix.mtx.gz`, then failed as non-gzip). Fixed 2026-07-09 on branch
  `importer-first-dataset` by filtering `._*` in `TenXMtxLoader._discover_matrices`.
- `HypoMap_study_display_card.csv` must stay at the repo root (importer default `--card` path).
- In `hypomap-viz/`, the Seurat `.rds` (~1.75 GB) and generated app/expression files exceed
  GitHub's 100 MB cap and are gitignored — each user regenerates them locally.
- **GSE207736 `condition`** currently carries the study-level "fed vs fasted" for all 6 samples;
  the true per-sample split lives in `archive/`, not the source files. Supply a `--sample-sheet`
  CSV (`sample_id,condition`) to split it. Not a bug — a documented data-source limitation.
- **GSE172461** annotates only 36,523 of 41,156 cells (published subset) — expected; the
  importer warns, does not fail (use `--strict` to make it fail).
- **GSE207736 enrichment — remaining technical debt / watch-outs:**
  - The sidecar builder reads the atlas obs export `/Volumes/SanDisk/hypomap_download/dowsett_obs.csv`
    (derived from the local ~3.8 GB `hypomap.h5ad`). That obs export is **not in the repo** and not
    gitignore-tracked here; regenerating the sidecar on another machine requires re-exporting the
    `Dataset==Dowsett10xnuc` obs slice first. Consider committing a small checked-in copy of the
    obs slice (or documenting its export step) if reproducibility off this machine is needed.
  - `_enrich_gse207736` currently reports its join stats via a `print` + `result.extra`; the
    built-in `validate()` does not emit a hypomap-specific WARN (it only warns on the
    `has_cell_metadata` path, which is deliberately left `False` here). Fine for one dataset;
    revisit if enrichment coverage should become a first-class validation check.
  - The enrichment is GSE207736-specific by design. Generalizing to other raw-only datasets
    means adding a per-dataset builder + `_enrich_*` following this same pattern (see
    EXTERNAL_ANNOTATION_STRATEGY.md §Future Datasets).

## Next Development Task
<!-- Owned by Claude Code -->
Primary next tasks (pick per Design's priority order above):

1. Define canonical coexpression formulas/denominators before exporting or wiring quadrant values.
2. Decide whether PVN/VMH/DMH should remain compact header options only or expose the full
   available `hypomap_region` list in a future design pass.
3. Batch-run the importer across the remaining 15 datasets.
4. **UI export** — convert the display card (and optionally per-sample CSVs) to whatever the
   exploration tool consumes (likely JSON). Do this last, after the data is locked.

Optional / on-request only:
- Per-sample condition sheet for GSE207736 (fed/fasted split via `--sample-sheet`).
- Generated Seurat LogNormalize matrices — generated and verified for GSE207736, GSE172461, and
  GSE93374; rerun via `tools/build_lognormalized_layer.py` after any raw-count importer rerun.
- Single combined all-samples table with harmonized columns (user declined once — revisit only
  if asked).
- Map region values to a controlled vocabulary / ontology for faceted UI search.
- Cross-dataset gene-symbol harmonization / alias reconciliation — implemented for the three
  current datasets via MGI-backed `gene_harmonization/gene_harmonization.csv`; rebuild after any
  `genes.csv` changes or MGI source refresh.

## Handoff to Claude Design — GSE207736 enrichment
<!-- Owned by Claude Code — a Code→Design handoff. Design: treat "Next Design task" below as an
     input to your own Current Goal / Design Status; the data facts here are verified. -->

### 1. Milestone status
- GSE207736 (HypoMap label **Dowsett10xnuc**) **base import and optional HypoMap enrichment are
  complete and validated** (2026-07-13, branch `importer-first-dataset`).
- The **original expression matrix and cell ordering are unchanged** by enrichment (still
  39,953 × 55,399, CSR int64, nnz 120,130,850, `raw_counts`; same row order).
- **Native metadata fields were not overwritten** — enrichment only *adds* `hypomap_*` columns.

### 2. Exact UI-facing fields now available (per cell, in `processed/GSE207736/cells.csv`)
**Native fields** (observed from the GEO deposit / study card):
`cell_id`, `dataset_id`, `sample_id`, `region`, `condition`, `major_cell_type`, `cell_type`,
`cluster_id`.

**Optional HypoMap fields** (curated atlas annotations, added by enrichment):
`hypomap_included`, `hypomap_region`, `hypomap_author_cell_type`, `hypomap_C7`, `hypomap_C25`,
`hypomap_C66`, `hypomap_C185`, `hypomap_C286`, `hypomap_C465`.

- `hypomap_included` is **derived during enrichment** (True/False from whether the imported cell
  is present in the atlas) — it is *not* stored in the sidecar.
- The sidecar carries the **other eight** HypoMap annotation fields (`hypomap_region` through
  `hypomap_C465`), keyed to `cell_id`.
- For this dataset the native `major_cell_type` / `cell_type` / `cluster_id` are empty (the raw
  deposit has no per-cell annotation); the biology lives in the `hypomap_*` fields.

### 3. Verified coverage
- Total imported cells: **39,953**
- Cells matched to HypoMap: **35,945** (`hypomap_included = True`)
- Imported cells not present in HypoMap: **4,008** (`hypomap_included = False`)
- Unmatched atlas cells: **0**
- Duplicate composite join keys: **0**
- `hypomap_region` is **missing for 9,409 matched cells** — solely because the atlas
  `Region_summarized` field is itself empty for those cells (an absent source value; no biological
  cell-class attribution is made here).

### 4. Interpretation for Design
- **Two distinct annotation sources.** Native study annotations and HypoMap integrated
  annotations are separate provenance streams — surface them as such; do not merge or imply they
  are the same layer.
- **`hypomap_included = False` cells remain in the expression data.** They are real cells with
  counts; they simply lack atlas annotation (dropped during HypoMap QC).
- **Cells without HypoMap annotations must not disappear silently.** The UI has to represent
  "present but unannotated" explicitly rather than filtering these cells out.
- **`hypomap_region` supports anatomical filtering where populated** — but expect gaps
  (here ~26% of matched cells have no region value), so region controls must tolerate empties.
- **`hypomap_C7 → hypomap_C465` form a coarse-to-fine integrated cluster hierarchy** (C7 coarsest,
  C465 finest) — usable as a drill-down / nested facet.
- **Original expression counts drive expression and coexpression calculations** — annotation
  fields are for grouping/filtering only, never a substitute for the counts.
- **Partial/absent HypoMap coverage is the norm, not the exception.** Other datasets will have
  different (or zero) HypoMap coverage; the interface must degrade gracefully when `hypomap_*`
  fields are sparse or entirely absent.
- **`has_cell_metadata = False` refers to the *native* metadata pathway only** — it does not mean
  the `hypomap_*` enrichment fields are absent. The enrichment layer is orthogonal to that flag.

### 5. Next Design task
> **Update the ARC Gene Explorer HTML prototype so the Overview, Expression, and future
> Coexpression workflows can distinguish native annotations from HypoMap integrated annotations,
> expose region and cluster hierarchy controls, and transparently handle partial annotation
> coverage.**
