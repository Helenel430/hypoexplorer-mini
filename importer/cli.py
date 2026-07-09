"""Command-line entry point.

    python -m importer <dataset_id> [--input DIR] [--out DIR]
                       [--card FILE] [--sample-sheet FILE] [--strict]

Resolves the dataset's source files, loads them into the standardized in-memory
form, enriches with HypoMap card + per-cell metadata + optional sample sheet,
validates, and writes ``processed/<dataset_id>/``.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

from . import schema
from .registry import get_config
from .study_card import StudyCard
from .validate import validate
from .writer import write_dataset


def _apply_sample_defaults(samples: pd.DataFrame, defaults: dict) -> pd.DataFrame:
    """Fill empty sample fields from study-level card defaults."""
    for col, value in defaults.items():
        if col not in samples.columns:
            samples[col] = value
        else:
            samples[col] = samples[col].replace("", value).fillna(value)
    return samples


def _apply_sample_sheet(samples: pd.DataFrame, sheet_path: Path) -> pd.DataFrame:
    """Override sample fields from an optional user sheet keyed by ``sample_id``."""
    sheet = pd.read_csv(sheet_path, dtype=str).fillna("")
    if "sample_id" not in sheet.columns:
        raise ValueError(f"{sheet_path} must have a 'sample_id' column")
    sheet = sheet.drop_duplicates("sample_id").set_index("sample_id")
    for col in sheet.columns:
        mapped = samples["sample_id"].map(sheet[col])
        if col in samples.columns:
            samples[col] = mapped.where(mapped.notna() & (mapped != ""), samples[col])
        else:
            samples[col] = mapped.fillna("")
    return samples


def run(
    dataset_id: str,
    input_root: Path,
    out_root: Path,
    card_path: Path,
    sample_sheet: Path | None,
    strict: bool,
) -> Path:
    config = get_config(dataset_id)
    card = StudyCard(card_path)
    dataset_meta = card.dataset_metadata(dataset_id)
    defaults = card.sample_defaults(dataset_id)
    tissue = dataset_meta.get("tissue", "")
    species = dataset_meta.get("species", "")

    input_dir = input_root / config.subdir if config.subdir else input_root

    print(f"[{dataset_id}] loading from {input_dir} ...")
    loader = config.build_loader(input_dir, species)
    result = loader.load()
    print(
        f"[{dataset_id}] matrix {result.matrix.shape[0]} cells x "
        f"{result.matrix.shape[1]} genes; {len(result.samples)} sample(s)"
    )

    # Per-cell metadata enrichment (dataset-specific), if any.
    if config.enrich is not None:
        config.enrich(result, input_dir, tissue)
        print(f"[{dataset_id}] enriched; {len(result.samples)} sample(s) after metadata")

    # Datasets without per-cell metadata still get study-level region.
    if not result.has_cell_metadata and tissue:
        result.cells["region"] = tissue

    # Sample-level metadata: card defaults, then optional sample sheet override.
    result.samples = _apply_sample_defaults(result.samples, defaults)
    if sample_sheet is not None:
        result.samples = _apply_sample_sheet(result.samples, sample_sheet)
        print(f"[{dataset_id}] applied sample sheet {sample_sheet}")

    # Ensure gene species is populated.
    if "species" not in result.genes.columns or (result.genes["species"] == "").all():
        result.genes["species"] = species

    report = validate(result, strict=strict)
    print(report.summary())

    out_dir = out_root / dataset_id
    write_dataset(result, {k: dataset_meta[k] for k in _dataset_out_keys(dataset_meta)}, out_dir)
    print(f"[{dataset_id}] wrote {out_dir}")
    return out_dir


def _dataset_out_keys(dataset_meta: dict) -> list[str]:
    # Required fields first, then any extra card fields we carried along.
    extra = [k for k in dataset_meta if k not in schema.DATASET_FIELDS]
    return schema.DATASET_FIELDS + extra


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="importer", description=__doc__)
    parser.add_argument("dataset_id", help="e.g. GSE207736")
    parser.add_argument(
        "--input", default=".", help="root folder holding the source files (default: .)"
    )
    parser.add_argument(
        "--out", default="processed", help="output root (default: processed)"
    )
    parser.add_argument(
        "--card",
        default="HypoMap_study_display_card.csv",
        help="path to HypoMap_study_display_card.csv",
    )
    parser.add_argument(
        "--sample-sheet",
        default=None,
        help="optional CSV with sample_id + fields (condition, ...) to override",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="fail if metadata cell ids do not fully match the matrix",
    )
    args = parser.parse_args(argv)

    try:
        run(
            dataset_id=args.dataset_id,
            input_root=Path(args.input),
            out_root=Path(args.out),
            card_path=Path(args.card),
            sample_sheet=Path(args.sample_sheet) if args.sample_sheet else None,
            strict=args.strict,
        )
    except (FileNotFoundError, KeyError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
