"""Study-level metadata from ``HypoMap_study_display_card.csv``.

The card carries one row per HypoMap dataset keyed by ``GEO_Acc`` (with a couple
keyed by a Mendeley DOI). We map the relevant columns into the standardized
``dataset.json`` fields and expose the per-sample default fields (sex, age,
condition, cells-vs-nuclei) that the card provides at study level.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


class StudyCard:
    def __init__(self, card_path: str | Path):
        self.card_path = Path(card_path)
        self._df = pd.read_csv(self.card_path, dtype=str).fillna("")

    def row_for(self, dataset_id: str) -> dict:
        """Return the card row whose ``GEO_Acc`` matches ``dataset_id``.

        Falls back to a substring match (some cards use the bare accession while
        the folder uses the same id). Raises KeyError if nothing matches.
        """
        exact = self._df[self._df["GEO_Acc"] == dataset_id]
        if len(exact):
            return exact.iloc[0].to_dict()
        loose = self._df[self._df["GEO_Acc"].str.contains(dataset_id, na=False)]
        if len(loose):
            return loose.iloc[0].to_dict()
        raise KeyError(f"No HypoMap card row for {dataset_id!r}")

    def dataset_metadata(self, dataset_id: str) -> dict:
        """Study-level metadata for ``dataset.json``."""
        r = self.row_for(dataset_id)
        return {
            "dataset_id": dataset_id,
            "title": r.get("Publication", ""),
            "species": r.get("Species", ""),
            "tissue": r.get("Region", ""),
            "technology": r.get("Technology", ""),
            "publication": r.get("Publication_link", ""),
            "source": r.get("GEO_Acc", dataset_id),
            "hypomap_label": r.get("HypoMap_label", ""),
            "cells_or_nuclei": r.get("Cells_or_nuclei", ""),
        }

    def sample_defaults(self, dataset_id: str) -> dict:
        """Study-level defaults applied to every sample row."""
        r = self.row_for(dataset_id)
        return {
            "sex": r.get("Sex", ""),
            "age": r.get("Age_stage", ""),
            "condition": r.get("Condition", ""),
            "technology": r.get("Technology", ""),
        }
