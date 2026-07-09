# CLAUDE.md — guidance for Claude Code / Claude Design

Entry point for AI-assisted work in this repository. Read this first, then follow the
documentation map below. **Don't re-derive facts that are already written down here or in the
linked docs** — these were established deliberately and validated against the source paper.

## What this repo is

Working files for the **HypoMap** project — a unified single-cell transcriptomic atlas of the
murine hypothalamus (Steuernagel et al. 2022, *Nature Metabolism*; 384,925 cells from 18
datasets). Two tracks:

1. **Metadata curation** — a curated, authoritative per-study / per-sample metadata layer for a
   users' atlas-exploration UI.
2. **Importer** (`importer/`) — a Python package that converts heterogeneous scRNA-seq GEO
   downloads into one standardized per-dataset backend format.

A third, related effort is the **visualizer** (`hypomap-viz/`, a separate nested git repo): an
interactive gene-expression explorer for the Romanov_10x dataset, with a design spec
(`DESIGN_SPEC.md`) for a future four-tab explorer.

## Documentation map — read in this order

| Doc | Read it for |
|---|---|
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Why the project exists, the two tracks, authoritative sources, and the **hard rules**. Stable background. |
| [DATASET_SUMMARIES.md](DATASET_SUMMARIES.md) | The 18 datasets: accession, tech, region, cell counts, format quirks, import status. |
| [DESIGN_SPEC.md](DESIGN_SPEC.md) | Canonical UI/UX spec for the visualizer (owned by Design). |
| [CURRENT_STATE.md](CURRENT_STATE.md) | **Live status** — what's done, what's next, known issues. Split into Design-owned and Code-owned sections. Start here for "what should I do next." |
| [README.md](README.md) | Repository map + importer quickstart. |
| [importer/README.md](importer/README.md) | Importer usage, output schema, architecture, how to add a dataset. |
| [archive/README.md](archive/README.md) | Index of archived raw provenance and superseded working files. |
| [hypomap-viz/README.md](hypomap-viz/README.md) | Visualizer setup and its three app stacks. |

## Two-agent ownership model

`CURRENT_STATE.md` is shared between two agents. **Stay within your track's sections when
editing:**

- **Claude Design** owns: *Current Goal*, *Design Status*, *Notes for Claude Code*, and
  `DESIGN_SPEC.md`.
- **Claude Code** owns: *Implementation Status*, *Files Modified*, *Known Bugs*,
  *Next Development Task*, and all data/importer/app code.

Do not change design decisions listed under "Do not change without design sign-off" in
`CURRENT_STATE.md` without confirming with the user.

## Hard rules (do not re-litigate — see PROJECT_OVERVIEW.md §"Hard rules")

1. **No embryonic cells are in HypoMap.** The two "Dev" datasets contribute adult timepoints
   only (KimDev10x = P45, RomanovDev10x = P23).
2. **18 datasets, 17 GEO/SRA links.** The 18th is **Kim10x** (Mendeley `10.17632/ypx3sw2f7c`),
   a *different* study from KimDev10x (GSE132355).
3. **Importer scope = conversion + validation only** — no PCA/UMAP/clustering/DE. Deliberate
   boundary.
4. `HypoMap_study_display_card.csv` is the single source of truth for study-level metadata and
   **must stay at the repo root** (importer default `--card` path).

## Conventions & environment

- **Not a git repo at the root.** `hypomap-viz/` is its own nested git repo (GitHub
  `Helenel430/hypomap-viz`). Root-level files are versioned outside this tree, if at all.
- **Importer** — Python 3, deps in `requirements.txt` (scipy, numpy, pandas). Run as a module
  from the folder holding the source files: `python -m importer <dataset_id>`.
- **Visualizer** — R/Shiny (`shinyApp/`, `gene-explorer/`) and a JS/Vite static app
  (`gene-explorer-js/`, deploys to Vercel).
- **Gitignored & regenerable:** raw GEO downloads (`*.gz`, `GSE207736_RAW/`), `processed/`, and
  the visualizer's large `.rds` / generated files. Never commit these; keep raw inputs locally.
- **macOS `._*` AppleDouble files** litter the tree — ignore them; they are filesystem
  metadata, not project files.

## Scope guardrails for this kind of work

- Don't implement application features unless explicitly asked. Match surrounding code style.
- Prefer editing the authoritative source (the display card, the registry) over hand-copying
  derived values into docs.
- When adding a dataset to the importer, follow "Adding a new dataset" in
  [importer/README.md](importer/README.md).
