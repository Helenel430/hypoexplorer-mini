# Gene Explorer Metric Specification

Canonical quantitative definitions for every value displayed in the Gene
Explorer. Implementation code and UI "How it's calculated" explanations must
derive from this document. Do not substitute alternate statistical definitions
without updating this specification and getting explicit approval.

Last updated: 2026-10-09

## Scope

This specification covers the First Viable Product Gene Explorer metrics for:

- positive cell count
- percent expressing
- mean expression among positive cells
- expression distribution
- cross-dataset percent-expressing summaries
- dataset detection
- selectable-pair coexpression quadrants for the five-gene vertical slice

The current target datasets are:

- GSE207736, HypoMap label Dowsett10xnuc
- GSE172461, HypoMap label Rupp10x
- GSE93374, HypoMap label CampbellDropseq

## Core Context Terms

### Queried Gene

The gene symbol selected by the user.

Gene lookup must resolve to the intended gene in each selected dataset before
metrics are computed. If a gene cannot be resolved consistently because of gene
identifier or symbol drift, the affected dataset must be reported as unsupported
for that query rather than silently substituted.

If the submitted search term maps to more than one official gene in the
approved harmonization source, metric computation must stop before reading
expression values. The resolver must return a disambiguation state listing every
candidate official symbol and stable identifier. The implementation must not
guess, rank, or automatically choose one candidate.

### Current Context

The set of cells eligible for a metric after applying the current UI scope.

Initial FVP scopes:

- Whole hypothalamus
- selected nucleus, where supported by available metadata
- selected dataset set
- selected cell-type group, where supported by an approved grouping column

If a dataset lacks the annotation needed for a selected nucleus or other
biological subset, that dataset cannot support the scoped metric unless an
approved fallback is documented here.

### Eligible Cells

All cells within the current context.

For a whole-hypothalamus context, eligible cells are all cells in the selected
dataset or selected datasets.

For a selected-nucleus context, eligible cells are the cells assigned to that
nucleus by an approved annotation column. The exact annotation source used for
each dataset must be documented before nucleus-scoped metrics are implemented.

Cells with blank `sample_id` remain eligible for whole-dataset and
whole-hypothalamus metrics that do not require sample identity. They must be
preserved and reported. They are excluded from sample-scoped, replicate-scoped,
condition-scoped, and true pseudobulk-scoped metrics until `sample_id` is
repaired. They must never be silently dropped from whole-dataset denominators.

### Filter Order

Every metric is computed from the same ordered filter pipeline:

1. Resolve the query to one official gene or stop in a disambiguation state.
2. Start with all cells in each selected dataset.
3. Apply the spatial context:
   - Whole hypothalamus: keep all cells from selected datasets.
   - Selected nucleus: keep only cells where `hypomap_region == selected_nucleus`.
4. Apply any selected cell-type context, if the view is grouped or filtered by a
   cell-type annotation.
5. Apply sample, replicate, or condition filters only for metrics whose scope
   explicitly requires those fields.

Dataset selection is always applied before cross-dataset aggregation. If no
datasets are selected, all downstream metrics are undefined and the UI must show
an unavailable state rather than `0`.

For the current target datasets, selected-nucleus metrics use
`hypomap_region == selected_nucleus`. Cells with blank `hypomap_region` remain in
whole-dataset contexts but are excluded from selected-nucleus denominators and
reported as unannotated/out of scope for that spatial calculation.

### Cell-Type Grouping

Cell-type grouped metrics use the same formulas as ungrouped metrics, applied
separately within each group.

Default FVP grouping column:

```text
group_col = hypomap_C25
```

The By cell type tab groups rows by `hypomap_C25` by default. Native
`cell_type`, `hypomap_author_cell_type`, and other HypoMap hierarchy levels
remain available provenance/annotation fields, but they are not the default
grouping axis unless a future spec update says so.

Given an approved grouping column `group_col` and group value `g`:

```text
eligible_cells(g) =
  eligible_cells_after_dataset_and_spatial_filters
  where group_col == g
```

Then:

```text
#Eligible Cells_g = count(eligible_cells(g))
#Expressing_g = count(eligible_cells(g) where raw_count(gene) >= 1)
%Expressing_g = (#Expressing_g / #Eligible Cells_g) * 100
Mean expression_g =
  sum(log_normalized_expression(cell, gene) for positive eligible_cells(g))
  / #Expressing_g
```

