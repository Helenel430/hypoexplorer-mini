# Archive — provenance & superseded working files

Historical/reference material. Nothing here is required to run the importer; it is kept for
provenance and audit. The active, authoritative files live at the repository root
(`HypoMap_study_display_card.csv`) — see [../README.md](../README.md).

## Contents

| File(s) | What it is | Status |
|---|---|---|
| `HypoMap_rawdata_classification.csv` | Maps the 17 GEO/SRA page accessions → HypoMap labels, with embryonic flags and the basis for each match. | **Reference** — stable; consolidated into [../DATASET_SUMMARIES.md](../DATASET_SUMMARIES.md). |
| `HypoMap_cellcount_vs_original.csv` | Cell-count reconciliation (HypoMap cells vs. originally reported, with kept-fraction mechanism). | **Superseded** — its numbers now live in the display card and DATASET_SUMMARIES.md. |
| `<ACC>_sample_metadata.csv` (16) | Per-sample harmonized metadata with `HM_*` columns — the machine-readable per-sample deliverable. | **Reference** — promote if a per-sample UI view is needed. |
| `<ACC>_sample_metadata.txt` (16) | Human-readable re-renders of the matching `.csv`. | **Redundant** — same information as the `.csv`; safe to delete. |
| `samples_soft/` (per-sample) | Raw GEO SOFT dumps (`targ=gsm`), plus SRP135960 SRA XML/run tables. | **Provenance** — definitive per-sample genome build / fields. |
| `series_soft/` (per-series) | Raw GEO SOFT series-level dumps. | **Provenance**. |
| `GSE132355_{description,raw_soft,samples_raw_soft}.txt` | Raw scratch dumps for the KimDev10x accession. | **Provenance**. |

## Notes

- The per-accession files here cover the datasets **not** yet run through the importer, as well
  as raw provenance for those that have been. See [../CURRENT_STATE.md](../CURRENT_STATE.md)
  for import progress.
- For each accession, the `.csv` is the source of truth; the paired `.txt` is a formatted
  re-render kept only for quick human reading.
