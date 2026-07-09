# scRNA-seq GEO Importer

Converts heterogeneous single-cell RNA-seq GEO downloads into one standardized,
per-dataset backend format for a gene-expression lookup database.

**Scope:** file conversion + validation only. No PCA/UMAP/clustering/DE.

## Install

```bash
pip install -r requirements.txt   # scipy, numpy, pandas
```

## Usage

```bash
python -m importer <dataset_id> [--input DIR] [--out DIR]
                   [--card FILE] [--sample-sheet FILE] [--strict]
```

Run from the folder holding the source files (the default `--input` is `.`).

```bash
python -m importer GSE207736      # 6-sample 10x MTX (primary target)
python -m importer GSE172461      # merged 10x MTX + per-cell metadata
python -m importer GSE93374       # dense Drop-seq DGE + per-cell metadata
```

| Flag | Meaning |
|---|---|
| `--input` | Root folder containing the dataset's source files (default `.`). A dataset may live in a subfolder — see `subdir` in the registry (e.g. GSE207736 → `GSE207736_RAW/`). |
| `--out` | Output root (default `processed`). Writes `processed/<dataset_id>/`. |
| `--card` | Path to `HypoMap_study_display_card.csv` (study-level metadata source). |
| `--sample-sheet` | Optional CSV keyed by `sample_id` whose columns (e.g. `condition`) override sample fields. |
| `--strict` | Fail (instead of warn) if any matrix cell has no metadata row. |

## Output layout

```
processed/<dataset_id>/
  dataset.json             # study-level: dataset_id,title,species,tissue,technology,publication,source
  samples.csv              # sample_id,dataset_id,condition,age,sex,technology
  cells.csv                # cell_id,dataset_id,sample_id,condition,major_cell_type,cell_type,cluster_id,region
  genes.csv                # gene_id,gene_symbol,species
  expression_matrix.npz    # scipy CSR sparse, cells x genes
  expression_metadata.json # orientation, value_type (raw_counts/normalized/log_normalized), shape, nnz
```

The matrix row order matches `cells.csv`; the column order matches `genes.csv`
(also recorded in `expression_metadata.json`).

Reload the matrix with:

```python
import scipy.sparse as sp
m = sp.load_npz("processed/GSE207736/expression_matrix.npz")   # cells x genes
```

## Validation

Every run checks, and fails on:
1. matrix gene-dimension == number of parsed genes
2. matrix cell-dimension == number of parsed cells/barcodes
3. metadata cell ids join the matrix cells (when per-cell metadata is provided;
   partial coverage warns, or fails under `--strict`)
4. gene symbols are unique (duplicates made unique R-style: `Foo`, `Foo.1`, ...)

## Architecture

```
importer/
  cli.py          entry point: resolve -> load -> enrich -> validate -> write
  registry.py     dataset_id -> loader + per-cell metadata enrichment
  study_card.py   HypoMap_study_display_card.csv -> study/sample metadata
  loaders/
    base.py       LoaderResult (matrix cells x genes + genes/cells/samples tables)
    tenx_mtx.py   10x MatrixMarket triplets (single or multi-sample)
    dense_dge.py  dense TSV DGE matrix (streamed to sparse in gene chunks)
  validate.py     the four checks above
  writer.py       emit the 6 output files
  schema.py       standardized column definitions
```

### Adding a new dataset

Add one `DatasetConfig` to `REGISTRY` in `importer/registry.py`:

```python
"GSEXXXXXX": DatasetConfig(
    dataset_id="GSEXXXXXX",
    build_loader=lambda input_dir, species: TenXMtxLoader(input_dir, "GSEXXXXXX", species),
    enrich=my_enrich_fn,   # optional: map a per-cell metadata file onto cells/samples
    subdir="GSEXXXXXX_RAW" # optional: source files live in a subfolder
),
```

- Reuse `TenXMtxLoader` for 10x MTX triplets or `DenseDGELoader` for dense matrices.
- For a genuinely new on-disk format, add a loader class under `loaders/` returning
  a `LoaderResult`; nothing else in the pipeline changes.
- An `enrich(result, input_dir, tissue)` function maps a per-cell metadata file onto
  the standardized `cells`/`samples` tables (see `_enrich_gse172461` /
  `_enrich_gse93374` for the pattern, including code→name legend resolution).

### Sample-format notes handled

- 10x features files: 3-column (Ensembl / symbol / type) **and** 1-column (symbol only),
  quoted or unquoted; `-1`-suffixed or plain barcodes.
- Multi-sample MTX: sample id inferred from `GSM..._<sample>_matrix.mtx.gz`; barcodes are
  prefixed `<sample_id>_<barcode>` before concatenation to avoid collisions; genes are
  aligned across samples on a stable `gene_id`.
- Study-level metadata (title, species, tissue, technology, publication) comes from the
  HypoMap card; per-sample `condition/age/sex` default from the card and can be refined by
  per-cell metadata or an explicit `--sample-sheet`.
