#!/usr/bin/env python3
"""Resolve a user gene query against the generated harmonization table."""

from __future__ import annotations

import argparse
from pathlib import Path

from gene_harmonization_lib import DATASETS, dump_json, resolve_query


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", help="Gene symbol, previous symbol, or synonym to resolve.")
    parser.add_argument("--datasets", nargs="+", default=DATASETS)
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
    parser.add_argument("--out", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = resolve_query(
        args.query,
        harmonization_csv=args.harmonization_csv,
        mgi_source_dir=args.mgi_source_dir,
        selected_datasets=args.datasets,
    )
    dump_json(result, args.out)


if __name__ == "__main__":
    main()
