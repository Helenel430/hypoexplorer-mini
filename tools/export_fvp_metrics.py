#!/usr/bin/env python3
"""Export a lightweight FVP metric slice from processed matrices.

The export is static JSON intended for wiring the frozen Gene Explorer FVP. It
uses the canonical resolver, raw counts for positivity/%/detection, and verified
Seurat LogNormalize matrices for magnitude metrics.
"""

from __future__ import annotations

import argparse
from itertools import combinations
import json
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from scipy.sparse import load_npz

from gene_harmonization_lib import DATASETS, resolve_query


DEFAULT_GENES = ["Pomc", "Agrp", "Ccn1", "Fam237b", "Npy"]
COEXPRESSION_GENES = DEFAULT_GENES
QUADRANT_KEYS = ("both_positive", "gene_a_only", "gene_b_only", "neither")
NO_REGION_LABEL = "No HypoMap region"
NO_C25_LABEL = "Unannotated C25"
MISSING_SAMPLE_LABEL = "Missing sample identity"


def clean_label(value: object, blank_label: str) -> str:
    value = str(value).strip()
    return value if value else blank_label


def json_number(value: float | None) -> float | None:
    if value is None or not np.isfinite(value):
        return None
    return float(value)


def histogram(values: np.ndarray, bins: int) -> dict:
    values = values[np.isfinite(values)]
    if values.size == 0:
        return {
            "population": "raw-count-positive eligible cells",
            "n": 0,
            "bin_edges": [],
            "counts": [],
            "quantiles": {},
        }

    vmin = float(values.min())
    vmax = float(values.max())
    if vmin == vmax:
        delta = max(abs(vmin) * 0.01, 0.01)
        hist_range = (vmin - delta, vmax + delta)
    else:
        hist_range = (vmin, vmax)
    counts, edges = np.histogram(values, bins=bins, range=hist_range)
    quantiles = np.quantile(values, [0, 0.25, 0.5, 0.75, 1.0])
    return {
        "population": "raw-count-positive eligible cells",
        "n": int(values.size),
        "bin_edges": [float(x) for x in edges],
        "counts": [int(x) for x in counts],
        "quantiles": {
            "min": float(quantiles[0]),
            "q25": float(quantiles[1]),
            "median": float(quantiles[2]),
            "q75": float(quantiles[3]),
            "max": float(quantiles[4]),
        },
    }


def compute_metrics(raw_col: np.ndarray, log_col: np.ndarray, eligible: np.ndarray, bins: int) -> dict:
    eligible = eligible.astype(bool)
    eligible_cells = int(eligible.sum())
    if eligible_cells == 0:
        return {
            "eligible_cells": 0,
            "positive_cells": 0,
            "percent_expressing": None,
            "dataset_detection": None,
            "mean_expression_positive": None,
            "sum_log_expression_positive": 0.0,
            "expression_distribution": histogram(np.array([], dtype=np.float32), bins),
        }

    positive_mask = eligible & (raw_col >= 1)
    positive_cells = int(positive_mask.sum())
    positive_log_values = log_col[positive_mask].astype(np.float64)
    sum_log = float(positive_log_values.sum()) if positive_cells else 0.0
    mean_log = sum_log / positive_cells if positive_cells else None
    return {
        "eligible_cells": eligible_cells,
        "positive_cells": positive_cells,
        "percent_expressing": (positive_cells / eligible_cells) * 100,
        "dataset_detection": positive_cells >= 1,
        "mean_expression_positive": json_number(mean_log),
        "sum_log_expression_positive": sum_log,
        "expression_distribution": histogram(positive_log_values, bins),
    }


def empty_metrics(bins: int) -> dict:
    return {
        "eligible_cells": 0,
        "positive_cells": 0,
        "percent_expressing": None,
        "dataset_detection": None,
        "mean_expression_positive": None,
        "sum_log_expression_positive": 0.0,
        "expression_distribution": histogram(np.array([], dtype=np.float32), bins),
    }


