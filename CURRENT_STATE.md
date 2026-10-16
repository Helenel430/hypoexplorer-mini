# Current State

Live working status. Update as work proceeds. *(Not intended for Claude Project knowledge —
it changes often; the stable docs are PROJECT_OVERVIEW / DATASET_SUMMARIES / DESIGN_SPEC.)*

_Last updated: 2026-10-01_

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
  copy; the by-dataset mean bar + ±SEM error-bar definition, overlaid dataset-colored points,
  point hover/focus labels, and dynamically rounded y-axis ceiling.
- **Open for implementation flexibility:** real data wiring (prototype uses hardcoded
  placeholder arrays), state-management/routing approach, whether tab state becomes
  URL-addressable, exact colors if a brand palette supersedes the prototype's red, and
  extending the live dataset-filter to the per-dataset detail cards / cell-type table
  (currently only the Overview aggregate, chip, and detection chart react to selection in the
  prototype — confirm scope before assuming those other views should filter too).
- **Priority order suggested:** (1) Overview tab incl. dataset filter + info popovers, (2) By
  dataset tab incl. detection chart, (3) By cell type tab, (4) Coexpression tab (depends on a
  gene-pair picker that isn't designed yet — flag that as a blocker/question rather than
  guessing).
- Before building empty/loading/error states or accessibility/responsive behavior, come back to
  design — these are explicitly open, not implicitly "use your judgment."

---

# Claude Code

## Implementation Status
<!-- Owned by Claude Code -->

**Navigation UI and export updates (2026-10-16).** The HypoMap brand links back
to the home gene search. Spatial summaries are compact and top-aligned with the
map card. The Whole hypothalamus reset appears only for a selected region, below
the spatial heading. Off this plane lists the eight other named exported regions
with detection percentages; selection updates the summary and carries into the
By dataset region dropdown. Unassigned cells are not labeled as a nucleus.

By dataset uses larger checkbox legends to reveal detail cards. Both graphs
continue to summarize all supported datasets, while CSV previews/downloads contain
only checked datasets; exports are disabled with no selection. Plot points retain
hover values but no longer toggle cards. Chart typography and navigation controls
are standardized.

Co-expression uses numbered Top 5 rows with left-aligned genes and right-aligned
scores. Partner changes preserve scroll and reserve comparison height while loading.
Neutral comparison dataset checkboxes are incorporated at the bottom of the same
card. The population dropdown labels the all-cell option All hypothalamic cells;
C7 choices remain measured subsets. Spatial region selections do not filter pair
comparisons: their anatomical scope remains Whole hypothalamus.

All Export CSV controls open a modal table preview with Close, Escape dismissal,
and Download CSV. Preview/download share a captured snapshot. Spatial CSV includes
all exported contexts, full names, detection percentages and mean detected expression
in ln(1 + counts per 10k). Dataset CSV uses the current region and checked datasets.
Comparison CSV has a context title and two sections: detection categories ordered
as eligible cells → category count → percentage, and conditional co-detection with
query-positive, partner-positive and both-positive totals. Pooled rows are Aggregate.
The preview uses stacked fractions matching the help popovers; CSV retains plain
text formulas. Undefined values are blank, true zeros remain zero, and values are
unrounded. CSV uses UTF-8 BOM, quoted fields and CRLF for Excel compatibility.

Navigation integration checks cover region scope/reset, checkbox card/export
selection, CSV precision/escaping/nulls, comparison marginals and formulas, and
modal rendering/lifecycle. Browser checks verified regional values, actual spatial
CSV download, comparison preview, visible partner switching without scroll movement,
summary alignment and donut count fit. Production build passes.

**Nucleus-scoped navigation summaries (2026-10-15).** Selecting any of the seven
mapped nuclei now updates the expression-summary heading, positive/eligible counts,
detection percentage, and positive-cell mean using exported regional values.
Selection also carries into By dataset. Map regions support mouse and Enter/Space,
with a visible selected outline; selecting the same nucleus or Whole hypothalamus
resets the scope. New gene searches reset to Whole hypothalamus. Top 5 and pair
comparison scopes retain their separately labeled controls. Integration checks
verify ARC counts/mean, dataset context, and reset.

