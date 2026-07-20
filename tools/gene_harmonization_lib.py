"""Shared helpers for MGI-based cross-dataset gene harmonization."""

from __future__ import annotations

import csv
import gzip
import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd


DATASETS = ["GSE207736", "GSE172461", "GSE93374"]
HARMONIZATION_COLUMNS = [
    "canonical_gene_id",
    "canonical_symbol",
    "alias_symbol",
    "dataset_id",
    "dataset_gene_id",
    "dataset_gene_symbol",
    "match_type",
    "source",
    "source_version_or_date",
]


@dataclass(frozen=True)
class CanonicalGene:
    canonical_gene_id: str
    canonical_symbol: str
    marker_name: str
    ensembl_gene_id: str = ""

    def as_candidate(self, matched_by: str = "") -> dict:
        out = {
            "canonical_gene_id": self.canonical_gene_id,
            "canonical_symbol": self.canonical_symbol,
            "marker_name": self.marker_name,
            "ensembl_gene_id": self.ensembl_gene_id,
        }
        if matched_by:
            out["matched_by"] = matched_by
        return out


def norm_symbol(symbol: object) -> str:
    return str(symbol).strip()


def norm_key(symbol: object) -> str:
    return norm_symbol(symbol).casefold()


def open_text(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", newline="", errors="replace")
    return path.open("rt", newline="", errors="replace")


def read_mgi_markers(marker_path: Path) -> tuple[dict[str, CanonicalGene], dict[str, set[str]], dict[str, set[str]]]:
    """Return canonical genes and symbol indexes from MGI MRK_List1.

    `current_index` maps current official symbols to MGI IDs.
    `alias_index` maps synonyms and withdrawn symbols to current MGI IDs.
    """
    raw_rows: dict[str, dict] = {}
    current_index: dict[str, set[str]] = defaultdict(set)
    alias_index: dict[str, set[str]] = defaultdict(set)

    with open_text(marker_path) as fh:
        reader = csv.DictReader(fh, delimiter="\t")
        for row in reader:
            if row.get("Marker Type") != "Gene":
                continue
            mgi_id = norm_symbol(row.get("MGI Accession ID", ""))
            symbol = norm_symbol(row.get("Marker Symbol", ""))
            if not mgi_id or not symbol:
                continue
            raw_rows[mgi_id] = row

    canonical_by_id: dict[str, CanonicalGene] = {}
    for mgi_id, row in raw_rows.items():
        current_id = norm_symbol(row.get("Current MGI Accession ID (if withdrawn)", ""))
        current_symbol = norm_symbol(row.get("Current Marker Symbol (if withdrawn)", ""))
        if row.get("Status") == "W" and current_id:
            continue
        canonical_by_id[mgi_id] = CanonicalGene(
            canonical_gene_id=mgi_id,
            canonical_symbol=norm_symbol(row.get("Marker Symbol", "")),
            marker_name=norm_symbol(row.get("Marker Name", "")),
        )

    for mgi_id, row in raw_rows.items():
        symbol = norm_symbol(row.get("Marker Symbol", ""))
        status = row.get("Status")
        current_id = norm_symbol(row.get("Current MGI Accession ID (if withdrawn)", ""))
        current_symbol = norm_symbol(row.get("Current Marker Symbol (if withdrawn)", ""))
        target_id = current_id if status == "W" and current_id else mgi_id
        if target_id not in canonical_by_id:
            continue

        if status == "W":
            alias_index[norm_key(symbol)].add(target_id)
            if current_symbol:
                alias_index[norm_key(current_symbol)].add(target_id)
        else:
            current_index[norm_key(symbol)].add(target_id)
            synonyms = norm_symbol(row.get("Marker Synonyms (pipe-separated)", ""))
            for synonym in [s.strip() for s in synonyms.split("|") if s.strip()]:
                alias_index[norm_key(synonym)].add(target_id)

    return canonical_by_id, current_index, alias_index


def add_ensembl_ids(canonical_by_id: dict[str, CanonicalGene], coord_path: Path) -> dict[str, CanonicalGene]:
    with coord_path.open("rt", newline="", errors="replace") as fh:
        reader = csv.DictReader(fh, delimiter="\t")
        for row in reader:
            mgi_id = norm_symbol(row.get("1. MGI accession id", ""))
            ensembl_id = norm_symbol(row.get("11. Ensembl gene id", ""))
            if not mgi_id or not ensembl_id or mgi_id not in canonical_by_id:
                continue
            gene = canonical_by_id[mgi_id]
            if not gene.ensembl_gene_id:
                canonical_by_id[mgi_id] = CanonicalGene(
                    canonical_gene_id=gene.canonical_gene_id,
                    canonical_symbol=gene.canonical_symbol,
                    marker_name=gene.marker_name,
                    ensembl_gene_id=ensembl_id,
                )
    return canonical_by_id


def resolve_symbol_to_candidates(
    query: str,
    canonical_by_id: dict[str, CanonicalGene],
    current_index: dict[str, set[str]],
    alias_index: dict[str, set[str]],
) -> tuple[str, list[CanonicalGene]]:
    key = norm_key(query)
    current_ids = sorted(current_index.get(key, set()))
    if current_ids:
        return "exact_current_symbol", [canonical_by_id[i] for i in current_ids if i in canonical_by_id]
    alias_ids = sorted(alias_index.get(key, set()))
    return "alias_symbol", [canonical_by_id[i] for i in alias_ids if i in canonical_by_id]


def load_harmonization_table(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(path)
    return pd.read_csv(path, dtype=str).fillna("")


def load_gene_source_indexes(source_dir: Path) -> tuple[dict[str, CanonicalGene], dict[str, set[str]], dict[str, set[str]]]:
    marker_path = source_dir / "MRK_List1.rpt.gz"
    coord_path = source_dir / "MGI_Gene_Model_Coord.rpt"
    canonical_by_id, current_index, alias_index = read_mgi_markers(marker_path)
    canonical_by_id = add_ensembl_ids(canonical_by_id, coord_path)
    return canonical_by_id, current_index, alias_index


def resolve_query(
    query: str,
    *,
    harmonization_csv: Path,
    mgi_source_dir: Path,
    selected_datasets: Iterable[str] = DATASETS,
) -> dict:
    canonical_by_id, current_index, alias_index = load_gene_source_indexes(mgi_source_dir)
    query_match_type, candidates = resolve_symbol_to_candidates(
        query, canonical_by_id, current_index, alias_index
    )

    if not candidates:
        return {
            "state": "gene_not_found",
            "query": query,
            "reason": "query did not resolve to an official MGI gene symbol, previous symbol, or synonym",
            "candidates": [],
            "dataset_mappings": [],
        }

    if len(candidates) > 1:
        return {
            "state": "disambiguation_required",
            "query": query,
            "reason": "query maps to multiple official genes",
            "candidates": [gene.as_candidate(query_match_type) for gene in candidates],
            "dataset_mappings": [],
        }

    canonical = candidates[0]
    table = load_harmonization_table(harmonization_csv)
    selected = list(selected_datasets)
    subset = table[table["canonical_gene_id"] == canonical.canonical_gene_id]

    mappings: list[dict] = []
    duplicate_datasets: list[str] = []
    for dataset_id in selected:
        rows = subset[subset["dataset_id"] == dataset_id]
        if len(rows) == 0:
            mappings.append(
                {
                    "dataset_id": dataset_id,
                    "state": "gene_not_found",
                    "canonical_gene_id": canonical.canonical_gene_id,
                    "canonical_symbol": canonical.canonical_symbol,
                    "dataset_gene_id": "",
                    "dataset_gene_symbol": "",
                    "match_type": "",
                }
            )
        elif len(rows) > 1:
            duplicate_datasets.append(dataset_id)
            mappings.extend([{**row, "state": "duplicate_mapping"} for row in rows.to_dict("records")])
        else:
            row = rows.iloc[0].to_dict()
            row["state"] = "resolved"
            mappings.append(row)

    if duplicate_datasets:
        return {
            "state": "duplicate_dataset_mapping",
            "query": query,
            "reason": "multiple dataset rows map to the same canonical gene",
            "canonical_gene": canonical.as_candidate(query_match_type),
            "duplicate_datasets": duplicate_datasets,
            "dataset_mappings": mappings,
        }

    return {
        "state": "resolved",
        "query": query,
        "query_match_type": query_match_type,
        "canonical_gene": canonical.as_candidate(query_match_type),
        "dataset_mappings": mappings,
    }


def dump_json(data: dict, path: Path | None = None) -> None:
    text = json.dumps(data, indent=2)
    if path is None:
        print(text)
    else:
        path.write_text(text + "\n")
