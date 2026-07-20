#!/usr/bin/env python3
"""Build optional HypoMap-atlas annotation sidecars from the atlas obs table.

The importer preserves GEO-native metadata. This tool adds a separate,
provenance-tracked layer from the integrated HypoMap atlas (CZ CELLxGENE
collection d86517f0-fa7e-4266-b82e-a521350d6d36) for datasets where the atlas
contains per-cell region and cluster annotations.

Only the h5ad ``obs`` metadata table is read; expression values are never read.

Usage:
    python tools/build_hypomap_sidecar.py GSE172461
    python tools/build_hypomap_sidecar.py GSE93374
    python tools/build_hypomap_sidecar.py GSE207736
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import h5py
import numpy as np
import pandas as pd


ATLAS_H5AD = Path("/Volumes/SanDisk/hypomap_download/hypomap.h5ad")
CELLXGENE_COLLECTION = "d86517f0-fa7e-4266-b82e-a521350d6d36"
ATLAS_OBJECT = "hypomap.h5ad (integrated HypoMap atlas, Steuernagel et al. 2022)"

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


@dataclass(frozen=True)
class SidecarConfig:
    dataset_id: str
    hypomap_label: str
    out: Path
    crosswalk: dict[str, str]


CONFIGS = {
    # Atlas index: AAAC...-1_adlib1_Dowsett10xnuc -> AG8_AAAC...-1
    "GSE207736": SidecarConfig(
        dataset_id="GSE207736",
        hypomap_label="Dowsett10xnuc",
        out=Path("GSE207736_RAW/GSE207736_hypomap_sidecar.csv.gz"),
        crosswalk={
            "adlib1": "AG8",
            "adlib2": "AH8",
            "adlib3": "AA3",
            "adlib4": "AB3",
            "fasted1": "AC3",
            "fasted2": "AD3",
        },
    ),
    # Atlas index: AAAC...-1_SRR14289036 -> AAAC...-1-2
    # The suffixes are Cell Ranger aggregate barcode suffixes in
    # GSE172461_barcodes.tsv.gz, validated by barcode-set overlap.
    "GSE172461": SidecarConfig(
        dataset_id="GSE172461",
        hypomap_label="Rupp10x",
        out=Path("GSE172461_hypomap_sidecar.csv.gz"),
        crosswalk={
            "SRR14289035": "",
            "SRR14289036": "-2",
            "SRR14289037": "-3",
            "SRR14289038": "-4",
        },
    ),
    # Atlas index: CATTC..._SRR5164436 -> arc1_CATTC...
    "GSE93374": SidecarConfig(
        dataset_id="GSE93374",
        hypomap_label="CampbellDropseq",
        out=Path("GSE93374_hypomap_sidecar.csv.gz"),
        crosswalk={
            "SRR5164436": "arc1",
            "SRR5164437": "arc2",
            "SRR5164438": "arc3",
            "SRR5164439": "Chow",
            "SRR5164440": "HFD",
            "SRR5164441": "Fasted",
            "SRR5164442": "Refed",
            "SRR5164443": "MaleFed",
            "SRR5164444": "MaleFasted",
            "SRR5164445": "FemaleFed",
            "SRR5164446": "FemaleFasted",
        },
    ),
}


def _decode_array(values) -> np.ndarray:
    return np.array(
        [x.decode() if isinstance(x, bytes) else str(x) for x in values],
        dtype=object,
    )


def _obs_column(obs, key: str) -> np.ndarray:
    obj = obs[key]
    if isinstance(obj, h5py.Group) and {"categories", "codes"}.issubset(obj.keys()):
        categories = _decode_array(obj["categories"][:])
        codes = obj["codes"][:]
        return np.array([categories[c] if c >= 0 else "" for c in codes], dtype=object)
    return _decode_array(obj[:])


def _cell_id_from_index(index: str, config: SidecarConfig) -> str:
    barcode, _, token = index.rpartition("_")
    if token not in config.crosswalk:
        raise ValueError(
            f"{config.dataset_id}: atlas token {token!r} has no crosswalk entry"
        )

    mapped = config.crosswalk[token]
    if config.dataset_id == "GSE207736":
        return f"{mapped}_{barcode}"
    if config.dataset_id == "GSE172461":
        return f"{barcode}{mapped}"
    if config.dataset_id == "GSE93374":
        return f"{mapped}_{barcode}"
    raise ValueError(f"unsupported dataset {config.dataset_id}")


def _load_atlas_obs(h5ad: Path, config: SidecarConfig) -> pd.DataFrame:
    with h5py.File(h5ad, "r") as h5:
        obs = h5["obs"]
        datasets = _obs_column(obs, "Dataset")
        mask = datasets == config.hypomap_label
        if not mask.any():
            raise ValueError(f"{config.hypomap_label} not found in atlas obs")

        data = {
            "_index": _obs_column(obs, "_index")[mask],
            "Dataset": datasets[mask],
            "SRA_ID": _obs_column(obs, "SRA_ID")[mask],
            "Sample_ID": _obs_column(obs, "Sample_ID")[mask],
        }
        for src in FIELD_MAP:
            data[src] = _obs_column(obs, src)[mask]
    return pd.DataFrame(data)


def _validate_against_processed(sidecar: pd.DataFrame, dataset_id: str, root: Path) -> dict:
    cells_path = root / "processed" / dataset_id / "cells.csv"
    if not cells_path.exists():
        return {"processed_cells_csv": str(cells_path), "validation": "skipped_missing"}

    cells = pd.read_csv(cells_path, dtype=str).fillna("")
    processed_ids = set(cells["cell_id"])
    atlas_ids = set(sidecar["cell_id"])
    matched = int(sidecar["cell_id"].isin(processed_ids).sum())
    imported_matched = int(cells["cell_id"].isin(atlas_ids).sum())

    per_token = (
        sidecar.assign(_matched=sidecar["cell_id"].isin(processed_ids))
        .groupby("atlas_token")["_matched"]
        .agg(["sum", "count"])
        .reset_index()
    )
    per_token["unmatched"] = per_token["count"] - per_token["sum"]
    return {
        "processed_cells_csv": str(cells_path),
        "atlas_cells": int(len(sidecar)),
        "imported_cells": int(len(cells)),
        "atlas_cells_matched_to_import": matched,
        "imported_cells_matched_to_atlas": imported_matched,
        "atlas_cells_unmatched_to_import": int(len(sidecar) - matched),
        "imported_cells_unmatched_to_atlas": int(len(cells) - imported_matched),
        "per_token": per_token.to_dict(orient="records"),
    }


def build(dataset_id: str, h5ad: Path, out: Path | None, root: Path) -> dict:
    if dataset_id not in CONFIGS:
        raise KeyError(f"Unknown dataset {dataset_id!r}; choose one of {sorted(CONFIGS)}")
    config = CONFIGS[dataset_id]
    out_path = out if out is not None else config.out

    obs = _load_atlas_obs(h5ad, config)
    obs["atlas_token"] = obs["_index"].str.rsplit("_", n=1).str[-1]
    unknown = set(obs["atlas_token"]) - set(config.crosswalk)
    if unknown:
        raise ValueError(f"{dataset_id}: atlas tokens with no crosswalk: {sorted(unknown)}")

    sidecar = pd.DataFrame({"cell_id": obs["_index"].map(lambda x: _cell_id_from_index(x, config))})
    sidecar["atlas_index"] = obs["_index"]
    sidecar["atlas_token"] = obs["atlas_token"]
    sidecar["atlas_sample_id"] = obs["Sample_ID"]
    for src, dst in FIELD_MAP.items():
        values = pd.Series(obs[src], dtype=str).fillna("").replace("NA", "")
        sidecar[dst] = values.values

    if sidecar["cell_id"].duplicated().any():
        dupes = int(sidecar["cell_id"].duplicated().sum())
        raise ValueError(f"{dataset_id}: {dupes} duplicate sidecar cell_id keys")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sidecar.to_csv(out_path, index=False, compression="gzip")

    validation = _validate_against_processed(sidecar, dataset_id, root)
    provenance = {
        "dataset_id": dataset_id,
        "hypomap_label": config.hypomap_label,
        "atlas_object": ATLAS_OBJECT,
        "cellxgene_collection": CELLXGENE_COLLECTION,
        "atlas_h5ad": str(h5ad),
        "reads": "atlas obs (cell metadata) only; no expression values read",
        "field_map": FIELD_MAP,
        "crosswalk": config.crosswalk,
        "atlas_cells": int(len(sidecar)),
        "built": date.today().isoformat(),
        "builder": "tools/build_hypomap_sidecar.py",
        "validation": validation,
    }
    prov_path = out_path.with_name(out_path.name.replace(".csv.gz", ".provenance.json"))
    with open(prov_path, "w") as fh:
        json.dump(provenance, fh, indent=2)

    print(f"wrote {out_path} ({len(sidecar)} atlas cells)")
    print(f"wrote {prov_path}")
    if validation.get("validation") != "skipped_missing":
        print(
            f"[{dataset_id}] atlas->import matched "
            f"{validation['atlas_cells_matched_to_import']}/{validation['atlas_cells']}; "
            f"import->atlas matched "
            f"{validation['imported_cells_matched_to_atlas']}/{validation['imported_cells']}"
        )
    return provenance


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset_id", choices=sorted(CONFIGS))
    parser.add_argument("--h5ad", type=Path, default=ATLAS_H5AD)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--root", type=Path, default=Path("."))
    args = parser.parse_args(argv)
    build(args.dataset_id, args.h5ad, args.out, args.root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