**Measured arbitrary-pair and C7 comparisons (2026-10-15).** The standalone
navigation route now uses `tools/comparison_service.py` for any two distinct
canonical genes with unique mappings in selected datasets. A separate
`tools/build_comparison_index.py` builds 511,259,299 bytes of server-side packed
raw-count detection bits and annotation masks for 39,583 genes / 102,195 imported
cells across GSE207736, GSE172461, and GSE93374. Dataset checkboxes, measured C7
quadrants, and quadrant C7 composition retain Unannotated C7 and disclose unsupported
mappings. Zero denominators remain undefined. Top 5 rankings and the five-gene FVP
are unchanged. API and UI caching, retry, and stale-response protection are included.
Raw-matrix validation passes 369 population blocks over 14 pairs, including
single-dataset and regional API checks; edge-case tests, navigation integration,
255-block/25-pair export audit, and production build pass. Browser checks confirm
Pomc × Agrp and measured GLU quadrants/composition. Local preview uses Vite's
same-origin API proxy. Startup, regeneration, contract, and deployment limits:
`docs/COMPARISON_SERVICE.md`. Earlier notes below describing C7/arbitrary pairs as
unavailable record superseded checkpoints.

**Functional annotation vertical slice (2026-10-09).** Added a source-checked
editorial reproduction slice in `annotations/reproduction_slice/`: four mouse
genes, two KEGG pathways, and two GO terms, with JSON, review CSV, source links
and mapping rationale. Refined into three reusable browsing topics (4, 2, and 3 entities),
with 15 specific mechanisms retained as detail tags and sourced individually.
Coverage is recorded by entity kind; the two-entity steroid topic is provisional.
The broad GO anchor has no invented narrower tags. Four gene identities match the navigation index. Gnaq
does not inherit reproduction from pathway membership. GO:0000003 is obsolete;
GO:0022414 is the replacement grouping anchor. Gene-level GO annotation retrieval
and hypothalamic expression evidence are not assessed; application integration
is not performed. Record integrity and identity checks pass.

**Navigation integration — checkpoints 1–5 complete (2026-10-09).** The standalone
route resolves the exported all-gene index (case, aliases, explicit ambiguity), then
loads and caches the selected gene's shard. Whole-hypothalamus counts, percentages,
and positive-cell means pool supported datasets. Spatial shading uses exported
regional positive-cell means for seven mapped nuclei; ME is unavailable because
no separate exported region exists. Native mappings and blank-region counts are
disclosed. By dataset uses exact counts, equal-weight means ± SEM, and accumulating
point-selected detail cards. Missing/duplicate mappings are unsupported; zero
positives have undefined expression means. The Top 5 panel now loads measured whole-hypothalamus conditional co-detection:
percentage, exact both/query-positive counts, and contributing datasets. Partner
identity comes from the initial index. Recommendation clicks and alias/ambiguity-aware
secondary search show measured Top 5 pair summaries; other pair scores remain
unavailable pending an on-demand backend. Scores are directional and do not adjust
for background expression. Short/empty lists, retry, and stale-response guards are
implemented. The four-tab FVP
app is unchanged. Vite serves the root export and copies it into builds.

Checkpoint-2 automated checks cover shard caching, Pomc exported counts and pooled/
ARC values, alias navigation, missing/duplicate mappings, zero/empty contexts, and
the actual page/detail renderer. Production build passes. A user-requested progress
validation and demo (2026-10-09) additionally verified all 158 export payloads,
39,583 gene/recommendation records, and 255 five-pilot dataset/context blocks against
the existing FVP reference. Browser checks passed for Pomc metrics and recommendations,
mouse/keyboard accumulating dataset cards, formula popover, alias deep link,
ambiguity selection, and a real zero-detection gene. No browser warnings/errors.
The preview is running at `http://127.0.0.1:5173/navigation-prototype.html?gene=Pomc`;
report: `docs/NAVIGATION_VALIDATION.md`, screenshots: `tmp/navigation-validation/`.
The early progress validation was followed by final checkpoint-5 checks after
checkpoint 4, as recorded below. Checkpoint-4 state presentation is now complete: initial index,
gene-shard, and recommendation loading with busy announcements; preserved queries;
recoverable index/shard errors with Retry; distinct missing-gene and zero-expression
states; unsupported dataset notices; undefined mean explanations in gene/dataset
views; readable zero-region labels. Controlled tests pass for index and shard
failure/retry, loading state, and stale responses after missing queries. Browser
checks confirm missing-query recovery and Platr11 zero detection in both views.
Checkpoint-3 checks cover Pomc/Agrp recommendation counts and scores, identity
lookup without partner shards, shared payload caching, secondary resolution,
unavailable pairs, retry, stale responses, and short/empty lists. Build passes.
Checkpoint 5 is complete (2026-10-09): reproducible final audit checks all five
pilot genes in 255 metric blocks and all 25 Top 5 quadrant reconstructions; all 158
production payloads match root-export bytes. Browser-displayed counts/percentages/
means for all five genes and both aliases pass. Integration tests and production
build pass; no browser warnings/errors. The local production preview is open on
Pomc × Malat1 at the URL above. Results: `docs/navigation_validation_results.json`;
report: `docs/NAVIGATION_VALIDATION.md`; screenshot: `tmp/navigation-validation/final-preview.jpg`.
The five requested checkpoints are complete. Measured C7 pair values and arbitrary
pair intersections outside Top 5 remain separate data-layer tasks.
Integration instructions are updated in the app README, visualizer README,
navigation-export README, and navigation prototype spec.