Rows with blank `group_col` are not assigned to any named cell-type group. They
must be preserved in the parent denominator when the parent view is not grouped
by cell type, and they must be reported as unannotated/out of scope for the
grouped view rather than silently discarded.

Do not merge native and HypoMap annotation columns into one group axis. The
grouped FVP view must label its grouping source as `hypomap_C25`.

## Metric Definitions

### Expression Layers

The metric layer is fixed by statistic:

| Statistic | Expression source |
|---|---|
| Positive cell flag | raw counts only |
| Positive cell count | raw counts only |
| Total eligible cells | cell metadata only |
| Percent expressing | raw counts for numerator, metadata context for denominator |
| Dataset detection | raw counts only |
| Mean expression among positives | log-normalized expression values, among raw-count-positive cells only |
| Expression distribution | same log-normalized expression values used for mean expression |

Normalized, log-normalized, imputed, scaled, or modeled values must not be used
to decide whether a cell is positive.

### Positive Cell

A positive, or expressing, cell is a cell with at least 1 detected raw count for
the queried gene.

Formally:

```text
positive(cell, gene) = raw_count(cell, gene) >= 1
```

This definition is used consistently for:

- positive cell count
- percent expressing
- dataset detection

No normalized, log-normalized, imputed, scaled, or threshold-adjusted value may
be used to determine positivity.

### Positive Cell Count

Positive cell count is the number of eligible cells with at least 1 detected raw
count for the queried gene.

Formula:

```text
#Expressing = count(eligible cells where raw_count(gene) >= 1)
```

If `#Eligible Cells = 0`, positive cell count is undefined for that context.

### Total Eligible Cells

Total eligible cells is the denominator after applying dataset selection,
spatial context, cell-type grouping if relevant, and any approved sample,
replicate, or condition filters.

Formula:

```text
#Eligible Cells = count(eligible cells in the current context)
```

This is a metadata-derived count. It does not depend on whether the queried gene
is detected. Cells with 0 raw counts for the queried gene are still eligible
cells.

### Percent Expressing

Percent expressing is the share of eligible cells that are positive for the
queried gene.

Formula:

```text
%Expressing = (#Expressing / #Eligible Cells) * 100
```

Where:

- `#Expressing` = cells with at least 1 detected raw count
- `#Eligible Cells` = all cells within the current context

If `#Eligible Cells = 0`, the metric is undefined. The UI must not display this
as `0%`; it must display an unavailable state with a reason.

### Mean Expression

Mean expression is the arithmetic mean of log-normalized expression among
positive cells only. The log-normalized value is computed with Seurat
`NormalizeData(normalization.method = "LogNormalize")` semantics:

```text
library_size(cell) = sum(raw_count(cell, gene_j) for all genes j)
normalized_count(cell, gene) =
  raw_count(cell, gene) / library_size(cell) * 10000
log_normalized_expression(cell, gene) =
  ln(1 + normalized_count(cell, gene))
```

The scale factor is fixed at `10000`. The logarithm is the natural log via
`log1p`, matching Seurat `LogNormalize`.

The UI unit label for this value is:

```text
ln(1 + counts per 10k)
```

This is **not TPM, FPKM, or RPKM**. Seurat `LogNormalize` corrects for each
cell's library size but does not divide by gene or transcript length. If a
visual progress bar uses the largest observed positive-cell value as its
reference, label that reference as a scale range such as `0–7.80`; do not show
`mean / maximum`, because the maximum is not a statistical denominator.

Formula:

```text
Mean expression =
  sum(log_normalized_expression(cell, gene) for positive eligible cells)
  / #Expressing
```

Only expressing cells contribute to this statistic. Cells with raw count `0` are
excluded from both the numerator and denominator.

If `#Expressing = 0`, mean expression is undefined. The UI must not display this
as `0`; it must display an unavailable or not-detected state.

If `library_size(cell) = 0`, that cell cannot produce a valid LogNormalize value
and must be flagged as invalid input. Current raw-count imports are expected to
contain nonzero libraries, but this must be validated before generating the
log-normalized layer.

### Expression Distribution

The expression histogram or distribution uses the same log-normalized expression
values used for Mean Expression.

Distribution population:

- eligible cells in the current context
- values are log-normalized expression values for the queried gene

If the distribution is intended to include only expressing cells or all eligible
cells including zero-valued cells, that display choice must be documented here
before implementation. The current FVP requirement only fixes the value scale:
the distribution must use the same log-normalized values as Mean Expression.

### Cross-Dataset Percent Expressing

The UI must support both aggregation modes below. They answer different
questions and must be clearly labeled.

