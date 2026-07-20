#!/usr/bin/env python3
"""Build the cross-dataset gene harmonization table from MGI reports."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import pandas as pd

from gene_harmonization_lib import (
    DATASETS,
    HARMONIZATION_COLUMNS,
    load_gene_source_indexes,
    norm_symbol,
    resolve_symbol_to_candidates,
)


SOURCE_NAME = "MGI MRK_List1 + MGI_Gene_Model_Coord"


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_ensembl_index(canonical_by_id: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for mgi_id, gene in canonical_by_id.items():
        if gene.ensembl_gene_id:
            out[gene.ensembl_gene_id] = mgi_id
    return out


def match_dataset_gene(
    gene_id: str,
    gene_symbol: str,
    *,
    canonical_by_id: dict,
    ensembl_index: dict[str, str],
    current_index: dict[str, set[str]],
    alias_index: dict[str, set[str]],
) -> tuple[str, str]:
    gene_id = norm_symbol(gene_id)
    gene_symbol = norm_symbol(gene_symbol)

    if gene_id.startswith("ENSMUSG") and gene_id in ensembl_index:
        return ensembl_index[gene_id], "ensembl_gene_id"

    match_type, candidates = resolve_symbol_to_candidates(
        gene_symbol, canonical_by_id, current_index, alias_index
    )
    if len(candidates) == 1:
        if match_type == "exact_current_symbol":
            return candidates[0].canonical_gene_id, "dataset_current_symbol"
        return candidates[0].canonical_gene_id, "dataset_alias_symbol"

    return "", "unresolved" if not candidates else "ambiguous_dataset_symbol"


def build_table(processed_dir: Path, source_dir: Path, datasets: list[str]) -> tuple[pd.DataFrame, dict]:
    canonical_by_id, current_index, alias_index = load_gene_source_indexes(source_dir)
    ensembl_index = load_ensembl_index(canonical_by_id)
    rows: list[dict] = []
    unresolved: dict[str, dict[str, int]] = {}

    for dataset_id in datasets:
        genes_path = processed_dir / dataset_id / "genes.csv"
        genes = pd.read_csv(genes_path, dtype=str).fillna("")
        stats = {"total": int(len(genes)), "resolved": 0, "unresolved": 0, "ambiguous": 0}
        for record in genes.to_dict("records"):
            gene_id = norm_symbol(record["gene_id"])
            gene_symbol = norm_symbol(record["gene_symbol"])
            canonical_id, match_type = match_dataset_gene(
                gene_id,
                gene_symbol,
                canonical_by_id=canonical_by_id,
                ensembl_index=ensembl_index,
                current_index=current_index,
                alias_index=alias_index,
            )
            if not canonical_id:
                if match_type == "ambiguous_dataset_symbol":
                    stats["ambiguous"] += 1
                else:
                    stats["unresolved"] += 1
                continue

            gene = canonical_by_id[canonical_id]
            stats["resolved"] += 1
            rows.append(
                {
                    "canonical_gene_id": gene.canonical_gene_id,
                    "canonical_symbol": gene.canonical_symbol,
                    "alias_symbol": gene_symbol,
                    "dataset_id": dataset_id,
                    "dataset_gene_id": gene_id,
                    "dataset_gene_symbol": gene_symbol,
                    "match_type": match_type,
                    "source": SOURCE_NAME,
                    "source_version_or_date": "downloaded_2026-07-20",
                }
            )
        unresolved[dataset_id] = stats

    table = pd.DataFrame(rows, columns=HARMONIZATION_COLUMNS)
    if not table.empty:
        table = table.sort_values(
            ["canonical_symbol", "canonical_gene_id", "dataset_id", "dataset_gene_symbol"],
            kind="stable",
        ).reset_index(drop=True)

    provenance = {
        "source": SOURCE_NAME,
        "source_version_or_date": "downloaded_2026-07-20",
        "mgi_marker_report": str(source_dir / "MRK_List1.rpt.gz"),
        "mgi_marker_report_sha256": sha256_file(source_dir / "MRK_List1.rpt.gz"),
        "mgi_gene_model_report": str(source_dir / "MGI_Gene_Model_Coord.rpt"),
        "mgi_gene_model_report_sha256": sha256_file(source_dir / "MGI_Gene_Model_Coord.rpt"),
        "processed_dir": str(processed_dir),
        "datasets": datasets,
        "rows": int(len(table)),
        "unique_canonical_genes": int(table["canonical_gene_id"].nunique()) if not table.empty else 0,
        "resolution_stats": unresolved,
        "rules": [
            "preserve dataset genes.csv unchanged",
            "prefer dataset Ensembl gene_id when present",
            "else resolve dataset gene_symbol by exact current MGI symbol first",
            "else resolve by MGI synonym or withdrawn symbol",
            "skip ambiguous dataset symbols; query resolver reports ambiguity for user terms",
            "missing dataset mappings are gene_not_found, not zero expression",
        ],
    }
    return table, provenance


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--processed-dir", type=Path, default=Path("processed"))
    parser.add_argument("--source-dir", type=Path, default=Path("gene_harmonization/mgi_source"))
    parser.add_argument("--out-dir", type=Path, default=Path("gene_harmonization"))
    parser.add_argument("--datasets", nargs="+", default=DATASETS)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    table, provenance = build_table(args.processed_dir, args.source_dir, args.datasets)
    table_path = args.out_dir / "gene_harmonization.csv"
    provenance_path = args.out_dir / "gene_harmonization.provenance.json"
    table.to_csv(table_path, index=False)
    provenance_path.write_text(json.dumps(provenance, indent=2) + "\n")
    print(
        f"wrote {table_path} ({len(table)} rows, "
        f"{provenance['unique_canonical_genes']} canonical genes)"
    )
    print(f"wrote {provenance_path}")
    for dataset_id, stats in provenance["resolution_stats"].items():
        print(
            f"{dataset_id}: resolved={stats['resolved']}/{stats['total']}; "
            f"unresolved={stats['unresolved']}; ambiguous={stats['ambiguous']}"
        )


if __name__ == "__main__":
    main()
