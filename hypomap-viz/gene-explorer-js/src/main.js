const DATA_URL = "/data/gene_metrics_vertical_slice.json";
const LOG_EXPRESSION_UNIT = "ln(1 + counts per 10k)";

const DATASET_META = [
  { id: "GSE207736", label: "Dowsett10xnuc", sub: "GSE207736 · 10x snRNA-seq", native: 0, color: "#91c3f2" },
  { id: "GSE172461", label: "Rupp10x", sub: "GSE172461 · 10x, per-cell metadata", native: 36523, color: "#4f8dcc" },
  { id: "GSE93374", label: "CampbellDropseq", sub: "GSE93374 · Drop-seq", native: 21086, color: "#165b9e" },
];

const REGION_LABELS = {
  "Dorsomedial n. of the hypothalamus": "Dorsomedial nucleus of the hypothalamus",
  "Periventricular hyp. n. (posterior)": "Periventricular hypothalamic nucleus, posterior part",
  "Periventricular hyp. n. (intermediate)": "Periventricular hypothalamic nucleus, intermediate part",
  "(Anterior/Preoptic)Periventricular": "(Anterior/Preoptic)Periventricular region",
  "Not assigned": "No HypoMap region",
};

const DISPLAY_LABELS = Object.fromEntries(Object.entries(REGION_LABELS).map(([k, v]) => [v, k]));
const dataLabel = (label) => REGION_LABELS[label] || label;
const displayLabel = (label) => DISPLAY_LABELS[label] || label;

const ABBR = {
  "Paraventricular hypothalamic nucleus": "PVN",
  "Zona incerta": "ZI",
  "Lateral hypothalamic area": "LHA",
  "Dorsomedial n. of the hypothalamus": "DMH",
  "Ventromedial hypothalamic nucleus": "VMH",
  "Periventricular hyp. n. (posterior)": "PVp",
  "Arcuate hypothalamic nucleus": "ARC",
  "(Pre)Mammillary region": "MM",
  "Medial preoptic area": "MPO",
  "Suprachiasmatic nucleus": "SCN",
  "(Anterior/Preoptic)Periventricular": "PeVa",
  "Tuberal nucleus": "TU",
  "Lateral preoptic area": "LPO",
  "Periventricular hyp. n. (intermediate)": "PVi",
  "Anterior hypothalamic nucleus": "AHN",
  "Not assigned": "NA",
};

const RES = [["C7", 7], ["C25", 24], ["C66", 63], ["C185", 165], ["C286", 254], ["C465", 390]];
const C7 = [
  ["C7-1: GLU", 17279], ["C7-2: GABA", 13826], ["C7-4: Oligo+Precursor", 2194],
  ["C7-3: Astro-Ependymal", 2102], ["C7-5: Immune", 298], ["C7-7: Vascular", 170], ["C7-6: ParsTuber", 76],
];
const C25 = [
  ["C25-11: GABA-1", 7377], ["C25-3: GLU-3", 6906], ["C25-2: GLU-2", 4934], ["C25-10: GABA-2", 3059],
  ["C25-8: GLU-8", 2284], ["C25-5: GLU-5", 1558], ["C25-19: Oligodendrocytes", 1466], ["C25-18: Astrocytes", 1455],
  ["C25-13: GABA-4", 1452], ["C25-4: GLU-4", 1103], ["C25-12: GABA-3", 783], ["C25-20: OPC", 728],
  ["C25-14: GABA-5", 711], ["C25-17: Ependymal-like", 647], ["C25-15: GABA-6", 443], ["C25-6: GLU-6", 325],
  ["C25-21: Immune", 298], ["C25-25: Fibroblasts", 135], ["C25-1: GLU-1", 124], ["C25-23: ParsTuber", 76],
  ["C25-7: GLU-7", 41], ["C25-24: Mural+Endothelial", 35], ["C25-9: GLU-9", 4], ["C25-16: GABA-7", 1],
];
const TREE_BASE = [
  { id: "C7-1: GLU", n: 17279, kids: [
    { id: "C25-3: GLU-3", n: 6906, kids: [{ id: "C66-12: Gpr149.GLU-3", n: 3248 }, { id: "C66-10: Fezf1.GLU-3", n: 1421 }, { id: "C66-11: Cd40.GLU-3", n: 924 }] },
    { id: "C25-2: GLU-2", n: 4934, kids: [{ id: "C66-2: Irx5.GLU-2", n: 1459 }, { id: "C66-4: Trh.GLU-2", n: 1140 }, { id: "C66-7: Foxb1.GLU-2", n: 939 }] },
    { id: "C25-8: GLU-8", n: 2284, kids: [{ id: "C66-25: Foxb1.GLU-8", n: 2124 }, { id: "C66-26: Prkch.GLU-8", n: 160 }] },
    { id: "C25-5: GLU-5", n: 1558, kids: [{ id: "C66-19: Pomc.GLU-5", n: 717 }, { id: "C66-21: Bace2.GLU-5", n: 474 }, { id: "C66-20: Tac2.GLU-5", n: 367 }] },
  ] },
  { id: "C7-2: GABA", n: 13826, kids: [
    { id: "C25-11: GABA-1", n: 7377, kids: [{ id: "C66-35: Lef1.GABA-1", n: 1664 }, { id: "C66-34: Il1rapl2.GABA-1", n: 1375 }, { id: "C66-41: Tbx3.GABA-1", n: 904 }] },
    { id: "C25-10: GABA-2", n: 3059, kids: [{ id: "C66-28: Mixed.GABA-2", n: 1207 }, { id: "C66-30: Onecut2.GABA-2", n: 964 }, { id: "C66-29: Vipr2.GABA-2", n: 511 }] },
    { id: "C25-13: GABA-4", n: 1452, kids: [{ id: "C66-47: Sst.GABA-4", n: 739 }, { id: "C66-46: Agrp.GABA-4", n: 713 }] },
    { id: "C25-12: GABA-3", n: 783, kids: [{ id: "C66-44: Nkx2-4.GABA-3", n: 469 }, { id: "C66-45: Ghrh.GABA-3", n: 314 }] },
  ] },
  { id: "C7-4: Oligo+Precursor", n: 2194, kids: [] },
  { id: "C7-3: Astro-Ependymal", n: 2102, kids: [] },
  { id: "C7-5: Immune", n: 298, kids: [] },
  { id: "C7-7: Vascular", n: 170, kids: [] },
  { id: "C7-6: ParsTuber", n: 76, kids: [] },
];

const GENE_BLURBS = {
  Pomc: {
    name: "Proopiomelanocortin",
    blurb: "Proopiomelanocortin encodes a polypeptide precursor cleaved into melanocortins (α-MSH) and β-endorphin. In the hypothalamus its expression is concentrated in the arcuate nucleus, where POMC neurons drive satiety signaling — a canonical marker for anorexigenic energy-balance circuits.",
    marks: ["Pomc", "GLU-5"],
  },
  Agrp: {
    name: "Agouti related neuropeptide",
    blurb: "Agouti related neuropeptide is a canonical orexigenic arcuate nucleus marker. AGRP neurons participate in hunger and energy-balance circuits and are commonly contrasted with POMC populations in the ARC.",
    marks: ["Agrp", "GABA-4"],
  },
  Ccn1: {
    name: "Cellular communication network factor 1",
    blurb: "Cellular communication network factor 1, historically known as Cyr61, is an extracellular matrix-associated signaling gene. In this slice the query resolves across datasets through the MGI alias layer rather than being treated as absent.",
    marks: ["Ccn1", "Cyr61"],
  },
  Fam237b: {
    name: "Family with sequence similarity 237, member B",
    blurb: "Fam237b, historically annotated as Gm8773, encodes a small secreted protein associated with orexigenic signaling. Its hypothalamic expression is enriched in arcuate NPY/AgRP neurons; in this slice the current symbol resolves to the native Gm8773 feature in all three datasets.",
    marks: ["Fam237b", "Gm8773", "GABA-4"],
  },
  Npy: {
    name: "Neuropeptide Y",
    blurb: "Neuropeptide Y is a canonical marker of orexigenic arcuate neurons and a central regulator of feeding and energy balance. In this slice Npy resolves directly to the native Npy feature in all three datasets.",
    marks: ["Npy", "GABA-4"],
  },
};

const NUCLEI = [
  { abbr: "PVN", key: "Paraventricular hypothalamic nucleus", cx: 436, cy: 188, rx: 50, ry: 25, rot: -14 },
  { abbr: "ZI", key: "Zona incerta", cx: 524, cy: 174, rx: 38, ry: 21, rot: -18 },
  { abbr: "LHA", key: "Lateral hypothalamic area", cx: 550, cy: 278, rx: 54, ry: 68, rot: 6 },
  { abbr: "DMH", key: "Dorsomedial n. of the hypothalamus", cx: 450, cy: 252, rx: 32, ry: 48, rot: 0 },
  { abbr: "VMH", key: "Ventromedial hypothalamic nucleus", cx: 448, cy: 346, rx: 41, ry: 39, rot: 0 },
  { abbr: "PVp", key: "Periventricular hyp. n. (posterior)", cx: 406, cy: 302, rx: 10, ry: 92, rot: 0, narrow: true },
];
const MAPPED_REGIONS = [...NUCLEI.map((nucleus) => nucleus.key), "Arcuate hypothalamic nucleus"];
const OFFMAP = ["(Pre)Mammillary region", "Medial preoptic area", "Suprachiasmatic nucleus", "Anterior hypothalamic nucleus", "(Anterior/Preoptic)Periventricular", "Tuberal nucleus", "Lateral preoptic area", "Periventricular hyp. n. (intermediate)", "Not assigned"];
const TABS = [["overview", "Overview"], ["identity", "Cell Identity"], ["dataset", "By dataset"], ["coexpression", "Coexpression"]];
const COEXPRESSION_QUADRANTS = [
  { key: "both_positive", color: "#124e88" },
  { key: "gene_a_only", color: "#2f75b5" },
  { key: "gene_b_only", color: "#8bb9e1" },
  { key: "neither", color: "#e1e8ef" },
];

const state = {
  tab: "overview",
  source: "hypomap",
  datasets: { GSE207736: true, GSE172461: true, GSE93374: true },
  region: null,
  resolution: "C25",
  aggregation: "mode_b_cell_pooled",
  gene: "Pomc",
  geneQuery: "Pomc",
  geneMenuOpen: false,
  geneActiveIndex: 0,
  coexpressionPartner: "Agrp",
  coexpressionPartnerQuery: "Agrp",
  coexpressionPartnerMenuOpen: false,
  coexpressionPartnerActiveIndex: 0,
  coexpressionMessage: "",
  coexpressionLineage: "whole",
  expandedCoexpressionQuadrant: null,
  expanded: { "C7-1: GLU": true },
  hoverRegion: null,
  provOpen: false,
  metricHelp: null,
  mapCounts: true,
  message: "",
};

let model = null;
let suppressGeneFocusOpen = false;
let suppressCoexpressionFocusOpen = false;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => n == null || !Number.isFinite(Number(n)) ? "—" : Math.round(Number(n)).toLocaleString("en-US");
const pct = (n, d) => d ? (n / d * 100) : 0;
const fmt0 = (p) => `${(p || 0).toFixed(0)}%`;
const fmt1 = (p) => p == null ? "—" : `${Number(p).toFixed(1)}%`;
const selectedDS = () => model.datasets.filter((d) => state.datasets[d.id]);

function emptyMetric() {
  return {
    eligible_cells: 0,
    positive_cells: 0,
    percent_expressing: null,
    dataset_detection: false,
    mean_expression_positive: null,
    sum_log_expression_positive: 0,
    expression_distribution: { bin_edges: [], counts: [], quantiles: {}, n: 0 },
  };
}

