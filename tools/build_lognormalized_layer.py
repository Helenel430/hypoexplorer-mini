#!/usr/bin/env python3
"""Generate and verify Seurat LogNormalize derived expression layers.

This script is deliberately outside the importer package. The importer writes
auditable raw-count artifacts; this tool creates a separate reproducible derived
layer for magnitude metrics.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.sparse import csr_matrix, load_npz, save_npz


SCALE_FACTOR = 10000.0
DEFAULT_ATOL = 1e-6
DEFAULT_RTOL = 1e-6


@dataclass(frozen=True)
class DerivedPaths:
    dataset_dir: Path
    raw_matrix: Path
    raw_metadata: Path
    log_matrix: Path
    log_metadata: Path


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_raw_metadata(path: Path) -> dict:
    with path.open() as fh:
        metadata = json.load(fh)
    if metadata.get("value_type") != "raw_counts":
        raise ValueError(f"{path} must describe raw_counts, found {metadata.get('value_type')!r}")
    if metadata.get("orientation") != "cells_x_genes":
        raise ValueError(f"{path} must be cells_x_genes, found {metadata.get('orientation')!r}")
    return metadata


def seurat_log_normalize(raw: csr_matrix) -> tuple[csr_matrix, np.ndarray]:
    """Return a CSR matrix with Seurat LogNormalize values.

    Formula per cell/gene:
        log1p(raw_count / sum(raw_count in cell) * 10000)
    """
    if not isinstance(raw, csr_matrix):
        raw = raw.tocsr()
    raw = raw.copy()
    row_sums = np.asarray(raw.sum(axis=1)).ravel().astype(np.float64)
    zero_rows = np.flatnonzero(row_sums <= 0)
    if len(zero_rows):
        preview = ", ".join(str(int(i)) for i in zero_rows[:10])
        raise ValueError(f"{len(zero_rows)} cells have nonpositive library size: {preview}")

    out = raw.astype(np.float32, copy=True)
    counts_per_row = np.diff(out.indptr)
    row_scale = np.repeat((SCALE_FACTOR / row_sums).astype(np.float64), counts_per_row)
    out.data = np.log1p(out.data.astype(np.float64) * row_scale).astype(np.float32)
    out.eliminate_zeros()
    return out.tocsr(), row_sums


def make_paths(processed_dir: Path, dataset_id: str) -> DerivedPaths:
    dataset_dir = processed_dir / dataset_id
    return DerivedPaths(
        dataset_dir=dataset_dir,
        raw_matrix=dataset_dir / "expression_matrix.npz",
        raw_metadata=dataset_dir / "expression_metadata.json",
        log_matrix=dataset_dir / "expression_matrix_lognormalized.npz",
        log_metadata=dataset_dir / "expression_metadata_lognormalized.json",
    )


def verify_matrix(stored: csr_matrix, regenerated: csr_matrix, *, atol: float, rtol: float) -> dict:
    if stored.shape != regenerated.shape:
        return {
            "ok": False,
            "reason": f"shape mismatch: stored {stored.shape}, regenerated {regenerated.shape}",
        }
    stored = stored.tocsr()
    regenerated = regenerated.tocsr()
    if not np.array_equal(stored.indptr, regenerated.indptr):
        return {"ok": False, "reason": "CSR indptr mismatch"}
    if not np.array_equal(stored.indices, regenerated.indices):
        return {"ok": False, "reason": "CSR indices mismatch"}
    if stored.data.shape != regenerated.data.shape:
        return {"ok": False, "reason": "CSR data length mismatch"}

    if stored.data.size:
        abs_diff = np.abs(stored.data.astype(np.float64) - regenerated.data.astype(np.float64))
        max_abs_diff = float(abs_diff.max())
        ref = np.abs(regenerated.data.astype(np.float64))
        max_rel_diff = float((abs_diff / np.maximum(ref, np.finfo(np.float64).eps)).max())
        ok = bool(np.allclose(stored.data, regenerated.data, atol=atol, rtol=rtol))
    else:
        max_abs_diff = 0.0
        max_rel_diff = 0.0
        ok = True

    return {
        "ok": ok,
        "reason": "passed" if ok else "numeric mismatch",
        "max_abs_diff": max_abs_diff,
        "max_rel_diff": max_rel_diff,
    }


def build_dataset(dataset_id: str, processed_dir: Path, *, atol: float, rtol: float) -> dict:
    paths = make_paths(processed_dir, dataset_id)
    if not paths.dataset_dir.exists():
        raise FileNotFoundError(paths.dataset_dir)
    raw_metadata = load_raw_metadata(paths.raw_metadata)
    raw_checksum = sha256_file(paths.raw_matrix)
    raw = load_npz(paths.raw_matrix).tocsr()

    expected_shape = tuple(raw_metadata.get("shape", []))
    if expected_shape and raw.shape != expected_shape:
        raise ValueError(
            f"{dataset_id}: raw matrix shape {raw.shape} does not match metadata {expected_shape}"
        )

    log_matrix, row_sums = seurat_log_normalize(raw)
    save_npz(paths.log_matrix, log_matrix)

    stored = load_npz(paths.log_matrix).tocsr()
    regenerated, _ = seurat_log_normalize(raw)
    verification = verify_matrix(stored, regenerated, atol=atol, rtol=rtol)
    status = "passed" if verification["ok"] else "failed"

    metadata = {
        "orientation": "cells_x_genes",
        "value_type": "log_normalized",
        "n_cells": int(log_matrix.shape[0]),
        "n_genes": int(log_matrix.shape[1]),
        "nnz": int(log_matrix.nnz),
        "shape": [int(log_matrix.shape[0]), int(log_matrix.shape[1])],
        "row_order": "cells.csv",
        "col_order": "genes.csv",
        "matrix_format": "csr",
        "dtype": str(log_matrix.dtype),
        "source_value_type": "raw_counts",
        "normalization_method": "Seurat LogNormalize",
        "scale_factor": int(SCALE_FACTOR),
        "log_transform": "log1p",
        "log_base": "natural",
        "normalization_axis": "per_cell",
        "source_matrix": "expression_matrix.npz",
        "source_expression_metadata": "expression_metadata.json",
        "source_matrix_checksum": f"sha256:{raw_checksum}",
        "verification_method": "independent_regeneration_from_raw_counts",
        "verification_atol": atol,
        "verification_rtol": rtol,
        "verification_status": status,
        "verification_max_abs_diff": verification.get("max_abs_diff"),
        "verification_max_rel_diff": verification.get("max_rel_diff"),
        "library_size_min": float(row_sums.min()),
        "library_size_max": float(row_sums.max()),
        "library_size_zero_cells": 0,
    }
    with paths.log_metadata.open("w") as fh:
        json.dump(metadata, fh, indent=2)

    if not verification["ok"]:
        raise ValueError(f"{dataset_id}: derived matrix verification failed: {verification['reason']}")

    return {
        "dataset_id": dataset_id,
        "matrix": str(paths.log_matrix),
        "metadata": str(paths.log_metadata),
        "shape": metadata["shape"],
        "nnz": metadata["nnz"],
        "dtype": metadata["dtype"],
        "source_checksum": metadata["source_matrix_checksum"],
        "verification_status": status,
        "verification_max_abs_diff": metadata["verification_max_abs_diff"],
        "verification_max_rel_diff": metadata["verification_max_rel_diff"],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "dataset_ids",
        nargs="+",
        help="Processed dataset IDs, e.g. GSE207736 GSE172461 GSE93374",
    )
    parser.add_argument(
        "--processed-dir",
        default="processed",
        type=Path,
        help="Directory containing processed/<dataset_id> outputs.",
    )
    parser.add_argument("--atol", type=float, default=DEFAULT_ATOL)
    parser.add_argument("--rtol", type=float, default=DEFAULT_RTOL)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for dataset_id in args.dataset_ids:
        result = build_dataset(
            dataset_id,
            args.processed_dir,
            atol=args.atol,
            rtol=args.rtol,
        )
        print(
            "[{dataset_id}] wrote {matrix}; shape={shape}; nnz={nnz}; "
            "verification={verification_status}; max_abs_diff={verification_max_abs_diff}; "
            "max_rel_diff={verification_max_rel_diff}".format(**result)
        )


if __name__ == "__main__":
    main()
