# Shared Processed Dataset Schema

Canonical schema for `processed/<dataset_id>/` outputs consumed by the Gene
Explorer. This is the Phase 2 contract: data files must keep a stable shape, and
missing annotations must remain explicit rather than causing cells, columns, or
datasets to disappear.

Last updated: 2026-07-20

## Output Layout

Each processed dataset directory contains exactly:

```text
processed/<dataset_id>/
  dataset.json
  samples.csv
  cells.csv
  genes.csv
  expression_matrix.npz
  expression_metadata.json
```

Matrix orientation is always cells x genes. Row order matches `cells.csv`;
column order matches `genes.csv`.

Generated derived expression layers may add sibling files without modifying the
raw-count importer output:

```text
processed/<dataset_id>/
  expression_matrix_lognormalized.npz
  expression_metadata_lognormalized.json
```

These files are reproducible derived artifacts, not importer outputs. They must
record their raw source and pass independent regeneration validation before app
metrics use them.

## dataset.json

Required keys:

| Field | Meaning |
|---|---|
| `dataset_id` | Importer dataset ID, usually the GEO accession. |
| `title` | Human-readable dataset/study title. |
| `species` | Species name. |
| `tissue` | Study-level tissue or anatomical source. |
| `technology` | Sequencing technology. |
| `publication` | Publication label. |
| `source` | Source accession or repository. |

Allowed extra keys currently emitted from the display card:

| Field | Meaning |
|---|---|
| `hypomap_label` | HypoMap dataset label. |
| `cells_or_nuclei` | Whether source assays measured cells or nuclei. |

## samples.csv

Canonical columns, in order:

| Column | Required | Missing value | Meaning |
|---|---:|---|---|
| `sample_id` | Yes | Not allowed in `samples.csv` | Importer sample/library ID. |
| `dataset_id` | Yes | Not allowed | Dataset ID matching `dataset.json`. |
| `condition` | No | blank | Sample-level condition where known. |
| `age` | No | blank | Sample-level age/stage where known. |
| `sex` | No | blank | Sample-level sex where known. |
| `technology` | No | blank | Sample-level technology, usually inherited from study card. |

`sample_id` values must be unique. Cells may have blank `sample_id` only when a
source metadata join is known to be partial; such cells remain eligible for
whole-dataset metrics where sample identity is not required. They are excluded
from sample-, replicate-, condition-, and true pseudobulk-scoped metrics until
`sample_id` is repaired. They must be preserved and reported, not silently
dropped.

## cells.csv

Canonical columns, in order:

### Identity And Sample Context

| Column | Required | Missing value | Meaning |
|---|---:|---|---|
| `cell_id` | Yes | Not allowed | Stable row ID matching matrix row order. |
| `dataset_id` | Yes | Not allowed | Dataset ID matching `dataset.json`. |
| `sample_id` | Conditional | blank allowed | Source sample/library ID. |
| `condition` | No | blank | Cell-level or sample-inherited condition. |

### Native Source Annotations

These fields come from the GEO/native study files or the study display card.
They must not be overwritten by HypoMap atlas annotations.

| Column | Required | Missing value | Meaning |
|---|---:|---|---|
| `major_cell_type` | No | blank | Native broad cell class where shipped. |
| `cell_type` | No | blank | Native fine cell type where shipped. |
| `cluster_id` | No | blank | Native cluster or subcluster ID where shipped. |
| `region` | No | blank | Native/study-level anatomical region. |

### External HypoMap Atlas Annotations

These fields come from optional HypoMap atlas sidecars built from CellxGene /
`hypomap.h5ad` obs metadata. They are always emitted as columns, even when no
sidecar was available.

| Column | Required | Missing value | Meaning |
|---|---:|---|---|
| `hypomap_included` | No | blank, `True`, or `False` | Whether this imported cell matched a HypoMap atlas cell. Blank means no sidecar was applied. |
| `hypomap_region` | No | blank | `Region_summarized` from HypoMap atlas. |
| `hypomap_author_cell_type` | No | blank | `Author_CellType` from HypoMap atlas. |
| `hypomap_C7` | No | blank | Coarsest HypoMap cluster hierarchy label. |
| `hypomap_C25` | No | blank | HypoMap C25 hierarchy label. |
| `hypomap_C66` | No | blank | HypoMap C66 hierarchy label. |
| `hypomap_C185` | No | blank | HypoMap C185 hierarchy label. |
| `hypomap_C286` | No | blank | HypoMap C286 hierarchy label. |
| `hypomap_C465` | No | blank | Finest HypoMap cluster hierarchy label. |

