# Dataset Summaries

The 18 datasets integrated into HypoMap (384,925 cells total). This is a human-readable rollup
of `HypoMap_study_display_card.csv` merged with the cell-count reconciliation
(`archive/HypoMap_cellcount_vs_original.csv`), the accession classification
(`archive/HypoMap_rawdata_classification.csv`), and importer format notes. The display card
remains the machine-readable source of truth.

## The 18 datasets

Ordered by cell contribution to HypoMap. "Import" = whether the raw expression data has been
run through the importer into `processed/`.

| HypoMap label | Accession | Tech | Cells/nuclei | Region | Cells in HypoMap | Import |
|---|---|---|---|---|---:|:--:|
| Anderson10x | GSE193921 | 10x v3 | cells | Ventromedial hypothalamus | 60,756 | – |
| Kim10x | **Mendeley** 10.17632/ypx3sw2f7c.3 | 10x v2 | cells | Ventromedial hypothalamus | 40,599 | – |
| Dowsett10xnuc | GSE207736 | 10x v3 | nuclei | Hypothalamus | 35,945 | ✅ |
| Rupp10x | GSE172461 | 10x v3 | nuclei | Mediobasal hypothalamus | 33,502 | ✅ |
| Morris10x | GSE167927 | 10x v3 | cells | Suprachiasmatic nucleus | 30,950 | – |
| Moffit10x | GSE113576 | 10x v2 | cells | Preoptic region | 28,035 | – |
| Affinati10x | GSE172204 | 10x v3 | nuclei | Ventromedial hypothalamus | 23,473 | – |
| Mousebrainorg10x | SRP135960 | 10x v2 | cells | Hypothalamus | 21,421 | – |
| CampbellDropseq | GSE93374 | Drop-seq | cells | Arcuate nucleus / median eminence | 20,889 | ✅ |
| Wen10x | GSE132608 | 10x v2 | cells | Suprachiasmatic nucleus | 17,483 | – |
| wenDropseq | GSE117295 | Drop-seq | cells | Suprachiasmatic nucleus | 16,181 | – |
| Flynn10x | GSE146692 | 10x v2 | cells | Ventroposterior hypothalamus | 13,353 | – |
| ChenDropseq | GSE87544 | Drop-seq | cells | Hypothalamus | 13,329 | – |
| RossiDropseq | GSE130597 | Drop-seq | cells | Lateral hypothalamus | 9,292 | – |
| Mickelsen10x | GSE125065 | 10x v2 | cells | Lateral hypothalamus | 8,441 | – |
| KimDev10x | GSE132355 | 10x v2 | cells | Hypothalamus | 6,912 | – |
| LeeDropseq | GSE119960 | Drop-seq | cells | Hypothalamus | 2,212 | – |
| RomanovDev10x | GSE132730 | 10x v2 | cells | Hypothalamus | 2,152 | – |

**Total: 384,925** (matches Supplementary Table 1 exactly.)

Single-nucleus datasets: **Affinati10x, Rupp10x, Dowsett10xnuc**. All others are single-cell.

## Notable per-dataset facts

- **Kim10x** — the 18th dataset. Raw data is a count table on **Mendeley**, not GEO. A
  *different* study from KimDev10x (Kim 2019 *Cell*, VMHvl vs. Kim 2020 *Nat Commun*
  hypothalamic development).
- **KimDev10x (GSE132355)** — source spans E10–P45; HypoMap used **only P45** (~5% kept).
  Embryonic cells excluded.
- **RomanovDev10x (GSE132730)** — source spans E15.5–P23; HypoMap used **only P23** (~4%
  kept). Embryonic cells excluded. *(No raw data fetched — flagged embryonic, skipped.)*
- **Mousebrainorg10x (SRP135960)** — hypothalamus subset (~13%) of the Zeisel et al. 2018
  whole-CNS atlas; 2 libraries unavailable.
- **Moffit10x (GSE113576)** — scRNA-seq portion of a MERFISH study (~90% kept).
- **LeeDropseq (GSE119960)** — IDOL-KO samples dropped; only wild-type retained.
- **Anderson10x (GSE193921)** — VMHvl; HypoMap used virgin females only.
- **Dowsett10xnuc (GSE207736)** — in-house snRNA-seq (Yeo lab), first published in HypoMap;
  fed vs. fasted.

## Import status detail (the 3 processed datasets)

All processed matrices are scipy CSR sparse, **cells × genes**, raw counts. Cell counts here
are the full delivered matrices (before HypoMap's own QC/doublet subsetting, which is why they
exceed the "Cells in HypoMap" column above).

| Dataset | Format | Processed shape (cells × genes) | Notes |
|---|---|---|---|
| GSE207736 | 6 GSM 10x MTX triplets in `GSE207736_RAW/` | 39,953 × 55,399 | sample ids AA3/AB3/AC3/AD3/AG8/AH8; barcodes prefixed `<sample>_<barcode>` |
| GSE172461 | merged 10x triplet + `GSE172461_metadata.csv.gz` | 41,156 × 31,053 | only 36,523 cells annotated (published subset — expected; warns, not fails) |
| GSE93374 | dense Drop-seq DGE + `GSE93374_cell_metadata.txt.gz` | 21,086 × 26,774 | `miss` = unassigned/QC-dropped (~165 cells) |

## Genome build (verified 2026-07-06)

All three imported datasets align to **mm10 (GRCm38)** — none are mm9 — but to **different
annotation releases**, so gene counts and symbols drift:

- GSE207736 = cellranger-5.0.1 (mm10-2020-A); the **only** dataset carrying Ensembl IDs; has
  newer symbols (e.g. `Ccn1`).
- GSE172461 = 31,053 genes ≈ 10x mm10-3.0.0 reference fingerprint; symbol-only; has older
  `Cyr61` (= same gene as `Ccn1`) and `Gm42418`.
- GSE93374 = Campbell 2017 "aligned to mm10 with STAR"; symbol-only; older `Cyr61`.

**Implication:** cross-dataset gene lookup needs **symbol harmonization / alias
reconciliation** (only GSE207736 has Ensembl IDs). Definitive per-sample genome build for any
dataset is in `archive/series_soft/` and `archive/samples_soft/` if local verification is
needed.

## Importer format gotchas (worth remembering)

- **GSE172461** features file is 1-column (symbol only, quoted); barcodes quoted. GSE207736
  features are 3-column (Ensembl / symbol / type). The loader strips quotes and handles both.
- **GSE93374 cell metadata**: the last 3 columns ("All Cell Clusters" / "All Cell
  Subclusters" / "Neuron Subclusters") are **not** per-cell values — they are a compact
  code→name **legend** (only the first ~20–36 rows are populated). Per-cell assignment lives in
  the `clust_all` / `clust_all_micro` / `clust_neurons` code columns; `_enrich_gse93374`
  resolves codes to names. The header has one fewer field than the body (unlabelled
  gene-symbol column) → read with pandas `index_col=0`.
- **GSE207736** per-sample condition (fed vs. fasted) is **not** in the source files — it's in
  the excluded `archive/` folder. So `condition` currently carries the study-level "fed vs
  fasted" for all 6 samples; supply a `--sample-sheet` CSV (`sample_id,condition`) to split it.

See [importer/README.md](importer/README.md) for the loader architecture and how to add a
dataset, and [CURRENT_STATE.md](CURRENT_STATE.md) for what's left to import.
