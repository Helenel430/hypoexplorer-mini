"""Loader for a dense DGE text matrix (e.g. GSE93374 Drop-seq).

The file is a tab-separated dense matrix with a header row of cell ids and one
row per gene (gene symbol followed by integer counts). The header has one fewer
field than the body rows because the gene-symbol column is unlabelled; pandas
resolves this by using column 0 as the index.

The file is read in row (gene) chunks and each chunk is converted to a sparse
block, so the full dense array is never materialized at once.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, vstack

from .base import BaseLoader, LoaderResult


class DenseDGELoader(BaseLoader):
    def __init__(
        self,
        matrix_path: str | Path,
        dataset_id: str,
        species: str = "",
        chunk_genes: int = 2000,
    ):
        self.matrix_path = Path(matrix_path)
        self.dataset_id = dataset_id
        self.species = species
        self.chunk_genes = chunk_genes

    def load(self) -> LoaderResult:
        if not self.matrix_path.exists():
            raise FileNotFoundError(self.matrix_path)

        reader = pd.read_csv(
            self.matrix_path,
            sep="\t",
            index_col=0,
            chunksize=self.chunk_genes,
            compression="gzip",
        )

        gene_ids: list[str] = []
        cell_ids: list[str] | None = None
        gene_blocks: list[csr_matrix] = []  # each: genes(chunk) x cells

        for chunk in reader:
            if cell_ids is None:
                cell_ids = [str(c) for c in chunk.columns]
            gene_ids.extend(str(g) for g in chunk.index)
            gene_blocks.append(csr_matrix(chunk.to_numpy(dtype=np.float32)))

        if cell_ids is None:
            raise ValueError(f"{self.matrix_path.name}: no data rows found")

        genes_x_cells = (
            vstack(gene_blocks).tocsr() if len(gene_blocks) > 1 else gene_blocks[0]
        )
        matrix = genes_x_cells.T.tocsr()  # cells x genes

        genes = pd.DataFrame(
            {
                "gene_id": gene_ids,
                "gene_symbol": gene_ids,
                "species": self.species,
            }
        )
        cells = pd.DataFrame({"cell_id": cell_ids})
        # Default sample id = the batch/group prefix of the cell id (e.g. "arc1").
        cells["sample_id"] = cells["cell_id"].str.split("_", n=1).str[0]
        cells["dataset_id"] = self.dataset_id

        samples = pd.DataFrame({"sample_id": sorted(cells["sample_id"].unique())})
        samples["dataset_id"] = self.dataset_id

        return LoaderResult(
            matrix=matrix,
            genes=genes,
            cells=cells,
            samples=samples,
            value_type="raw_counts",
            has_cell_metadata=False,
        )
