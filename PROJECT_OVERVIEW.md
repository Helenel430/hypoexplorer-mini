# Project Overview

## Background

[HypoMap](https://www.nature.com/articles/s42255-022-00657-y) (Steuernagel et al. 2022,
*Nature Metabolism*) is a unified single-cell transcriptomic atlas of the **murine
hypothalamus**: **384,925 cells** integrated from **18 datasets**. This repository holds the
working files for making that atlas' provenance usable — both a curated metadata layer for an
exploration UI and an importer that standardizes the underlying expression data.

## The two work tracks

### 1. Metadata curation
Produce clean, harmonized, authoritative metadata about each of the 18 contributing studies so
users exploring the atlas can see where every cell came from.

- **Per-study display card** — `HypoMap_study_display_card.csv`: one row per dataset with
  technology, region, sex, age stage, condition, cell counts, subsetting mechanism, and an
  embryonic-data flag. Validated against the paper's Supplementary Table 1 (cell counts sum
  exactly to 384,925).
- **Per-sample metadata** — `<ACC>_sample_metadata.csv` files (in `archive/`) with harmonized
  `HM_*` columns, plus `HypoMap_rawdata_classification.csv` mapping the 17 GEO/SRA page
  accessions to HypoMap labels.

### 2. Importer
A Python package (`importer/`) that converts heterogeneous scRNA-seq GEO downloads into one
standardized, per-dataset backend format for a gene-expression lookup database.

- **Scope guard — conversion + validation ONLY.** No PCA / UMAP / clustering / differential
  expression. This is a deliberate, explicit boundary.
- Design and usage: see [importer/README.md](importer/README.md).

## Authoritative sources

Use these rather than guessing or re-deriving:

| Fact | Source |
|---|---|
| Dataset → accession mapping; curated Technology / Region / Sex / Age | `github.com/lsteuernagel/hypoMap_datasets` → `R/curate_metadata/curate_<Dataset>.R` |
| Cell counts, nbatches, published overview | `github.com/lsteuernagel/hypoMap_paper` → `table_outputs/supplementary_table_1_dataset_overview.csv` and `data_inputs/dataset_overview_inputV2.csv` |
| Per-sample genome build / provenance (if local verification needed) | `archive/series_soft/` and `archive/samples_soft/` (raw GEO SOFT dumps) |

## Hard rules (established, do not re-litigate)

1. **No embryonic cells are in HypoMap.** The two "Dev" datasets contribute adult timepoints
   only — **KimDev10x = P45 only**, **RomanovDev10x = P23 only**. The user does not want
   embryonic data; nothing extra is needed for it.
2. **18 datasets, but the atlas page lists only 17 raw-data links.** The 18th is **Kim10x**
   (Kim et al. 2019, *Cell*, VMHvl), whose raw data is on **Mendeley
   (10.17632/ypx3sw2f7c)**, not GEO. Kim10x is a **different study** from KimDev10x
   (= GSE132355) — not a subset of it.
3. **Importer scope is conversion + validation only** — no analysis steps.
4. `HypoMap_study_display_card.csv` is the single source of truth for study-level metadata and
   must stay at the repository root (the importer reads it by default from there).

## Related documents

- [DATASET_SUMMARIES.md](DATASET_SUMMARIES.md) — the per-dataset detail.
- [CURRENT_STATE.md](CURRENT_STATE.md) — live progress and open work.
- [README.md](README.md) — repository map and quickstart.