function aggregate(metricsByDataset) {
  const vals = Object.values(metricsByDataset).filter((m) => m && m.eligible_cells > 0);
  const totalEligible = vals.reduce((s, m) => s + m.eligible_cells, 0);
  const totalPositive = vals.reduce((s, m) => s + m.positive_cells, 0);
  const totalLog = vals.reduce((s, m) => s + (m.sum_log_expression_positive || 0), 0);
  const pctVals = vals.map((m) => m.percent_expressing).filter((v) => v != null);
  const meanVals = vals.map((m) => m.mean_expression_positive).filter((v) => v != null);
  return {
    eligible_cells: totalEligible,
    positive_cells: totalPositive,
    percent_expressing: {
      mode_a_dataset_average: pctVals.length ? pctVals.reduce((a, b) => a + b, 0) / pctVals.length : null,
      mode_b_cell_pooled: totalEligible ? totalPositive / totalEligible * 100 : null,
    },
    mean_expression_positive: {
      mode_a_dataset_average: meanVals.length ? meanVals.reduce((a, b) => a + b, 0) / meanVals.length : null,
      mode_b_cell_pooled: totalPositive ? totalLog / totalPositive : null,
    },
    dataset_detection_count: vals.filter((m) => m.dataset_detection).length,
    dataset_detection_total: vals.length,
  };
}

function aggregateCoexpression(metricsByDataset) {
  const vals = Object.values(metricsByDataset).filter((metric) => metric && metric.eligible_cells > 0);
  const eligibleCells = vals.reduce((sum, metric) => sum + metric.eligible_cells, 0);
  const quadrantCounts = Object.fromEntries(COEXPRESSION_QUADRANTS.map(({ key }) => [
    key,
    vals.reduce((sum, metric) => sum + (metric.quadrant_counts?.[key] || 0), 0),
  ]));
  return {
    eligible_cells: eligibleCells,
    quadrant_counts: quadrantCounts,
    quadrant_percentages: Object.fromEntries(COEXPRESSION_QUADRANTS.map(({ key }) => [
      key,
      eligibleCells ? quadrantCounts[key] / eligibleCells * 100 : null,
    ])),
  };
}

function selectedCoexpressionPopulation(population) {
  return aggregateCoexpression(Object.fromEntries(selectedDS().map((dataset) => [
    dataset.id,
    population?.dataset_metrics?.[dataset.id],
  ])));
}

function orientCoexpression(metric, reversed) {
  if (!reversed) return metric;
  return {
    ...metric,
    quadrant_counts: {
      ...metric.quadrant_counts,
      gene_a_only: metric.quadrant_counts.gene_b_only,
      gene_b_only: metric.quadrant_counts.gene_a_only,
    },
    quadrant_percentages: {
      ...metric.quadrant_percentages,
      gene_a_only: metric.quadrant_percentages.gene_b_only,
      gene_b_only: metric.quadrant_percentages.gene_a_only,
    },
  };
}

function currentCoexpressionPilot() {
  const geneA = geneInfo(currentGene()).symbol;
  const geneB = state.coexpressionPartner;
  const direct = model.coexpressionPilots.find((pilot) => pilot.gene_a === geneA && pilot.gene_b === geneB);
  if (direct) return { pilot: direct, reversed: false };
  const reverse = model.coexpressionPilots.find((pilot) => pilot.gene_a === geneB && pilot.gene_b === geneA);
  return reverse ? { pilot: reverse, reversed: true } : { pilot: null, reversed: false };
}

function currentCoexpressionRegion() {
  return state.region;
}

function currentCoexpressionPopulation(pilot) {
  const region = currentCoexpressionRegion();
  if (!region) return pilot?.populations?.find((population) => population.scope === "whole_dataset") || null;
  return pilot?.populations?.find((population) => population.region === dataLabel(region)) || null;
}

function currentCoexpressionRegionLabel() {
  const region = currentCoexpressionRegion();
  return region ? (ABBR[region] || region) : "Whole hypothalamus";
}

function coexpressionPartnerSuggestions(query = state.coexpressionPartnerQuery) {
  const currentSymbol = geneInfo(currentGene()).symbol;
  const needle = query.trim().toLowerCase();
  return model.searchOptions
    .filter((option) => model.coexpressionGenes.includes(option.symbol) && option.symbol !== currentSymbol)
    .filter((option) => !needle || option.searchText.includes(needle))
    .sort((a, b) => {
      const rank = (option) => {
        if (!needle) return 2;
        if (option.symbol.toLowerCase().startsWith(needle)) return 0;
        if (option.aliases.some((alias) => alias.toLowerCase().startsWith(needle))) return 1;
        return 2;
      };
      return rank(a) - rank(b) || a.symbol.localeCompare(b.symbol);
    });
}

function selectCoexpressionPartner(option, query = option.symbol) {
  state.coexpressionPartner = option.symbol;
  state.coexpressionPartnerQuery = option.symbol;
  state.coexpressionPartnerMenuOpen = false;
  state.coexpressionPartnerActiveIndex = 0;
  state.coexpressionMessage = query.toLowerCase() !== option.symbol.toLowerCase() ? `${query} resolved to ${option.symbol}` : "";
}

function syncCoexpressionPartner(currentSymbol) {
  if (state.coexpressionPartner !== currentSymbol && model.coexpressionGenes.includes(state.coexpressionPartner)) return;
  const fallback = model.coexpressionGenes.find((gene) => gene !== currentSymbol);
  state.coexpressionPartner = fallback || "";
  state.coexpressionPartnerQuery = fallback || "";
  state.coexpressionPartnerMenuOpen = false;
  state.coexpressionPartnerActiveIndex = 0;
  state.coexpressionMessage = "";
}

function selectedMetrics(metricsByDataset) {
  return Object.fromEntries(selectedDS().map((d) => [d.id, metricsByDataset?.[d.id] || emptyMetric()]));
}

function currentGene() {
  return model.genes.find((g) => g.query === state.gene) || model.genes[0];
}

function geneInfo(gene) {
  const canonical = gene.resolver?.canonical_gene || {};
  const local = GENE_BLURBS[canonical.canonical_symbol] || GENE_BLURBS[gene.query] || {};
  return {
    symbol: canonical.canonical_symbol || gene.query,
    name: local.name || canonical.marker_name || gene.query,
    blurb: local.blurb || canonical.marker_name || "",
    marks: local.marks || [gene.query],
  };
}

function geneSuggestions(query = state.geneQuery) {
  const needle = query.trim().toLowerCase();
  return model.searchOptions
    .filter((option) => !needle || option.searchText.includes(needle))
    .sort((a, b) => {
      const rank = (option) => {
        if (!needle) return 2;
        if (option.symbol.toLowerCase().startsWith(needle)) return 0;
        if (option.aliases.some((alias) => alias.toLowerCase().startsWith(needle))) return 1;
        return 2;
      };
      return rank(a) - rank(b) || a.symbol.localeCompare(b.symbol);
    });
}

function markTree(nodes, marks) {
  return nodes.map((node) => {
    const kids = markTree(node.kids || [], marks);
    const self = marks.some((mark) => node.id.toLowerCase().includes(mark.toLowerCase()));
    return { ...node, kids, mark: self || kids.some((kid) => kid.mark) };
  });
}

function derive() {
  const gene = currentGene();
  const info = geneInfo(gene);
  const hypo = state.source === "hypomap";
  const sel = selectedDS();
  const selectedIds = sel.map((d) => d.id);
  const regionEnabled = hypo && sel.some((d) => d.hypomap != null);
  const region = regionEnabled ? state.region : null;
  const contextName = region ? region : "Whole hypothalamus";
  const contextDataName = region ? dataLabel(region) : "Whole hypothalamus";
  const sourceMetrics = region
    ? gene.metrics.by_hypomap_region?.[contextDataName]?.dataset_metrics
    : gene.metrics.whole_dataset.dataset_metrics;
  const dsMetrics = selectedMetrics(sourceMetrics);
  const agg = aggregate(dsMetrics);
  const mode = state.aggregation;
  const regionStatsDisplay = {};
  for (const [label, group] of Object.entries(gene.metrics.by_hypomap_region || {})) {
    const metrics = selectedMetrics(group.dataset_metrics);
    const regionAggregate = aggregate(metrics);
    regionStatsDisplay[displayLabel(label)] = {
      eligible: regionAggregate.eligible_cells,
      positive: regionAggregate.positive_cells,
      percent: regionAggregate.percent_expressing[mode],
    };
  }
  const totalRegionAssigned = Object.entries(regionStatsDisplay)
    .filter(([k]) => k !== "Not assigned")
    .reduce((s, [, stats]) => s + stats.eligible, 0);
  const maxMappedRegionPositive = Math.max(
    1,
    ...MAPPED_REGIONS.map((key) => regionStatsDisplay[key]?.positive || 0),
  );

  let total = 0, regionAssigned = 0, annotNoRegion = 0, notCovered = 0, nativeAnnot = 0;
  for (const d of sel) {
    total += d.cells;
    nativeAnnot += d.native || 0;
    if (hypo) {
      if (d.hypomap != null) {
        regionAssigned += d.hypoRegion || 0;
        annotNoRegion += d.hypomap - (d.hypoRegion || 0);
        notCovered += d.cells - d.hypomap;
      } else {
        notCovered += d.cells;
      }
    } else {
      notCovered += Math.max(0, d.cells - (d.native || 0));
    }
  }

  const covFor = (src) => {
    const t = sel.reduce((s, d) => s + d.cells, 0);
    const a = sel.reduce((s, d) => s + (src === "hypomap" ? (d.hypomap || 0) : (d.native || 0)), 0);
    return pct(a, t);
  };

  const contextTotal = agg.eligible_cells;
  const positive = agg.positive_cells;
  const pctExpr = agg.percent_expressing[mode];
  const meanExpr = agg.mean_expression_positive[mode];
  const regionTotal = region ? (regionStatsDisplay[region]?.eligible || 0) : regionAssigned;
  const contextPctLabel = region && regionAssigned ? ` · ${(regionTotal / regionAssigned * 100).toFixed(1)}% of annotated tissue` : "";
  const unsupportedRegion = region && Object.values(dsMetrics).every((m) => m.eligible_cells === 0);

  return {
    gene, info, hypo, sel, selectedIds, regionEnabled, region, contextName, contextDataName,
    contextTotal, positive, pctExpr, meanExpr, agg, dsMetrics, total, regionAssigned,
    annotNoRegion, notCovered, nativeAnnot, annotatedTotal: hypo ? regionAssigned + annotNoRegion : nativeAnnot,
    annCov: hypo ? covFor("hypomap") : covFor("native"),
    covNative: covFor("native"), covHypomap: covFor("hypomap"),
    mode, contextPctLabel, unsupportedRegion, regionStatsDisplay, totalRegionAssigned,
    maxMappedRegionPositive,
  };
}

function computedBadge(label = "computed") {
  return `<span style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#1f8a5b;border:1px solid #bee3cd;background:#eaf6ef;padding:1px 5px;border-radius:4px;">${label}</span>`;
}

function metricHelp() {
  return `Raw-count positive cells use raw_count ≥ 1. % expressing uses positive / eligible cells. Mean expression uses Seurat LogNormalize among positive cells only, in ${LOG_EXPRESSION_UNIT}. This is not TPM: no transcript-length correction is applied.`;
}

function rampAlpha(value, maxValue) {
  if (value == null || !Number.isFinite(Number(value))) return 0.13;
  const ratio = Math.min(1, Math.max(0, Number(value) / Math.max(1, maxValue)));
  return 0.13 + 0.64 * ratio;
}