#### Mode A: Dataset-Average

Equal-weight, pseudobulk-style aggregation.

Step 1: compute `%Expressing` independently for each selected dataset.

Step 2: compute the arithmetic mean of those dataset-level percentages.

Formula:

```text
Dataset-average %Expressing =
  mean(%Expressing_dataset for each selected dataset)
```

Every selected dataset contributes equally, regardless of its cell count.

This follows the philosophy of pseudobulk by treating each independent study
equally rather than allowing larger datasets to dominate. It is intentionally
pseudobulk-style, not a true replicate-level pseudobulk analysis.

Because this mode is dataset-scoped, not sample- or replicate-scoped, cells with
blank `sample_id` remain eligible when they otherwise match the current context.
Do not call this mode true pseudobulk; true sample/replicate pseudobulk requires
valid `sample_id` values and must exclude blank-`sample_id` cells until repaired.

Question answered:

```text
How consistently is this gene expressed across independent studies?
```

If a selected dataset has zero eligible cells in the current context, it cannot
contribute a dataset-level percentage for that context. The UI must report that
the dataset is unavailable for the scoped calculation rather than silently
dropping it.

#### Mode B: Cell-Pooled

Cell-count-weighted aggregation across selected datasets.

Formula:

```text
Cell-pooled %Expressing =
  total expressing cells across selected datasets
  / total eligible cells across selected datasets
  * 100
```

Larger datasets contribute proportionally more cells.

Question answered:

```text
What fraction of all selected cells express this gene?
```

If the pooled selected context has zero eligible cells, the metric is undefined.
The UI must not display this as `0%`.

Cells with blank `sample_id` remain eligible for this mode when the selected
context does not require sample, replicate, or condition identity.

### Cross-Dataset Mean Expression

Mean expression still uses only log-normalized values from raw-count-positive
cells. The same two aggregation modes must be available once a log-normalized
layer exists.

#### Mode A: Dataset-Average Mean Expression

Step 1: compute mean expression independently for each selected dataset:

```text
Mean expression_dataset =
  sum(log_normalized_expression(cell, gene) for positive eligible cells in dataset)
  / #Expressing_dataset
```

Step 2: compute the arithmetic mean of those dataset-level means:

```text
Dataset-average mean expression =
  mean(Mean expression_dataset for each selected dataset with #Expressing_dataset > 0)
```

Every selected dataset with at least one positive eligible cell contributes
equally regardless of its number of positive cells. If a selected dataset has
eligible cells but zero positive cells, its mean expression is undefined and the
UI must report that dataset as not detected for this statistic rather than
treating its mean as `0`.

#### Mode B: Cell-Pooled Mean Expression

Pool all raw-count-positive eligible cells across the selected datasets, then
average their log-normalized expression values:

```text
Cell-pooled mean expression =
  sum(log_normalized_expression(cell, gene) for positive eligible cells across selected datasets)
  / total positive eligible cells across selected datasets
```

Larger datasets contribute proportionally more positive cells. If the pooled
context has zero positive cells, mean expression is undefined and the UI must
not display this as `0`.

Current implementation status: the normalization procedure is now specified as
Seurat `LogNormalize` with scale factor `10000`, but the processed outputs still
need a validated generated log-normalized layer before these statistics can be
computed.

### Dataset Detection

Initial implementation:

A dataset is considered to detect the queried gene if at least one eligible cell
contains at least 1 detected raw count for that gene.

Formula:

```text
dataset_detects_gene =
  count(eligible cells where raw_count(gene) >= 1) >= 1
```

If a more biologically appropriate threshold is warranted, for example requiring
a minimum number or fraction of expressing cells, document the proposed change
and rationale here before implementing it.

### Vertical-Slice Coexpression Pilot

The first coexpression implementation supports any two distinct genes from the
current vertical slice: `Pomc`, `Agrp`, `Ccn1`, `Fam237b`, and `Npy`. The static export
contains all ten unordered pairs. This is not yet an arbitrary atlas-wide
gene-pair search. In the UI, gene A is the currently browsed gene and gene B is
selected through an alias-aware partner picker that excludes gene A. Both
selected genes must resolve successfully in every selected dataset before
metrics are computed. An unresolved gene is unsupported, never zero.

Coexpression positivity uses the same raw-count rule as single-gene detection:

```text
A_positive(cell) = raw_count(cell, geneA) >= 1
B_positive(cell) = raw_count(cell, geneB) >= 1
```