def aggregate_dataset_metrics(metrics_by_dataset: dict[str, dict]) -> dict:
    available = [
        (dataset_id, metric)
        for dataset_id, metric in metrics_by_dataset.items()
        if metric.get("eligible_cells", 0) > 0
    ]
    unavailable = [
        dataset_id
        for dataset_id, metric in metrics_by_dataset.items()
        if metric.get("eligible_cells", 0) == 0
    ]

    total_eligible = int(sum(metric["eligible_cells"] for _, metric in available))
    total_positive = int(sum(metric["positive_cells"] for _, metric in available))
    total_sum_log = float(sum(metric["sum_log_expression_positive"] for _, metric in available))
    detected = [dataset_id for dataset_id, metric in available if metric["dataset_detection"]]
    pct_values = [metric["percent_expressing"] for _, metric in available if metric["percent_expressing"] is not None]
    mean_values = [
        metric["mean_expression_positive"]
        for _, metric in available
        if metric["mean_expression_positive"] is not None
    ]

    return {
        "datasets_available": [dataset_id for dataset_id, _ in available],
        "datasets_unavailable_zero_eligible": unavailable,
        "dataset_detection_count": len(detected),
        "dataset_detection_total": len(available),
        "detected_dataset_ids": detected,
        "total_eligible_cells": total_eligible,
        "total_positive_cells": total_positive,
        "percent_expressing": {
            "mode_a_dataset_average": float(np.mean(pct_values)) if pct_values else None,
            "mode_b_cell_pooled": (total_positive / total_eligible * 100) if total_eligible else None,
        },
        "mean_expression_positive": {
            "mode_a_dataset_average": float(np.mean(mean_values)) if mean_values else None,
            "mode_b_cell_pooled": (total_sum_log / total_positive) if total_positive else None,
        },
    }


def load_dataset(processed_dir: Path, dataset_id: str) -> dict:
    dataset_dir = processed_dir / dataset_id
    genes = pd.read_csv(dataset_dir / "genes.csv", dtype=str).fillna("")
    cells = pd.read_csv(dataset_dir / "cells.csv", dtype=str).fillna("")
    raw = load_npz(dataset_dir / "expression_matrix.npz").tocsc()
    log = load_npz(dataset_dir / "expression_matrix_lognormalized.npz").tocsc()
    with (dataset_dir / "expression_metadata_lognormalized.json").open() as fh:
        log_metadata = json.load(fh)
    if log_metadata.get("verification_status") != "passed":
        raise ValueError(f"{dataset_id}: log-normalized matrix verification is not passed")
    return {
        "genes": genes,
        "cells": cells,
        "raw": raw,
        "log": log,
        "log_metadata": log_metadata,
    }


def find_gene_index(genes: pd.DataFrame, dataset_gene_id: str, dataset_gene_symbol: str) -> int | None:
    id_matches = genes.index[genes["gene_id"].astype(str) == str(dataset_gene_id)].tolist()
    symbol_matches = genes.index[genes["gene_symbol"].astype(str) == str(dataset_gene_symbol)].tolist()
    if len(id_matches) == 1:
        return int(id_matches[0])
    if len(symbol_matches) == 1:
        return int(symbol_matches[0])
    return None


def resolve_gene_columns(
    query: str,
    *,
    datasets: dict[str, dict],
    harmonization_csv: Path,
    mgi_source_dir: Path,
    dataset_ids: list[str],
) -> tuple[dict, dict[str, int]]:
    """Resolve one gene and return its matrix column in every selected dataset."""
    resolver = resolve_query(
        query,
        harmonization_csv=harmonization_csv,
        mgi_source_dir=mgi_source_dir,
        selected_datasets=dataset_ids,
    )
    if resolver["state"] != "resolved":
        return resolver, {}

    columns: dict[str, int] = {}
    for mapping in resolver["dataset_mappings"]:
        dataset_id = mapping["dataset_id"]
        if mapping["state"] != "resolved":
            continue
        gene_idx = find_gene_index(
            datasets[dataset_id]["genes"],
            mapping["dataset_gene_id"],
            mapping["dataset_gene_symbol"],
        )
        if gene_idx is not None:
            columns[dataset_id] = gene_idx
    return resolver, columns


