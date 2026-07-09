"""Dataset registry: maps a dataset id to its loader and metadata enrichment.

Each entry knows how to build the right loader for the dataset's on-disk layout
and, when a per-cell metadata file exists, how to map its columns onto the
standardized ``cells``/``samples`` tables. Adding a new dataset means adding one
``DatasetConfig`` here (and, if it is a new on-disk format, a new loader).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

import pandas as pd

from .loaders import DenseDGELoader, LoaderResult, TenXMtxLoader


@dataclass
class DatasetConfig:
    dataset_id: str
    # build_loader(input_dir, species) -> loader instance
    build_loader: Callable
    # enrich(result, input_dir, tissue) -> None; mutates result.cells/samples in place
    enrich: Optional[Callable] = None
    # subdirectory (relative to the search root) holding the source files
    subdir: str = ""


def _read_gzip_table(path: Path, sep: str) -> pd.DataFrame:
    return pd.read_csv(path, sep=sep, dtype=str, compression="gzip").fillna("")


def _apply_cell_metadata(
    result: LoaderResult,
    meta: pd.DataFrame,
    id_col: str,
    mapping: dict[str, str],
    tissue: str,
) -> None:
    """Align ``meta`` to the matrix cells and apply a ``target -> source`` mapping.

    ``result.cells`` keeps its matrix-defined row order; metadata is joined on
    ``id_col``. Cells absent from metadata get empty annotation values.
    """
    meta = meta.drop_duplicates(subset=[id_col]).set_index(id_col)
    idx = result.cells["cell_id"]
    # Record how many matrix cells actually join to a metadata row (check 3).
    result.extra["metadata_matched"] = int(idx.isin(meta.index).sum())
    result.extra["metadata_total"] = int(len(idx))
    for target, source in mapping.items():
        if source in meta.columns:
            result.cells[target] = idx.map(meta[source]).fillna("").values
    if tissue and "region" not in mapping:
        result.cells["region"] = tissue
    result.has_cell_metadata = True

    # Rebuild samples from the (possibly metadata-derived) sample ids.
    if "sample_id" in result.cells.columns:
        sample_ids = [s for s in result.cells["sample_id"].unique() if s != ""]
        dataset_id = result.cells["dataset_id"].iloc[0] if len(result.cells) else ""
        result.samples = pd.DataFrame({"sample_id": sorted(sample_ids)})
        result.samples["dataset_id"] = dataset_id


# ---------------------------------------------------------------------------
# Per-dataset enrichment functions
# ---------------------------------------------------------------------------

def _enrich_gse172461(result: LoaderResult, input_dir: Path, tissue: str) -> None:
    meta_path = input_dir / "GSE172461_metadata.csv.gz"
    if not meta_path.exists():
        return
    meta = _read_gzip_table(meta_path, sep=",")
    # cluster_id: prefer neuron cluster, fall back to conserved cluster.
    meta["_cluster"] = meta["Neuron_cluster"].where(
        meta["Neuron_cluster"] != "", meta.get("Conserved_cluster", "")
    )
    _apply_cell_metadata(
        result,
        meta,
        id_col="ID",
        mapping={
            "sample_id": "Sample",
            "condition": "Treatment",
            "major_cell_type": "Cell_type",
            "cell_type": "Cell_type",
            "cluster_id": "_cluster",
        },
        tissue=tissue,
    )
    result.samples["dataset_id"] = result.cells["dataset_id"].iloc[0]
    # carry condition onto samples via first-seen per sample
    cond = (
        result.cells.groupby("sample_id")["condition"].first()
        if "condition" in result.cells
        else None
    )
    if cond is not None:
        result.samples["condition"] = result.samples["sample_id"].map(cond).fillna("")


def _legend_map(meta: pd.DataFrame, col: str) -> dict[str, str]:
    """Build a ``code -> name`` lookup from a legend column like ``a03.Endothelial``.

    In this dataset the ``All Cell Clusters`` / ``... Subclusters`` columns are not
    per-cell values; they hold a compact legend (only the first N rows populated)
    mapping a cluster code to a human-readable name.
    """
    out: dict[str, str] = {}
    if col not in meta.columns:
        return out
    for entry in meta[col]:
        if entry:
            code, _, name = str(entry).partition(".")
            out[code] = name or code
    return out


def _enrich_gse93374(result: LoaderResult, input_dir: Path, tissue: str) -> None:
    meta_path = input_dir / "GSE93374_cell_metadata.txt.gz"
    if not meta_path.exists():
        return
    meta = _read_gzip_table(meta_path, sep="\t")
    # Column names carry numeric prefixes ("1.ID", "2.group", ...); normalize.
    rename = {c: c.split(".", 1)[1] if "." in c and c[0].isdigit() else c for c in meta.columns}
    meta = meta.rename(columns=rename)
    # Combined diet/fed-vs-fast condition, e.g. "Chow | Fed".
    if "Diet" in meta and "FvF" in meta:
        meta["_condition"] = (meta["Diet"] + " | " + meta["FvF"]).str.strip(" |")
    else:
        meta["_condition"] = meta.get("Diet", "")

    # Resolve per-cell cluster codes to names via the legend columns.
    cluster_legend = _legend_map(meta, "All Cell Clusters")
    subcluster_legend = _legend_map(meta, "All Cell Subclusters")
    neuron_legend = _legend_map(meta, "Neuron Subclusters")
    meta["_major"] = meta["clust_all"].map(cluster_legend).fillna("")
    sub = meta["clust_all_micro"].map(subcluster_legend).fillna("")
    neur = meta["clust_neurons"].map(neuron_legend).fillna("")
    # Prefer the neuron subcluster name for neurons, else the general subcluster.
    meta["_subtype"] = neur.where(neur != "", sub)

    _apply_cell_metadata(
        result,
        meta,
        id_col="ID",
        mapping={
            "sample_id": "group",
            "condition": "_condition",
            "major_cell_type": "_major",
            "cell_type": "_subtype",
            "cluster_id": "clust_all",
        },
        tissue=tissue,
    )
    result.samples["dataset_id"] = result.cells["dataset_id"].iloc[0]
    # sex and condition onto samples
    for target, source in (("sex", "sex"), ("condition", "_condition")):
        per = meta.drop_duplicates("group").set_index("group")[source] if source in meta else None
        if per is not None:
            result.samples[target] = result.samples["sample_id"].map(per).fillna("")


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

REGISTRY: dict[str, DatasetConfig] = {
    "GSE207736": DatasetConfig(
        dataset_id="GSE207736",
        build_loader=lambda input_dir, species: TenXMtxLoader(input_dir, "GSE207736", species),
        enrich=None,
        subdir="GSE207736_RAW",
    ),
    "GSE172461": DatasetConfig(
        dataset_id="GSE172461",
        build_loader=lambda input_dir, species: TenXMtxLoader(input_dir, "GSE172461", species),
        enrich=_enrich_gse172461,
        subdir="",
    ),
    "GSE93374": DatasetConfig(
        dataset_id="GSE93374",
        build_loader=lambda input_dir, species: DenseDGELoader(
            Path(input_dir) / "GSE93374_Merged_all_020816_DGE.txt.gz", "GSE93374", species
        ),
        enrich=_enrich_gse93374,
        subdir="",
    ),
}


def get_config(dataset_id: str) -> DatasetConfig:
    if dataset_id not in REGISTRY:
        raise KeyError(
            f"Unknown dataset {dataset_id!r}. Registered: {', '.join(sorted(REGISTRY))}"
        )
    return REGISTRY[dataset_id]
