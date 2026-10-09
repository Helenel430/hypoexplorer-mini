# All-gene navigation export

Generated static data for the search → gene page → dataset breakdown mockup.
Includes whole-dataset and regional expression summaries, canonical gene search,
dataset-native mappings, and whole-hypothalamus Top 5 conditional co-detection
recommendations. No C25, expression histograms, or all-pair tables.

## Regeneration

Run from the repository root, using a new output directory:

```sh
python3 tools/export_navigation_metrics.py --out-dir navigation_export_next
python3 tools/export_navigation_recommendations.py --export-dir navigation_export_next
python3 tools/validate_navigation_export.py navigation_export_next
```

Inputs are the three processed raw-count and verified Seurat LogNormalize layers,
MGI harmonization and source reports, cell-level annotation coverage, and the root
study display card. The manifest records input and output SHA-256 checksums.
Missing and duplicate gene mappings are unsupported, never zero expression.
Unresolved native features are excluded from canonical lookup rather than guessed.

## Source control and build prerequisite

Only this README is versioned from the generated export directory. The manifest,
compressed shards, recommendations, validation output, and generated loader copy
are regenerated locally and are not committed. The authoritative loader source is
`tools/navigation_export_client.mjs`.

A fresh clone needs the processed inputs and regeneration steps above, or a separately
provisioned validated export. Vite copies this directory into `dist/navigation_export/`;
a hosted build must have the export present before `npm run build`. Verify transferred
payloads with `python3 tools/validate_navigation_export.py navigation_export`.

## Loading

1. Fetch `manifest.json`, `metadata.json.gz`, and `search-index.json.gz`.
2. Search case-insensitively using `current_symbols` first, then `aliases`.
   Preserve `outside_export_candidates` when resolving ambiguity; an alias may
   also identify a gene without a mapped row in these datasets. Never silently
   select one candidate from an ambiguous query. Exact current symbols take
   precedence over aliases.
3. A search index gene's position is its numeric `gene_index`. Fetch
   `genes-{floor(gene_index / shard_size), padded to four digits}.json.gz`.
   Each shard holds up to 256 genes; cache loaded shards.
4. Fetch `recommendations.json.gz` only when recommendations are needed.
   Partner IDs refer to the same search index.

A small browser loader is included as `load.mjs` (source:
`tools/navigation_export_client.mjs`). It fetches only the initial index/metadata,
then caches gene shards and loads recommendations on request:

```js
import { openNavigationExport } from './navigation_export/load.mjs';
const data = await openNavigationExport('/navigation_export/');
const result = data.resolve('Cyr61');
if (result.state === 'resolved') {
  const gene = await data.gene(result.candidates[0].index);
  const top5 = await data.recommendations(result.candidates[0].index);
}
```

Files contain gzip-compressed JSON. Serve `.gz` with appropriate Content-Encoding
or explicitly decompress the fetched bytes; do not decompress twice if the host
already handles gzip. This directory is ready to host; the exporter itself does not perform hosting.
The standalone app route `hypomap-viz/gene-explorer-js/public/navigation-prototype.html`
now integrates the index, lazy expression shards, and Top 5 recommendations
(checkpoints 1–5 complete, 2026-10-09). Vite serves this directory locally and copies it into app
builds. Recommendations load when a gene page opens and are cached across queries.
The loader's `identity(gene_index)` resolves partner names from the initial index
without fetching expression shards. Compact score buttons show percentages; exact both/query-positive counts are in
tooltips/accessibility labels, and contributing datasets are in the `?` popover. Top 5 selections also support four quadrants without changing this export: fetch
one cached partner shard and combine its marginals in the recommendation datasets
with the query marginal and exported intersection. Neither is N − A+ − B+ + Both.
Quadrant percentages use all eligible cells. Arbitrary pairs outside Top 5 remain
unavailable without additional intersection data.

## Record schema

Dataset order and context order are in `metadata.json.gz`.