The denominator is every imported cell for Whole hypothalamus, or every cell
assigned to the selected `hypomap_region` for a region context. It is not
restricted to `geneA+`, `geneB+`, or the current single-gene search. This is
required for all four quadrants to be meaningful.

The region follows the Overview coronal-map selection and is retained when the
user changes tabs. With no explicit selection, both By dataset and Coexpression
use the Whole hypothalamus context. Coexpression displays one context card at a
time. For example:

```text
Whole hypothalamus cells =
  all imported cells in the selected hypothalamic datasets

ARC cells =
  cells where hypomap_region == "Arcuate hypothalamic nucleus"

LHA cells =
  cells where hypomap_region == "Lateral hypothalamic area"
```

For eligible population `S`, the four exhaustive counts are:

```text
Both+       = count(S where A_positive and B_positive)
Gene A only = count(S where A_positive and not B_positive)
Gene B only = count(S where not A_positive and B_positive)
Neither     = count(S where not A_positive and not B_positive)

N = Both+ + Gene A only + Gene B only + Neither
%Quadrant = Quadrant count / N * 100
```

The pilot uses cell-pooled aggregation. Integer quadrant counts are exported per
dataset; after applying the selected-dataset filter, corresponding counts are
summed and percentages are recomputed from the pooled denominator. Rounded
percentages must never be averaged. If no dataset is selected, or the pooled
denominator is zero, all percentages are undefined.

Region eligibility requires a populated matching `hypomap_region`. Cells with a
blank region remain in the processed data and in the Whole hypothalamus
denominator, but are excluded from named-region denominators and reported as
lacking the annotation required for region calculations. Cells assigned to
another named region are outside the selected context, not missing.

Required invariants:

- the four counts sum exactly to the eligible denominator;
- unrounded percentages sum to 100% whenever `N > 0`;
- swapping A and B preserves Both+/Neither and swaps the two single-positive
  quadrants;
- every whole-hypothalamus denominator exactly matches the dataset's imported
  cell count;
- every region denominator exactly matches the dataset's cells carrying that
  `hypomap_region` value.

### Navigation Top 5 quadrants (2026-10-09)

The standalone navigation route supports measured quadrants for partners in the
queried gene's exported Top 5. This whole-hypothalamus population is exactly the
recommendation's dataset list, which includes every dataset uniquely mapping the
query and requires a unique partner mapping in those same datasets. No regional,
C7, or dataset-subset intersections are available from this pooled record.

The existing intersection plus the partner shard's whole-dataset marginals gives:

```text
N = sum(eligible cells in recommendation datasets)
A+ = recommendation queried_gene_positive
B+ = sum(partner positive cells in those same datasets)
Both = recommendation both_positive
A only = A+ - Both
B only = B+ - Both
Neither = N - A+ - B+ + Both
% quadrant = count / N * 100
```

Require nonnegative integer counts summing to N. Unsupported mappings or invalid
counts must show unavailable quadrants. The UI displays exact counts and all-cell
percentages in a 2×2 detection table. The conditional recommendation score uses
Both / A+, a separate denominator. Loading a partner shard does not change the
export; arbitrary pairs outside the Top 5 still need measured intersections from
a backend or additional pair export.

## UI Explanation Source Text

Every displayed metric must have a corresponding "How it's calculated"
explanation generated from this section or from a structured representation that
matches this section exactly.

### Positive Cells

Positive cells are cells with at least 1 detected raw count for the queried gene.
The same raw-count threshold is used for positive cell count, percent
expressing, and dataset detection.

### Percent Expressing

`%Expressing = (#Expressing / #Eligible Cells) * 100`.

`#Expressing` is the number of cells in the current context with at least 1 raw
count for the queried gene. `#Eligible Cells` is every cell in the current
context, such as the whole hypothalamus or the selected nucleus.

### Total Eligible Cells

`#Eligible Cells` is the count of cells remaining after applying the selected
datasets, spatial scope, and any selected grouping/filtering context. It is the
denominator for `%Expressing`; it does not depend on whether the gene is
detected.

### Mean Expression

Mean expression is the average log-normalized expression among expressing cells
only. Cells with 0 raw counts for the queried gene do not contribute to this
mean.

### Expression Distribution

The expression distribution uses the same log-normalized expression values used
for Mean Expression.

### Dataset-Average Percent Expressing

Dataset-average `%Expressing` computes `%Expressing` separately within each
selected dataset, then averages those dataset-level percentages. Each selected
dataset contributes equally regardless of cell count.

This asks: how consistently is this gene expressed across independent studies?

