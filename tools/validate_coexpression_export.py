#!/usr/bin/env python3
"""Validate structural and arithmetic invariants in the coexpression export."""

from __future__ import annotations

import argparse
from itertools import combinations
import json
import math
from pathlib import Path


QUADRANTS = ("both_positive", "gene_a_only", "gene_b_only", "neither")


def validate_metric(metric: dict, label: str) -> None:
    eligible = metric["eligible_cells"]
    counts = metric["quadrant_counts"]
    percentages = metric["quadrant_percentages"]
    if set(counts) != set(QUADRANTS) or set(percentages) != set(QUADRANTS):
        raise ValueError(f"{label}: unexpected quadrant keys")
    if sum(counts.values()) != eligible:
        raise ValueError(f"{label}: quadrant counts do not sum to {eligible}")
    if eligible == 0:
        if any(value is not None for value in percentages.values()):
            raise ValueError(f"{label}: zero denominator must have undefined percentages")
        return
    for key in QUADRANTS:
        expected = counts[key] / eligible * 100
        if not math.isclose(percentages[key], expected, rel_tol=0, abs_tol=1e-12):
            raise ValueError(f"{label}: {key} percentage does not match its count")
    if not math.isclose(sum(percentages.values()), 100.0, rel_tol=0, abs_tol=1e-10):
        raise ValueError(f"{label}: percentages do not sum to 100")


def validate_export(path: Path) -> int:
    with path.open() as fh:
        payload = json.load(fh)
    pilots = payload.get("coexpression_pilots", [])
    if not pilots:
        raise ValueError("no coexpression_pilots found")
    vertical_slice_genes = [gene["query"] for gene in payload.get("genes", []) if gene.get("state") == "resolved"]
    expected_pairs = {frozenset(pair) for pair in combinations(vertical_slice_genes, 2)}
    exported_pairs = {frozenset((pilot.get("gene_a"), pilot.get("gene_b"))) for pilot in pilots}
    if exported_pairs != expected_pairs:
        raise ValueError("coexpression export does not contain every vertical-slice gene pair exactly once")
    checked = 0
    for pilot in pilots:
        if pilot.get("state") != "resolved":
            raise ValueError(f"{pilot.get('id', 'pilot')}: state is not resolved")
        context_by_dataset = pilot["context_by_dataset"]
        expected_regions = {
            region
            for context in context_by_dataset.values()
            for region in context["region_cells"]
        }
        population_regions = {
            population["region"]
            for population in pilot["populations"]
            if population["scope"] == "hypomap_region"
        }
        if population_regions != expected_regions:
            raise ValueError(f"{pilot['id']}: region populations are incomplete")
        whole_populations = [
            population for population in pilot["populations"]
            if population["scope"] == "whole_dataset"
        ]
        if len(whole_populations) != 1:
            raise ValueError(f"{pilot['id']}: expected exactly one whole-dataset population")
        for population in pilot["populations"]:
            region = population["region"]
            dataset_metrics = population["dataset_metrics"]
            for dataset_id, metric in dataset_metrics.items():
                validate_metric(metric, f"{population['id']} / {dataset_id}")
                expected_cells = (
                    context_by_dataset[dataset_id]["total_imported_cells"]
                    if population["scope"] == "whole_dataset"
                    else context_by_dataset[dataset_id]["region_cells"][region]
                )
                if metric["eligible_cells"] != expected_cells:
                    raise ValueError(
                        f"{population['id']} / {dataset_id}: denominator does not match its scope"
                    )
                checked += 1
            pooled = population["cross_dataset"]
            validate_metric(pooled, f"{population['id']} / pooled")
            expected_eligible = sum(
                metric["eligible_cells"] for metric in dataset_metrics.values()
            )
            if pooled["eligible_cells"] != expected_eligible:
                raise ValueError(f"{population['id']}: pooled denominator is inconsistent")
            for key in QUADRANTS:
                expected_count = sum(
                    metric["quadrant_counts"][key] for metric in dataset_metrics.values()
                )
                if pooled["quadrant_counts"][key] != expected_count:
                    raise ValueError(f"{population['id']}: pooled {key} is inconsistent")
            checked += 1
    return checked


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=Path("fvp_export/gene_metrics_vertical_slice.json"),
    )
    args = parser.parse_args()
    checked = validate_export(args.path)
    print(f"PASS: validated {checked} coexpression metric blocks in {args.path}")


if __name__ == "__main__":
    main()
