#!/usr/bin/env python3
"""Build the optional HypoMap-atlas annotation sidecar for GSE207736 (Dowsett10xnuc).

GSE207736's GEO deposit ships raw counts only. The fine-grained annotations
(cell type, the C7->C465 cluster hierarchy, per-cell hypothalamic region) were
produced downstream, during HypoMap's integrated analysis, and live in the
published atlas object -- not in the GEO files. This script maps those curated
labels onto the importer's cells, producing a sidecar the optional
``_enrich_gse207736`` step joins on ``cell_id``.

Provenance / scope (see EXTERNAL_ANNOTATION_STRATEGY.md):

- Source is the integrated HypoMap atlas ``obs`` table ONLY. Expression values
  are never read. The default input is ``dowsett_obs.csv``, the obs slice for
  ``Dataset == Dowsett10xnuc`` exported from ``hypomap.h5ad`` (CZ CELLxGENE
  collection d86517f0-fa7e-4266-b82e-a521350d6d36).
- The atlas keys cells as ``<barcode>_<token>_Dowsett10xnuc`` with feeding-
  condition tokens (adlib*/fasted*); the importer keys them ``<sample>_<barcode>``
  with GEO sample ids. The two are reconciled by the validated crosswalk below.
- Output is deterministic: same obs input -> same sidecar. The sidecar lives
  next to the raw inputs (``GSE207736_RAW/``) and is regenerable, so it is
  gitignored along with the raw deposit.

Usage:
    python tools/build_gse207736_sidecar.py \
        [--obs /Volumes/SanDisk/hypomap_download/dowsett_obs.csv] \
        [--out GSE207736_RAW/GSE207736_hypomap_sidecar.csv.gz]
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import pandas as pd

# Validated sample crosswalk: atlas feeding-condition token -> GEO sample id.
# Derived empirically by per-sample barcode-set overlap and recorded in
# EXTERNAL_ANNOTATION_STRATEGY.md. Do not change without re-validating the join.
TOKEN_TO_SAMPLE = {
    "adlib1": "AG8",
    "adlib2": "AH8",
    "adlib3": "AA3",
    "adlib4": "AB3",
    "fasted1": "AC3",
    "fasted2": "AD3",
}

# atlas obs column -> sidecar (importer) column. hypomap_included is derived by
# the enrichment step from cell presence, so it is not stored in the sidecar.
FIELD_MAP = {
    "Region_summarized": "hypomap_region",
    "Author_CellType": "hypomap_author_cell_type",
    "C7_named": "hypomap_C7",
    "C25_named": "hypomap_C25",
    "C66_named": "hypomap_C66",
    "C185_named": "hypomap_C185",
    "C286_named": "hypomap_C286",
    "C465_named": "hypomap_C465",
}

ATLAS_SUFFIX = "_Dowsett10xnuc"
DEFAULT_OBS = Path("/Volumes/SanDisk/hypomap_download/dowsett_obs.csv")
DEFAULT_OUT = Path("GSE207736_RAW/GSE207736_hypomap_sidecar.csv.gz")

# Provenance of the atlas obs source (recorded alongside the sidecar).
ATLAS_OBJECT = "hypomap.h5ad (integrated HypoMap atlas, Steuernagel et al. 2022)"
CELLXGENE_COLLECTION = "d86517f0-fa7e-4266-b82e-a521350d6d36"


def _to_cell_id(index: str) -> str:
    """Map an atlas ``_index`` to the importer ``cell_id``.

    ``AAACCCAAGTGACCTT-1_adlib1_Dowsett10xnuc`` -> ``AG8_AAACCCAAGTGACCTT-1``.
    The barcode never contains ``_`` and always ends in ``-1``, so stripping the
    dataset suffix and splitting off the last token is unambiguous.
    """
    core = index[: -len(ATLAS_SUFFIX)] if index.endswith(ATLAS_SUFFIX) else index
    barcode, _, token = core.rpartition("_")
    return f"{TOKEN_TO_SAMPLE[token]}_{barcode}"


def build(obs_path: Path, out_path: Path) -> dict:
    obs = pd.read_csv(obs_path, dtype=str)

    # Guard the assumptions the crosswalk relies on.
    datasets = set(obs["Dataset"].unique())
    if datasets != {"Dowsett10xnuc"}:
        raise ValueError(f"obs must be Dowsett10xnuc only; found datasets {datasets}")
    tokens = {i[: -len(ATLAS_SUFFIX)].rpartition("_")[2] for i in obs["_index"]}
    unknown = tokens - set(TOKEN_TO_SAMPLE)
    if unknown:
        raise ValueError(f"obs has tokens with no crosswalk entry: {sorted(unknown)}")

    sidecar = pd.DataFrame({"cell_id": obs["_index"].map(_to_cell_id)})
    for src, dst in FIELD_MAP.items():
        col = obs[src].fillna("")
        if dst == "hypomap_region":
            col = col.replace("NA", "")  # region is legitimately NA for ~26% of cells
        sidecar[dst] = col.values

    if sidecar["cell_id"].duplicated().any():
        n = int(sidecar["cell_id"].duplicated().sum())
        raise ValueError(f"{n} duplicate composite cell_id keys in sidecar")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sidecar.to_csv(out_path, index=False, compression="gzip")

    provenance = {
        "dataset_id": "GSE207736",
        "hypomap_label": "Dowsett10xnuc",
        "atlas_object": ATLAS_OBJECT,
        "cellxgene_collection": CELLXGENE_COLLECTION,
        "atlas_obs_source": str(obs_path),
        "reads": "atlas obs (cell metadata) only; no expression values read",
        "sample_crosswalk": TOKEN_TO_SAMPLE,
        "join_key": "(sample, barcode) via importer cell_id <sample>_<barcode>",
        "field_map": FIELD_MAP,
        "atlas_cells": int(len(sidecar)),
        "built": date.today().isoformat(),
        "builder": "tools/build_gse207736_sidecar.py",
    }
    prov_path = out_path.with_name(out_path.name.replace(".csv.gz", ".provenance.json"))
    with open(prov_path, "w") as fh:
        json.dump(provenance, fh, indent=2)

    print(f"wrote {out_path} ({len(sidecar)} atlas cells)")
    print(f"wrote {prov_path}")
    return provenance


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--obs", type=Path, default=DEFAULT_OBS,
                        help=f"atlas obs CSV (default: {DEFAULT_OBS})")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT,
                        help=f"sidecar output path (default: {DEFAULT_OUT})")
    args = parser.parse_args(argv)
    build(args.obs, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