**Navigation quadrant restoration (2026-10-09).** At the user's request, selecting
a Top 5 partner now loads its cached shard and derives the four whole-hypothalamus
quadrants from the exported both-positive count and same-dataset marginals. Counts
and percentages of all eligible cells appear in a 2×2 table under the conditional
summary. Export size is unchanged. Arbitrary pairs outside Top 5 remain unavailable.
Tests pass for exact counts/sums, restricted dataset scope, invalid input rejection,
partner loading/retry, and stale selections. Build and Pomc × Malat1 browser demo
pass with no warnings/errors. Screenshot: `tmp/navigation-validation/pomc-quadrants.jpg`.
Final checkpoint-5 validation is complete, as recorded above.

**Coexpression prototype formatting (2026-10-09).** At the user's request, the
navigation comparison now follows the earlier Coexpression view: population
selector, count-centered donut, four-row legend, blue clickable quadrant matrix,
and C7 expansion under Whole hypothalamus and each quadrant. C7 eligible populations
are measured over the same pair datasets; Unannotated C7 is retained. The earlier
view's C7 pair profiles and splits were illustrative. Current C7 pair values remain
explicitly unavailable; no whole-population counts are relabeled as C7. Tests/build
pass for population totals, unannotated retention, expansion, unavailable profile,
and state resets. Measured C7 pair data is still a separate outstanding task.

**Coexpression simplification (2026-10-09).** Following user feedback, consolidated
Top 5, pair summary, and quadrants into one card. Top 5 buttons show gene + score,
with exact counts in accessible labels/tooltips. Recommendation selection opens the
comparison directly. Formula, scope, and dataset detail moved to existing dismissible
`?` popovers. One population selector replaces duplicated C7 navigation; unavailable
C7 profiles use one message, and quadrant expansion shows one concise C7 availability
note. Whole-population counts are unchanged. Updated interaction tests, build, final
255-block/25-pair audit, and browser checks pass. Screenshot:
`tmp/navigation-validation/coexpression-simplified.jpg`.

**UniProt descriptions restored (2026-10-09).** At the user's request, restored
the previous About this gene / Protein function block beneath the navigation gene
heading, with curated summaries and direct UniProtKB links for Pomc, Agrp, Ccn1,
Fam237b, and Npy. Extracted existing descriptions unchanged into the shared app
`gene-descriptions.mjs`, used by the FVP and standalone route; Vite copies the module
into the build. No description is inferred for other genes. Existing tests, build,
and final audit pass. Browser checks verify Pomc and alias Cyr61 → Ccn1 descriptions
and accession links; no errors/warnings. Screenshot:
`tmp/navigation-validation/uniprot-description.jpg`.

**All-gene navigation export (2026-10-08).** New standalone exporter
`tools/export_navigation_metrics.py` generates lazy-loadable whole-dataset and
regional summaries for 39,583 canonical genes in `navigation_export/`, without
C25, histograms, or all-pair tables. Dataset mappings preserve missing and duplicate
states. `tools/export_navigation_recommendations.py` adds Top 5 whole-hypothalamus
recommendations ranked by raw-count co-detection among query-positive cells,
as authorized by the user. C7 eligible-cell metadata is included; measured arbitrary
C7 pair comparisons still require an on-demand backend. Schema, loading rules,
validation, and reproducibility are documented in `navigation_export/README.md`.
The export is now wired to the standalone navigation route; the existing FVP
uses its separate five-gene data file.
Measured compressed JSON payload: **14.23 MB**, below the 30–50 MB planning
budget. All 158 gzip files and 39,583 recommendation records validate; 250
reference expression blocks and exhaustive five-pilot recommendation rankings pass.

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
  and `Ccn1`/`Cyr61`. At that milestone, the app defaulted to Dowsett10xnuc / `GSE207736` only;
  the current all-three-dataset default is documented below. Additional target datasets
  (`GSE172461`, `GSE93374`) were selectable for multi-dataset analysis, and dataset-average vs
  cell-pooled aggregation controls are revealed only when more than one dataset is selected.
  Whole/ARC/PVN/VMH/DMH context switching and the five-view shell were implemented from the
  handoff. Extended `tools/export_fvp_metrics.py` to
  include `hypomap_C25` groups within each `hypomap_region`, so the Cell Identity tab uses
  region-scoped values when ARC/PVN/VMH/DMH is selected. At this milestone, Context/coexpression
  intentionally remained a metric-definition-needed state; that blocker was subsequently resolved
  by the region-linked pilot documented below.
