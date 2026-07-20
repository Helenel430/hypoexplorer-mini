# GSE172461 Sample Identity Repair

Date: 2026-07-20

This document records the provenance check and importer decision used to fill
blank `sample_id` and inherited `condition` values for GSE172461 / Rupp10x.

## Problem

The processed GSE172461 matrix has 41,156 cells, but the shipped per-cell
metadata file (`GSE172461_metadata.csv.gz`) contains 36,534 rows. After exact
cell-id joining, 36,523 matrix cells matched source metadata and 4,633 matrix
cells had blank `sample_id`.

Those 4,633 cells must be retained. They have real expression counts and remain
eligible for expression metrics where their context is known. The question was
whether their sample identity could be safely inherited from the Cell Ranger
aggregate barcode suffix.

## Source Files Checked

- `GSE172461_barcodes.tsv.gz`
- `GSE172461_metadata.csv.gz`
- `archive/GSE172461_sample_metadata.csv`
- current importer output: `processed/GSE172461/cells.csv`

Barcode tokens are quoted in the raw barcode file, so validation strips
surrounding quotes before comparing identifiers. GSE172461 uses Cell Ranger
aggregate suffixes:

- sample 1: ordinary 10x barcode form, for example `AAAC...-1`
- samples 2-4: aggregate form, for example `AAAC...-1-2`,
  `AAAC...-1-3`, `AAAC...-1-4`

The repair parser therefore treats `-1-<n>` as aggregate suffix `<n>`, and a
plain terminal `-1` as aggregate suffix `1`.

## Provenance Checks

### Source Metadata

The source metadata has 36,534 unique `ID` values.

`suffix x Sample`:

| suffix | Sample_871-AA-1 | Sample_871-AA-2 | Sample_987-AA-1 | Sample_987-AA-2 |
|---|---:|---:|---:|---:|
| 1 | 9,484 | 0 | 0 | 0 |
| 2 | 0 | 8,352 | 0 | 0 |
| 3 | 0 | 0 | 8,902 | 0 |
| 4 | 0 | 0 | 0 | 9,796 |

`suffix x Treatment`:

| suffix | Saline | Insulin |
|---|---:|---:|
| 1 | 9,484 | 0 |
| 2 | 0 | 8,352 |
| 3 | 8,902 | 0 |
| 4 | 0 | 9,796 |

`Sample x Treatment`:

| Sample | Treatment |
|---|---|
| `Sample_871-AA-1` | `Saline` |
| `Sample_871-AA-2` | `Insulin` |
| `Sample_987-AA-1` | `Saline` |
| `Sample_987-AA-2` | `Insulin` |

The mapping is one-to-one: every aggregate suffix maps to exactly one source
`Sample`, and every source `Sample` maps to exactly one `Treatment`.

### Raw Barcode Coverage

The raw barcode file has 41,156 unique cells.

| suffix | raw barcode count |
|---|---:|
| 1 | 10,410 |
| 2 | 9,085 |
| 3 | 10,719 |
| 4 | 10,942 |

There are 4,633 raw barcodes without a matching row in
`GSE172461_metadata.csv.gz`:

| suffix | raw barcodes without source metadata |
|---|---:|
| 1 | 937 |
| 2 | 733 |
| 3 | 1,817 |
| 4 | 1,146 |

There are also 11 source metadata IDs absent from the raw barcode file, all in
suffix 1. These cannot be imported because they are not matrix cells.

### Processed Output Before Repair

Among cells that did join source metadata, suffix-to-sample assignment was
already perfectly one-to-one:

| suffix | Sample_871-AA-1 | Sample_871-AA-2 | Sample_987-AA-1 | Sample_987-AA-2 |
|---|---:|---:|---:|---:|
| 1 | 9,473 | 0 | 0 | 0 |
| 2 | 0 | 8,352 | 0 | 0 |
| 3 | 0 | 0 | 8,902 | 0 |
| 4 | 0 | 0 | 0 | 9,796 |

The 4,633 blank-`sample_id` cells had the same aggregate suffix distribution as
the raw barcodes without source metadata.

## Decision

The importer now repairs GSE172461 `sample_id` for cells with blank sample
identity by applying the validated source metadata suffix map:

| suffix | repaired `sample_id` | inherited `condition` |
|---|---|---|
| 1 | `Sample_871-AA-1` | `Saline` |
| 2 | `Sample_871-AA-2` | `Insulin` |
| 3 | `Sample_987-AA-1` | `Saline` |
| 4 | `Sample_987-AA-2` | `Insulin` |

The importer validates that the suffix-to-sample and sample-to-treatment maps
are one-to-one before filling values. If a future source file violates that
assumption, import stops with an error rather than making a guess.

## Explicit Non-Decisions

The repair does not infer native cell biology for source-missing cells.

For the 4,633 cells without source metadata rows:

- `sample_id` is filled from the validated suffix map
- `condition` is inherited from the repaired sample
- `major_cell_type` remains blank
- `cell_type` remains blank
- `cluster_id` remains blank
- existing `hypomap_*` annotations remain whatever the HypoMap sidecar provides

In other words, these cells are now eligible for sample- and condition-scoped
metrics with respect to sample identity, but they remain partially annotated
cells for native cell type/cluster fields.

## Post-Repair Validation

After rerunning `python3 -m importer GSE172461`:

- total cells: 41,156
- blank `sample_id`: 0
- blank `condition`: 0
- `samples.csv` rows: 4
- cell sample IDs resolve to `samples.csv`: passed
- metadata join coverage remains 36,523 / 41,156
- warning retained: 4,633 matrix cells have no metadata row

Post-repair `suffix x sample_id`:

| suffix | Sample_871-AA-1 | Sample_871-AA-2 | Sample_987-AA-1 | Sample_987-AA-2 |
|---|---:|---:|---:|---:|
| 1 | 10,410 | 0 | 0 | 0 |
| 2 | 0 | 9,085 | 0 | 0 |
| 3 | 0 | 0 | 10,719 | 0 |
| 4 | 0 | 0 | 0 | 10,942 |

Post-repair `sample_id x condition`:

| sample_id | Saline | Insulin |
|---|---:|---:|
| `Sample_871-AA-1` | 10,410 | 0 |
| `Sample_871-AA-2` | 0 | 9,085 |
| `Sample_987-AA-1` | 10,719 | 0 |
| `Sample_987-AA-2` | 0 | 10,942 |

The GSE172461 Seurat LogNormalize derived layer was regenerated after repair.
The matrix values are unchanged in principle, but the metadata sidecar and
downstream exports now align with the repaired `cells.csv`. Independent
regeneration verification passed with max absolute and relative difference 0.0.
