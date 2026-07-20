# External Annotation Strategy

How the HypoMap importer handles datasets whose GEO deposit ships only raw
expression data and no fine-grained cell-level annotation. This document is the
long-term reference for the design decision; it explains the *why* and the
*architecture*, and records the validation that established it (using GSE207736
as the worked example). It is not a task list — see
[CURRENT_STATE.md](CURRENT_STATE.md) for live status.

Related reading: [importer/README.md](importer/README.md) (loader/enrichment
architecture), [DATASET_SUMMARIES.md](DATASET_SUMMARIES.md) (per-dataset format
quirks), [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) (hard rules, incl. the
importer scope boundary).

## Purpose

Single-cell GEO deposits are not uniform. Some studies publish a fully annotated
per-cell metadata table alongside the counts (e.g. GSE172461, GSE93374 — each
ships a metadata sidecar the importer already consumes). Others publish **only
the raw count matrices** — a 10x MatrixMarket triplet (`matrix.mtx` +
`features.tsv` + `barcodes.tsv`) or a dense DGE — with no per-cell cluster,
subclass, cell-type, or spatial-region assignment anywhere in the deposit.

For those raw-only datasets, the fine-grained annotations *do exist*, but they
were produced **downstream of the deposit**, during the integrated atlas
analysis (clustering, label transfer, region prediction). They live in the
published HypoMap atlas object, not in the GEO files. The raw deposit is
therefore genuinely coarse by nature: the barcodes file carries no biology, so
there is nothing finer for the importer to read. The coarse result is a property
of the **source data**, not a defect in the importer.

This document defines how such annotations are brought back in — as **externally
curated metadata**, mapped onto the imported cells through a separate,
optional enrichment step.

## Motivation

The importer's scope is deliberately narrow: **conversion + validation only** —
no PCA, UMAP, clustering, differential expression, or label inference (see
PROJECT_OVERVIEW.md hard rules). Keeping annotation out of the importer's core
protects several properties:

- **Determinism.** Raw import is a pure, repeatable transform from GEO files to
  the standardized schema. The same inputs always yield the same outputs, with
  no dependency on model versions, atlas releases, or network access.
- **Separation of concerns.** Counts and identifiers are *observed* facts from
  the deposit. Cell-type and region labels are *derived, curated* judgements
  from a specific published analysis. Mixing the two would blur which values are
  raw and which are interpreted.
- **Provenance.** When annotations arrive through a distinct, named sidecar, it
  stays obvious where every label came from and against which atlas version it
  was curated.
- **Auditability and trust.** A reviewer can verify the raw conversion
  independently of any biological interpretation layered on top.

Annotation is therefore modeled as an **enrichment step**, not a loader
responsibility. This mirrors the existing per-dataset enrichment functions
(`_enrich_gse172461`, `_enrich_gse93374`) in `importer/registry.py`: the loader
produces the standardized matrix + cells/samples/genes tables, and a separate
enrichment function joins curated metadata onto those cells.

## External Annotation Workflow

```
Raw GEO files
   → Importer (loader: convert + validate)
      → Standardized outputs  (matrix, cells.csv, samples.csv, genes.csv, dataset.json)
         → Optional external metadata sidecar  (curated annotations, keyed to cells)
            → Enriched outputs  (cells.csv with cell-type / cluster / region populated)
```

Stage by stage:

1. **Raw GEO files** — the deposit as downloaded (gitignored, kept locally).
2. **Importer** — the loader converts the raw format to the standardized
   in-memory tables and validates them. No biology is added here.
3. **Standardized outputs** — the canonical per-dataset backend format. For a
   raw-only dataset, the annotation columns (`major_cell_type`, `cell_type`,
   `cluster_id`) are present but empty; `region` carries only the study-level
   tissue from the display card.
4. **Optional external metadata sidecar** — a curated file (e.g.
   `GSE207736_metadata.csv.gz`) placed next to the raw inputs, holding the
   externally sourced annotations keyed to the importer's `cell_id`.
5. **Enriched outputs** — a dataset-specific enrichment function joins the
   sidecar onto the cells, populating the annotation columns.