- ✅ **Dynamic gene autocomplete added to `gene-explorer-js` (2026-08-10).** The header search
  now filters the genes present in the loaded metric export as the user types, exposes canonical
  names and dataset aliases in a dropdown, supports mouse and arrow-key/Enter selection, and
  retains alias resolution (for example, `Cyr61` selects canonical `Ccn1`).
- ✅ **Aggregate and By dataset views added to `gene-explorer-js` (2026-08-10).** Replaced the
  Expression and Reproducibility tabs at the user's direction. Aggregate now presents the
  count-led expressing-cell donut, across-dataset average, positive-cell mean with scale, formula
  popovers, and detection chip. The initial By dataset implementation used a fixed 0–100% bar
  chart with dataset color ramp and rotated labels; this presentation was superseded by the
  2026-09-09 update below. All values react to the active gene, context, annotation source, and
  selected datasets.
- ✅ **Aggregate calculation switch added (2026-08-12).** The Aggregate page now exposes
  dataset-average (each dataset weighted equally) versus cell-pooled (each cell weighted equally)
  calculation modes. Both the percentage and positive-cell mean update with the selected mode;
  the donut remains an explicitly labeled pooled absolute cell count.
- ✅ **By dataset detection plot updated (2026-09-09).** The view now shows a selected-dataset
  mean bar with ±SEM error bars and overlaid dataset points. Points preserve the shared dataset
  colour identity and reveal the dataset name plus exact `%Expressing` value on hover. The y-axis
  uses a padded, rounded upper bound derived from the largest point or error-bar cap.
- ✅ **By dataset plot width tightened (2026-09-17).** The single-bar summary chart is now
  centered at a compact 620px maximum width instead of stretching across the full three-card row;
  the per-dataset detail cards remain full width below it. The mean/SEM readout is emphasized and
  the x-axis is explicitly labelled as the selected datasets.
- ✅ **Mean-expression unit and By dataset comparison audited (2026-09-20).** Confirmed from
  raw matrices, verified derived layers, export code, and all 15 whole-dataset gene×dataset
  blocks that mean expression is Seurat LogNormalize among raw-count-positive cells:
  `ln(1 + counts / cell library size × 10,000)`, not TPM (no transcript-length correction).
  The UI now labels this as `ln(1 + counts per 10k)`, presents the Aggregate progress scale as
  `0–max` instead of the misleading `value / max`, and places side-by-side `% expressing` and
  mean-expression mean±SEM plots in By dataset. Dataset dots share one x-position so comparisons
  read vertically. Zero-eligible datasets and undefined positive-cell means are excluded from the
  relevant plot summary rather than silently contributing zero.
- ✅ **Aggregate summary consolidated into Overview (2026-10-01).** Moved the pooled positive /
  negative donut, dataset-average versus cell-pooled selector, metric formula popovers,
  mean-expression scale, and detection chip into Overview beside the anatomy map. Removed the
  duplicate Aggregate navigation tab; the app now has four tabs.
- ✅ **Region-linked coexpression pilot implemented (2026-09-10).** Defined the canonical
  four-quadrant contract in `docs/METRIC_SPEC.md` and extended `tools/export_fvp_metrics.py` to
  export all six pairs among `Pomc`, `Agrp`, `Ccn1`, and `Fam237b`, with exact per-dataset counts
  for every nonblank HypoMap region. Replaced the Context placeholder with a
  Coexpression tab that fixes the browsed gene as gene A and provides an alias-aware autocomplete
  for selecting a different vertical-slice partner, alongside one live
  donut/legend/quadrant-matrix card in the shared blue theme. The card uses the full content width,
  with the matrix beside the donut and legend. Its region follows the remembered
  Overview-map selection and defaults to Whole hypothalamus when no region is selected, matching
  the By dataset tab. All datasets are selected by default; subsequent selections
  are applied by summing integer counts and recomputing cell-pooled percentages. Blank
  `hypomap_region` cells remain in Whole hypothalamus and are excluded only from named-region
  denominators. Session-close validation covers all six pairs × 16 contexts × three datasets plus
  pooled results: 384 structural/arithmetic metric blocks pass, all four unit tests pass, the app
  and export JSON copies are byte-identical, and the Vite production build succeeds.