Graceful degradation rules:

- Blank native annotation means the source did not provide that value or the
  native metadata join did not cover that cell.
- `hypomap_included=False` means the cell is present in imported expression data
  but absent from the HypoMap atlas sidecar, typically because HypoMap QC removed
  it.
- Blank `hypomap_region` with `hypomap_included=True` means the atlas matched the
  cell but did not assign a summarized region.
- Cells with blank `hypomap_region` are not eligible for selected-nucleus metrics
  but remain eligible for whole-dataset metrics.
- Cells with blank `sample_id` remain eligible for whole-dataset metrics when
  sample identity is not required. They are not eligible for sample-scoped,
  replicate-scoped, condition-scoped, or true pseudobulk-scoped metrics until
  sample identity is repaired.
- The FVP By cell type view groups by `hypomap_C25` by default. Cells with blank
  `hypomap_C25` are not assigned to a named grouped row; they remain in parent
  whole-dataset/spatial denominators when the parent view is not grouped, and
  must be reported as unannotated/out of scope for grouped summaries.
- No metric code may silently drop cells from whole-dataset denominators because
  annotations are missing.

## genes.csv

Canonical columns, in order:

| Column | Required | Missing value | Meaning |
|---|---:|---|---|
| `gene_id` | Yes | Not allowed | Dataset-native gene ID. May be Ensembl or symbol-only, depending on source. |
| `gene_symbol` | Yes | Not allowed | Dataset-native gene symbol, made unique if needed. |
| `species` | No | blank | Species name. |

Gene tables preserve source provenance. Cross-dataset synonym resolution belongs
in a separate harmonization layer; do not rewrite imported `genes.csv` symbols to
newer aliases.

## gene_harmonization.csv

Generated post-import artifact:

```text
gene_harmonization/gene_harmonization.csv
gene_harmonization/gene_harmonization.provenance.json
```

This table maps dataset-native gene rows to canonical MGI genes without changing
`processed/<dataset_id>/genes.csv`.

Canonical columns, in order:

| Column | Required | Meaning |
|---|---:|---|
| `canonical_gene_id` | Yes | MGI stable marker accession ID for the official gene. |
| `canonical_symbol` | Yes | Current official MGI gene symbol. |
| `alias_symbol` | Yes | Dataset symbol or matched alias used for this row. |
| `dataset_id` | Yes | Processed dataset ID. |
| `dataset_gene_id` | Yes | Dataset-native `genes.csv` `gene_id`. |
| `dataset_gene_symbol` | Yes | Dataset-native `genes.csv` `gene_symbol`. |
| `match_type` | Yes | `ensembl_gene_id`, `dataset_current_symbol`, or `dataset_alias_symbol`. |
| `source` | Yes | Harmonization source. |
| `source_version_or_date` | Yes | Source/report date or download date. |

Resolver states:

- `resolved`: one official gene was selected and each dataset either maps or is
  explicitly `gene_not_found`.
- `disambiguation_required`: the query maps to multiple official MGI genes. Stop
  before metrics and show candidate official symbols/stable IDs.
- `gene_not_found`: the query or affected dataset has no resolvable gene row. Do
  not treat this as zero expression.
- `duplicate_dataset_mapping`: more than one dataset row maps to the canonical
  gene. Stop until a dataset-specific duplicate handling rule exists.

## annotation_coverage_report.json

Generated post-import audit artifact:

```text
annotation_coverage_report.json
```

Regenerate with:

```bash
python3 tools/build_annotation_coverage_report.py
```

This report exists to make missing annotations explicit for the UI and metric
code. It records, per dataset:

- total imported cells
- nonblank and blank `hypomap_region`
- nonblank and blank `hypomap_C25`
- nonblank and blank `sample_id`
- whole-dataset denominator cells
- metric-handling rules for blank spatial/sample annotations

Blank annotation rows are retained in `cells.csv` and reported here. Metric code
must not infer that blank rows should be removed from whole-dataset denominators.

## expression_metadata.json

Canonical keys:

| Key | Required | Meaning |
|---|---:|---|
| `orientation` | Yes | Must be `cells_x_genes`. |
| `value_type` | Yes | One of `raw_counts`, `normalized`, `log_normalized`. |
| `n_cells` | Yes | Matrix row count. |
| `n_genes` | Yes | Matrix column count. |
| `nnz` | Yes | Number of stored nonzero values. |
| `shape` | Yes | `[n_cells, n_genes]`. |
| `row_order` | Yes | Must be `cells.csv`. |
| `col_order` | Yes | Must be `genes.csv`. |
| `matrix_format` | Yes | Must be `csr` for current outputs. |
| `dtype` | Yes | Matrix storage dtype. |

