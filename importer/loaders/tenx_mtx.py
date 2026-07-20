"""Loader for 10x-style MatrixMarket triplets.

Handles both the multi-sample case (a folder of
``GSM..._<sample>_{matrix.mtx,features.tsv,barcodes.tsv}.gz`` triplets, e.g.
GSE207736) and the single merged case (one ``<dataset>_matrix.mtx.gz`` triplet,
e.g. GSE172461).

For multi-sample datasets each sample is loaded independently, its barcodes are
prefixed with the sample id to prevent collisions, genes are aligned across
samples on a stable ``gene_id``, and everything is concatenated into one
``cells x genes`` CSR matrix.
"""

from __future__ import annotations

import gzip
import re
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.io import mmread
from scipy.sparse import csr_matrix, vstack

from .base import BaseLoader, LoaderResult

# GSM accession + human-readable sample token, e.g. "GSM6311217_AA3".
_GSM_SAMPLE_RE = re.compile(r"^(GSM\d+)_(.+)$")


def _strip(token: str) -> str:
    """Strip surrounding whitespace and quotes from a TSV token."""
    return token.strip().strip('"').strip("'")


def _find_sibling(matrix_path: Path, kind: str) -> Path:
    """Given a ``*matrix.mtx.gz`` path, find its ``features``/``barcodes`` sibling.

    ``kind`` is ``features`` or ``barcodes``. Handles both the ``features`` and
    legacy ``genes`` naming for the features file.
    """
    prefix = matrix_path.name[: -len("matrix.mtx.gz")]
    candidates = []
    if kind == "features":
        candidates = [f"{prefix}features.tsv.gz", f"{prefix}genes.tsv.gz"]
    else:
        candidates = [f"{prefix}barcodes.tsv.gz"]
    for name in candidates:
        p = matrix_path.with_name(name)
        if p.exists():
            return p
    raise FileNotFoundError(
        f"No {kind} file found for {matrix_path.name} "
        f"(looked for {', '.join(candidates)})"
    )


def _parse_sample_id(matrix_path: Path, dataset_id: str) -> tuple[str, str | None]:
    """Infer ``(sample_id, gsm_id)`` from a matrix filename.

    ``GSM6311217_AA3_matrix.mtx.gz`` -> ("AA3", "GSM6311217").
    ``GSE172461_matrix.mtx.gz``      -> (dataset_id, None)  [single merged file]
    """
    prefix = matrix_path.name[: -len("_matrix.mtx.gz")]
    m = _GSM_SAMPLE_RE.match(prefix)
    if m:
        return m.group(2), m.group(1)
    # Single merged file named after the dataset (or anything without a GSM).
    if prefix == dataset_id or prefix == "":
        return dataset_id, None
    return prefix, None


def _read_features(path: Path) -> pd.DataFrame:
    """Read a features/genes TSV into a DataFrame with ``gene_id``/``gene_symbol``.

    Supports 3-column (Ensembl, symbol, type) and 1-column (symbol only) files,
    quoted or unquoted.
    """
    gene_ids: list[str] = []
    symbols: list[str] = []
    with gzip.open(path, "rt") as fh:
        for line in fh:
            parts = [_strip(p) for p in line.rstrip("\n").split("\t")]
            if not parts or parts == [""]:
                continue
            if len(parts) >= 2:
                gene_ids.append(parts[0])
                symbols.append(parts[1])
            else:
                gene_ids.append(parts[0])
                symbols.append(parts[0])
    return pd.DataFrame({"gene_id": gene_ids, "gene_symbol": symbols})


def _read_barcodes(path: Path) -> list[str]:
    barcodes: list[str] = []
    with gzip.open(path, "rt") as fh:
        for line in fh:
            token = _strip(line)
            if token:
                barcodes.append(token)
    return barcodes


