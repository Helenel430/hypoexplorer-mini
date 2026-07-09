"""Write a validated LoaderResult to the standardized output layout."""

from __future__ import annotations

import json
from pathlib import Path

from scipy.sparse import csr_matrix, save_npz

from . import schema
from .loaders.base import LoaderResult


def write_dataset(
    result: LoaderResult,
    dataset_meta: dict,
    out_dir: str | Path,
) -> Path:
    """Emit dataset.json, samples.csv, cells.csv, genes.csv, matrix + metadata.

    Returns the output directory. ``dataset_meta`` is the study-level dict from
    the HypoMap card. Row/column order of the matrix is pinned to the written
    cells.csv / genes.csv order.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # dataset.json
    with open(out_dir / "dataset.json", "w") as fh:
        json.dump(dataset_meta, fh, indent=2)

    # samples.csv / cells.csv / genes.csv (conform to required columns)
    samples = schema.conform(result.samples, schema.SAMPLE_COLUMNS)
    cells = schema.conform(result.cells, schema.CELL_COLUMNS)
    genes = schema.conform(result.genes, schema.GENE_COLUMNS)
    samples.to_csv(out_dir / "samples.csv", index=False)
    cells.to_csv(out_dir / "cells.csv", index=False)
    genes.to_csv(out_dir / "genes.csv", index=False)

    # expression_matrix.npz (cells x genes, CSR)
    matrix = result.matrix
    if not isinstance(matrix, csr_matrix):
        matrix = matrix.tocsr()
    save_npz(out_dir / "expression_matrix.npz", matrix)

    # expression_metadata.json
    n_cells, n_genes = matrix.shape
    with open(out_dir / "expression_metadata.json", "w") as fh:
        json.dump(
            {
                "orientation": "cells_x_genes",
                "value_type": result.value_type,
                "n_cells": int(n_cells),
                "n_genes": int(n_genes),
                "nnz": int(matrix.nnz),
                "shape": [int(n_cells), int(n_genes)],
                "row_order": "cells.csv",
                "col_order": "genes.csv",
                "matrix_format": "csr",
                "dtype": str(matrix.dtype),
            },
            fh,
            indent=2,
        )

    return out_dir