### Cell-Pooled Percent Expressing

Cell-pooled `%Expressing` pools all eligible cells across the selected datasets,
then divides total expressing cells by total eligible cells. Larger datasets
contribute more cells.

This asks: what fraction of all selected cells express this gene?

Cells without sample identity are included in this metric when the current
context is whole-dataset or selected-nucleus only. They are excluded from
sample-, replicate-, condition-, and true pseudobulk-scoped versions.

### Dataset-Average Mean Expression

Dataset-average mean expression computes mean log-normalized expression among
positive cells within each selected dataset, then averages those dataset-level
means. Each detected selected dataset contributes equally.

### Cell-Pooled Mean Expression

Cell-pooled mean expression pools all positive eligible cells across selected
datasets, then averages their log-normalized expression values. Larger datasets
contribute more positive cells.

### Cell-Type Grouping

Cell-type grouped rows use the same formulas as the parent view, but each row's
eligible cells are restricted to one value of the approved grouping column.
Blank grouping values are reported as unannotated/out of scope for the grouped
view, not assigned to a named cell type.

### Dataset Detection

A dataset detects the gene if at least one eligible cell in that dataset has at
least 1 raw count for the queried gene.

## Required Data Inputs

Faithful implementation requires:

1. A raw-count expression matrix for positivity, positive cell count, percent
   expressing, and dataset detection.
2. A generated log-normalized expression matrix for mean expression and
   expression distribution, computed from raw counts using Seurat `LogNormalize`
   with scale factor `10000`.
3. Cell metadata defining the current context, including dataset membership and
   any selected biological scope such as nucleus.
4. Gene identifiers sufficient to resolve the queried gene consistently across
   datasets.
5. For grouped views, an explicitly approved grouping column. The app must not
   infer or merge grouping columns without approval.

## Processed Dataset Audit

Audit date: 2026-07-17.

### GSE207736, Dowsett10xnuc

Available processed files:

- matrix shape: 39,953 cells x 55,399 genes
- matrix orientation: cells x genes
- expression value type: `raw_counts`
- matrix dtype: `int64`
- nonzero values are integer-like and nonnegative in the audited matrix
- `cells.csv` rows: 39,953
- `genes.csv` rows: 55,399
- `samples.csv` rows: 6

Annotation availability:

- native `major_cell_type`, `cell_type`, and `cluster_id` are empty
- study-level `region` is populated as `Hypothalamus` for all cells
- optional HypoMap fields are present
- `hypomap_included` is populated for all cells
- `hypomap_region` is populated for 26,536 cells
- `hypomap_C7` through `hypomap_C465` are populated for 35,945 atlas-included
  cells

Supported now:

- positive cell count from raw counts
- percent expressing from raw counts
- dataset detection from raw counts
- whole-hypothalamus eligible-cell denominator
- selected-nucleus metrics for cells with populated `hypomap_region`
- mean expression from the verified Seurat LogNormalize matrix
- expression distribution from the verified Seurat LogNormalize matrix

Not supported:

- treating blank `hypomap_region` cells as part of any selected nucleus

### GSE172461, Rupp10x

Available processed files:

- matrix shape: 41,156 cells x 31,053 genes
- matrix orientation: cells x genes
- expression value type: `raw_counts`
- matrix dtype: `int64`
- nonzero values are integer-like and nonnegative in the audited matrix
- `cells.csv` rows: 41,156
- `genes.csv` rows: 31,053
- `samples.csv` rows: 4

Annotation availability:

- `major_cell_type` and `cell_type` are populated for 36,523 cells
- `cluster_id` is populated for 23,261 cells
- `sample_id` is populated for all 41,156 cells after validated suffix-based
  repair
- 4,633 cells did not join the shipped per-cell metadata; their `sample_id` and
  inherited `condition` are repaired from the Cell Ranger aggregate suffix map,
  while native cell type and cluster annotations remain blank
- study-level `region` is populated as `Mediobasal Hypothalamus` for all cells
- optional HypoMap fields are present after sidecar enrichment
- `hypomap_included` is populated for all cells
- `hypomap_region` is populated for 19,554 cells after exact atlas-to-import
  joining

Supported now:

- positive cell count from raw counts
- percent expressing from raw counts
- dataset detection from raw counts
- whole-hypothalamus eligible-cell denominator
- selected-nucleus metrics for cells with populated `hypomap_region`
- mean expression from the verified Seurat LogNormalize matrix
- expression distribution from the verified Seurat LogNormalize matrix

Not supported:

- treating blank `hypomap_region` cells as part of any selected nucleus

Implementation note:

- `docs/GSE172461_SAMPLE_ID_REPAIR.md` documents the repair. The 4,633 repaired
  cells are eligible for sample- and condition-scoped metrics with respect to
  sample identity, but they remain excluded from native cell-type/cluster groups
  because those biological annotations were not present in the source metadata.

### GSE93374, CampbellDropseq

Available processed files:

- matrix shape: 21,086 cells x 26,774 genes
- matrix orientation: cells x genes
- expression value type: `raw_counts`
- matrix dtype: `float32`
- nonzero values are integer-like and nonnegative in the audited matrix
- `cells.csv` rows: 21,086
- `genes.csv` rows: 26,774
- `samples.csv` rows: 11

Annotation availability:

- `major_cell_type` and `cell_type` are populated for 20,921 cells
- `cluster_id` is populated for all 21,086 cells
- study-level `region` is populated as `Arcuate Nucleus/Median Eminence` for all
  cells
- `sample_id` is populated for all cells
- optional HypoMap fields are present after sidecar enrichment
- `hypomap_included` is populated for all cells
- `hypomap_region` is populated for 8,148 cells after exact atlas-to-import
  joining

Supported now:

- positive cell count from raw counts
- percent expressing from raw counts
- dataset detection from raw counts
- whole-hypothalamus eligible-cell denominator
- selected-nucleus metrics for cells with populated `hypomap_region`
- mean expression from the verified Seurat LogNormalize matrix
- expression distribution from the verified Seurat LogNormalize matrix

Not supported:

- treating blank `hypomap_region` cells as part of any selected nucleus

Implementation watch-out:

- The raw-count matrix is stored as `float32`, although audited nonzero values
  are integer-like. Positivity remains computable with `>= 1`, but validation
  should preserve or verify integer-like raw counts before relying on this
  dataset for raw-count thresholds.
- HypoMap sidecar enrichment currently exact-matches 14,286 of 20,889 atlas
  cells to imported cells. Many unmatched Campbell barcodes contain Drop-seq
  ambiguity (`N`) differences between source files and atlas obs. Do not use
  wildcard barcode matching unless a separate validation proves it is safe.

## Cross-Dataset Consistency Audit

### Raw Counts

All three processed datasets currently provide `expression_metadata.json` with
`value_type = raw_counts` and `orientation = cells_x_genes`.

This supports:

- positive cell count
- percent expressing
- dataset detection
- cell-pooled percent expressing
- dataset-average percent expressing, for whole-dataset contexts

### Log-Normalized Expression

Canonical method: Seurat `LogNormalize`.

For every cell and gene:

```text
library_size(cell) = sum(raw_count(cell, all genes))
log_normalized_expression(cell, gene) =
  ln(1 + raw_count(cell, gene) / library_size(cell) * 10000)
```

The implementation must:

- compute from the imported raw-count matrix
- use scale factor `10000`
- use natural-log `log1p`
- preserve cells x genes orientation and the same `cells.csv` / `genes.csv`
  ordering
- record provenance in expression metadata, including source value type,
  normalization method, scale factor, and log base/function
- validate that cell library sizes are positive before division
- keep the generated log-normalized matrix as a separate derived layer from the
  raw-count importer output
- independently regenerate the derived layer from the recorded raw source and
  confirm it matches the stored log-normalized matrix within the documented
  numeric tolerance before app metrics use it

Minimum required metadata for the derived layer:

```text
value_type = log_normalized
source_matrix = raw_counts
source_value_type = raw_counts
normalization_method = Seurat LogNormalize
scale_factor = 10000
log_transform = log1p
log_base = natural
```

Validation requirement:

```text
regenerated_log_matrix =
  log1p(raw_count_matrix / row_sums(raw_count_matrix) * 10000)

stored_log_matrix ~= regenerated_log_matrix
```

The comparison must verify identical shape, row order, column order, and numeric
agreement within a declared absolute and/or relative tolerance. Any mismatch is
a blocker for mean expression and expression distribution.

As of 2026-07-20, all three target processed datasets provide verified generated
Seurat LogNormalize layers:

- `GSE207736`: `expression_matrix_lognormalized.npz`, verification passed, max
  absolute difference 0.0 and max relative difference 0.0
- `GSE172461`: `expression_matrix_lognormalized.npz`, verification passed, max
  absolute difference 0.0 and max relative difference 0.0