def compute_coexpression_metrics(
    raw_a: np.ndarray,
    raw_b: np.ndarray,
    eligible: np.ndarray,
) -> dict:
    """Return the exhaustive four-way raw-count detection split for a population."""
    eligible = eligible.astype(bool)
    eligible_cells = int(eligible.sum())
    a_positive = raw_a >= 1
    b_positive = raw_b >= 1
    counts = {
        "both_positive": int((eligible & a_positive & b_positive).sum()),
        "gene_a_only": int((eligible & a_positive & ~b_positive).sum()),
        "gene_b_only": int((eligible & ~a_positive & b_positive).sum()),
        "neither": int((eligible & ~a_positive & ~b_positive).sum()),
    }
    if sum(counts.values()) != eligible_cells:
        raise ValueError("coexpression quadrants do not partition the eligible population")
    percentages = {
        key: (value / eligible_cells * 100) if eligible_cells else None
        for key, value in counts.items()
    }
    return {
        "eligible_cells": eligible_cells,
        "quadrant_counts": counts,
        "quadrant_percentages": percentages,
    }


def aggregate_coexpression_metrics(metrics_by_dataset: dict[str, dict]) -> dict:
    """Cell-pooled coexpression summary computed from integer dataset counts."""
    available = {
        dataset_id: metric
        for dataset_id, metric in metrics_by_dataset.items()
        if metric.get("eligible_cells", 0) > 0
    }
    total = int(sum(metric["eligible_cells"] for metric in available.values()))
    counts = {
        key: int(sum(metric["quadrant_counts"][key] for metric in available.values()))
        for key in QUADRANT_KEYS
    }
    if sum(counts.values()) != total:
        raise ValueError("aggregated coexpression quadrants do not sum to the pooled denominator")
    return {
        "aggregation": "cell_pooled",
        "datasets_available": list(available),
        "datasets_unavailable_zero_eligible": [
            dataset_id for dataset_id in metrics_by_dataset if dataset_id not in available
        ],
        "eligible_cells": total,
        "quadrant_counts": counts,
        "quadrant_percentages": {
            key: (value / total * 100) if total else None for key, value in counts.items()
        },
    }


