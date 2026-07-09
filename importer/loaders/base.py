"""Common loader interface and result container.

Every source-format loader parses its raw files into a `LoaderResult`, which
holds the expression matrix in the standardized orientation (cells x genes)
plus aligned genes/cells/samples tables. Everything downstream (validation,
metadata enrichment, writing) works only against `LoaderResult` and never
touches source-specific layout.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd
from scipy.sparse import csr_matrix


@dataclass
class LoaderResult:
    """Standardized in-memory representation produced by a loader.

    Attributes
    ----------
    matrix:
        Sparse CSR matrix, oriented ``cells x genes``. Row order matches
        ``cells['cell_id']``; column order matches ``genes['gene_id']``.
    genes:
        One row per gene. Must contain ``gene_id`` and ``gene_symbol``.
    cells:
        One row per cell/nucleus. Must contain ``cell_id`` and ``sample_id``.
        May carry per-cell annotation columns (major_cell_type, cell_type,
        cluster_id, region, condition) when the source provides them.
    samples:
        One row per detected biological sample/library. Must contain
        ``sample_id``; may carry ``gsm_id`` and any per-sample fields.
    value_type:
        One of ``raw_counts``, ``normalized``, ``log_normalized``.
    """

    matrix: csr_matrix
    genes: pd.DataFrame
    cells: pd.DataFrame
    samples: pd.DataFrame
    value_type: str = "raw_counts"
    has_cell_metadata: bool = False
    extra: dict = field(default_factory=dict)


class BaseLoader:
    """Interface every format loader implements."""

    def load(self) -> LoaderResult:  # pragma: no cover - interface only
        raise NotImplementedError


def make_unique(names) -> list[str]:
    """R-style ``make.unique``: append ``.1``, ``.2`` ... to duplicates.

    The first occurrence of a name is kept as-is; subsequent duplicates get an
    incrementing suffix. Used to guarantee unique gene symbols.
    """
    seen: dict[str, int] = {}
    out: list[str] = []
    for raw in names:
        name = "" if raw is None else str(raw)
        if name not in seen:
            seen[name] = 0
            out.append(name)
        else:
            seen[name] += 1
            out.append(f"{name}.{seen[name]}")
    return out
