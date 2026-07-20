# HypoMap Metadata & scRNA-seq Importer

Working repository for two related tracks of the HypoMap project:

1. **Metadata curation** — building a per-study / per-sample metadata display for users
   exploring the [HypoMap](https://www.nature.com/articles/s42255-022-00657-y) hypothalamus
   atlas (Steuernagel et al. 2022, *Nat Metab*; 384,925 cells, 18 integrated mouse datasets).
2. **Importer** — a Python package that converts heterogeneous scRNA-seq GEO downloads into
   one standardized, per-dataset backend format for a gene-expression lookup database.

## Documentation map

| Doc | What it covers |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Entry point for AI-assisted (Claude Code / Claude Design) work: doc map, ownership model, hard rules, conventions. |
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Why this project exists, the two work tracks, authoritative sources, and the hard rules. Stable background. |
| [DATASET_SUMMARIES.md](DATASET_SUMMARIES.md) | All 18 HypoMap datasets: accession, technology, region, cell counts, format quirks, and import status. |
| [DESIGN_SPEC.md](DESIGN_SPEC.md) | Canonical UI/UX spec for the HypoMap visualizer (owned by Claude Design). |
| [CURRENT_STATE.md](CURRENT_STATE.md) | Live status — what's done, what's pending, known issues. Split into Design-owned and Code-owned sections. Updated as work proceeds. |
| [docs/SHARED_SCHEMA.md](docs/SHARED_SCHEMA.md) | Canonical processed-data schema: exact dataset/sample/cell/gene/matrix metadata columns and missing-annotation rules. |
| [docs/METRIC_SPEC.md](docs/METRIC_SPEC.md) | Canonical quantitative definitions for Gene Explorer metrics. |
| [docs/GSE172461_SAMPLE_ID_REPAIR.md](docs/GSE172461_SAMPLE_ID_REPAIR.md) | Provenance and validation record for repairing GSE172461 blank `sample_id` / inherited `condition` values from Cell Ranger aggregate suffixes. |
| [importer/README.md](importer/README.md) | Importer usage, output format, architecture, and how to add a dataset. |
| [EXTERNAL_ANNOTATION_STRATEGY.md](EXTERNAL_ANNOTATION_STRATEGY.md) | Design decision for datasets whose GEO deposit ships only raw counts: how fine annotations are mapped in from an external curated source (e.g. the integrated atlas) via an optional sidecar, without breaking the importer's convert-and-validate scope. |
| [hypomap-viz/README.md](hypomap-viz/README.md) | Visualizer setup and its three app stacks (ShinyCell, R gene-explorer, JS/Vite port). |
| [archive/README.md](archive/README.md) | Index of the archived raw provenance dumps and superseded working files. |

## Repository layout

```
Claude/
├── CLAUDE.md                        ← AI-assist entry point (doc map, ownership, rules)
├── README.md                        ← you are here
├── PROJECT_OVERVIEW.md              ← project background & rules
├── DATASET_SUMMARIES.md             ← the 18 datasets
├── EXTERNAL_ANNOTATION_STRATEGY.md  ← external-annotation design (raw-only deposits)
├── DESIGN_SPEC.md                   ← visualizer UI/UX spec (Design-owned)
├── CURRENT_STATE.md                 ← live status (Design- and Code-owned sections)
├── docs/
│   ├── SHARED_SCHEMA.md             ← processed-data schema contract
│   └── METRIC_SPEC.md               ← Gene Explorer metric definitions
├── requirements.txt                 ← importer deps (scipy, numpy, pandas)
├── .gitignore                       ← keeps raw data & generated output out of VCS
│
├── HypoMap_study_display_card.csv   ← AUTHORITATIVE 18-dataset study table
│
├── importer/                        ← Python package (source code)
│   ├── README.md
│   ├── cli.py  registry.py  study_card.py  writer.py  validate.py  schema.py
│   └── loaders/  (tenx_mtx.py, dense_dge.py, base.py)
├── tools/                           ← reproducible sidecar / derived-layer builders
│   ├── build_hypomap_sidecar.py
│   ├── build_lognormalized_layer.py
│   ├── build_gene_harmonization.py
│   ├── resolve_gene_query.py
│   ├── build_annotation_coverage_report.py
│   └── export_fvp_metrics.py
├── gene_harmonization/              ← GENERATED MGI-backed gene alias artifacts
│   ├── gene_harmonization.csv
│   ├── gene_harmonization.provenance.json
│   └── mgi_source/
├── fvp_export/                      ← GENERATED static Gene Explorer metric export
│   └── gene_metrics_vertical_slice.json
│
├── hypomap-viz/                     ← visualizer (SEPARATE nested git repo)
│   ├── README.md
│   ├── shinyApp/  gene-explorer/  gene-explorer-js/
│   └── prepare_app.R  compute_gene_stats.R
│
├── processed/                       ← GENERATED importer output (gitignored)
│   └── GSE207736/  GSE172461/  GSE93374/
│
├── archive/                         ← raw GEO SOFT dumps, per-sample metadata, provenance
│
└── <raw GEO downloads>              ← large source inputs (gitignored, local only)
    GSE172461_*.gz, GSE93374_*.gz, GSE207736_RAW/
```

## Quickstart — running the importer

```bash
pip install -r requirements.txt

# Run from the folder holding the source files (default --input is ".")
python -m importer GSE207736      # 6-sample 10x MTX (primary target)
python -m importer GSE172461      # merged 10x MTX + per-cell metadata
python -m importer GSE93374       # dense Drop-seq DGE + per-cell metadata
```

Output lands in `processed/<dataset_id>/` (six raw-count importer files per dataset). See
[importer/README.md](importer/README.md) for the full output schema, flags, and validation.

After importing, generate the audited Seurat LogNormalize derived layer with:

```bash
python3 tools/build_lognormalized_layer.py GSE207736 GSE172461 GSE93374
```

This writes `expression_matrix_lognormalized.npz` and
`expression_metadata_lognormalized.json` beside the raw-count files, then
independently regenerates and verifies the derived matrix.

Build and test the MGI-backed cross-dataset gene alias layer with:

```bash
python3 tools/build_gene_harmonization.py
python3 tools/resolve_gene_query.py Ccn1
python3 tools/resolve_gene_query.py Cyr61
```

The resolver returns structured states. Ambiguous aliases return
`disambiguation_required`; unresolved genes return `gene_not_found`; neither
state may be treated as zero expression.

Generate the missing-annotation coverage report with:

```bash
python3 tools/build_annotation_coverage_report.py
```

This writes `annotation_coverage_report.json`, including retained blank
`hypomap_region`, blank `hypomap_C25`, and blank `sample_id` counts.

Generate the lightweight FVP metric vertical slice with:

```bash
python3 tools/export_fvp_metrics.py --genes Pomc Agrp Ccn1
```

This writes `fvp_export/gene_metrics_vertical_slice.json` with whole-dataset,
`hypomap_region`, and `hypomap_C25` metrics for the three-gene slice.

## What lives where

- **Authoritative deliverable:** `HypoMap_study_display_card.csv` (validated against the
  paper's Supplementary Table 1 — cell counts sum exactly to 384,925). The importer reads
  this as its study-metadata source, so keep it at the repository root.
- **Raw inputs** (the large `*.gz` files and `GSE207736_RAW/`) are re-downloadable from GEO
  and are gitignored — keep them locally but do not commit them.
- **`processed/`** is 100% regenerable from raw inputs via the importer plus derived-layer tools
  and is gitignored.