- `GSE93374`: `expression_matrix_lognormalized.npz`, verification passed, max
  absolute difference 0.0 and max relative difference 0.0

Mean expression and expression distribution may use these verified layers for
gene queries that resolve to dataset-specific matrix columns. The UI must not
substitute raw counts, normalized counts, scaled values, or modeled values if a
verified log-normalized layer is missing or fails validation.

### Selected-Dataset Filtering

All cross-dataset metrics operate only on the currently selected dataset set.
Let `S` be the selected dataset IDs.

```text
eligible cells for cross-dataset metrics =
  cells where dataset_id is in S
  and all non-dataset context filters are satisfied
```

Changing `S` must recompute:

- total eligible cells
- positive cell count
- percent expressing
- dataset detection count
- dataset-average summaries
- cell-pooled summaries
- per-dataset bars/cards
- grouped cell-type rows and cell-type x dataset dot-matrix values, once the
  grouped view is wired

If `S` is empty, metrics are undefined and must be displayed as unavailable,
not as zero.

### Gene Identifiers

Gene identifier consistency is incomplete:

- GSE207736 has Ensembl-style gene IDs and gene symbols.
- GSE172461 and GSE93374 are effectively symbol-only.
- All-dataset gene-symbol intersection in the current processed outputs is
  20,685 symbols.
- Example alias drift exists: `Ccn1` is present in GSE207736 but not GSE172461
  or GSE93374; `Cyr61` is present in GSE172461 and GSE93374 but not GSE207736.

This is handled by the generated MGI-backed harmonization layer described below.

Genome build is not the apparent cause for this discrepancy in the three
currently processed datasets. The local GEO SOFT provenance records all three as
mm10 / GRCm38:

- GSE207736: Cell Ranger v5.0.1, `Assembly: mm10`
- GSE172461: `Genome_build: GRCm38`
- GSE93374: `Genome_build: mm10 (GRCm38)`

The observed discrepancy is therefore attributed to different mm10 annotation
releases and gene-symbol vintages, not mm9 vs. mm10 alignment. For example,
`Ccn1` is the newer symbol for the same gene historically represented as
`Cyr61` in older annotations.

Implemented policy:

- exact symbol matching behavior
- case-sensitivity behavior
- duplicate symbol behavior after R-style suffixing
- alias mapping source and precedence, if aliases are supported
- how to report datasets where the queried gene cannot be resolved

#### Gene Harmonization Layer

Cross-dataset gene lookup must use a separate harmonization layer. Do not rewrite
the imported `genes.csv` files to current symbols, because those files are
provenance records of what each dataset shipped.

Recommended architecture:

```text
processed/<dataset>/genes.csv
        +
external mouse gene synonym source
        ->
gene_harmonization table
        ->
query resolver used by metric computation
```

The harmonization table is a generated, provenance-tracked artifact at:

```text
gene_harmonization/gene_harmonization.csv
gene_harmonization/gene_harmonization.provenance.json
```

It is generated by:

```bash
python3 tools/build_gene_harmonization.py
```

It contains enough information to explain every match used by the UI and metric
code.

Required columns:

- `canonical_gene_id`
- `canonical_symbol`
- `alias_symbol`
- `dataset_id`
- `dataset_gene_id`
- `dataset_gene_symbol`
- `match_type`
- `source`
- `source_version_or_date`

Example rows:

```text
canonical_gene_id,canonical_symbol,alias_symbol,dataset_id,dataset_gene_id,dataset_gene_symbol,match_type
ENSMUSG00000028195,Ccn1,Ccn1,GSE207736,ENSMUSG00000028195,Ccn1,ensembl_current_symbol
ENSMUSG00000028195,Ccn1,Cyr61,GSE172461,Cyr61,Cyr61,alias_previous_symbol
ENSMUSG00000028195,Ccn1,Cyr61,GSE93374,Cyr61,Cyr61,alias_previous_symbol
```

Implemented external source:

- MGI `MRK_List1.rpt.gz` for official symbols, withdrawn symbols, and synonyms.
- MGI `MGI_Gene_Model_Coord.rpt` for MGI-to-Ensembl gene ID mapping.

Resolution rules:

1. Preserve each dataset's imported gene rows unchanged.
2. Resolve the user query to a canonical mouse gene using exact current symbol,
   previous symbol, or synonym matches from the approved harmonization source.
3. Exact current-symbol matches take precedence over alias matches.
4. If a query or alias maps to multiple canonical genes, stop and return an
   ambiguity state listing candidate official symbols and stable identifiers; do
   not choose one silently.