```text
gene record = [gene_index, dataset_mappings, dataset_statistics]
mapping = [native_gene_id, native_gene_symbol, match_type]
statistics = [positive_counts_by_context, positive_log_sums_by_context]
```

A null mapping means `gene_not_found`; a duplicate-mapping object lists candidate
native rows. Both have null statistics. Per-dataset eligibility is shared in
`metadata.eligible_cells`, indexed by context. Named regions plus `No HypoMap
region` partition the whole population. Blank-region cells remain in the whole
denominator. All imported cells are retained, not just atlas-QC-included cells.

For an available gene and context:

```text
percent = 100 * positive_count / eligible_count
mean_when_detected = positive_log_sum / positive_count
```

Zero eligible count makes both metrics unavailable. Zero positive count makes
mean expression undefined, while percent remains zero when eligible count is
positive. Pool selected datasets by summing positive counts, expression sums,
and supported eligible counts; report unavailable datasets explicitly. Dataset
averages give each supported dataset equal weight. Mean-expression averages
exclude zero-positive datasets. SEM is sample SD / sqrt(number of contributing
datasets), or zero for one contributing dataset.

## Recommendations

Approved ranking: `both_positive / queried_gene_positive`, using raw counts ≥1.
The population is whole hypothalamus, cell-pooled across datasets where the query
has a unique mapping. A partner must have a unique mapping in all of those same
datasets. Therefore a query supported by only one dataset has recommendations
based on that dataset, and the exported dataset list must be disclosed.

Ties prefer higher partner positive-cell count, then the earlier canonical gene
index. The query itself is excluded. Zero-detection queries have empty lists;
fewer than five positive co-detection candidates yield shorter lists. No
housekeeping or broad-expression exclusions are imposed. The result is
conditional co-detection, not correlation, differential expression, enrichment,
or a claim of regulatory interaction.

```text
recommendation record = [gene_index, dataset_indices, query_positive, partners]
partner = [gene_index, both_positive]
score = both_positive / query_positive
```

Generation uses temporary positivity bitsets, sparse positive-cell accumulation,
and exact marginal-count bounds.
Top 5 results for all five pilot genes are independently checked against an
exhaustive candidate scan. Temporary bitsets are not shipped.

## C7 comparisons

The metadata includes C7 labels, eligible counts, and an explicit unannotated
bucket. Measured C7 gene-pair results are **not** included. The navigation UI now provides
one population selector with real eligible counts. Selecting C7 shows a compact
unavailable state; expanding a quadrant shows its count and one C7 availability
message. C7 pair values and quadrant compositions remain explicitly unavailable. Arbitrary comparisons
require a separate backend using raw-count positivity and `hypomap_C7` annotations,
returning four quadrant counts per selected dataset and population. Backend
implementation, caching, and UI integration remain separate work. Top 5 lists
are not C7-stratified and do not replace this comparison endpoint.

## Validation and size

`manifest.json` contains exact compressed payload sizes and checksums, mapping
coverage, normalization source checks, and reference-validation counts. Sizes
exclude this README and the uncompressed manifest. The 30–50 MB figure was a
planning budget, not a required minimum; no padding is added to meet it.

## Measured export (2026-10-08)

- Canonical genes: 39,583 across 102,195 imported cells in three datasets.
- Compressed JSON payload: 14,234,582 bytes (14.23 MB decimal).
- Search index: 1,773,383 bytes; shared metadata: 1,395 bytes.
- Expression summaries: 11,775,411 bytes in 155 shards.
- Top 5 recommendations: 684,393 bytes.
- Initial index + metadata + manifest: approximately 1.82 MB.
- All 158 gzip files and all 39,583 recommendation records passed validation.
- Reference expression checks: 250 existing pilot metric blocks.
- Top 5 ranking checked exhaustively for all five pilot anchors.

The C7 comparison backend is not included. Recommendations can have fewer than
five partners where no co-detection or insufficient supported partners exist.