- ✅ **Fam237b vertical slice added (2026-08-13).** Expanded the static metric export and
  `gene-explorer-js` lookup from three to four canonical genes. `Fam237b` resolves through
  MGI:3646213 to the native `Gm8773` feature in GSE207736, GSE172461, and GSE93374; both symbols
  are searchable and lead to the same record. Whole-dataset detection is 3/3 datasets (1,224 /
  102,195 pooled expressing cells, 1.198%).
- ✅ **Npy vertical slice added (2026-09-18).** Expanded the static metric export and
  `gene-explorer-js` lookup from four to five canonical genes. `Npy` resolves directly to the
  native `Npy` feature in GSE207736, GSE172461, and GSE93374 and participates in all ten
  selectable coexpression pairs. Whole-dataset detection is 3/3 datasets (14,521 / 102,195
  pooled expressing cells, 14.209%).
- ✅ **Gene-specific anatomy schematic added (2026-08-13).** The Overview coronal map now uses
  raw-count-positive cell number for region colour intensity and prints the same positive-cell
  counts inside each mapped region. Values react to the active gene and selected datasets; a
  linear gene-specific scale runs from zero to the largest positive-cell count among the mapped
  regions. Off-plane regions show both positive count and percentage on the same clamped scale.
  The legend explicitly states that raw detections use ≥1 count and are not ambient-RNA corrected.
- ✅ **Blue visual system applied (2026-09-15).** Replaced the prior red/coral accents throughout
  `gene-explorer-js` with a coherent blue hierarchy covering primary controls, active states,
  anatomy intensity, dataset identities, Aggregate charts, and Coexpression quadrants. Neutral and
  warning colours remain semantically distinct.
- ✅ **Standalone gene-navigation prototype documented and iterated (2026-10-08).** Added
  `hypomap-viz/gene-explorer-js/public/navigation-prototype.html`, a self-contained, hardcoded
  review route with a gene-search landing page, gene-specific co-expression recommendations,
  the original coronal spatial schematic, whole-hypothalamus expressing-cell donut and mean
  expression, formula `?` popovers, and a By dataset view. The dataset view has paired
  `% expressing` and mean-expression charts with stacked, color-coded points; selecting points
  accumulates dataset detail cards in selection order, with a compact yellow selected-point halo.
  Details and formulas are in `docs/NAVIGATION_PROTOTYPE_SPEC.md`. This route does not replace or
  change navigation in the data-backed FVP app.

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
  `Ccn1`/`Cyr61`, `Fam237b`/`Gm8773`, and `Npy`, defaulting to all three target datasets selected. The
  four-tab app is wired to real metric exports where
  supported: Overview (including the former Aggregate summary), By dataset, `hypomap_C25` Cell Identity values, and flexible
  region-linked Coexpression for any pair of the five exported genes, with the browsed gene fixed,
  the second gene chosen through an alias-aware partner search, and the Overview-map region carried
  across tabs. Atlas-wide arbitrary gene pairs and
  non-C25 cell-identity hierarchy levels remain outside the current vertical slice rather than
  being filled with modeled values.

## Files Modified
<!-- Owned by Claude Code -->
- **Measured comparisons (2026-10-15):** new index builder, local API, raw-matrix
  validator and edge-case tests in `tools/`; navigation pair/C7 rendering and
  dataset controls; Vite API proxy; navigation UI tests and measured fixtures;
  `docs/COMPARISON_SERVICE.md` and validation results. Generated index remains
  gitignored under `processed/`.
- **Documentation and GitHub handoff (2026-10-09):** refreshed READMEs, current
  navigation/metric specifications, and validation report for the compact
  coexpression layout, shared UniProt descriptions, and generated-export build
  prerequisite. Validation screenshots are preserved in `docs/navigation-demos/`.
  Source changes and the supporting five-gene FVP reference are prepared for the
  configured root GitHub repository; generated navigation payloads stay local.