function aggregationControl(D) {
  if (D.sel.length <= 1) return "";
  const btn = (mode, label, sub) => {
    const active = D.mode === mode;
    return `<button data-act="agg" data-v="${mode}" style="display:flex;flex-direction:column;gap:1px;padding:6px 9px;border:none;border-right:1px solid #ddd7cc;cursor:pointer;background:${active ? "#2563a6" : "#fff"};color:${active ? "#fff" : "#7b756a"};font-size:11px;font-weight:700;">
      <span>${label}</span><span style="font-size:9px;font-weight:500;color:${active ? "#d8e8f7" : "#b8b2a7"};">${sub}</span></button>`;
  };
  return `<div style="display:inline-flex;border:1px solid #ddd7cc;border-radius:8px;overflow:hidden;">${btn("mode_a_dataset_average", "Dataset avg", "equal")} ${btn("mode_b_cell_pooled", "Cell pooled", "pooled")}</div>`;
}

function header(D) {
  const opts = ["native", "hypomap"].map((k) => {
    const active = (k === "hypomap") === D.hypo;
    const cov = fmt0(k === "hypomap" ? D.covHypomap : D.covNative);
    return `<button data-act="source" data-v="${k}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 10px;border:none;cursor:pointer;font-size:12.5px;font-weight:600;${active ? "background:#2563a6;color:#fff;" : "background:#f6f4ef;color:#7b756a;"}">
      <span>${k === "hypomap" ? "HypoMap" : "Native"}</span>
      <span class="mono" style="font-size:9.5px;font-weight:600;${active ? "color:#d8e8f7;" : "color:#b8b2a7;"}">${cov}</span></button>`;
  }).join("");
  const provText = D.hypo
    ? `HypoMap atlas · CZ CELLxGENE d86517f0 · Steuernagel et al. 2022. ${fmt(D.regionAssigned + D.annotNoRegion)} / ${fmt(D.total)} selected cells matched; ${fmt(D.regionAssigned)} carry a nucleus assignment.`
    : `Native study annotations, as deposited in GEO. Native region is study-level; nucleus placement and HypoMap hierarchy require HypoMap annotations.`;
  const dropdown = state.provOpen ? `
    <div style="position:absolute;top:calc(100% + 8px);right:0;width:344px;background:#fff;border:1px solid #e2ddd3;border-radius:12px;box-shadow:0 12px 34px rgba(30,25,15,.16);padding:16px;z-index:40;">
      <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8a847a;margin-bottom:8px;">Annotation source</div>
      <div style="display:flex;border:1px solid #ddd7cc;border-radius:9px;overflow:hidden;margin-bottom:12px;">${opts}</div>
      <div style="font-size:11px;color:#a7a197;line-height:1.55;">${provText}</div>
      <div style="font-size:11px;color:#7b756a;line-height:1.55;margin-top:10px;">${metricHelp()}</div>
    </div>` : "";
  const suggestions = geneSuggestions();
  const geneDropdown = state.geneMenuOpen ? `
    <div class="gene-menu" id="gene-suggestions" role="listbox" aria-label="Available genes">
      ${suggestions.length ? suggestions.map((option, index) => {
        const aliasMatches = option.aliases.filter((alias) => alias.toLowerCase() !== option.symbol.toLowerCase());
        return `<button type="button" id="gene-option-${index}" class="gene-option${index === state.geneActiveIndex ? " is-active" : ""}" role="option" aria-selected="${index === state.geneActiveIndex}" data-act="gene-select" data-v="${esc(option.gene)}" data-index="${index}">
          <span class="gene-option-copy"><span class="gene-option-symbol mono">${esc(option.symbol)}</span><span class="gene-option-name">${esc(option.name)}</span></span>
          ${aliasMatches.length ? `<span class="gene-option-alias mono">alias ${esc(aliasMatches.join(", "))}</span>` : ""}
        </button>`;
      }).join("") : `<div class="gene-menu-empty">No available gene matches “${esc(state.geneQuery)}”</div>`}
      <div class="gene-menu-meta">${suggestions.length} of ${model.searchOptions.length} genes available in this data slice</div>
    </div>` : "";
  return `
  <header style="position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:15px 26px;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid #e8e4dc;border-radius:14px 14px 0 0;">
    <div style="display:flex;align-items:center;gap:20px;min-width:0;">
      <span style="font-size:13.5px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;">ARC Gene Explorer</span>
      <form data-act="gene-form" data-gene-picker class="gene-search">
        <label for="gene-input" style="font-size:12px;color:#a7a197;margin-right:8px;">Gene</label>
        <input id="gene-input" data-role="gene-input" value="${esc(state.geneQuery)}" placeholder="Type a gene" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="gene-suggestions" aria-expanded="${state.geneMenuOpen}" ${state.geneMenuOpen && suggestions.length ? `aria-activedescendant="gene-option-${state.geneActiveIndex}"` : ""}>
        <button type="submit" class="gene-submit">Look up</button>
        ${geneDropdown}
      </form>
      ${state.message ? `<span style="font-size:11px;color:#8a6d47;">${esc(state.message)}</span>` : ""}
    </div>
    <div style="position:relative;flex:none;">
      <button data-act="prov" style="display:flex;align-items:center;gap:9px;padding:7px 12px;border:1px solid #e2ddd3;border-radius:9px;background:#faf9f6;cursor:pointer;">
        <span style="width:8px;height:8px;border-radius:50%;background:${D.hypo ? "#2563a6" : "#8a847a"};flex:none;"></span>
        <span style="font-size:12px;font-weight:600;color:#3a352d;">${D.hypo ? "HypoMap" : "Native"}</span>
        <span style="font-size:11px;color:#a7a197;">${fmt0(D.annCov)} coverage</span>
        <span style="font-size:9px;color:#bdb7ac;">▾</span>
      </button>${dropdown}
    </div>
  </header>`;
}

function nav(D) {
  const tabs = TABS.map(([k, label]) => {
    const active = state.tab === k;
    return `<button data-act="tab" data-v="${k}" style="padding:13px 15px;border:none;background:none;cursor:pointer;font-size:13px;letter-spacing:-.005em;white-space:nowrap;font-weight:${active ? "700" : "500"};color:${active ? "#211f1b" : "#a7a197"};border-bottom:2px solid ${active ? "#2563a6" : "transparent"};margin-bottom:-1px;">${label}</button>`;
  }).join("");
  const isCoexpression = state.tab === "coexpression";
  const { pilot } = currentCoexpressionPilot();
  const regionPopulation = currentCoexpressionPopulation(pilot);
  const selectedLineage = LINEAGE_PREVIEW.find((item) => item.id === state.coexpressionLineage);
  const coexpressionTotal = selectedLineage?.count || (regionPopulation ? selectedCoexpressionPopulation(regionPopulation).eligible_cells : 0);
  const viewingLabel = isCoexpression ? `${selectedLineage?.id || currentCoexpressionRegionLabel()} cells` : D.contextName;
  const viewingTotal = isCoexpression ? coexpressionTotal : D.contextTotal;
  const whole = D.region && !isCoexpression ? `<button data-act="whole" style="flex:none;padding:4px 9px;border:1px solid #ddd7cc;border-radius:6px;background:#fff;font-size:11px;font-weight:600;color:#7b756a;cursor:pointer;white-space:nowrap;">↩ Whole</button>` : "";
  return `
  <nav style="position:sticky;top:59px;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 26px;background:rgba(255,255,255,.96);backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid #e8e4dc;">
    <div style="display:flex;align-items:stretch;gap:2px;">${tabs}</div>
    <div style="display:flex;align-items:center;gap:11px;min-width:0;">
      ${state.tab === "overview" || state.tab === "dataset" || isCoexpression ? "" : aggregationControl(D)}
      <span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#bdb7ac;white-space:nowrap;">Viewing</span>
      <span style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px;">${esc(viewingLabel)}</span>
      <span style="font-size:11px;color:#a7a197;white-space:nowrap;"><span class="mono" style="color:#2563a6;font-weight:600;">${fmt(viewingTotal)}</span> cells</span>
      ${whole}
    </div>
  </nav>`;
}

function anatomyMap(D) {
  const hasContext = D.region;
  const styleFor = (key) => {
    const stats = D.regionStatsDisplay[key] || { eligible: 0, positive: 0, percent: null };
    const on = D.region === key;
    const hov = state.hoverRegion === key;
    const a = rampAlpha(stats.positive, D.maxMappedRegionPositive);
    return {
      ...stats,
      fill: `rgba(37,99,166,${a.toFixed(3)})`,
      stroke: on ? "#1d4f8a" : (hov ? "#2563a6" : "rgba(25,78,130,.32)"),
      sw: (on || hov) ? 2.4 : 1.1,
      opacity: (hasContext && !on) ? 0.38 : 1,
      labelColor: a > 0.5 ? "#fff" : "#243f5a",
      countColor: a > 0.5 ? "rgba(255,255,255,.82)" : "#57718a",
    };
  };
  const txt = (x, y, fs, fill, fam, w, t) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" font-weight="${w}" fill="${fill}" style="pointer-events:none;font-family:${fam};">${t}</text>`;
  const SANS = "-apple-system,Helvetica Neue,Arial,sans-serif", MONO = "ui-monospace,Menlo,monospace";
  let shapes = "";
  for (const n of NUCLEI) {
    const st = styleFor(n.key), labFont = n.narrow ? 10 : 15, countFont = n.narrow ? 8.5 : 11;
    const one = (cx, tf) => `<g data-act="region" data-v="${esc(n.key)}" data-hover="${esc(n.key)}" opacity="${st.opacity}" style="cursor:pointer;transition:opacity .15s;">
      <ellipse cx="${cx}" cy="${n.cy}" rx="${n.rx}" ry="${n.ry}" transform="${tf}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.sw}"></ellipse>
      ${txt(cx, n.narrow ? n.cy - 3 : n.cy - 2, labFont, st.labelColor, SANS, 700, n.abbr)}
      ${state.mapCounts ? txt(cx, n.narrow ? n.cy + 11 : n.cy + 14, countFont, st.countColor, MONO, 400, fmt(st.positive)) : ""}</g>`;
    const lx = 760 - n.cx;
    shapes += one(n.cx, `rotate(${n.rot} ${n.cx} ${n.cy})`);
    shapes += one(lx, `rotate(${-n.rot} ${lx} ${n.cy})`);
  }
  const arc = styleFor("Arcuate hypothalamic nucleus");
  const arcG = `<g data-act="region" data-v="Arcuate hypothalamic nucleus" data-hover="Arcuate hypothalamic nucleus" opacity="${arc.opacity}" style="cursor:pointer;transition:opacity .15s;">
    <path d="M380,430 C414,441 420,496 380,510 C340,496 346,441 380,430 Z" fill="${arc.fill}" stroke="${arc.stroke}" stroke-width="${arc.sw}"></path>
    ${txt(380, 466, 14, arc.labelColor, SANS, 700, "ARC")}
    ${state.mapCounts ? txt(380, 482, 11, arc.countColor, MONO, 400, fmt(arc.positive)) : ""}</g>`;
  const hov = state.hoverRegion;
  const hoverStats = hov ? D.regionStatsDisplay[hov] : null;
  const readout = hov
    ? `<div style="text-align:right;min-width:0;"><div style="font-size:11.5px;font-weight:700;color:#211f1b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(hov)}</div><div style="font-size:10.5px;color:#a7a197;"><span class="mono" style="color:#2563a6;">${fmt(hoverStats?.positive || 0)} ${esc(D.info.symbol)}+</span> · ${hoverStats?.percent == null ? "—" : `${Number(hoverStats.percent).toFixed(1)}% expressing`}</div></div>`
    : `<span style="font-size:10.5px;color:#bdb7ac;">click a nucleus</span>`;
  return `
  <div style="border:1px solid #e8e4dc;border-radius:12px;overflow:hidden;background:#fbfaf7;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 14px;border-bottom:1px solid #efece5;min-height:44px;">
      <span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#8a847a;white-space:nowrap;">Coronal · tuberal</span>${readout}
    </div>
    <div style="padding:4px 10px 0;">
      <svg viewBox="0 0 760 600" style="width:100%;height:auto;display:block;">
        <path d="M380,96 C305,92 230,98 180,124 C130,150 112,208 120,262 C127,326 156,382 205,416 C224,430 244,433 258,428 C250,440 256,452 270,452 C286,452 296,438 312,444 C334,453 352,464 380,466 C408,464 426,453 448,444 C464,438 474,452 490,452 C504,452 510,440 502,428 C516,433 536,430 555,416 C604,382 633,326 640,262 C648,208 630,150 580,124 C530,98 455,92 380,96 Z" fill="#f3ede7" stroke="#d8cdc3" stroke-width="2"></path>
        <path d="M380,116 L389,132 L380,148 L371,132 Z" fill="#c9c0b4"></path>
        <path d="M380,146 L380,452" stroke="#c9c0b4" stroke-width="3" stroke-linecap="round"></path>
        <circle cx="380" cy="452" r="5" fill="#4a453d"></circle>
        <ellipse cx="380" cy="522" rx="30" ry="14" fill="#efe7df" stroke="#cbbfb4" stroke-width="1.2"></ellipse>
        <text x="380" y="527" text-anchor="middle" font-size="12" font-weight="600" fill="#a7a197" style="pointer-events:none;">ME</text>
        ${shapes}${arcG}
      </svg>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:8px 14px 12px;">
      <span class="mono" style="font-size:10.5px;color:#a7a197;">0</span>
      <div style="flex:1;height:7px;border-radius:4px;background:linear-gradient(90deg,rgba(37,99,166,.13),rgba(37,99,166,.77));"></div>
      <span class="mono" style="font-size:10.5px;color:#a7a197;">${fmt(D.maxMappedRegionPositive)} ${esc(D.info.symbol)}+ cells</span>
    </div>
    <div style="padding:0 14px 10px;font-size:9.5px;color:#b0a99e;line-height:1.35;">Raw detections ≥1 count · not corrected for ambient RNA</div>
  </div>`;
}

