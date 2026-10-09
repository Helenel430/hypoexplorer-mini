import importlib.util
import sys
import unittest
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
SPEC = importlib.util.spec_from_file_location(
    "export_fvp_metrics", ROOT / "tools" / "export_fvp_metrics.py"
)
EXPORTER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(EXPORTER)


class CoexpressionMetricTests(unittest.TestCase):
    def test_quadrants_are_exhaustive_and_percentages_match_counts(self):
        raw_a = np.array([1, 2, 0, 0, 4, 0])
        raw_b = np.array([1, 0, 3, 0, 5, 0])
        eligible = np.array([True, True, True, True, False, False])

        metric = EXPORTER.compute_coexpression_metrics(raw_a, raw_b, eligible)

        self.assertEqual(metric["eligible_cells"], 4)
        self.assertEqual(
            metric["quadrant_counts"],
            {
                "both_positive": 1,
                "gene_a_only": 1,
                "gene_b_only": 1,
                "neither": 1,
            },
        )
        self.assertEqual(sum(metric["quadrant_percentages"].values()), 100.0)

    def test_swapping_genes_swaps_only_single_positive_quadrants(self):
        raw_a = np.array([1, 1, 1, 0, 0])
        raw_b = np.array([1, 0, 0, 2, 0])
        eligible = np.ones(5, dtype=bool)

        direct = EXPORTER.compute_coexpression_metrics(raw_a, raw_b, eligible)
        swapped = EXPORTER.compute_coexpression_metrics(raw_b, raw_a, eligible)

        self.assertEqual(
            direct["quadrant_counts"]["both_positive"],
            swapped["quadrant_counts"]["both_positive"],
        )
        self.assertEqual(
            direct["quadrant_counts"]["gene_a_only"],
            swapped["quadrant_counts"]["gene_b_only"],
        )
        self.assertEqual(
            direct["quadrant_counts"]["gene_b_only"],
            swapped["quadrant_counts"]["gene_a_only"],
        )
        self.assertEqual(
            direct["quadrant_counts"]["neither"],
            swapped["quadrant_counts"]["neither"],
        )

    def test_pooling_sums_integer_counts_before_recomputing_percentages(self):
        one = {
            "eligible_cells": 2,
            "quadrant_counts": {
                "both_positive": 1,
                "gene_a_only": 1,
                "gene_b_only": 0,
                "neither": 0,
            },
        }
        two = {
            "eligible_cells": 8,
            "quadrant_counts": {
                "both_positive": 0,
                "gene_a_only": 0,
                "gene_b_only": 0,
                "neither": 8,
            },
        }

        pooled = EXPORTER.aggregate_coexpression_metrics({"one": one, "two": two})

        self.assertEqual(pooled["eligible_cells"], 10)
        self.assertEqual(pooled["quadrant_counts"]["both_positive"], 1)
        self.assertEqual(pooled["quadrant_percentages"]["both_positive"], 10.0)
        self.assertEqual(pooled["quadrant_percentages"]["neither"], 80.0)

    def test_zero_eligible_population_is_undefined_not_zero_percent(self):
        metric = EXPORTER.compute_coexpression_metrics(
            np.array([1, 0]), np.array([0, 1]), np.array([False, False])
        )

        self.assertEqual(metric["eligible_cells"], 0)
        self.assertTrue(all(value is None for value in metric["quadrant_percentages"].values()))


if __name__ == "__main__":
    unittest.main()
