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

CELL_ID_COLUMNS = [
    "cell_id",
    "dataset_id",
    "sample_id",
    "condition",
]

NATIVE_ANNOTATION_COLUMNS = [
    "major_cell_type",
    "cell_type",
    "cluster_id",
    "region",
]

# Optional external-annotation columns appended by a per-dataset enrichment step
# (see EXTERNAL_ANNOTATION_STRATEGY.md). These are strictly additive: they are
# written only when an enrichment populated them, and they never displace the
# native CELL_COLUMNS above. Currently produced by the GSE207736 HypoMap-atlas
# enrichment.
CELL_ENRICHMENT_COLUMNS = [
    "hypomap_included",
    "hypomap_region",
    "hypomap_author_cell_type",
    "hypomap_C7",
    "hypomap_C25",
    "hypomap_C66",
    "hypomap_C185",
    "hypomap_C286",
    "hypomap_C465",
]

CELL_COLUMNS = CELL_ID_COLUMNS + NATIVE_ANNOTATION_COLUMNS + CELL_ENRICHMENT_COLUMNS

GENE_COLUMNS = [
    "gene_id",
    "gene_symbol",
    "species",
]

EXPRESSION_METADATA_FIELDS = [
    "orientation",
    "value_type",
    "n_cells",
    "n_genes",
    "nnz",
    "shape",
    "row_order",
    "col_order",
    "matrix_format",
    "dtype",
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
