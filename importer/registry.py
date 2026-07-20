"""Dataset registry: maps a dataset id to its loader and metadata enrichment.

Each entry knows how to build the right loader for the dataset's on-disk layout
and, when a per-cell metadata file exists, how to map its columns onto the
standardized ``cells``/``samples`` tables. Adding a new dataset means adding one
``DatasetConfig`` here (and, if it is a new on-disk format, a new loader).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
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
    _repair_gse172461_sample_ids_from_suffix(result, meta)
    _rebuild_samples_from_cells(result)


def _gse172461_aggregate_suffix(cell_id: str) -> str:
    """Return the Cell Ranger aggregate sample suffix from a GSE172461 cell id."""
    token = str(cell_id).strip().strip('"').strip("'")
    # Aggregated barcodes look like ``AAAC...-1-4``. Non-aggregated sample 1
    # cells use the ordinary 10x ``AAAC...-1`` form, so they map to suffix 1.
    match = re.search(r"-1-(\d+)$", token)
    if match:
        return match.group(1)
    match = re.search(r"-(\d+)$", token)
    return match.group(1) if match else ""


def _one_to_one_lookup(
    frame: pd.DataFrame,
    key_col: str,
    value_col: str,
    context: str,
) -> dict[str, str]:
    pairs = (
        frame[[key_col, value_col]]
        .replace("", pd.NA)
        .dropna()
        .drop_duplicates()
    )
    counts = pairs.groupby(key_col)[value_col].nunique()
    conflicts = counts[counts > 1]
    if not conflicts.empty:
        details = ", ".join(f"{key}={int(n)}" for key, n in conflicts.items())
        raise ValueError(f"{context}: expected one {value_col} per {key_col}; conflicts: {details}")
    return pairs.set_index(key_col)[value_col].to_dict()


def _repair_gse172461_sample_ids_from_suffix(
    result: LoaderResult, meta: pd.DataFrame
) -> None:
    """Fill GSE172461 sample_id/condition for matrix cells lacking metadata rows.

    The source metadata contains four Cell Ranger aggregate suffixes. Each suffix
    maps cleanly to one native ``Sample`` and one ``Treatment``. Cells without a
    per-cell metadata row keep native cell type/cluster fields blank; only these
    sample-level fields are inherited from the suffix.
    """
    meta = meta.copy()
    meta["_aggregate_suffix"] = meta["ID"].map(_gse172461_aggregate_suffix)
    suffix_to_sample = _one_to_one_lookup(
        meta, "_aggregate_suffix", "Sample", "GSE172461 sample_id repair"
    )
    sample_to_condition = _one_to_one_lookup(
        meta, "Sample", "Treatment", "GSE172461 sample_id repair"
    )

    if "sample_id" not in result.cells.columns:
        result.cells["sample_id"] = ""
    if "condition" not in result.cells.columns:
        result.cells["condition"] = ""

    cell_suffix = result.cells["cell_id"].map(_gse172461_aggregate_suffix)
    inferred_sample = cell_suffix.map(suffix_to_sample).fillna("")
    blank_sample = result.cells["sample_id"].astype(str).eq("")
    repair_mask = blank_sample & inferred_sample.ne("")

    repaired = int(repair_mask.sum())
    if repaired:
        result.cells.loc[repair_mask, "sample_id"] = inferred_sample[repair_mask].values
        inferred_condition = (
            result.cells.loc[repair_mask, "sample_id"]
            .map(sample_to_condition)
            .fillna("")
        )
        result.cells.loc[repair_mask, "condition"] = inferred_condition.values

    result.extra["gse172461_sample_id_repair_method"] = (
        "Cell Ranger aggregate suffix validated against GSE172461_metadata.csv.gz "
        "Sample and Treatment columns"
    )
    result.extra["gse172461_sample_id_repaired"] = repaired
    result.extra["gse172461_sample_id_repair_suffix_map"] = suffix_to_sample
    result.extra["gse172461_condition_repair_sample_map"] = sample_to_condition


def _rebuild_samples_from_cells(result: LoaderResult) -> None:
    """Rebuild sample rows and carry first-seen nonblank condition per sample."""
    sample_ids = [s for s in result.cells["sample_id"].unique() if s != ""]
    dataset_id = result.cells["dataset_id"].iloc[0] if len(result.cells) else ""
    result.samples = pd.DataFrame({"sample_id": sorted(sample_ids)})
    result.samples["dataset_id"] = dataset_id
    if "condition" in result.cells:
        nonblank = result.cells[result.cells["sample_id"].astype(str).ne("")]
        cond = nonblank.groupby("sample_id")["condition"].first()
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


# HypoMap-atlas annotation columns added by optional per-dataset sidecars. The
# sidecars carry these already named (built from the atlas obs table), so the
# join is a straight cell_id lookup.
_HYPOMAP_FIELDS = [
    "hypomap_region",
    "hypomap_author_cell_type",
    "hypomap_C7",
    "hypomap_C25",
    "hypomap_C66",
    "hypomap_C185",
    "hypomap_C286",
    "hypomap_C465",
]


def _apply_hypomap_sidecar(
    result: LoaderResult, input_dir: Path, dataset_id: str
) -> None:
    """Add optional HypoMap atlas annotations from a dataset-specific sidecar.

    The sidecar is an external curated metadata layer keyed to the importer's
    ``cell_id``. It is strictly additive: native observed columns are untouched,
    and ``has_cell_metadata`` is not changed. Imported cells absent from the
    atlas retain their expression data with ``hypomap_included = False``.
    """
    sidecar = input_dir / f"{dataset_id}_hypomap_sidecar.csv.gz"
    if not sidecar.exists():
        return
    meta = _read_gzip_table(sidecar, sep=",")
    meta = meta.drop_duplicates(subset=["cell_id"]).set_index("cell_id")

    idx = result.cells["cell_id"]
    included = idx.isin(meta.index)
    result.cells["hypomap_included"] = included.map({True: "True", False: "False"}).values
    for col in _HYPOMAP_FIELDS:
        source = meta[col] if col in meta.columns else pd.Series(dtype=str)
        result.cells[col] = idx.map(source).fillna("").values

    matched, total = int(included.sum()), int(len(idx))
    result.extra["hypomap_matched"] = matched
    result.extra["hypomap_total"] = total
    result.extra["hypomap_unmatched"] = total - matched
    result.extra["hypomap_source"] = sidecar.name
    print(
        f"[{dataset_id}] HypoMap enrichment: {matched}/{total} cells annotated; "
        f"{total - matched} unmatched retained as hypomap_included=False"
    )


def _enrich_gse207736(result: LoaderResult, input_dir: Path, tissue: str) -> None:
    """Optional HypoMap-atlas annotation for the raw-only Dowsett10xnuc dataset."""
    _apply_hypomap_sidecar(result, input_dir, "GSE207736")


def _enrich_gse172461_with_hypomap(
    result: LoaderResult, input_dir: Path, tissue: str
) -> None:
    _enrich_gse172461(result, input_dir, tissue)
    _apply_hypomap_sidecar(result, input_dir, "GSE172461")


def _enrich_gse93374_with_hypomap(
    result: LoaderResult, input_dir: Path, tissue: str
) -> None:
    _enrich_gse93374(result, input_dir, tissue)
    _apply_hypomap_sidecar(result, input_dir, "GSE93374")


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

REGISTRY: dict[str, DatasetConfig] = {
    "GSE207736": DatasetConfig(
        dataset_id="GSE207736",
        build_loader=lambda input_dir, species: TenXMtxLoader(input_dir, "GSE207736", species),
        enrich=_enrich_gse207736,
        subdir="GSE207736_RAW",
    ),
    "GSE172461": DatasetConfig(
        dataset_id="GSE172461",
        build_loader=lambda input_dir, species: TenXMtxLoader(input_dir, "GSE172461", species),
        enrich=_enrich_gse172461_with_hypomap,
        subdir="",
    ),
    "GSE93374": DatasetConfig(
        dataset_id="GSE93374",
        build_loader=lambda input_dir, species: DenseDGELoader(
            Path(input_dir) / "GSE93374_Merged_all_020816_DGE.txt.gz", "GSE93374", species
        ),
        enrich=_enrich_gse93374_with_hypomap,
        subdir="",
    ),
}


def get_config(dataset_id: str) -> DatasetConfig:
    if dataset_id not in REGISTRY:
        raise KeyError(
            f"Unknown dataset {dataset_id!r}. Registered: {', '.join(sorted(REGISTRY))}"
        )
    return REGISTRY[dataset_id]