def export_coexpression_pilot(
    gene_a: str,
    gene_b: str,
    *,
    datasets: dict[str, dict],
    harmonization_csv: Path,
    mgi_source_dir: Path,
    dataset_ids: list[str],
) -> dict:
    """Export one selectable vertical-slice pair across annotated HypoMap regions."""
    if gene_a == gene_b:
        raise ValueError("coexpression genes must be distinct")
    pilot_id = f"{gene_a.lower()}_{gene_b.lower()}_regions"
    queries = [gene_a, gene_b]
    resolved = {
        query: resolve_gene_columns(
            query,
            datasets=datasets,
            harmonization_csv=harmonization_csv,
            mgi_source_dir=mgi_source_dir,
            dataset_ids=dataset_ids,
        )
        for query in queries
    }
    unsupported = {
        query: resolver["state"]
        for query, (resolver, columns) in resolved.items()
        if resolver["state"] != "resolved" or set(columns) != set(dataset_ids)
    }
    if unsupported:
        return {
            "id": pilot_id,
            "gene_a": gene_a,
            "gene_b": gene_b,
            "state": "unsupported",
            "unsupported_genes": unsupported,
            "resolvers": {query: resolver for query, (resolver, _) in resolved.items()},
            "populations": [],
        }

    region_labels = sorted(
        {
            str(region).strip()
            for dataset_id in dataset_ids
            for region in datasets[dataset_id]["cells"]["hypomap_region"]
            if str(region).strip()
        }
    )
    population_specs = [
        {
            "id": "whole_dataset",
            "scope": "whole_dataset",
            "region": None,
            "label": "Whole hypothalamus cells",
            "definition": "all imported cells in the selected hypothalamic datasets",
        },
        *[
        {
            "id": f"region::{region}",
            "scope": "hypomap_region",
            "region": region,
            "label": f"{region} cells",
            "definition": f'hypomap_region == "{region}"',
        }
        for region in region_labels
        ],
    ]
    metrics_by_population = {spec["id"]: {} for spec in population_specs}
    context_by_dataset: dict[str, dict] = {}

    for dataset_id in dataset_ids:
        data = datasets[dataset_id]
        cells = data["cells"]
        raw_columns = {
            query: data["raw"][:, resolved[query][1][dataset_id]].toarray().ravel()
            for query in queries
        }
        cell_regions = cells["hypomap_region"].astype(str).str.strip()
        population_masks = {
            spec["id"]: (
                np.ones(len(cells), dtype=bool)
                if spec["scope"] == "whole_dataset"
                else cell_regions.eq(spec["region"]).to_numpy()
            )
            for spec in population_specs
        }
        context_by_dataset[dataset_id] = {
            "total_imported_cells": int(len(cells)),
            "cells_with_hypomap_region": int(cell_regions.ne("").sum()),
            "cells_without_hypomap_region": int(cell_regions.eq("").sum()),
            "region_cells": {
                region: int(cell_regions.eq(region).sum()) for region in region_labels
            },
        }
        for population_id, eligible in population_masks.items():
            metric = compute_coexpression_metrics(
                raw_columns[gene_a],
                raw_columns[gene_b],
                eligible,
            )
            swapped = compute_coexpression_metrics(
                raw_columns[gene_b],
                raw_columns[gene_a],
                eligible,
            )
            if (
                metric["quadrant_counts"]["both_positive"] != swapped["quadrant_counts"]["both_positive"]
                or metric["quadrant_counts"]["gene_a_only"] != swapped["quadrant_counts"]["gene_b_only"]
                or metric["quadrant_counts"]["gene_b_only"] != swapped["quadrant_counts"]["gene_a_only"]
                or metric["quadrant_counts"]["neither"] != swapped["quadrant_counts"]["neither"]
            ):
                raise ValueError(f"{dataset_id} {population_id}: gene-swap symmetry failed")
            metrics_by_population[population_id][dataset_id] = metric

    populations = []
    for spec in population_specs:
        dataset_metrics = metrics_by_population[spec["id"]]
        populations.append(
            {
                **spec,
                "dataset_metrics": dataset_metrics,
                "cross_dataset": aggregate_coexpression_metrics(dataset_metrics),
            }
        )

    return {
        "id": pilot_id,
        "gene_a": gene_a,
        "gene_b": gene_b,
        "state": "resolved",
        "gene_a_resolver": resolved[gene_a][0],
        "gene_b_resolver": resolved[gene_b][0],
        "metric_contract": {
            "positivity": "raw_count >= 1",
            "denominator": "all imported cells, or cells assigned to the selected HypoMap region",
            "aggregation": "cell-pooled sums of integer per-dataset quadrant counts",
            "quadrant_order": list(QUADRANT_KEYS),
            "missing_region_handling": (
                "cells with blank hypomap_region are included in whole-dataset metrics, excluded from region denominators, and reported"
            ),
        },
        "context_by_dataset": context_by_dataset,
        "populations": populations,
    }