- **Navigation checkpoints 1–5 and subsequent refinements:** `hypomap-viz/gene-explorer-js/public/navigation-prototype.html`,
  `public/navigation-export-client.mjs`, `public/navigation-metrics.mjs`,
  `vite.config.js`, `tests/navigation.test.mjs`, and `tests/navigation-audit.mjs`
  (paths relative to the app).
  Loader precedence fix also lives in `tools/navigation_export_client.mjs` and the
  generated `navigation_export/load.mjs`. Integration Markdown is updated above.
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
  `Pomc`/`Agrp`/`Ccn1`/`Fam237b`/`Npy` vertical slice using raw counts, verified LogNormalize matrices, MGI
  resolver mappings, annotation coverage buckets, region-scoped `hypomap_C25` groups, and the
  complete set of ten selectable coexpression pairs among the five vertical-slice genes, each
  exported across Whole hypothalamus and every nonblank HypoMap region (16 contexts).
- **Coexpression validation (tracked source tools)** — `tests/test_coexpression_metrics.py` and
  `tools/validate_coexpression_export.py`. Unit-check quadrant math, pooling, swap symmetry, and
  undefined zero-denominator behavior; validate all real exported dataset and pooled blocks.
- **FVP static app data (generated, tracked if app deployment needs it)** —
  `hypomap-viz/gene-explorer-js/public/data/gene_metrics_vertical_slice.json`, copied from
  `fvp_export/gene_metrics_vertical_slice.json` after regeneration.
- **FVP static app UI** — `hypomap-viz/gene-explorer-js/src/main.js` and `src/style.css`, including
  dynamic gene autocomplete sourced from the loaded metric export, canonical/alias labels,
  keyboard selection behavior, the gene-specific anatomy schematic (raw-count-positive cell
  colour and labels in the current blue visual system, with an explicit ambient-RNA caveat),
  all-dataset fresh-session defaults, and
  the region-linked single-card coexpression view with fixed browsed gene, partner autocomplete,
  and a horizontal donut/legend/quadrant layout.
- **Standalone navigation review prototype** —
  `hypomap-viz/gene-explorer-js/public/navigation-prototype.html`; HTML/CSS with ES modules loading the exported index and expression/recommendation
  payloads; curated descriptions are shared through `gene-descriptions.mjs`. Behavior and visual guidance are documented in
  `docs/NAVIGATION_PROTOTYPE_SPEC.md`.
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
- **Visualizer** — `hypomap-viz/` (tracked in the current root repository): `shinyApp/`, `gene-explorer/`,
  `gene-explorer-js/`, `prepare_app.R`, `compute_gene_stats.R`.
- **Data/status docs** — `DATASET_SUMMARIES.md`, `EXTERNAL_ANNOTATION_STRATEGY.md`, and the
  Code-owned half of this file.

## Known Bugs
<!-- Owned by Claude Code -->
- **Comparison hosting:** arbitrary-pair and C7 results require the running Python
  comparison service plus its private generated index; Vite dev/preview proxy it
  locally. A static hosted build alone cannot supply these results. See
  `docs/COMPARISON_SERVICE.md`.
- **Build prerequisite:** generated `navigation_export/` payloads are excluded from Git.
  A fresh clone/hosted build must regenerate or receive the validated export before
  building. The current root checkout uses `Helenel430/hypoexplorer-mini`; older
  nested-repository instructions do not describe this checkout.

No open correctness bugs in the current `gene-explorer-js` FVP. Behavioral watch-outs and
constraints to respect:

- **Legacy Romanov R/Shiny gene explorer:** `compute_gene_stats.R` reads the Seurat `RNA` assay
  `data` layer and labels it log-normalized, but does not persist that source object's
  normalization method/scale factor. It also stores mean expression as `0` for genes with no
  expressing cells, whereas the current metric contract requires an undefined/not-detected
  state. This does not affect `gene-explorer-js`, which uses independently verified
  LogNormalize layers; regenerate the legacy `gene_stats.rds` with explicit provenance and
  missing-value handling before treating that older app as quantitatively interchangeable.

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
The standalone navigation integration and the three-dataset measured pair/C7 service
are complete. Follow-up work is hosted service deployment if requested, and expansion
to additional validated datasets. Regional queries are supported by the API; regional
comparison UI controls remain future scope.

Primary next tasks (pick per Design's priority order above):

1. Decide whether PVN/VMH/DMH should remain compact header options only or expose the full
   available `hypomap_region` list in a future design pass.
2. Batch-run the importer across the remaining 15 datasets.
3. **UI export** — convert the display card (and optionally per-sample CSVs) to whatever the
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