function viewOverview(D) {
  const disabled = !D.regionEnabled;
  const pooledPct = D.contextTotal ? D.positive / D.contextTotal * 100 : 0;
  const aggregatePct = D.agg.percent_expressing[D.mode];
  const aggregateMean = D.agg.mean_expression_positive[D.mode];
  const selectedDatasetMetrics = Object.values(D.dsMetrics).filter((metric) => metric.eligible_cells > 0);
  const meanScale = Math.max(1, ...selectedDatasetMetrics.map((metric) =>
    Number(metric.expression_distribution?.quantiles?.max || metric.mean_expression_positive || 0)));
  const meanWidth = aggregateMean == null ? 0 : Math.min(100, Number(aggregateMean) / meanScale * 100);
  const selectionLabel = D.sel.length === model.datasets.length ? "all datasets" : "selected datasets";
  const empty = D.contextTotal === 0;
  const expressionSummary = `
    <section class="overview-expression" aria-label="Aggregated expression summary">
      ${aggregateCalculationControl(D)}
      ${empty ? `<div class="aggregate-empty">Select a dataset with eligible cells to view expression summary.</div>` : `<div class="overview-expression-content">
        <div class="overview-summary-heading">
          <div><h3>Expression summary</h3><p>${esc(D.contextName)} · ${D.sel.length} selected dataset${D.sel.length === 1 ? "" : "s"}</p></div>
          ${computedBadge()}
        </div>
        <div class="overview-aggregate-layout">
        <section class="aggregate-donut-panel overview-donut-panel" aria-label="${pooledPct.toFixed(1)} percent of cells express ${esc(D.info.symbol)}">
          <h3>Cells expressing · ${selectionLabel}</h3>
          <div class="aggregate-legend">
            <span><i style="background:#2c6fae;"></i><em>${esc(D.info.symbol)}</em> + expressing</span>
            <span class="is-negative"><i></i><em>${esc(D.info.symbol)}</em> − not expressing</span>
          </div>
          <div class="aggregate-donut overview-donut" style="background:conic-gradient(#2c6fae 0 ${pooledPct.toFixed(3)}%,#dceaf7 ${pooledPct.toFixed(3)}% 100%);">
            <div><strong>${fmt(D.positive)}</strong><span>of ${fmt(D.contextTotal)} cells</span></div>
          </div>
          <p class="aggregate-donut-note">Absolute counts are always pooled across selected datasets.</p>
        </section>
        <section class="overview-summary">
          <div class="aggregate-cards overview-cards">
            <article class="aggregate-card overview-stat-card">
              <div class="aggregate-card-label">% <i>${esc(D.info.symbol)}</i>+ · ${D.mode === "mode_a_dataset_average" ? "dataset average" : "cell pooled"}</div>
              <button data-act="metric-help" data-v="percent" class="metric-help" aria-expanded="${state.metricHelp === "percent"}" aria-label="Explain expression percentage">?</button>
              <div class="aggregate-percent">${aggregatePct == null ? "—" : `${Number(aggregatePct).toFixed(1)}%`}</div>
              ${metricInfo("percent", D)}
            </article>
            <article class="aggregate-card overview-stat-card">
              <div class="aggregate-card-label">Mean expr. (when on)</div>
              <button data-act="metric-help" data-v="mean" class="metric-help" aria-expanded="${state.metricHelp === "mean"}" aria-label="Explain mean expression">?</button>
              <div class="aggregate-mean"><strong>${aggregateMean == null ? "—" : Number(aggregateMean).toFixed(2)}</strong><span>${LOG_EXPRESSION_UNIT}</span></div>
              <div class="aggregate-mean-track"><span style="width:${meanWidth.toFixed(1)}%;"></span></div>
              <div class="aggregate-mean-scale">Visual scale: 0–${meanScale.toFixed(2)}</div>
              ${metricInfo("mean", D)}
            </article>
          </div>
          <div class="detection-chip">Detected in <b>${D.agg.dataset_detection_count}</b> / <b>${D.agg.dataset_detection_total}</b> datasets</div>
        </section>
        </div>
      </div>`}
    </section>`;

  const left = disabled
    ? `<div style="border:1px dashed #ddd7cc;border-radius:12px;background:#faf9f6;padding:22px 20px;text-align:center;">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Spatial view needs HypoMap</div>
        <div style="font-size:11.5px;color:#8a6d47;line-height:1.55;margin-bottom:14px;">Nucleus placement comes from the HypoMap <span class="mono">hypomap_region</span> field. Native deposits carry only a study-level region.</div>
        <button data-act="source" data-v="hypomap" style="padding:8px 15px;border:none;border-radius:8px;background:#2563a6;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Switch to HypoMap</button></div>`
    : anatomyMap(D);

  const offRows = D.regionEnabled ? OFFMAP.map((name) => {
    const stats = D.regionStatsDisplay[name] || { eligible: 0, positive: 0, percent: null }, on = D.region === name, na = name === "Not assigned";
    const dot = na
      ? "width:11px;height:11px;border-radius:3px;flex:none;background-image:repeating-linear-gradient(45deg,#cbc6bd,#cbc6bd 3px,#bdb7ac 3px,#bdb7ac 6px);"
      : `width:11px;height:11px;border-radius:3px;flex:none;background:rgba(37,99,166,${rampAlpha(stats.positive, D.maxMappedRegionPositive).toFixed(3)});border:1px solid rgba(25,78,130,.3);`;
    return `<div data-act="region" data-v="${esc(name)}" style="display:flex;align-items:center;gap:9px;padding:5px 8px;border-radius:7px;cursor:pointer;background:${on ? "#e8f1fa" : "transparent"};">
      <span style="${dot}"></span>
      <span style="flex:1;font-size:11.5px;line-height:1.25;${on ? "font-weight:700;color:#2563a6;" : (na ? "color:#7b756a;" : "")}">${esc(name)}</span>
      <span class="mono" style="font-size:10px;color:#a7a197;">${fmt(stats.positive)} · ${stats.percent == null ? "—" : `${Number(stats.percent).toFixed(1)}%`}</span></div>`;
  }).join("") : "";
  const offBlock = D.regionEnabled ? `
    <div class="overview-offplane">
      <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8a847a;margin-bottom:3px;">Off this plane</div>
      <div style="font-size:10.5px;color:#bdb7ac;line-height:1.45;margin-bottom:8px;">Nuclei at other rostro-caudal levels — selectable all the same.</div>
      <div style="display:flex;flex-direction:column;gap:1px;">${offRows}</div>
    </div>` : "";
  const unsupported = D.unsupportedRegion ? `<div style="margin-top:12px;font-size:11.5px;color:#8a6d47;background:#faf3e2;border:1px solid #ecdcc8;border-radius:8px;padding:9px 11px;">No selected dataset has eligible cells for this context. Values are unavailable rather than treated as zero.</div>` : "";

  return `
    <div style="display:flex;align-items:baseline;gap:11px;margin-bottom:4px;">
      <span style="font-size:32px;font-weight:700;letter-spacing:-.02em;">${esc(D.info.symbol)}</span>
      <span style="font-size:14px;color:#7b756a;">${esc(D.info.name)}</span>
    </div>
    <div class="overview-about">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;">About this gene</div>
      <div style="font-size:12.5px;color:#7b756a;line-height:1.6;">${esc(D.info.blurb)}</div>
    </div>
    <div class="overview-workspace">
      <section class="overview-anatomy-column">
        <div class="overview-section-label">Anatomy · click a nucleus to set context</div>
        ${left}${offBlock}
      </section>
      <section class="overview-expression-column">
        <div style="font-size:12.5px;color:#a7a197;margin-bottom:14px;line-height:1.5;">Hypothalamus · Mus musculus · expression across <b style="color:#7b756a;">${esc(D.contextName)}</b>${D.contextPctLabel}</div>
        ${expressionSummary}${unsupported}
      </section>
    </div>`;
}