def context_entries(
    dataset_data: dict,
    raw_col: np.ndarray,
    log_col: np.ndarray,
    *,
    column: str,
    blank_label: str,
    bins: int,
) -> dict[str, dict]:
    cells = dataset_data["cells"]
    labels = cells[column].map(lambda value: clean_label(value, blank_label))
    out: dict[str, dict] = {}
    for label in sorted(labels.unique()):
        eligible = labels.eq(label).to_numpy()
        out[label] = compute_metrics(raw_col, log_col, eligible, bins)
    return out


def grouped_entries_within_context(
    dataset_data: dict,
    raw_col: np.ndarray,
    log_col: np.ndarray,
    *,
    context_column: str,
    context_blank_label: str,
    group_column: str,
    group_blank_label: str,
    bins: int,
) -> dict[str, dict[str, dict]]:
    cells = dataset_data["cells"]
    context_labels = cells[context_column].map(lambda value: clean_label(value, context_blank_label))
    group_labels = cells[group_column].map(lambda value: clean_label(value, group_blank_label))
    out: dict[str, dict[str, dict]] = {}
    for context_label in sorted(context_labels.unique()):
        in_context = context_labels.eq(context_label)
        groups: dict[str, dict] = {}
        for group_label in sorted(group_labels[in_context].unique()):
            eligible = (in_context & group_labels.eq(group_label)).to_numpy()
            groups[group_label] = compute_metrics(raw_col, log_col, eligible, bins)
        out[context_label] = groups
    return out


