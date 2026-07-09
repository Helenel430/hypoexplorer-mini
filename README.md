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
| [importer/README.md](importer/README.md) | Importer usage, output format, architecture, and how to add a dataset. |
| [hypomap-viz/README.md](hypomap-viz/README.md) | Visualizer setup and its three app stacks (ShinyCell, R gene-explorer, JS/Vite port). |
| [archive/README.md](archive/README.md) | Index of the archived raw provenance dumps and superseded working files. |

## Repository layout

```
Claude/
├── CLAUDE.md                        ← AI-assist entry point (doc map, ownership, rules)
├── README.md                        ← you are here
├── PROJECT_OVERVIEW.md              ← project background & rules
├── DATASET_SUMMARIES.md             ← the 18 datasets
├── DESIGN_SPEC.md                   ← visualizer UI/UX spec (Design-owned)
├── CURRENT_STATE.md                 ← live status (Design- and Code-owned sections)
├── requirements.txt                 ← importer deps (scipy, numpy, pandas)
├── .gitignore                       ← keeps raw data & generated output out of VCS
│
├── HypoMap_study_display_card.csv   ← AUTHORITATIVE 18-dataset study table
│
├── importer/                        ← Python package (source code)
│   ├── README.md
│   ├── cli.py  registry.py  study_card.py  writer.py  validate.py  schema.py
│   └── loaders/  (tenx_mtx.py, dense_dge.py, base.py)
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

Output lands in `processed/<dataset_id>/` (six files per dataset). See
[importer/README.md](importer/README.md) for the full output schema, flags, and validation.

## What lives where

- **Authoritative deliverable:** `HypoMap_study_display_card.csv` (validated against the
  paper's Supplementary Table 1 — cell counts sum exactly to 384,925). The importer reads
  this as its study-metadata source, so keep it at the repository root.
- **Raw inputs** (the large `*.gz` files and `GSE207736_RAW/`) are re-downloadable from GEO
  and are gitignored — keep them locally but do not commit them.
- **`processed/`** is 100% regenerable from raw inputs via the importer and is gitignored.
