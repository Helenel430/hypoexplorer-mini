"""Validation checks run against a LoaderResult before writing.

Implements the required checks:
  1. matrix gene-dimension == number of parsed genes
  2. matrix cell-dimension == number of parsed barcodes/cells
  3. per-cell metadata cell ids match matrix cell ids (when metadata provided)
  4. gene symbols are unique (made unique with an R-style suffix)
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .loaders.base import LoaderResult, make_unique
from .schema import VALUE_TYPES


@dataclass
class ValidationReport:
    checks: list[tuple[str, bool, str]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def add(self, name: str, ok: bool, detail: str = "") -> None:
        self.checks.append((name, ok, detail))

    @property
    def ok(self) -> bool:
        return all(ok for _, ok, _ in self.checks)

    def summary(self) -> str:
        lines = []
        for name, ok, detail in self.checks:
            mark = "PASS" if ok else "FAIL"
            lines.append(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))
        for w in self.warnings:
            lines.append(f"  [WARN] {w}")
        return "\n".join(lines)


def validate(result: LoaderResult, strict: bool = False) -> ValidationReport:
    """Validate a LoaderResult in place (may make gene symbols unique).

    Raises ValueError if a required check fails, or (with ``strict``) if a
    metadata/matrix cell-id mismatch is found.
    """
    report = ValidationReport()
    n_cells, n_genes = result.matrix.shape

    # Schema/value-type sanity.
    value_type_ok = result.value_type in VALUE_TYPES
    report.add("expression value_type recognized", value_type_ok, result.value_type)

    # 1. gene dimension
    ok = n_genes == len(result.genes)
    report.add(
        "matrix gene-dim == n_genes", ok, f"{n_genes} vs {len(result.genes)}"
    )

    # 2. cell dimension
    ok = n_cells == len(result.cells)
    report.add(
        "matrix cell-dim == n_cells", ok, f"{n_cells} vs {len(result.cells)}"
    )

    # Stable identifiers required by every downstream metric/export.
    cell_ids = result.cells["cell_id"].astype(str) if "cell_id" in result.cells else []
    if len(cell_ids) == 0:
        report.add("cell ids present", False, "missing cell_id column")
    else:
        blank_cells = int((cell_ids == "").sum())
        unique_cells = bool(result.cells["cell_id"].is_unique)
        report.add(
            "cell ids nonempty",
            blank_cells == 0,
            f"{blank_cells} blank cell_id values",
        )
        report.add(
            "cell ids unique",
            unique_cells,
            "already unique" if unique_cells else "duplicates present",
        )

    if "sample_id" in result.samples:
        sample_ids = result.samples["sample_id"].astype(str)
        blank_samples = int((sample_ids == "").sum())
        unique_samples = bool(result.samples["sample_id"].is_unique)
        report.add(
            "sample ids nonempty",
            blank_samples == 0,
            f"{blank_samples} blank sample_id values",
        )
        report.add(
            "sample ids unique",
            unique_samples,
            "already unique" if unique_samples else "duplicates present",
        )

    if "sample_id" in result.cells and "sample_id" in result.samples:
        cell_sample_values = result.cells["sample_id"].astype(str)
        cell_sample_ids = set(cell_sample_values)
        sample_ids = set(result.samples["sample_id"].astype(str))
        blank_cell_samples = int((cell_sample_values == "").sum())
        unresolved = sorted(s for s in cell_sample_ids - sample_ids if s != "")
        if blank_cell_samples:
            report.warnings.append(f"{blank_cell_samples} cells have blank sample_id")
        if unresolved:
            report.warnings.append(
                f"{len(unresolved)} cell sample_id values do not resolve to samples.csv"
            )
        report.add(
            "cell sample ids resolve to samples",
            not unresolved,
            f"{len(unresolved)} unresolved nonblank sample ids",
        )

    # Matrix value contract. Raw-count positivity depends on count-like values.
    data = result.matrix.data
    nonnegative = bool(len(data) == 0 or data.min() >= 0)
    report.add(
        "matrix values nonnegative",
        nonnegative,
        "all stored values >= 0" if nonnegative else f"minimum {data.min()}",
    )
    if result.value_type == "raw_counts":
        integer_like = bool(len(data) == 0 or np.all(np.equal(data, np.floor(data))))
        report.add(
            "raw_count matrix values integer-like",
            integer_like,
            "all stored values are integer-like"
            if integer_like
            else "fractional stored values found",
        )

    # 3. metadata cell ids match matrix cell ids (join coverage, not annotation
    #    sparsity — some datasets legitimately annotate only a subset of cells)
    if result.has_cell_metadata:
        matched = result.extra.get("metadata_matched", n_cells)
        total = result.extra.get("metadata_total", n_cells)
        missing = total - matched
        detail = f"{matched}/{total} matrix cells join a metadata row"
        if missing:
            report.warnings.append(f"{missing} matrix cells have no metadata row")
            report.add("metadata cell ids match matrix", not strict, detail)
        else:
            report.add("metadata cell ids match matrix", True, detail)

    # 4. unique gene symbols (make unique if needed)
    symbols = result.genes["gene_symbol"].astype(str).tolist()
    gene_ids = result.genes["gene_id"].astype(str).tolist()
    blank_gene_ids = sum(1 for gene_id in gene_ids if gene_id == "")
    report.add(
        "gene ids nonempty",
        blank_gene_ids == 0,
        f"{blank_gene_ids} blank gene_id values",
    )
    report.add(
        "gene ids unique",
        result.genes["gene_id"].is_unique,
        "already unique" if result.genes["gene_id"].is_unique else "duplicates present",
    )
    blank_symbols = sum(1 for symbol in symbols if symbol == "")
    report.add(
        "gene symbols nonempty",
        blank_symbols == 0,
        f"{blank_symbols} blank gene_symbol values",
    )
    n_dupe = len(symbols) - len(set(symbols))
    if n_dupe:
        result.genes["gene_symbol"] = make_unique(symbols)
        report.warnings.append(
            f"{n_dupe} duplicate gene symbols made unique (R-style suffixing)"
        )
    report.add(
        "gene symbols unique",
        result.genes["gene_symbol"].is_unique,
        f"{n_dupe} duplicates resolved" if n_dupe else "already unique",
    )

    if not report.ok:
        raise ValueError("Validation failed:\n" + report.summary())
    return report