def export_gene(
    query: str,
    *,
    datasets: dict[str, dict],
    processed_dir: Path,
    harmonization_csv: Path,
    mgi_source_dir: Path,
    dataset_ids: list[str],
    bins: int,
) -> dict:
    resolver = resolve_query(
        query,
        harmonization_csv=harmonization_csv,
        mgi_source_dir=mgi_source_dir,
        selected_datasets=dataset_ids,
    )
    if resolver["state"] != "resolved":
        return {
            "query": query,
            "resolver": resolver,
            "state": resolver["state"],
            "metrics": None,
        }

    dataset_outputs: dict[str, dict] = {}
    whole_metrics: dict[str, dict] = {}
    region_metrics_by_label: dict[str, dict[str, dict]] = {}
    c25_metrics_by_label: dict[str, dict[str, dict]] = {}
    c25_by_region_context: dict[str, dict[str, dict[str, dict]]] = {}

    for mapping in resolver["dataset_mappings"]:
        dataset_id = mapping["dataset_id"]
        data = datasets[dataset_id]
        cells = data["cells"]
        if mapping["state"] != "resolved":
            dataset_outputs[dataset_id] = {
                "mapping": mapping,
                "state": mapping["state"],
                "metrics": None,
            }
            continue

        gene_idx = find_gene_index(data["genes"], mapping["dataset_gene_id"], mapping["dataset_gene_symbol"])
        if gene_idx is None:
            missing = {**mapping, "state": "gene_not_found"}
            dataset_outputs[dataset_id] = {"mapping": missing, "state": "gene_not_found", "metrics": None}
            continue

        raw_col = data["raw"][:, gene_idx].toarray().ravel()
        log_col = data["log"][:, gene_idx].toarray().ravel()
        all_eligible = np.ones(len(cells), dtype=bool)
        whole = compute_metrics(raw_col, log_col, all_eligible, bins)
        whole_metrics[dataset_id] = whole

        by_region = context_entries(
            data,
            raw_col,
            log_col,
            column="hypomap_region",
            blank_label=NO_REGION_LABEL,
            bins=bins,
        )
        by_c25 = context_entries(
            data,
            raw_col,
            log_col,
            column="hypomap_C25",
            blank_label=NO_C25_LABEL,
            bins=bins,
        )
        by_region_c25 = grouped_entries_within_context(
            data,
            raw_col,
            log_col,
            context_column="hypomap_region",
            context_blank_label=NO_REGION_LABEL,
            group_column="hypomap_C25",
            group_blank_label=NO_C25_LABEL,
            bins=bins,
        )

        for label, metric in by_region.items():
            region_metrics_by_label.setdefault(label, {})[dataset_id] = metric
        for label, metric in by_c25.items():
            c25_metrics_by_label.setdefault(label, {})[dataset_id] = metric
        for region_label, groups in by_region_c25.items():
            region_out = c25_by_region_context.setdefault(region_label, {})
            for group_label, metric in groups.items():
                region_out.setdefault(group_label, {})[dataset_id] = metric

        dataset_outputs[dataset_id] = {
            "mapping": mapping,
            "state": "resolved",
            "gene_column_index": gene_idx,
            "whole_dataset": whole,
            "annotation_counts": {
                "blank_hypomap_region": int(cells["hypomap_region"].astype(str).str.strip().eq("").sum()),
                "blank_hypomap_C25": int(cells["hypomap_C25"].astype(str).str.strip().eq("").sum()),
                "blank_sample_id": int(cells["sample_id"].astype(str).str.strip().eq("").sum()),
                "missing_sample_identity_label": MISSING_SAMPLE_LABEL,
            },
            "by_hypomap_region": by_region,
            "by_hypomap_C25": by_c25,
            "by_hypomap_region_and_C25": by_region_c25,
        }

    region_groups = {
        label: {
            "label": label,
            "annotation_column": "hypomap_region",
            "is_named_selected_nucleus": label != NO_REGION_LABEL,
            "unannotated_bucket": label == NO_REGION_LABEL,
            "dataset_metrics": {
                dataset_id: metrics.get(dataset_id, empty_metrics(bins))
                for dataset_id in dataset_ids
            },
            "cross_dataset": aggregate_dataset_metrics(
                {
                    dataset_id: metrics.get(dataset_id, empty_metrics(bins))
                    for dataset_id in dataset_ids
                }
            ),
        }
        for label, metrics in sorted(region_metrics_by_label.items())
    }
    c25_groups = {
        label: {
            "label": label,
            "annotation_column": "hypomap_C25",
            "is_named_cell_type_group": label != NO_C25_LABEL,
            "unannotated_bucket": label == NO_C25_LABEL,
            "dataset_metrics": {
                dataset_id: metrics.get(dataset_id, empty_metrics(bins))
                for dataset_id in dataset_ids
            },
            "cross_dataset": aggregate_dataset_metrics(
                {
                    dataset_id: metrics.get(dataset_id, empty_metrics(bins))
                    for dataset_id in dataset_ids
                }
            ),
        }
        for label, metrics in sorted(c25_metrics_by_label.items())
    }
    c25_by_context_groups = {
        "Whole hypothalamus": c25_groups,
        **{
            region_label: {
                group_label: {
                    "label": group_label,
                    "context_label": region_label,
                    "context_annotation_column": "hypomap_region",
                    "annotation_column": "hypomap_C25",
                    "is_named_cell_type_group": group_label != NO_C25_LABEL,
                    "unannotated_bucket": group_label == NO_C25_LABEL,
                    "dataset_metrics": {
                        dataset_id: metrics.get(dataset_id, empty_metrics(bins))
                        for dataset_id in dataset_ids
                    },
                    "cross_dataset": aggregate_dataset_metrics(
                        {
                            dataset_id: metrics.get(dataset_id, empty_metrics(bins))
                            for dataset_id in dataset_ids
                        }
                    ),
                }
                for group_label, metrics in sorted(groups.items())
            }
            for region_label, groups in sorted(c25_by_region_context.items())
        },
    }

    return {
        "query": query,
        "state": "resolved",
        "resolver": resolver,
        "metrics": {
            "whole_dataset": {
                "dataset_metrics": whole_metrics,
                "cross_dataset": aggregate_dataset_metrics(whole_metrics),
            },
            "datasets": dataset_outputs,
            "by_hypomap_region": region_groups,
            "by_hypomap_C25": c25_groups,
            "by_context_hypomap_C25": c25_by_context_groups,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--processed-dir", type=Path, default=Path("processed"))
    parser.add_argument("--out", type=Path, default=Path("fvp_export/gene_metrics_vertical_slice.json"))
    parser.add_argument("--genes", nargs="+", default=DEFAULT_GENES)
    parser.add_argument("--datasets", nargs="+", default=DATASETS)
    parser.add_argument("--bins", type=int, default=20)
    parser.add_argument(
        "--harmonization-csv",
        type=Path,
        default=Path("gene_harmonization/gene_harmonization.csv"),
    )
    parser.add_argument(
        "--mgi-source-dir",
        type=Path,
        default=Path("gene_harmonization/mgi_source"),
    )
    parser.add_argument(
        "--annotation-coverage",
        type=Path,
        default=Path("annotation_coverage_report.json"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    datasets = {dataset_id: load_dataset(args.processed_dir, dataset_id) for dataset_id in args.datasets}
    annotation_coverage = {}
    if args.annotation_coverage.exists():
        with args.annotation_coverage.open() as fh:
            annotation_coverage = json.load(fh)

    export = {
        "generated_on": "2026-09-18",
        "description": "Lightweight FVP vertical-slice gene metrics with MGI-backed alias resolution.",
        "metric_contract": {
            "positivity": "raw_count >= 1",
            "percent_expressing": "positive_cells / eligible_cells * 100",
            "mean_expression_positive": "mean Seurat LogNormalize expression among raw-count-positive eligible cells",
            "expression_distribution_population": "raw-count-positive eligible cells",
            "region_grouping": "hypomap_region",
            "cell_type_grouping": "hypomap_C25",
            "blank_region_label": NO_REGION_LABEL,
            "blank_c25_label": NO_C25_LABEL,
            "blank_sample_id_label": MISSING_SAMPLE_LABEL,
            "coexpression_positivity": "raw_count(gene) >= 1",
            "coexpression_aggregation": "cell-pooled quadrant counts",
        },
        "selected_datasets": args.datasets,
        "annotation_coverage": annotation_coverage,
        "genes": [
            export_gene(
                gene,
                datasets=datasets,
                processed_dir=args.processed_dir,
                harmonization_csv=args.harmonization_csv,
                mgi_source_dir=args.mgi_source_dir,
                dataset_ids=args.datasets,
                bins=args.bins,
            )
            for gene in args.genes
        ],
        "coexpression_pilots": [
            export_coexpression_pilot(
                gene_a,
                gene_b,
                datasets=datasets,
                harmonization_csv=args.harmonization_csv,
                mgi_source_dir=args.mgi_source_dir,
                dataset_ids=args.datasets,
            )
            for gene_a, gene_b in combinations(COEXPRESSION_GENES, 2)
        ],
    }
    args.out.write_text(json.dumps(export, indent=2) + "\n")
    print(f"wrote {args.out}")
    for gene in export["genes"]:
        state = gene["state"]
        if state != "resolved":
            print(f"{gene['query']}: {state}")
            continue
        whole = gene["metrics"]["whole_dataset"]["cross_dataset"]
        print(
            f"{gene['query']}: resolved; whole pooled %="
            f"{whole['percent_expressing']['mode_b_cell_pooled']:.3f}; "
            f"dataset avg %={whole['percent_expressing']['mode_a_dataset_average']:.3f}; "
            f"detected={whole['dataset_detection_count']}/{whole['dataset_detection_total']}"
        )
    for pilot in export["coexpression_pilots"]:
        print(f"{pilot['id']}: {pilot['state']}")
        for population in pilot.get("populations", []):
            metric = population["cross_dataset"]
            print(
                f"  {population['label']}: n={metric['eligible_cells']}; "
                + ", ".join(
                    f"{key}={metric['quadrant_percentages'][key]:.3f}%"
                    for key in QUADRANT_KEYS
                )
            )


if __name__ == "__main__":
    main()