5. For each dataset, resolve the canonical gene to the dataset-specific
   `genes.csv` row.
6. If a dataset has no resolvable row for that canonical gene, mark the dataset
   as `gene_not_found`; do not treat it as zero expression.
7. If multiple rows in one dataset map to the same canonical gene, stop and flag
   a duplicate mapping unless a dataset-specific rule has been documented to
   safely combine those rows.

UI requirements:

- Display the queried canonical symbol as the main gene identity.
- If the query resolver returns multiple official genes, display a
  disambiguation state with candidate symbols and stable identifiers, and do not
  compute or display expression metrics until the user selects one.
- When a dataset uses an older or alternate symbol, show that mapping clearly,
  for example: `matched as Cyr61 in GSE172461`.
- "How it's calculated" text for cross-dataset metrics must be able to disclose
  when dataset-specific alias matching was used.

Implementation gate:

- Cross-dataset lookup may proceed when `tools/resolve_gene_query.py` returns
  `state = resolved`.
- Alias-drift genes, such as `Ccn1` / `Cyr61`, may proceed when the resolver
  maps all required datasets or explicitly marks missing datasets as
  `gene_not_found`.
- If the resolver returns `disambiguation_required`, metric computation must
  stop and the UI must show candidate official symbols and stable identifiers.
- If the resolver returns `gene_not_found`, metric computation must stop for the
  query or affected dataset; unresolved genes are not zero expression.
- If the resolver returns `duplicate_dataset_mapping`, metric computation must
  stop until a documented dataset-specific duplicate handling rule exists.

### Annotation Availability

Whole-dataset metrics can be computed across all three target datasets.

Selected-nucleus metrics can be computed across all three target datasets only
for cells with populated `hypomap_region` from the integrated HypoMap atlas.
Cells with blank `hypomap_region` are retained in expression data but are not
eligible for a selected-nucleus context.

- GSE207736 has `hypomap_region` for 26,536 imported cells.
- GSE172461 has `hypomap_region` for 19,554 imported cells.
- GSE93374 has `hypomap_region` for 8,148 imported cells.

Selected-nucleus denominator:

```text
#Eligible Cells_nucleus =
  count(cells in selected datasets where hypomap_region == selected_nucleus)
```

Blank-region cells must be retained in the dataset and reported as lacking the
selected-nucleus annotation; they are not eligible for any named selected
nucleus. The UI should show per-dataset annotation coverage beside spatial
metrics so users can see how much of each dataset supports nucleus-scoped
calculation.

The canonical coverage report is:

```text
annotation_coverage_report.json
```

Regenerate with:

```bash
python3 tools/build_annotation_coverage_report.py
```

Current blank-annotation counts:

| Dataset | Blank `hypomap_region` | Blank `hypomap_C25` | Blank `sample_id` |
|---|---:|---:|---:|
| `GSE207736` | 13,417 | 4,008 | 0 |
| `GSE172461` | 21,602 | 7,850 | 0 |
| `GSE93374` | 12,938 | 6,800 | 0 |

Metric code must surface these counts where relevant:

- blank `hypomap_region`: retained in whole-dataset denominators; excluded from
  named selected-nucleus denominators; reported as unannotated/out of scope
- blank `hypomap_C25`: retained in parent whole-dataset/spatial denominators;
  excluded from named By cell type rows; reported as unannotated/out of scope
- blank `sample_id`: currently 0 for the three target datasets; if future
  datasets contain blanks, retain them in whole-dataset metrics where sample
  identity is not required and exclude them from sample-, replicate-,
  condition-, and true pseudobulk-scoped metrics until repaired

## Implementation Gate

The following metrics are approved for implementation from current processed
outputs for whole-dataset contexts:

- positive cell count
- percent expressing
- dataset detection
- Mode A dataset-average percent expressing
- Mode B cell-pooled percent expressing
- selected-nucleus versions of the above, using `hypomap_region` where populated
- By cell type versions of the raw-count metrics above, grouped by `hypomap_C25`
- mean expression, using verified Seurat LogNormalize matrices
- expression distribution, using verified Seurat LogNormalize matrices
- cross-dataset gene lookup for exact-symbol and alias-drift genes when the
  harmonization resolver returns `state = resolved`
- any pair of distinct genes from `Pomc`, `Agrp`, `Ccn1`, `Fam237b`, and `Npy` for the
  selected annotated HypoMap region, using cell-pooled per-dataset integer counts

Stop and resolve the relevant blocker before implementing any unsupported
metric.