class TenXMtxLoader(BaseLoader):
    def __init__(self, input_dir: str | Path, dataset_id: str, species: str = ""):
        self.input_dir = Path(input_dir)
        self.dataset_id = dataset_id
        self.species = species

    def _discover_matrices(self) -> list[Path]:
        # Skip macOS AppleDouble sidecar files (``._*``); they share the real
        # file's name and glob but are non-gzip filesystem metadata.
        matrices = sorted(
            p for p in self.input_dir.glob("*matrix.mtx.gz")
            if not p.name.startswith("._")
        )
        if not matrices:
            raise FileNotFoundError(
                f"No *matrix.mtx.gz files found under {self.input_dir}"
            )
        return matrices

    def load(self) -> LoaderResult:
        matrices = self._discover_matrices()

        # First pass: read each sample's features and build the master gene table
        # (union of gene_ids, ordered by first appearance across samples).
        sample_specs = []  # (sample_id, gsm_id, matrix_path, features_df, barcodes)
        master_gene_ids: list[str] = []
        master_index: dict[str, int] = {}
        gene_symbol_by_id: dict[str, str] = {}

        for mpath in matrices:
            sample_id, gsm_id = _parse_sample_id(mpath, self.dataset_id)
            features = _read_features(_find_sibling(mpath, "features"))
            barcodes = _read_barcodes(_find_sibling(mpath, "barcodes"))
            sample_specs.append((sample_id, gsm_id, mpath, features, barcodes))
            for gid, sym in zip(features["gene_id"], features["gene_symbol"]):
                if gid not in master_index:
                    master_index[gid] = len(master_gene_ids)
                    master_gene_ids.append(gid)
                    gene_symbol_by_id[gid] = sym

        n_genes = len(master_gene_ids)

        # Second pass: read each matrix, orient to cells x genes, remap columns
        # into the master gene space, prefix barcodes, and collect.
        cell_blocks: list[csr_matrix] = []
        cell_rows: list[dict] = []
        sample_rows: list[dict] = []
        multi = len(sample_specs) > 1

        for sample_id, gsm_id, mpath, features, barcodes in sample_specs:
            mat = mmread(str(mpath)).tocsr()  # genes x cells (10x convention)
            if mat.shape[0] != len(features):
                raise ValueError(
                    f"{mpath.name}: matrix has {mat.shape[0]} gene rows but "
                    f"features file has {len(features)} entries"
                )
            if mat.shape[1] != len(barcodes):
                raise ValueError(
                    f"{mpath.name}: matrix has {mat.shape[1]} cell cols but "
                    f"barcodes file has {len(barcodes)} entries"
                )

            cells_x_genes = mat.T.tocsr()  # cells x genes (sample-local order)

            # Remap sample-local gene columns to master gene columns.
            col_map = np.array(
                [master_index[gid] for gid in features["gene_id"]], dtype=np.int64
            )
            coo = cells_x_genes.tocoo()
            remapped = csr_matrix(
                (coo.data, (coo.row, col_map[coo.col])),
                shape=(cells_x_genes.shape[0], n_genes),
            )
            cell_blocks.append(remapped)

            for bc in barcodes:
                cell_id = f"{sample_id}_{bc}" if multi else bc
                cell_rows.append({"cell_id": cell_id, "sample_id": sample_id})

            sample_rows.append({"sample_id": sample_id, "gsm_id": gsm_id})

        matrix = vstack(cell_blocks).tocsr() if len(cell_blocks) > 1 else cell_blocks[0]

        genes = pd.DataFrame(
            {
                "gene_id": master_gene_ids,
                "gene_symbol": [gene_symbol_by_id[g] for g in master_gene_ids],
                "species": self.species,
            }
        )
        cells = pd.DataFrame(cell_rows)
        cells["dataset_id"] = self.dataset_id
        samples = pd.DataFrame(sample_rows)
        samples["dataset_id"] = self.dataset_id

        return LoaderResult(
            matrix=matrix,
            genes=genes,
            cells=cells,
            samples=samples,
            value_type="raw_counts",
            has_cell_metadata=False,
        )
