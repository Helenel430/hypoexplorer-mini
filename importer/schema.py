"""Standardized output schema: column definitions shared by writer/validation."""

from __future__ import annotations

# dataset.json is a dict; these are the required keys (extra keys are allowed).
DATASET_FIELDS = [
    "dataset_id",
    "title",
    "species",
    "tissue",
    "technology",
    "publication",
    "source",
]

SAMPLE_COLUMNS = [
    "sample_id",
    "dataset_id",
    "condition",
    "age",
    "sex",
    "technology",
]

CELL_COLUMNS = [
    "cell_id",
    "dataset_id",
    "sample_id",
    "condition",
    "major_cell_type",
    "cell_type",
    "cluster_id",
    "region",
]

GENE_COLUMNS = [
    "gene_id",
    "gene_symbol",
    "species",
]

# Recognized values for expression_metadata.json "value_type".
VALUE_TYPES = {"raw_counts", "normalized", "log_normalized"}


def conform(df, columns, fill=""):
    """Return a copy of ``df`` with exactly ``columns`` (added-as-``fill``, reordered)."""
    out = df.copy()
    for col in columns:
        if col not in out.columns:
            out[col] = fill
    return out[columns]