function viewIdentity(D) {
  if (!D.regionEnabled) {
    return `<div style="font-size:18px;font-weight:700;margin-bottom:4px;">Which cell types</div>
      <div style="font-size:12.5px;color:#7b756a;margin-bottom:18px;line-height:1.5;">HypoMap lineage within <b style="color:#211f1b;">${esc(D.contextName)}</b>.</div>
      <div style="border:1px dashed #ddd7cc;background:#faf9f6;border-radius:11px;padding:22px;text-align:center;">
        <div style="font-size:12.5px;color:#8a6d47;line-height:1.55;max-width:440px;margin:0 auto 14px;">The C7 → C465 tree is a HypoMap integrated annotation, unavailable for native-only labels.</div>
        <button data-act="source" data-v="hypomap" style="padding:8px 15px;border:none;border-radius:8px;background:#2563a6;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Switch to HypoMap</button></div>`;
  }
  const resBtns = RES.map(([k, n]) => {
    const active = k === state.resolution;
    return `<button data-act="res" data-v="${k}" style="display:flex;align-items:center;gap:5px;padding:7px 11px;border:none;border-right:1px solid #ddd7cc;cursor:pointer;font-size:12px;font-weight:600;${active ? "background:#2563a6;color:#fff;" : "background:#fff;color:#7b756a;"}">${k}<span class="mono" style="font-size:9.5px;font-weight:400;${active ? "color:#d8e8f7;" : "color:#b8b2a7;"}">${n}</span></button>`;
  }).join("");

  const tree = markTree(TREE_BASE, D.info.marks);
  let treeRows = "";
  const walk = (nodes, depth) => {
    for (const node of nodes) {
      const open = !!state.expanded[node.id], hasKids = node.kids && node.kids.length > 0;
      const caretStyle = `width:14px;flex:none;text-align:center;font-size:${hasKids ? 11 : 13}px;color:${hasKids ? "#2563a6" : "#cbc6bd"};`;
      const labelWeight = depth === 0 ? "font-weight:600;" : (depth === 1 ? "font-weight:500;color:#3a352d;" : "color:#7b756a;");
      const markSpan = node.mark ? `<span style="font-size:8.5px;font-weight:700;color:#2563a6;background:#e8f1fa;padding:1px 5px;border-radius:4px;margin-left:6px;">${esc(D.info.symbol)}⁺</span>` : "";
      treeRows += `<div ${hasKids ? `data-act="node" data-v="${esc(node.id)}"` : ""} style="display:flex;align-items:center;gap:7px;padding:6px 8px;padding-left:${8 + depth * 18}px;border-radius:6px;cursor:${hasKids ? "pointer" : "default"};background:${node.mark ? "#f0f6fc" : "transparent"};">
        <span style="${caretStyle}">${hasKids ? (open ? "▾" : "▸") : "·"}</span>
        <span style="flex:1;font-size:11.5px;${labelWeight}">${esc(node.id)}${markSpan}</span>
        <span class="mono" style="font-size:10px;color:#a7a197;">${fmt(node.n)}</span></div>`;
      if (open && hasKids) walk(node.kids, depth + 1);
    }
  };
  walk(tree, 0);

  const listable = state.resolution === "C7" || state.resolution === "C25";
  const c25Context = D.gene.metrics.by_context_hypomap_C25?.[D.contextDataName] || {};
  const realC25 = Object.values(c25Context)
    .map((group) => {
      const groupAgg = aggregate(selectedMetrics(group.dataset_metrics));
      return [group.label, groupAgg.eligible_cells];
    })
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const src = state.resolution === "C7" ? C7 : realC25;
  const resMeta = RES.find((r) => r[0] === state.resolution) || ["C25", 24];
  const table = listable ? `<div style="max-height:412px;overflow-y:auto;">${src.map(([label, count]) => {
    const mark = D.info.marks.some((m) => label.toLowerCase().includes(m.toLowerCase()));
    const max = src[0]?.[1] || 1;
    const denom = state.resolution === "C25" ? D.contextTotal : D.annotatedTotal;
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f4f1ea;">
      <div style="flex:1;min-width:0;"><div style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(label)}${mark ? `<span style="font-size:8.5px;font-weight:700;color:#2563a6;margin-left:5px;">${esc(D.info.symbol)}⁺</span>` : ""}</div>
      <div style="height:5px;border-radius:3px;background:#efece5;overflow:hidden;margin-top:4px;"><div style="height:100%;width:${(count / max * 100).toFixed(1)}%;background:#2563a6;"></div></div></div>
      <span class="mono" style="font-size:10.5px;width:48px;text-align:right;">${fmt(count)}</span>
      <span class="mono" style="font-size:10px;color:#a7a197;width:40px;text-align:right;">${denom ? (count / denom * 100).toFixed(1) : "—"}%</span></div>`;
  }).join("")}</div>` : `<div style="padding:20px 8px;text-align:center;"><div class="mono" style="font-size:22px;font-weight:700;color:#2563a6;">${resMeta[1]}</div>
      <div style="font-size:11.5px;color:#7b756a;margin-top:6px;line-height:1.5;">clusters at ${state.resolution} — too many to rank flat. Drill a lineage instead.</div></div>`;

  return `
    <div style="font-size:18px;font-weight:700;letter-spacing:-.01em;margin-bottom:4px;">Which cell types</div>
    <div style="font-size:12.5px;color:#7b756a;margin-bottom:18px;line-height:1.5;">HypoMap lineage within <b style="color:#211f1b;">${esc(D.contextName)}</b>. Expand a class to drill C7 → C465.</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
      <span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8a847a;">Resolution</span>
      <div style="display:inline-flex;border:1px solid #ddd7cc;border-radius:8px;overflow:hidden;">${resBtns}</div>
      <span style="font-size:11px;color:#a7a197;">coarse → fine</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;">
      <div style="border:1px solid #e8e4dc;border-radius:11px;padding:15px 6px 15px 15px;">
        <div style="font-size:12px;font-weight:700;margin-bottom:4px;padding-right:10px;">Lineage explorer</div>
        <div style="font-size:10.5px;color:#a7a197;margin-bottom:11px;padding-right:10px;line-height:1.45;">Collapsed by default — the 390 leaf clusters never all show at once.</div>
        <div style="max-height:420px;overflow-y:auto;padding-right:8px;">${treeRows}</div>
      </div>
      <div style="border:1px solid #e8e4dc;border-radius:11px;padding:15px 17px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:11px;">
          <span style="font-size:12px;font-weight:700;">Cluster abundance · ${state.resolution}</span>
          <span style="font-size:10px;color:#a7a197;">${state.resolution === "C25" ? `${realC25.length} groups · % of context` : (listable ? `${resMeta[1]} clusters · % of annotated` : `${resMeta[1]} distinct`)}</span></div>
        ${table}
        <div style="margin-top:11px;display:flex;align-items:center;gap:9px;padding:8px 10px;background:#f8f6f2;border-radius:8px;">
          <span style="width:10px;height:10px;border-radius:2px;background:#cbc6bd;flex:none;"></span>
          <span style="font-size:10.5px;color:#7b756a;line-height:1.4;"><b style="color:#211f1b;">${fmt(D.notCovered)}</b> cells (${D.total ? (D.notCovered / D.total * 100).toFixed(1) : "—"}%) present but unannotated — kept visible.</span></div>
      </div>
    </div>`;
}

function datasetToggles(D) {
  return model.datasets.map((d) => {
    const on = !!state.datasets[d.id], cov = D.hypo ? d.hypomap : d.native;
    const covLabel = cov == null ? "no HM" : `${pct(cov, d.cells).toFixed(0)}%`;
    return `<button data-act="dataset" data-v="${d.id}" aria-pressed="${on}" class="dataset-toggle${on ? " is-selected" : ""}">
      <span class="dataset-toggle-swatch" style="background:${on ? d.color : "transparent"};border-color:${d.color};">${on ? "✓" : ""}</span>
      <span>${esc(d.label)}</span><span class="mono dataset-toggle-coverage">${covLabel}</span></button>`;
  }).join("");
}

function metricInfo(kind, D) {
  if (state.metricHelp !== kind) return "";
  const datasetAverage = D.mode === "mode_a_dataset_average";
  if (kind === "percent" && datasetAverage) return `<div class="metric-popover">
    <button data-act="metric-help" data-v="percent" class="metric-popover-close" aria-label="Close formula">×</button>
    <div class="metric-popover-title">Dataset-average % expressing</div>
    <div class="metric-formula"><span>1</span><span class="formula-rule"></span><span>${fmt(D.agg.dataset_detection_total) || "D"}</span></div>
    <span class="metric-formula-times">× Σ</span>
    <div class="metric-fraction"><span># expressing cells</span><span></span><span># eligible cells</span></div>
    <span class="metric-formula-times">× 100</span>
    <p>Each selected dataset contributes its own percentage equally; the headline is their average.</p>
  </div>`;
  if (kind === "percent") return `<div class="metric-popover">
    <button data-act="metric-help" data-v="percent" class="metric-popover-close" aria-label="Close formula">×</button>
    <div class="metric-popover-title">Cell-pooled % expressing</div>
    <div class="metric-fraction metric-fraction-wide"><span>Σ expressing cells across selected datasets</span><span></span><span>Σ eligible cells across selected datasets</span></div>
    <span class="metric-formula-times">× 100</span>
    <p>Every eligible cell has equal weight, so larger datasets contribute more to the headline value.</p>
  </div>`;
  const meanFormula = datasetAverage
    ? `<div class="metric-formula"><span>1</span><span class="formula-rule"></span><span>${fmt(D.agg.dataset_detection_total) || "D"}</span></div><span class="metric-formula-times">× Σ</span><div class="metric-fraction"><span>dataset mean among positive cells</span><span></span><span>1</span></div>`
    : `<div class="metric-fraction metric-fraction-wide"><span>Σ log-normalized expression in all positive cells</span><span></span><span>Σ positive cells across selected datasets</span></div>`;
  return `<div class="metric-popover">
    <button data-act="metric-help" data-v="mean" class="metric-popover-close" aria-label="Close formula">×</button>
    <div class="metric-popover-title">${datasetAverage ? "Dataset-average" : "Cell-pooled"} mean expression when on</div>
    ${meanFormula}
    <p>Expression uses the verified Seurat LogNormalize layer in ${LOG_EXPRESSION_UNIT}. ${datasetAverage ? "Each dataset mean has equal weight." : "Each positive cell has equal weight."} This is not TPM because transcript length is not used. The bar is scaled to the largest positive-cell value in the selected data.</p>
  </div>`;
}

function aggregateCalculationControl(D) {
  const options = [
    ["mode_a_dataset_average", "Dataset average", "Each dataset counts equally"],
    ["mode_b_cell_pooled", "Cell pooled", "Each cell counts equally"],
  ];
  return `<div class="aggregate-calculation">
    <span class="aggregate-calculation-label">Calculation</span>
    <div class="aggregate-calculation-options" role="group" aria-label="Aggregate calculation method">
      ${options.map(([mode, label, description]) => {
        const active = D.mode === mode;
        return `<button data-act="agg" data-v="${mode}" class="aggregate-calculation-option${active ? " is-active" : ""}" aria-pressed="${active}">
          <strong>${label}</strong><span>${description}</span>
        </button>`;
      }).join("")}
    </div>
    ${D.sel.length === 1 ? `<small>Both methods are identical with one selected dataset.</small>` : ""}
  </div>`;
}

function chartScale(maxValue, maxCap = null) {
  const minimum = maxCap === 100 ? 1 : 0.1;
  const paddedMax = Math.max(minimum, maxValue * 1.12);
  const rawStep = paddedMax / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const factor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 2.5 ? 2.5 : normalizedStep <= 5 ? 5 : 10;
  const step = factor * magnitude;
  let axisMax = Math.max(step, Math.ceil(paddedMax / step) * step);
  if (maxCap != null) axisMax = Math.min(maxCap, axisMax);
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const ticks = Array.from({ length: Math.round(axisMax / step) + 1 }, (_, index) => index * step);
  return { axisMax, decimals, ticks };
}

function datasetSummaryChart({ rows, title, unit, axisTitle, valueDigits, maxCap, contextShort, geneSymbol }) {
  if (!rows.length) {
    return `<section class="dataset-chart-panel"><h3>${esc(title)}</h3><div class="dataset-chart-empty">No dataset has a defined value in this context.</div></section>`;
  }

  const svgW = 560, svgH = 440, left = 82, right = 30, top = 76, bottom = 76;
  const plotW = svgW - left - right, plotH = svgH - top - bottom;
  const values = rows.map((row) => row.value);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sampleVariance = values.length > 1
    ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
    : 0;
  const sem = values.length > 1 ? Math.sqrt(sampleVariance / values.length) : 0;
  const semLow = Math.max(0, mean - sem);
  const semHigh = maxCap == null ? mean + sem : Math.min(maxCap, mean + sem);
  const { axisMax, decimals: tickDigits, ticks: tickValues } = chartScale(Math.max(semHigh, ...values), maxCap);
  const ticks = tickValues.map((tick) => {
    const y = top + plotH - tick / axisMax * plotH;
    return `<line x1="${left}" y1="${y}" x2="${left + plotW}" y2="${y}" class="dataset-grid${tick === 0 ? " is-axis" : ""}"></line>
      <text x="${left - 14}" y="${y + 4}" text-anchor="end" class="dataset-tick">${tick.toFixed(tickDigits)}</text>`;
  }).join("");
  const centerX = left + plotW / 2;
  const yFor = (value) => top + plotH - value / axisMax * plotH;
  const meanY = yFor(mean), semHighY = yFor(semHigh), semLowY = yFor(semLow);
  const barWidth = Math.min(210, plotW * .38);
  const points = rows.map(({ dataset, value }) => {
    const y = yFor(value);
    const valueLabel = unit === "%" ? `${value.toFixed(valueDigits)}%` : `${value.toFixed(valueDigits)} ${unit}`;
    const hoverLabel = `${dataset.label} · ${valueLabel}`;
    const labelWidth = Math.max(114, hoverLabel.length * 6.5 + 20);
    const labelTop = y < top + 34 ? y + 18 : y - 47;
    return `<g class="dataset-point-group" tabindex="0" role="img" aria-label="${esc(dataset.label)}: ${esc(valueLabel)}">
      <title>${esc(hoverLabel)}</title>
      <circle cx="${centerX.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="${dataset.color}" class="dataset-point"></circle>
      <g class="dataset-point-label" transform="translate(${centerX.toFixed(1)} ${labelTop.toFixed(1)})">
        <rect x="${(-labelWidth / 2).toFixed(1)}" y="0" width="${labelWidth.toFixed(1)}" height="24" rx="6"></rect>
        <text x="0" y="16" text-anchor="middle">${esc(hoverLabel)}</text>
      </g>
    </g>`;
  }).join("");
  const summaryUnit = unit === "%" ? "%" : unit;
  const axisLabel = unit ? `${axisTitle} [${unit}]` : axisTitle;

  return `<section class="dataset-chart-panel">
    <svg viewBox="0 0 ${svgW} ${svgH}" role="img" aria-label="${esc(title)} for ${esc(geneSymbol)} with standard error and individual eligible datasets">
      <text x="${left + plotW / 2}" y="27" text-anchor="middle" class="dataset-chart-title">${esc(contextShort)} <tspan font-style="italic">${esc(geneSymbol)}</tspan> · ${esc(title)}</text>
      <text x="${left + plotW / 2}" y="52" text-anchor="middle" class="dataset-chart-subtitle">Mean ± SEM</text>
      ${ticks}<line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotH}" class="dataset-axis"></line>
      <text x="24" y="${top + plotH / 2}" text-anchor="middle" transform="rotate(-90 24 ${top + plotH / 2})" class="dataset-axis-title">${esc(axisLabel)}</text>
      <rect x="${(centerX - barWidth / 2).toFixed(1)}" y="${meanY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, top + plotH - meanY).toFixed(1)}" class="dataset-mean-bar"></rect>
      <line x1="${centerX}" y1="${semHighY.toFixed(1)}" x2="${centerX}" y2="${semLowY.toFixed(1)}" class="dataset-sem-whisker"></line>
      <line x1="${centerX - 24}" y1="${semHighY.toFixed(1)}" x2="${centerX + 24}" y2="${semHighY.toFixed(1)}" class="dataset-sem-cap"></line>
      <line x1="${centerX - 24}" y1="${semLowY.toFixed(1)}" x2="${centerX + 24}" y2="${semLowY.toFixed(1)}" class="dataset-sem-cap"></line>
      ${points}
      <text x="${centerX}" y="${top + plotH + 28}" text-anchor="middle" class="dataset-x-axis-title">Eligible selected datasets</text>
      <text x="${centerX}" y="${top + plotH + 55}" text-anchor="middle" class="dataset-sem-summary">Mean ${mean.toFixed(valueDigits)} · SEM ${sem.toFixed(valueDigits)} ${esc(summaryUnit)}</text>
    </svg>
  </section>`;
}

function viewByDataset(D) {
  const detailRows = D.sel.map((dataset) => {
    const metric = D.dsMetrics[dataset.id] || emptyMetric();
    return { dataset, metric, detectionValue: metric.percent_expressing, meanValue: metric.mean_expression_positive };
  });
  const detectionRows = detailRows
    .filter(({ metric, detectionValue }) => metric.eligible_cells > 0 && detectionValue != null)
    .map(({ dataset, detectionValue }) => ({ dataset, value: Number(detectionValue) }));
  const meanRows = detailRows
    .filter(({ metric, meanValue }) => metric.eligible_cells > 0 && meanValue != null)
    .map(({ dataset, meanValue }) => ({ dataset, value: Number(meanValue) }));
  const contextShort = D.region ? (ABBR[D.region] || D.region) : "Whole hypothalamus";
  const charts = [
    datasetSummaryChart({
      rows: detectionRows,
      title: "% expressing by dataset",
      unit: "% of eligible cells",
      axisTitle: "Expressing cells",
      valueDigits: 1,
      maxCap: 100,
      contextShort,
      geneSymbol: D.info.symbol,
    }),
    datasetSummaryChart({
      rows: meanRows,
      title: "Mean expression when on",
      unit: LOG_EXPRESSION_UNIT,
      axisTitle: "Mean expression",
      valueDigits: 2,
      maxCap: null,
      contextShort,
      geneSymbol: D.info.symbol,
    }),
  ].join("");
  const cards = detailRows.map(({ dataset, metric, detectionValue, meanValue }) => {
    const unavailable = D.region && metric.eligible_cells === 0;
    const value = Number(detectionValue || 0);
    return `<article class="dataset-detail-card">
      <div class="dataset-detail-title"><span style="background:${dataset.color};"></span><div><strong>${esc(dataset.label)}</strong><small>${esc(dataset.sub)}</small></div></div>
      ${unavailable ? `<div class="dataset-unavailable">No eligible cells in this context</div>` : `<div class="dataset-detail-body">
        <div class="dataset-mini-donut" style="background:conic-gradient(${dataset.color} 0 ${value.toFixed(3)}%,#eee8e3 ${value.toFixed(3)}% 100%);"><span>${value.toFixed(1)}%</span></div>
        <dl><div><dt>Cells expr.</dt><dd>${fmt(metric.positive_cells)} <span>of ${fmt(metric.eligible_cells)}</span></dd></div><div><dt>Mean expr.</dt><dd>${meanValue == null ? "Not detected" : Number(meanValue).toFixed(2)} <span class="dataset-expression-unit">${meanValue == null ? "" : LOG_EXPRESSION_UNIT}</span></dd></div></dl>
      </div>`}
    </article>`;
  }).join("");

  return `
    <div class="dataset-view-heading"><h2>Detection by dataset</h2><p>Per-dataset <i>${esc(D.info.symbol)}</i>+ fraction and expression within <b>${esc(D.contextName)}</b> cells.</p></div>
    <div class="dataset-toggles">${datasetToggles(D)}</div>
    ${detailRows.length ? `<div class="dataset-chart-grid">${charts}</div><div class="dataset-detail-grid">${cards}</div>` : `<div class="aggregate-empty">Select at least one dataset to populate this view.</div>`}`;
}

function coexpressionLabel(key, geneA, geneB) {
  const a = `<i>${esc(geneA)}</i>`;
  const b = `<i>${esc(geneB)}</i>`;
  return {
    both_positive: `${a}+ ${b}+`,
    gene_a_only: `${a}+ ${b}−`,
    gene_b_only: `${a}− ${b}+`,
    neither: `${a}− ${b}−`,
  }[key];
}

function coexpressionDonut(metric) {
  let cursor = 0;
  const stops = COEXPRESSION_QUADRANTS.map(({ key, color }) => {
    const value = metric.quadrant_percentages[key] || 0;
    const start = cursor;
    cursor += value;
    return `${color} ${start.toFixed(4)}% ${cursor.toFixed(4)}%`;
  });
  return `conic-gradient(${stops.join(",")})`;
}

function coexpressionPanel(population, geneA, geneB, reversed) {
  const lineage = LINEAGE_PREVIEW.find((item) => item.id === state.coexpressionLineage);
  const measured = orientCoexpression(selectedCoexpressionPopulation(population), reversed);
  const metric = lineage ? previewLineageMetric(lineage) : measured;
  if (!metric.eligible_cells) {
    return `<article class="coexpression-panel"><h3>${esc(population.label)}</h3><div class="coexpression-empty">No eligible cells in the selected datasets.</div></article>`;
  }
  const maxPercent = Math.max(...Object.values(metric.quadrant_percentages));
  const legend = COEXPRESSION_QUADRANTS.map(({ key, color }) => `
    <li><span class="coexpression-swatch" style="background:${color};"></span><span>${coexpressionLabel(key, geneA, geneB)}</span><b>${metric.quadrant_percentages[key].toFixed(2)}%</b><small>${fmt(metric.quadrant_counts[key])}</small></li>`).join("");
  const canExpand = !lineage && !state.region;
  const tile = (key) => {
    const value = metric.quadrant_percentages[key];
    const alpha = maxPercent ? .14 + .76 * value / maxPercent : .14;
    const active = state.expandedCoexpressionQuadrant === key;
    return `<button class="coexpression-tile${active ? " is-expanded" : ""}" data-act="coexpression-quadrant" data-v="${key}" aria-expanded="${active}" ${canExpand ? "" : "disabled"} style="background:rgba(37,99,166,${alpha.toFixed(3)});"><b>${value.toFixed(2)}%</b><small>${fmt(metric.quadrant_counts[key])} cells</small></button>`;
  };
  const breakdown = canExpand && state.expandedCoexpressionQuadrant
    ? lineageBreakdown(metric, state.expandedCoexpressionQuadrant, geneA, geneB, population.label)
    : "";
  return `<article class="coexpression-panel">
    <div class="coexpression-panel-heading">${lineageMockup(metric.eligible_cells)}</div>
    <div class="coexpression-panel-body">
      <div class="coexpression-figure">
        <div class="coexpression-donut" role="img" aria-label="Four-way ${esc(geneA)} and ${esc(geneB)} coexpression split among ${esc(population.label)}" style="background:${coexpressionDonut(metric)};"><div><strong>${fmt(metric.eligible_cells)}</strong><span>eligible cells</span></div></div>
        <ul class="coexpression-legend">${legend}</ul>
      </div>
      <div><div class="coexpression-matrix-help">${canExpand ? "Click a quadrant to expand its C7 lineage composition." : (lineage ? "Illustrative quadrant profile for this selected lineage." : "Choose Whole hypothalamus to expand quadrants into C7 lineages.")}</div><div class="coexpression-matrix" aria-label="Coexpression quadrant matrix">
        <span></span><b><i>${esc(geneB)}</i> +</b><b><i>${esc(geneB)}</i> −</b>
        <b><i>${esc(geneA)}</i> +</b>${tile("both_positive")}${tile("gene_a_only")}
        <b><i>${esc(geneA)}</i> −</b>${tile("gene_b_only")}${tile("neither")}
      </div></div>
    </div>
    ${breakdown}
  </article>`;
}

// UX-only lineage mock data. Replace with C7-stratified coexpression metrics
// when those are added to the metric export; this preview must not imply these
// counts are measured from the current datasets.
const LINEAGE_PREVIEW = [
  { id: "C7-1: GLU", count: 17279, color: "#2563a6" },
  { id: "C7-2: GABA", count: 13826, color: "#4f8dcc" },
  { id: "C7-4: Oligo+Precursor", count: 2194, color: "#78a9d5" },
  { id: "C7-3: Astro-Ependymal", count: 2102, color: "#9bbddd" },
  { id: "C7-5: Immune", count: 298, color: "#b9cfe2" },
  { id: "C7-7: Vascular", count: 170, color: "#d1deea" },
  { id: "C7-6: ParsTuber", count: 76, color: "#e4ebf1" },
];
const QUADRANT_PREVIEW = [
  { key: "both_positive", color: "#124e88", pct: 18 },
  { key: "gene_a_only", color: "#2f75b5", pct: 22 },
  { key: "gene_b_only", color: "#8bb9e1", pct: 16 },
  { key: "neither", color: "#e1e8ef", pct: 44 },
];

function previewLineageMetric(lineage) {
  const quadrantCounts = Object.fromEntries(QUADRANT_PREVIEW.map(({ key, pct }) => [key, Math.round(lineage.count * pct / 100)]));
  const adjustment = lineage.count - Object.values(quadrantCounts).reduce((sum, count) => sum + count, 0);
  quadrantCounts.neither += adjustment;
  return {
    eligible_cells: lineage.count,
    quadrant_counts: quadrantCounts,
    quadrant_percentages: Object.fromEntries(QUADRANT_PREVIEW.map(({ key }) => [key, quadrantCounts[key] / lineage.count * 100])),
  };
}

function lineageBreakdown(metric, key, geneA, geneB, populationLabel) {
  const target = metric.quadrant_counts[key];
  const base = LINEAGE_PREVIEW.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0, assigned = 0;
  const slices = LINEAGE_PREVIEW.map((item, i) => {
    const amount = i === LINEAGE_PREVIEW.length - 1 ? 100 - cursor : item.count / base * 100;
    const start = cursor; cursor += amount;
    return `${item.color} ${start.toFixed(3)}% ${cursor.toFixed(3)}%`;
  });
  const rows = LINEAGE_PREVIEW.map((item, index) => {
    const n = index === LINEAGE_PREVIEW.length - 1 ? target - assigned : Math.round(target * item.count / base);
    assigned += n;
    return `<li><span style="background:${item.color}"></span><span>${esc(item.id)}</span><b>${fmt(n)}</b></li>`;
  }).join("");
  const label = coexpressionLabel(key, geneA, geneB);
  return `<section class="lineage-breakdown"><div><h4>${label} · C7 lineage counts</h4><p>Illustrative split within ${esc(populationLabel)} · n = ${fmt(target)}</p><div class="lineage-pie" role="img" aria-label="Illustrative C7 lineage counts for ${esc(label.replace(/<[^>]*>/g, ""))}" style="background:conic-gradient(${slices.join(",")});"><span>${fmt(target)}<small>cells</small></span></div></div><ul>${rows}</ul></section>`;
}

function lineageMockup(total) {
  const lineage = LINEAGE_PREVIEW.find((item) => item.id === state.coexpressionLineage);
  const options = [`<option value="whole" ${!lineage ? "selected" : ""}>Whole hypothalamus cells</option>`, ...LINEAGE_PREVIEW.map((item) => `<option value="${esc(item.id)}" ${state.coexpressionLineage === item.id ? "selected" : ""}>${esc(item.id)}</option>`)].join("");
  return `<div class="lineage-selector-row"><label>Cell population<select data-act="lineage-select">${options}</select></label><span class="mono">n = ${fmt(total)}</span></div>`;
}

function viewCoexpression(D) {
  const { pilot, reversed } = currentCoexpressionPilot();
  if (!D.hypo) {
    return `<div class="coexpression-heading"><h2>Coexpression</h2><p>Region-level coexpression requires HypoMap region annotations.</p></div>
      <div class="aggregate-empty"><button data-act="source" data-v="hypomap" class="coexpression-source-button">Switch to HypoMap</button></div>`;
  }
  if (!pilot || pilot.state !== "resolved") {
    return `<div class="coexpression-heading"><h2>Coexpression</h2><p>The fixed pair is unavailable because one or more genes did not resolve.</p></div>`;
  }
  const geneA = D.info.symbol;
  const geneB = state.coexpressionPartner;
  const region = currentCoexpressionRegion();
  const regionLabel = currentCoexpressionRegionLabel();
  const selectedLineage = LINEAGE_PREVIEW.find((item) => item.id === state.coexpressionLineage);
  const population = currentCoexpressionPopulation(pilot);
  const suggestions = coexpressionPartnerSuggestions();
  const partnerDropdown = state.coexpressionPartnerMenuOpen ? `
    <div class="gene-menu coexpression-gene-menu" id="coexpression-gene-suggestions" role="listbox" aria-label="Available partner genes">
      ${suggestions.length ? suggestions.map((option, index) => {
        const aliasMatches = option.aliases.filter((alias) => alias.toLowerCase() !== option.symbol.toLowerCase());
        return `<button type="button" id="coexpression-gene-option-${index}" class="gene-option${index === state.coexpressionPartnerActiveIndex ? " is-active" : ""}" role="option" aria-selected="${index === state.coexpressionPartnerActiveIndex}" data-act="coexpression-select" data-v="${esc(option.gene)}">
          <span class="gene-option-copy"><span class="gene-option-symbol mono">${esc(option.symbol)}</span><span class="gene-option-name">${esc(option.name)}</span></span>
          ${aliasMatches.length ? `<span class="gene-option-alias mono">alias ${esc(aliasMatches.join(", "))}</span>` : ""}
        </button>`;
      }).join("") : `<div class="gene-menu-empty">No available partner matches “${esc(state.coexpressionPartnerQuery)}”</div>`}
      <div class="gene-menu-meta">${suggestions.length} partner gene${suggestions.length === 1 ? "" : "s"} available</div>
    </div>` : "";
  const missingRegion = D.sel.reduce((sum, dataset) => sum + Math.max(0, dataset.cells - (dataset.hypoRegion || 0)), 0);
  return `
    <div class="coexpression-heading">
      <div><h2>Coexpression · <i>${esc(geneA)}</i> × <i>${esc(geneB)}</i></h2><p>${selectedLineage ? "Illustrative coexpression profile for" : "Four-way raw-count detection among"} <b>${esc(selectedLineage?.id || regionLabel)} cells</b>${selectedLineage ? " · preview values" : ". Region selection follows the Overview map."}</p></div>
      <div class="coexpression-pair" aria-label="Coexpression gene pair">
        <label><small>Current gene</small><span class="coexpression-fixed-gene mono"><i>${esc(geneA)}</i></span></label>
        <span class="coexpression-times">×</span>
        <label><small>Partner gene</small><form data-act="coexpression-form" data-coexpression-picker class="coexpression-search"><input data-role="coexpression-input" value="${esc(state.coexpressionPartnerQuery)}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="coexpression-gene-suggestions" aria-expanded="${state.coexpressionPartnerMenuOpen}" ${state.coexpressionPartnerMenuOpen && suggestions.length ? `aria-activedescendant="coexpression-gene-option-${state.coexpressionPartnerActiveIndex}"` : ""}><button type="submit">Set</button>${partnerDropdown}</form></label>
      </div>
    </div>
    ${state.coexpressionMessage ? `<div class="coexpression-resolution-message">${esc(state.coexpressionMessage)}</div>` : ""}
    <div class="dataset-toggles coexpression-datasets">${datasetToggles(D)}</div>
    <div class="coexpression-method"><b>Cell pooled</b> · raw count ≥1 defines positivity · percentages are recomputed from integer counts after dataset filtering.</div>
    ${D.sel.length && population ? `<div class="coexpression-grid">${coexpressionPanel({ ...population, label: `${LINEAGE_PREVIEW.find((item) => item.id === state.coexpressionLineage)?.id || regionLabel} cells` }, geneA, geneB, reversed)}</div>` : `<div class="aggregate-empty">${D.sel.length ? "This selection has no assigned HypoMap region, so coexpression is unavailable." : "Select at least one dataset to populate this view."}</div>`}
    <div class="coexpression-coverage"><b>Preview interaction</b> · C7 lineage coexpression values and quadrant lineage splits are illustrative; the current export contains measured whole and region-level coexpression.</div>
    ${!selectedLineage ? `<div class="coexpression-coverage"><b>${fmt(missingRegion)}</b> selected cells lack a HypoMap region assignment and are ${region ? "excluded from this region denominator" : "included in the whole-hypothalamus denominator"}.</div>` : ""}
    ${population && !selectedLineage ? `<details class="coexpression-definitions"><summary>Population and quadrant definitions</summary><div><p><b>${esc(regionLabel)} cells:</b> <span class="mono">${esc(population.definition)}</span></p><p>Both+, gene-A-only, gene-B-only, and neither are exhaustive within this context. Positivity uses uncorrected raw detection.</p></div></details>` : ""}`;
}

function render() {
  const D = derive();
  const body = { overview: viewOverview, identity: viewIdentity, dataset: viewByDataset, coexpression: viewCoexpression }[state.tab](D);
  const footer = `
    <footer style="padding:13px 30px;border-top:1px solid #e8e4dc;background:#f9f8f4;border-radius:0 0 14px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <span style="font-size:11px;color:#a7a197;">${D.hypo ? `HypoMap atlas · CZ CELLxGENE d86517f0 · Steuernagel et al. 2022 · ${fmt(D.regionAssigned + D.annotNoRegion)} / ${fmt(D.total)} selected cells matched` : "Native study annotations · as deposited in GEO"}</span>
      <span class="mono" style="font-size:10px;color:#bdb7ac;">raw counts + verified Seurat LogNormalize · export ${esc(model.generated_on || "")}</span>
    </footer>`;
  document.getElementById("app").innerHTML =
    `<div class="wrap"><div class="card">${header(D)}${nav(D)}<main style="padding:26px 30px 34px;">${body}</main>${footer}</div></div>`;
}

function buildModel(data) {
  const genes = data.genes.filter((g) => g.state === "resolved");
  const aliases = new Map();
  const searchOptions = [];
  for (const gene of genes) {
    const names = new Set([gene.query, gene.resolver?.canonical_gene?.canonical_symbol]);
    for (const mapping of gene.resolver?.dataset_mappings || []) {
      names.add(mapping.alias_symbol);
      names.add(mapping.dataset_gene_symbol);
    }
    for (const name of names) if (name) aliases.set(String(name).toLowerCase(), gene.query);
    const canonical = gene.resolver?.canonical_gene || {};
    const symbol = canonical.canonical_symbol || gene.query;
    const local = GENE_BLURBS[symbol] || GENE_BLURBS[gene.query] || {};
    const optionAliases = [...names].filter(Boolean).map(String);
    searchOptions.push({
      gene: gene.query,
      symbol,
      name: local.name || canonical.marker_name || symbol,
      aliases: [...new Set(optionAliases)],
      searchText: [symbol, local.name, canonical.marker_name, ...optionAliases].filter(Boolean).join(" ").toLowerCase(),
    });
  }
  const coverage = Object.fromEntries((data.annotation_coverage?.datasets || []).map((d) => [d.dataset_id, d]));
  const datasets = DATASET_META.map((d) => {
    const c = coverage[d.id] || {};
    return {
      ...d,
      cells: c.total_cells || genes[0]?.metrics.whole_dataset.dataset_metrics[d.id]?.eligible_cells || 0,
      hypomap: c.nonblank_hypomap_C25 ?? null,
      hypoRegion: c.nonblank_hypomap_region ?? null,
    };
  });
  const coexpressionPilots = (data.coexpression_pilots || []).filter((pilot) => pilot.state === "resolved");
  const coexpressionGenes = [...new Set(coexpressionPilots.flatMap((pilot) => [pilot.gene_a, pilot.gene_b]))];
  return {
    generated_on: data.generated_on,
    genes,
    aliases,
    searchOptions,
    datasets,
    coexpressionPilots,
    coexpressionGenes,
  };
}

function selectGene(option, query = option.symbol) {
  state.gene = option.gene;
  state.geneQuery = option.symbol;
  state.geneMenuOpen = false;
  state.geneActiveIndex = 0;
  state.message = query.toLowerCase() !== option.symbol.toLowerCase() ? `${query} resolved to ${option.symbol}` : "";
  syncCoexpressionPartner(option.symbol);
}

function focusGeneInput(cursor = null, selectAll = false, keepClosed = false) {
  const input = document.querySelector("[data-role='gene-input']");
  if (!input) return;
  suppressGeneFocusOpen = keepClosed;
  input.focus();
  if (selectAll) input.select();
  else if (cursor != null) input.setSelectionRange(cursor, cursor);
}

function handleGeneSubmit() {
  const input = document.querySelector("[data-role='gene-input']");
  const query = input?.value.trim() || "";
  const resolved = model.aliases.get(query.toLowerCase());
  if (resolved) {
    const option = model.searchOptions.find((candidate) => candidate.gene === resolved);
    selectGene(option, query);
  } else {
    const suggestions = geneSuggestions(query);
    if (suggestions.length === 1) selectGene(suggestions[0], query);
    else {
      state.geneQuery = query;
      state.geneMenuOpen = true;
      state.geneActiveIndex = 0;
      state.message = `${query || "Gene"} is not available in this vertical slice`;
    }
  }
  render();
}

function focusCoexpressionInput(cursor = null, selectAll = false, keepClosed = false) {
  const input = document.querySelector("[data-role='coexpression-input']");
  if (!input) return;
  suppressCoexpressionFocusOpen = keepClosed;
  input.focus();
  if (selectAll) input.select();
  else if (cursor != null) input.setSelectionRange(cursor, cursor);
}

function handleCoexpressionSubmit() {
  const input = document.querySelector("[data-role='coexpression-input']");
  const query = input?.value.trim() || "";
  const currentSymbol = geneInfo(currentGene()).symbol;
  const resolved = model.aliases.get(query.toLowerCase());
  const exact = model.searchOptions.find((option) => option.gene === resolved && option.symbol !== currentSymbol);
  if (exact && model.coexpressionGenes.includes(exact.symbol)) {
    selectCoexpressionPartner(exact, query);
  } else {
    const suggestions = coexpressionPartnerSuggestions(query);
    if (suggestions.length === 1) selectCoexpressionPartner(suggestions[0], query);
    else {
      state.coexpressionPartnerQuery = query;
      state.coexpressionPartnerMenuOpen = true;
      state.coexpressionPartnerActiveIndex = 0;
      state.coexpressionMessage = query.toLowerCase() === currentSymbol.toLowerCase()
        ? "Choose a different gene for coexpression"
        : `${query || "Gene"} is not an available partner in this vertical slice`;
    }
  }
  render();
}

document.getElementById("app").addEventListener("submit", (e) => {
  if (e.target.closest("[data-act='gene-form']")) {
    e.preventDefault();
    handleGeneSubmit();
  } else if (e.target.closest("[data-act='coexpression-form']")) {
    e.preventDefault();
    handleCoexpressionSubmit();
  }
});

document.getElementById("app").addEventListener("focusin", (e) => {
  const geneInput = e.target.closest("[data-role='gene-input']");
  if (geneInput) {
    if (suppressGeneFocusOpen) {
      suppressGeneFocusOpen = false;
      return;
    }
    if (state.geneMenuOpen) return;
    state.geneQuery = geneInput.value;
    state.geneMenuOpen = true;
    state.geneActiveIndex = 0;
    render();
    focusGeneInput(null, true);
    return;
  }
  const partnerInput = e.target.closest("[data-role='coexpression-input']");
  if (!partnerInput) return;
  if (suppressCoexpressionFocusOpen) {
    suppressCoexpressionFocusOpen = false;
    return;
  }
  if (state.coexpressionPartnerMenuOpen) return;
  state.coexpressionPartnerQuery = partnerInput.value;
  state.coexpressionPartnerMenuOpen = true;
  state.coexpressionPartnerActiveIndex = 0;
  render();
  focusCoexpressionInput(null, true);
});

document.getElementById("app").addEventListener("input", (e) => {
  const geneInput = e.target.closest("[data-role='gene-input']");
  if (geneInput) {
    const cursor = geneInput.selectionStart;
    state.geneQuery = geneInput.value;
    state.geneMenuOpen = true;
    state.geneActiveIndex = 0;
    state.message = "";
    render();
    focusGeneInput(cursor);
    return;
  }
  const partnerInput = e.target.closest("[data-role='coexpression-input']");
  if (!partnerInput) return;
  const cursor = partnerInput.selectionStart;
  state.coexpressionPartnerQuery = partnerInput.value;
  state.coexpressionPartnerMenuOpen = true;
  state.coexpressionPartnerActiveIndex = 0;
  state.coexpressionMessage = "";
  render();
  focusCoexpressionInput(cursor);
});

document.getElementById("app").addEventListener("change", (e) => {
  if (!e.target.matches("[data-act='lineage-select']")) return;
  state.coexpressionLineage = e.target.value;
  state.region = null;
  state.expandedCoexpressionQuadrant = null;
  render();
});

document.getElementById("app").addEventListener("keydown", (e) => {
  if (e.target.closest("[data-role='gene-input']")) {
    const suggestions = geneSuggestions();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!suggestions.length) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      state.geneMenuOpen = true;
      state.geneActiveIndex = (state.geneActiveIndex + delta + suggestions.length) % suggestions.length;
      render();
      focusGeneInput(state.geneQuery.length);
    } else if (e.key === "Enter" && state.geneMenuOpen && suggestions.length) {
      e.preventDefault();
      selectGene(suggestions[Math.min(state.geneActiveIndex, suggestions.length - 1)], state.geneQuery);
      render();
      focusGeneInput(state.geneQuery.length, false, true);
    } else if (e.key === "Escape" && state.geneMenuOpen) {
      e.preventDefault();
      state.geneQuery = geneInfo(currentGene()).symbol;
      state.geneMenuOpen = false;
      state.geneActiveIndex = 0;
      render();
      focusGeneInput(state.geneQuery.length, false, true);
    }
    return;
  }
  if (!e.target.closest("[data-role='coexpression-input']")) return;
  const suggestions = coexpressionPartnerSuggestions();
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!suggestions.length) return;
    const delta = e.key === "ArrowDown" ? 1 : -1;
    state.coexpressionPartnerMenuOpen = true;
    state.coexpressionPartnerActiveIndex = (state.coexpressionPartnerActiveIndex + delta + suggestions.length) % suggestions.length;
    render();
    focusCoexpressionInput(state.coexpressionPartnerQuery.length);
  } else if (e.key === "Enter" && state.coexpressionPartnerMenuOpen && suggestions.length) {
    e.preventDefault();
    selectCoexpressionPartner(suggestions[Math.min(state.coexpressionPartnerActiveIndex, suggestions.length - 1)], state.coexpressionPartnerQuery);
    render();
    focusCoexpressionInput(state.coexpressionPartnerQuery.length, false, true);
  } else if (e.key === "Escape" && state.coexpressionPartnerMenuOpen) {
    e.preventDefault();
    state.coexpressionPartnerQuery = state.coexpressionPartner;
    state.coexpressionPartnerMenuOpen = false;
    state.coexpressionPartnerActiveIndex = 0;
    render();
    focusCoexpressionInput(state.coexpressionPartnerQuery.length, false, true);
  }
});

document.getElementById("app").addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) {
    let changed = false;
    if (state.provOpen) { state.provOpen = false; changed = true; }
    if (state.metricHelp) { state.metricHelp = null; changed = true; }
    if (state.geneMenuOpen && !e.target.closest("[data-gene-picker]")) {
      state.geneQuery = geneInfo(currentGene()).symbol;
      state.geneMenuOpen = false;
      state.geneActiveIndex = 0;
      changed = true;
    }
    if (state.coexpressionPartnerMenuOpen && !e.target.closest("[data-coexpression-picker]")) {
      state.coexpressionPartnerQuery = state.coexpressionPartner;
      state.coexpressionPartnerMenuOpen = false;
      state.coexpressionPartnerActiveIndex = 0;
      changed = true;
    }
    if (changed) render();
    return;
  }
  const act = el.getAttribute("data-act"), v = el.getAttribute("data-v");
  if (act !== "gene-select" && act !== "gene-form") {
    state.geneQuery = geneInfo(currentGene()).symbol;
    state.geneMenuOpen = false;
    state.geneActiveIndex = 0;
  }
  if (act !== "coexpression-select" && act !== "coexpression-form") {
    state.coexpressionPartnerQuery = state.coexpressionPartner;
    state.coexpressionPartnerMenuOpen = false;
    state.coexpressionPartnerActiveIndex = 0;
  }
  if (act !== "metric-help") state.metricHelp = null;
  switch (act) {
    case "gene-select": {
      const option = model.searchOptions.find((candidate) => candidate.gene === v);
      if (!option) return;
      selectGene(option, state.geneQuery);
      break;
    }
    case "coexpression-select": {
      const option = model.searchOptions.find((candidate) => candidate.gene === v);
      if (!option || option.symbol === geneInfo(currentGene()).symbol) return;
      selectCoexpressionPartner(option, state.coexpressionPartnerQuery);
      break;
    }
    case "tab":
      state.tab = v;
      if (v === "coexpression") {
        state.source = "hypomap";
      }
      break;
    case "metric-help": state.metricHelp = state.metricHelp === v ? null : v; break;
    case "source": state.source = v; state.region = v === "native" ? null : state.region; state.provOpen = false; break;
    case "prov": state.provOpen = !state.provOpen; break;
    case "dataset": state.datasets = { ...state.datasets, [v]: !state.datasets[v] }; break;
    case "region": state.region = state.region === v ? null : v; break;
    case "whole": state.region = null; break;
    case "res": state.resolution = v; break;
    case "agg": state.aggregation = v; break;
    case "node": { const ex = { ...state.expanded }; ex[v] ? delete ex[v] : ex[v] = true; state.expanded = ex; break; }
    case "coexpression-quadrant": state.expandedCoexpressionQuadrant = state.expandedCoexpressionQuadrant === v ? null : v; break;
    default: return;
  }
  e.stopPropagation();
  render();
});

document.getElementById("app").addEventListener("mouseover", (e) => {
  const el = e.target.closest("[data-hover]");
  const key = el ? el.getAttribute("data-hover") : null;
  if (key !== state.hoverRegion) { state.hoverRegion = key; render(); }
});
document.getElementById("app").addEventListener("mouseleave", () => {
  if (state.hoverRegion) { state.hoverRegion = null; render(); }
}, true);

async function main() {
  document.getElementById("app").innerHTML = `<div class="wrap"><div class="card" style="padding:30px;">Loading…</div></div>`;
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
  model = buildModel(await response.json());
  render();
}

main().catch((error) => {
  document.getElementById("app").innerHTML = `<div class="wrap"><div class="card" style="padding:30px;"><b>Could not load Gene Explorer.</b><br>${esc(error.message)}</div></div>`;
});
