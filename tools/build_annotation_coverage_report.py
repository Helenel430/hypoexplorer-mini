#!/usr/bin/env python3
"""Report missing annotation coverage without dropping cells.

The report exists so metric/UI code can surface annotation gaps explicitly:
blank spatial labels and blank sample IDs are retained in processed data and
counted here.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


DEFAULT_DATASETS = ["GSE207736", "GSE172461", "GSE93374"]


def count_blank(series: pd.Series) -> int:
    return int(series.fillna("").astype(str).str.strip().eq("").sum())


def summarize_dataset(processed_dir: Path, dataset_id: str) -> dict:
    cells_path = processed_dir / dataset_id / "cells.csv"
    cells = pd.read_csv(cells_path, dtype=str).fillna("")
    total = int(len(cells))

    blank_hypomap_region = count_blank(cells["hypomap_region"]) if "hypomap_region" in cells else total
    blank_sample_id = count_blank(cells["sample_id"]) if "sample_id" in cells else total
    blank_hypomap_c25 = count_blank(cells["hypomap_C25"]) if "hypomap_C25" in cells else total

    return {
        "dataset_id": dataset_id,
        "total_cells": total,
        "nonblank_hypomap_region": total - blank_hypomap_region,
        "blank_hypomap_region": blank_hypomap_region,
        "nonblank_hypomap_C25": total - blank_hypomap_c25,
        "blank_hypomap_C25": blank_hypomap_c25,
        "nonblank_sample_id": total - blank_sample_id,
        "blank_sample_id": blank_sample_id,
        "whole_dataset_denominator_cells": total,
        "selected_nucleus_denominator_rule": "hypomap_region == selected_nucleus",
        "blank_hypomap_region_metric_handling": (
            "retained in whole-dataset denominators; excluded from named selected-nucleus "
            "denominators; report as unannotated/out of scope"
        ),
        "blank_sample_id_metric_handling": (
            "retained in whole-dataset metrics when sample identity is not required; "
            "excluded from sample-, replicate-, condition-, and true pseudobulk-scoped metrics"
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--processed-dir", type=Path, default=Path("processed"))
    parser.add_argument("--out", type=Path, default=Path("annotation_coverage_report.json"))
    parser.add_argument("--datasets", nargs="+", default=DEFAULT_DATASETS)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = {
        "generated_on": "2026-07-20",
        "processed_dir": str(args.processed_dir),
        "datasets": [summarize_dataset(args.processed_dir, d) for d in args.datasets],
        "global_rules": [
            "No cells are silently dropped from whole-dataset denominators because annotations are blank.",
            "Blank hypomap_region cells are retained and reported; they are not eligible for named selected-nucleus metrics.",
            "Blank sample_id cells are retained and reported; they are excluded only from scopes requiring sample identity.",
        ],
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    for row in report["datasets"]:
        print(
            "{dataset_id}: total={total_cells}; blank_hypomap_region={blank_hypomap_region}; "
            "blank_sample_id={blank_sample_id}; blank_hypomap_C25={blank_hypomap_C25}".format(**row)
        )
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
