"""Validation checks run against a LoaderResult before writing.

Implements the required checks:
  1. matrix gene-dimension == number of parsed genes
  2. matrix cell-dimension == number of parsed barcodes/cells
  3. per-cell metadata cell ids match matrix cell ids (when metadata provided)
  4. gene symbols are unique (made unique with an R-style suffix)
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .loaders.base import LoaderResult, make_unique


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