**The importer must remain fully functional when no sidecar is present.** The
sidecar is strictly additive. If it is absent, the loader still runs, validation
still passes, and the standardized outputs are still written — just with coarse
annotation. Enrichment never becomes a hard dependency of import. This is the
same contract the existing enrichers honor: they return early (leaving the
coarse output intact) if their metadata file is not found.

## GSE207736 Case Study

GSE207736 (HypoMap label **Dowsett10xnuc**; in-house snRNA-seq, Yeo lab) is the
canonical raw-only dataset and the reason this strategy was formalized.

- **GEO provides only raw counts.** The deposit is six 10x MatrixMarket
  triplets (`GSE207736_RAW/`, samples AA3/AB3/AC3/AD3/AG8/AH8). Triplets carry a
  count matrix, a gene list, and cell barcodes — and nothing else. There is no
  per-cell cluster, cell-type, or region column to import. The loader correctly
  reports `has_cell_metadata = False`.
- **Fine annotations originate from the integrated HypoMap atlas.** Cell type,
  the C7→C465 cluster hierarchy, and per-cell hypothalamic region were assigned
  during HypoMap's integrated analysis. They are published in the atlas object
  (CZ CELLxGENE collection `d86517f0-fa7e-4266-b82e-a521350d6d36`; also the
  University of Cambridge Apollo repository), not in the GEO deposit.
- **These annotations are externally curated metadata, not importer output.**
  The importer must not attempt to regenerate them (that would require
  clustering / label transfer — outside its scope and non-deterministic).
  Instead they are treated as curated inputs to be *mapped* onto the imported
  cells via a sidecar, exactly like GSE172461's and GSE93374's shipped metadata.

The distinction matters: for GSE172461/GSE93374 the curated metadata happens to
be published *in the deposit*; for GSE207736 the equally-curated metadata lives
in a *separate* published object. The handling is architecturally identical — a
sidecar plus an enrichment function — only the sourcing differs.

## Join Validation

Before treating the atlas as a usable annotation source, the join between atlas
cells and imported cells was validated (metadata only — the atlas matrix was
never read).

Cell counts:

| Quantity | Count |
|---|---|
| Imported cells (raw matrix, `processed/GSE207736/cells.csv`) | 39,953 |
| Atlas cells (HypoMap, `Dataset == Dowsett10xnuc`) | 35,945 |
| Matched cells | 35,945 |
| Unmatched (imported, no atlas annotation) | 4,008 |

**100% of atlas cells matched an imported cell.** The 4,008 unmatched imported
cells were **removed during HypoMap's QC / doublet filtering** — they exist in
the raw deposit but were dropped before the integrated atlas was built, so they
legitimately have no atlas annotation. This is expected and non-fatal (see
Design Principles: partial matches warn, they do not fail). It is the same
pattern as GSE172461, where only 36,523 of 41,156 cells are annotated.

**Validated sample crosswalk.** The atlas labels samples by feeding condition
(`adlib*` = ad libitum / fed, `fasted*` = fasted); the GEO deposit labels them
AA3…AH8. The mapping between the two was not documented, so it was derived
empirically by intersecting per-sample barcode sets and confirmed to be a clean
1:1 correspondence (correct pairs share 5,463–7,627 barcodes; incorrect pairs
share only 4–15, i.e. random collisions):

| GEO sample | HypoMap `Sample_ID` token |
|---|---|
| AG8 | adlib1 |
| AH8 | adlib2 |
| AA3 | adlib3 |
| AB3 | adlib4 |
| AC3 | fasted1 |
| AD3 | fasted2 |

**Why barcode + sample is the identifying key, and barcode alone is not.** A 10x
cell barcode is only unique *within* a single sample/lane; the same 16-mer
barcode is routinely reused across samples. Joining on barcode alone would
therefore collide cells from different samples. The unique key is the pair
**(sample, barcode)** — equivalently the atlas's own `Cell_ID`
(`<barcode>_<token>_Dowsett10xnuc`) and the importer's `cell_id`
(`<sample>_<barcode>`), once the sample crosswalk above is applied to align the
two naming schemes. Under that composite key the match is exact and duplicate-free
(35,945 unique keys, 0 duplicates).