For `value_type=raw_counts`, stored values must be nonnegative and integer-like.

For `value_type=log_normalized`, the canonical FVP normalization is Seurat
`LogNormalize` with scale factor `10000`, generated from the corresponding
raw-count matrix:

```text
log_normalized_expression(cell, gene) =
  ln(1 + raw_count(cell, gene) / sum(raw_count(cell, all genes)) * 10000)
```

Additional required metadata keys for generated log-normalized matrices:

| Key | Required | Meaning |
|---|---:|---|
| `source_value_type` | Yes | Must be `raw_counts`. |
| `normalization_method` | Yes | Must be `Seurat LogNormalize`. |
| `scale_factor` | Yes | Must be `10000`. |
| `log_transform` | Yes | Must be `log1p`. |
| `log_base` | Yes | Must be `natural`. |
| `source_matrix` | Yes | Path or identifier for the raw-count matrix used. |
| `source_expression_metadata` | Yes | Path or identifier for the raw-count metadata used. |
| `source_matrix_checksum` | Yes | Checksum of the raw-count matrix file used. |
| `normalization_axis` | Yes | Must be `per_cell`. |
| `verification_method` | Yes | Must describe independent regeneration from raw counts. |
| `verification_atol` | Yes | Absolute tolerance used for matrix comparison. |
| `verification_rtol` | Yes | Relative tolerance used for matrix comparison. |
| `verification_status` | Yes | Must be `passed` before app metrics use the layer. |

Derived matrix validation:

- independently reload the raw-count matrix named by `source_matrix`
- verify raw metadata still reports `value_type=raw_counts`
- recompute Seurat LogNormalize from raw counts using the recorded parameters
- confirm cells x genes shape, row order, and column order match the stored
  log-normalized matrix
- compare stored values to regenerated values using the recorded tolerances
- fail validation if the source checksum, shape/order checks, or numeric
  comparison fail

The log-normalized matrix is a reproducible derived layer. It should be produced
outside the importer’s raw conversion path so importer outputs remain auditable
raw-count artifacts.

## expression_matrix.npz

Sparse scipy CSR matrix.

Required invariants:

- shape is `n_cells x n_genes`
- row `i` corresponds to row `i` of `cells.csv`
- column `j` corresponds to row `j` of `genes.csv`
- raw-count matrices must store nonnegative integer-like values

## Current Annotation Coverage

As of 2026-07-17, after HypoMap sidecar enrichment:

| Dataset | Imported cells | `hypomap_included=True` | nonblank `hypomap_region` |
|---|---:|---:|---:|
| `GSE207736` | 39,953 | 35,945 | 26,536 |
| `GSE172461` | 41,156 | 33,306 | 19,554 |
| `GSE93374` | 21,086 | 14,286 | 8,148 |

These coverage differences are expected to surface in the UI. They must not be
hidden by silently filtering unmatched cells out of whole-dataset calculations.

Current blank-annotation counts, from `annotation_coverage_report.json`:

| Dataset | Blank `hypomap_region` | Blank `hypomap_C25` | Blank `sample_id` |
|---|---:|---:|---:|
| `GSE207736` | 13,417 | 4,008 | 0 |
| `GSE172461` | 21,602 | 7,850 | 0 |
| `GSE93374` | 12,938 | 6,800 | 0 |

## Current Derived Expression Coverage

As of 2026-07-20, Seurat LogNormalize derived matrices have been generated for
the three target datasets by `tools/build_lognormalized_layer.py`.

| Dataset | Shape | nnz | dtype | Verification |
|---|---:|---:|---|---|
| `GSE207736` | 39,953 x 55,399 | 120,130,850 | `float32` | passed; max abs diff 0.0; max rel diff 0.0 |
| `GSE172461` | 41,156 x 31,053 | 120,966,482 | `float32` | passed; max abs diff 0.0; max rel diff 0.0 |
| `GSE93374` | 21,086 x 26,774 | 40,695,355 | `float32` | passed; max abs diff 0.0; max rel diff 0.0 |

Known partial-native-annotation limitation:

- `GSE172461` has 4,633 imported expression cells that did not join to the
  shipped per-cell metadata. Their `sample_id` and inherited `condition` are
  repaired from the validated Cell Ranger aggregate suffix map documented in
  `docs/GSE172461_SAMPLE_ID_REPAIR.md`. Native `major_cell_type`, `cell_type`,
  and `cluster_id` remain blank for those cells.