## Metadata Recovered

The atlas `obs` table exposes the following biologically useful, per-cell fields
for the Dowsett cells (all curated, none regenerable from the raw counts):

- **`Region_summarized`** — per-cell hypothalamic region (Arcuate,
  Ventromedial, Lateral hypothalamic area, (Pre)Mammillary, Paraventricular,
  Dorsomedial, Suprachiasmatic, Zona incerta, …). Replaces the coarse
  study-level `region = "Hypothalamus"`. Note ~26% of cells are `NA` (mostly
  non-neuronal or unassigned).
- **`Author_CellType`** — the authors' curated cell-type label (e.g.
  `C37-Pomc/Cpne4`).
- **C7 / C25 / C66 / C185 / C286 / C465 hierarchy** (`C*_named`) — the six-level
  HypoMap cluster tree from coarse neurotransmitter class (`C7-1: GLU`) to fine
  marker-defined leaf clusters (`C465-125: Tbx3.Ttr.Pomc.GLU-5`). Provides a
  natural mapping to `major_cell_type` (coarse levels), `cell_type` (fine
  levels), and `cluster_id`.
- **`Sample_ID`** — encodes the **fed vs. fasted** condition (`adlib*` vs.
  `fasted*`), the per-sample split that is absent from the raw triplets.
- **`Batch_ID`** — the two sequencing batches (`Dowsett10xnuc_batch_1/2`).

Enrichment with these fields **changes only annotation columns**. The expression
matrix, gene table, barcodes, and cell counts of the standardized output are
untouched. Downstream visualization gains region/cell-type/cluster facets and a
real fed/fasted split without any alteration to the raw quantitative data.

## Design Principles

Long-term rules for this and any future external-annotation work:

1. **Keep raw import deterministic.** The loader is a pure convert-and-validate
   transform. Its output must not depend on atlas versions, external services,
   or annotation availability.
2. **Never infer biological labels.** The importer does not cluster, transfer
   labels, or predict regions. If a label is not observed in an input, it stays
   empty.
3. **Only map externally curated annotations.** Enrichment *joins* pre-existing,
   published, curated labels onto cells. It never computes new ones.
4. **Sidecars are optional.** Import must succeed and validate with no sidecar
   present; annotation is strictly additive.
5. **Preserve provenance.** Record the annotation source (object, version /
   accession, atlas release, and the crosswalk used) so every derived label is
   traceable back to its curated origin.
6. **Validation warns on partial matches; it does not fail.** Real curated
   datasets are QC-filtered subsets of the raw deposit, so partial coverage is
   normal. Unmatched cells keep empty annotations and the run continues (a strict
   mode may exist to opt into hard failure).

## Future Datasets

Several of the remaining HypoMap datasets are expected to be raw-only in the same
way. This architecture generalizes to each of them:

1. **Import first.** Run the dataset through the importer to produce standardized
   outputs with coarse annotation. Confirm it validates on its own.
2. **Source the curated annotations.** Obtain the per-cell labels from the
   integrated atlas (or the study's own supplementary object) — reading metadata
   only, never the full expression matrix.
3. **Validate the join before trusting it.** Establish and confirm the
   identifying key (typically sample + barcode). Where sample naming differs
   between the deposit and the annotation source, derive the crosswalk
   empirically (barcode-set overlap) rather than assuming a mapping. Record
   matched / unmatched counts and confirm unmatched cells are explained (e.g. QC
   removal).
4. **Build an optional sidecar** keyed to the importer's `cell_id`, holding the
   recovered annotation fields, placed alongside the raw inputs.
5. **Add a dataset-specific enrichment function** in `importer/registry.py`,
   mirroring `_enrich_gse172461` / `_enrich_gse93374`: read the sidecar, map its
   columns onto the standardized annotation columns, join on `cell_id`, and warn
   on partial coverage.

The invariant across all of them: **the raw import path stays pure and always
works; external annotation is a validated, provenance-tracked, optional layer on
top.**
