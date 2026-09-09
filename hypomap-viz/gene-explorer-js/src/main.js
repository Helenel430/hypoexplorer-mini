const DATA_URL = "/data/gene_metrics_vertical_slice.json";

const DATASET_META = [
  { id: "GSE207736", label: "Dowsett10xnuc", sub: "GSE207736 · 10x snRNA-seq", native: 0, color: "#e3a092" },
  { id: "GSE172461", label: "Rupp10x", sub: "GSE172461 · 10x, per-cell metadata", native: 36523, color: "#ce6d5b" },
  { id: "GSE93374", label: "CampbellDropseq", sub: "GSE93374 · Drop-seq", native: 21086, color: "#a92d21" },
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
const TABS = [["overview", "Overview"], ["identity", "Cell Identity"], ["aggregate", "Aggregate"], ["dataset", "By dataset"], ["context", "Context"]];

const state = {
  tab: "overview",
  source: "hypomap",
  datasets: { GSE207736: true, GSE172461: false, GSE93374: false },
  region: null,
  resolution: "C25",
  aggregation: "mode_b_cell_pooled",
  gene: "Pomc",
  geneQuery: "Pomc",
  geneMenuOpen: false,
  geneActiveIndex: 0,
  expanded: { "C7-1: GLU": true },
  hoverRegion: null,
  provOpen: false,
  metricHelp: null,
  mapCounts: true,
  message: "",
};

let model = null;
let suppressGeneFocusOpen = false;

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
  return `Raw-count positive cells use raw_count ≥ 1. % expressing uses positive / eligible cells. Mean expression uses Seurat LogNormalize among positive cells only.`;
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
    return `<button data-act="agg" data-v="${mode}" style="display:flex;flex-direction:column;gap:1px;padding:6px 9px;border:none;border-right:1px solid #ddd7cc;cursor:pointer;background:${active ? "#b23b32" : "#fff"};color:${active ? "#fff" : "#7b756a"};font-size:11px;font-weight:700;">
      <span>${label}</span><span style="font-size:9px;font-weight:500;color:${active ? "#f0cfca" : "#b8b2a7"};">${sub}</span></button>`;
  };
  return `<div style="display:inline-flex;border:1px solid #ddd7cc;border-radius:8px;overflow:hidden;">${btn("mode_a_dataset_average", "Dataset avg", "equal")} ${btn("mode_b_cell_pooled", "Cell pooled", "pooled")}</div>`;
}

function header(D) {
  const opts = ["native", "hypomap"].map((k) => {
    const active = (k === "hypomap") === D.hypo;
    const cov = fmt0(k === "hypomap" ? D.covHypomap : D.covNative);
    return `<button data-act="source" data-v="${k}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 10px;border:none;cursor:pointer;font-size:12.5px;font-weight:600;${active ? "background:#b23b32;color:#fff;" : "background:#f6f4ef;color:#7b756a;"}">
      <span>${k === "hypomap" ? "HypoMap" : "Native"}</span>
      <span class="mono" style="font-size:9.5px;font-weight:600;${active ? "color:#f0cfca;" : "color:#b8b2a7;"}">${cov}</span></button>`;
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
        <span style="width:8px;height:8px;border-radius:50%;background:${D.hypo ? "#b23b32" : "#8a847a"};flex:none;"></span>
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
    return `<button data-act="tab" data-v="${k}" style="padding:13px 15px;border:none;background:none;cursor:pointer;font-size:13px;letter-spacing:-.005em;white-space:nowrap;font-weight:${active ? "700" : "500"};color:${active ? "#211f1b" : "#a7a197"};border-bottom:2px solid ${active ? "#b23b32" : "transparent"};margin-bottom:-1px;">${label}</button>`;
  }).join("");
  const whole = D.region ? `<button data-act="whole" style="flex:none;padding:4px 9px;border:1px solid #ddd7cc;border-radius:6px;background:#fff;font-size:11px;font-weight:600;color:#7b756a;cursor:pointer;white-space:nowrap;">↩ Whole</button>` : "";
  return `
  <nav style="position:sticky;top:59px;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 26px;background:rgba(255,255,255,.96);backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid #e8e4dc;">
    <div style="display:flex;align-items:stretch;gap:2px;">${tabs}</div>
    <div style="display:flex;align-items:center;gap:11px;min-width:0;">
      ${state.tab === "aggregate" || state.tab === "dataset" ? "" : aggregationControl(D)}
      <span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#bdb7ac;white-space:nowrap;">Viewing</span>
      <span style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px;">${esc(D.contextName)}</span>
      <span style="font-size:11px;color:#a7a197;white-space:nowrap;"><span class="mono" style="color:#b23b32;font-weight:600;">${fmt(D.contextTotal)}</span> cells</span>
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
      fill: `rgba(178,59,50,${a.toFixed(3)})`,
      stroke: on ? "#8f2c25" : (hov ? "#b23b32" : "rgba(122,40,34,.32)"),
      sw: (on || hov) ? 2.4 : 1.1,
      opacity: (hasContext && !on) ? 0.38 : 1,
      labelColor: a > 0.5 ? "#fff" : "#5a2b26",
      countColor: a > 0.5 ? "rgba(255,255,255,.82)" : "#8a5c53",
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
    ? `<div style="text-align:right;min-width:0;"><div style="font-size:11.5px;font-weight:700;color:#211f1b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(hov)}</div><div style="font-size:10.5px;color:#a7a197;"><span class="mono" style="color:#b23b32;">${fmt(hoverStats?.positive || 0)} ${esc(D.info.symbol)}+</span> · ${hoverStats?.percent == null ? "—" : `${Number(hoverStats.percent).toFixed(1)}% expressing`}</div></div>`
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
      <div style="flex:1;height:7px;border-radius:4px;background:linear-gradient(90deg,rgba(178,59,50,.13),rgba(178,59,50,.77));"></div>
      <span class="mono" style="font-size:10.5px;color:#a7a197;">${fmt(D.maxMappedRegionPositive)} ${esc(D.info.symbol)}+ cells</span>
    </div>
    <div style="padding:0 14px 10px;font-size:9.5px;color:#b0a99e;line-height:1.35;">Raw detections ≥1 count · not corrected for ambient RNA</div>
  </div>`;
}

function viewOverview(D) {
  const disabled = !D.regionEnabled;
  const cards = [
    { label: "% expressing", value: D.pctExpr == null ? "—" : Number(D.pctExpr).toFixed(1), unit: "%", sub: D.sel.length > 1 ? (D.mode === "mode_a_dataset_average" ? "dataset-average" : "cell-pooled") : "positive fraction", color: "#b23b32" },
    { label: "Positive cells", value: fmt(D.positive), unit: "cells", sub: `of ${fmt(D.contextTotal)} in context`, color: "#211f1b" },
    { label: "Mean expression", value: D.meanExpr == null ? "—" : Number(D.meanExpr).toFixed(2), unit: "log-norm", sub: "across positive cells", color: "#211f1b" },
    { label: "Detected in", value: `${D.agg.dataset_detection_count}/${D.agg.dataset_detection_total}`, unit: "datasets", sub: "present in selected deposits", color: "#211f1b" },
  ].map((m) => `<div style="border:1px solid #e8e4dc;border-radius:11px;padding:15px 16px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:9px;min-height:16px;">
        <span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#8a847a;">${m.label}</span>${computedBadge()}</div>
      <div style="display:flex;align-items:baseline;gap:4px;"><span class="mono" style="font-size:25px;font-weight:700;color:${m.color};letter-spacing:-.01em;">${m.value}</span><span style="font-size:12px;color:#a7a197;">${m.unit}</span></div>
      <div style="font-size:11px;color:#a7a197;margin-top:4px;line-height:1.35;">${m.sub}</div></div>`).join("");

  const left = disabled
    ? `<div style="border:1px dashed #ddd7cc;border-radius:12px;background:#faf9f6;padding:22px 20px;text-align:center;">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Spatial view needs HypoMap</div>
        <div style="font-size:11.5px;color:#8a6d47;line-height:1.55;margin-bottom:14px;">Nucleus placement comes from the HypoMap <span class="mono">hypomap_region</span> field. Native deposits carry only a study-level region.</div>
        <button data-act="source" data-v="hypomap" style="padding:8px 15px;border:none;border-radius:8px;background:#b23b32;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Switch to HypoMap</button></div>`
    : anatomyMap(D);

  const offRows = D.regionEnabled ? OFFMAP.map((name) => {
    const stats = D.regionStatsDisplay[name] || { eligible: 0, positive: 0, percent: null }, on = D.region === name, na = name === "Not assigned";
    const dot = na
      ? "width:11px;height:11px;border-radius:3px;flex:none;background-image:repeating-linear-gradient(45deg,#cbc6bd,#cbc6bd 3px,#bdb7ac 3px,#bdb7ac 6px);"
      : `width:11px;height:11px;border-radius:3px;flex:none;background:rgba(178,59,50,${rampAlpha(stats.positive, D.maxMappedRegionPositive).toFixed(3)});border:1px solid rgba(122,40,34,.3);`;
    return `<div data-act="region" data-v="${esc(name)}" style="display:flex;align-items:center;gap:9px;padding:5px 8px;border-radius:7px;cursor:pointer;background:${on ? "#f5e6e3" : "transparent"};">
      <span style="${dot}"></span>
      <span style="flex:1;font-size:11.5px;line-height:1.25;${on ? "font-weight:700;color:#b23b32;" : (na ? "color:#7b756a;" : "")}">${esc(name)}</span>
      <span class="mono" style="font-size:10px;color:#a7a197;">${fmt(stats.positive)} · ${stats.percent == null ? "—" : `${Number(stats.percent).toFixed(1)}%`}</span></div>`;
  }).join("") : "";
  const offBlock = D.regionEnabled ? `
    <div style="width:452px;margin-top:16px;">
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
    <div style="margin-top:22px;border:1px solid #e8e4dc;border-radius:11px;padding:16px 18px;background:#fbfaf7;width:922px;">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;">About this gene</div>
      <div style="font-size:12.5px;color:#7b756a;line-height:1.6;">${esc(D.info.blurb)}</div>
    </div>
    <div style="width:452px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8a847a;margin-top:20px;margin-bottom:9px;">Anatomy · click a nucleus to set context</div>
    <div style="display:flex;gap:30px;align-items:center;">
      <div style="width:452px;flex:none;">${left}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.5px;color:#a7a197;margin-bottom:22px;line-height:1.5;">Hypothalamus · Mus musculus · expression across <b style="color:#7b756a;">${esc(D.contextName)}</b>${D.contextPctLabel}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">${cards}</div>${unsupported}
      </div>
    </div>${offBlock}`;
}

function viewIdentity(D) {
  if (!D.regionEnabled) {
    return `<div style="font-size:18px;font-weight:700;margin-bottom:4px;">Which cell types</div>
      <div style="font-size:12.5px;color:#7b756a;margin-bottom:18px;line-height:1.5;">HypoMap lineage within <b style="color:#211f1b;">${esc(D.contextName)}</b>.</div>
      <div style="border:1px dashed #ddd7cc;background:#faf9f6;border-radius:11px;padding:22px;text-align:center;">
        <div style="font-size:12.5px;color:#8a6d47;line-height:1.55;max-width:440px;margin:0 auto 14px;">The C7 → C465 tree is a HypoMap integrated annotation, unavailable for native-only labels.</div>
        <button data-act="source" data-v="hypomap" style="padding:8px 15px;border:none;border-radius:8px;background:#b23b32;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Switch to HypoMap</button></div>`;
  }
  const resBtns = RES.map(([k, n]) => {
    const active = k === state.resolution;
    return `<button data-act="res" data-v="${k}" style="display:flex;align-items:center;gap:5px;padding:7px 11px;border:none;border-right:1px solid #ddd7cc;cursor:pointer;font-size:12px;font-weight:600;${active ? "background:#b23b32;color:#fff;" : "background:#fff;color:#7b756a;"}">${k}<span class="mono" style="font-size:9.5px;font-weight:400;${active ? "color:#f0cfca;" : "color:#b8b2a7;"}">${n}</span></button>`;
  }).join("");

  const tree = markTree(TREE_BASE, D.info.marks);
  let treeRows = "";
  const walk = (nodes, depth) => {
    for (const node of nodes) {
      const open = !!state.expanded[node.id], hasKids = node.kids && node.kids.length > 0;
      const caretStyle = `width:14px;flex:none;text-align:center;font-size:${hasKids ? 11 : 13}px;color:${hasKids ? "#b23b32" : "#cbc6bd"};`;
      const labelWeight = depth === 0 ? "font-weight:600;" : (depth === 1 ? "font-weight:500;color:#3a352d;" : "color:#7b756a;");
      const markSpan = node.mark ? `<span style="font-size:8.5px;font-weight:700;color:#b23b32;background:#f5e6e3;padding:1px 5px;border-radius:4px;margin-left:6px;">${esc(D.info.symbol)}⁺</span>` : "";
      treeRows += `<div ${hasKids ? `data-act="node" data-v="${esc(node.id)}"` : ""} style="display:flex;align-items:center;gap:7px;padding:6px 8px;padding-left:${8 + depth * 18}px;border-radius:6px;cursor:${hasKids ? "pointer" : "default"};background:${node.mark ? "#faf1ef" : "transparent"};">
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
      <div style="flex:1;min-width:0;"><div style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(label)}${mark ? `<span style="font-size:8.5px;font-weight:700;color:#b23b32;margin-left:5px;">${esc(D.info.symbol)}⁺</span>` : ""}</div>
      <div style="height:5px;border-radius:3px;background:#efece5;overflow:hidden;margin-top:4px;"><div style="height:100%;width:${(count / max * 100).toFixed(1)}%;background:#b23b32;"></div></div></div>
      <span class="mono" style="font-size:10.5px;width:48px;text-align:right;">${fmt(count)}</span>
      <span class="mono" style="font-size:10px;color:#a7a197;width:40px;text-align:right;">${denom ? (count / denom * 100).toFixed(1) : "—"}%</span></div>`;
  }).join("")}</div>` : `<div style="padding:20px 8px;text-align:center;"><div class="mono" style="font-size:22px;font-weight:700;color:#b23b32;">${resMeta[1]}</div>
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
    <p>Expression uses the verified Seurat LogNormalize layer. ${datasetAverage ? "Each dataset mean has equal weight." : "Each positive cell has equal weight."} The bar is scaled to the largest positive-cell value in the selected data.</p>
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

function viewAggregate(D) {
  const pooledPct = D.contextTotal ? D.positive / D.contextTotal * 100 : 0;
  const aggregatePct = D.agg.percent_expressing[D.mode];
  const aggregateMean = D.agg.mean_expression_positive[D.mode];
  const calculationLabel = D.mode === "mode_a_dataset_average" ? "dataset average" : "cell pooled";
  const selectedMetrics = Object.values(D.dsMetrics).filter((metric) => metric.eligible_cells > 0);
  const meanScale = Math.max(1, ...selectedMetrics.map((metric) =>
    Number(metric.expression_distribution?.quantiles?.max || metric.mean_expression_positive || 0)));
  const meanWidth = aggregateMean == null ? 0 : Math.min(100, Number(aggregateMean) / meanScale * 100);
  const selectionLabel = D.sel.length === model.datasets.length ? "all datasets" : "selected datasets";
  const empty = D.contextTotal === 0;

  return `
    <div class="aggregate-heading">
      <div><h2>Aggregate expression</h2><p><i>${esc(D.info.symbol)}</i> across <b>${esc(D.contextName)}</b> and ${D.sel.length} selected dataset${D.sel.length === 1 ? "" : "s"}.</p></div>
      <div class="aggregate-heading-meta">${computedBadge()}<span>${calculationLabel}</span></div>
    </div>
    ${aggregateCalculationControl(D)}
    ${empty ? `<div class="aggregate-empty">Select a dataset with eligible cells to view aggregate expression.</div>` : `<div class="aggregate-layout">
      <section class="aggregate-donut-panel" aria-label="${pooledPct.toFixed(1)} percent of cells express ${esc(D.info.symbol)}">
        <h3>Cells expressing — ${selectionLabel}</h3>
        <div class="aggregate-legend">
          <span><i style="background:#b93429;"></i><em>${esc(D.info.symbol)}</em> + <b>${pooledPct.toFixed(1)}%</b></span>
          <span class="is-negative"><i></i><em>${esc(D.info.symbol)}</em> − <b>${(100 - pooledPct).toFixed(1)}%</b></span>
        </div>
        <div class="aggregate-donut" style="background:conic-gradient(#b93429 0 ${pooledPct.toFixed(3)}%,#efddd9 ${pooledPct.toFixed(3)}% 100%);">
          <div><strong>${fmt(D.positive)}</strong><span>of ${fmt(D.contextTotal)} cells</span></div>
        </div>
        <p class="aggregate-donut-note">Absolute counts are always pooled across selected datasets.</p>
      </section>
      <section class="aggregate-summary">
        <div class="aggregate-cards">
          <article class="aggregate-card">
            <div class="aggregate-card-label">% <i>${esc(D.info.symbol)}</i>+ · ${calculationLabel}</div>
            <button data-act="metric-help" data-v="percent" class="metric-help" aria-expanded="${state.metricHelp === "percent"}" aria-label="Explain aggregate percentage">?</button>
            <div class="aggregate-percent">${aggregatePct == null ? "—" : `${Number(aggregatePct).toFixed(1)}%`}</div>
            ${metricInfo("percent", D)}
          </article>
          <article class="aggregate-card">
            <div class="aggregate-card-label">Mean expr. (when on)</div>
            <button data-act="metric-help" data-v="mean" class="metric-help" aria-expanded="${state.metricHelp === "mean"}" aria-label="Explain mean expression">?</button>
            <div class="aggregate-mean"><strong>${aggregateMean == null ? "—" : Number(aggregateMean).toFixed(2)}</strong><span>/ ${meanScale.toFixed(2)}</span></div>
            <div class="aggregate-mean-track"><span style="width:${meanWidth.toFixed(1)}%;"></span></div>
            ${metricInfo("mean", D)}
          </article>
        </div>
        <div class="detection-chip">Detected in <b>${D.agg.dataset_detection_count}</b> / <b>${D.agg.dataset_detection_total}</b> datasets</div>
      </section>
    </div>`}`;
}

function viewByDataset(D) {
  const rows = D.sel.map((dataset) => {
    const metric = D.dsMetrics[dataset.id] || emptyMetric();
    return { dataset, metric, value: Number(metric.percent_expressing || 0) };
  });
  const svgW = 1120, svgH = 430, left = 82, right = 30, top = 76, bottom = 70;
  const plotW = svgW - left - right, plotH = svgH - top - bottom;
  const contextShort = D.region ? (ABBR[D.region] || D.region) : "Whole hypothalamus";
  const mean = rows.length ? rows.reduce((sum, row) => sum + row.value, 0) / rows.length : 0;
  const sampleVariance = rows.length > 1
    ? rows.reduce((sum, row) => sum + (row.value - mean) ** 2, 0) / (rows.length - 1)
    : 0;
  const sem = rows.length > 1 ? Math.sqrt(sampleVariance / rows.length) : 0;
  const semLow = Math.max(0, mean - sem), semHigh = Math.min(100, mean + sem);
  const highestValue = Math.max(semHigh, ...rows.map((row) => row.value));
  const paddedMax = Math.max(1, highestValue * 1.12);
  const tickStep = paddedMax <= 10 ? 2 : paddedMax <= 25 ? 5 : paddedMax <= 50 ? 10 : 20;
  const axisMax = Math.min(100, Math.max(tickStep, Math.ceil(paddedMax / tickStep) * tickStep));
  const tickValues = Array.from({ length: Math.round(axisMax / tickStep) + 1 }, (_, index) => index * tickStep);
  const ticks = tickValues.map((tick) => {
    const y = top + plotH - tick / axisMax * plotH;
    return `<line x1="${left}" y1="${y}" x2="${left + plotW}" y2="${y}" class="dataset-grid${tick === 0 ? " is-axis" : ""}"></line>
      <text x="${left - 14}" y="${y + 4}" text-anchor="end" class="dataset-tick">${tick}</text>`;
  }).join("");
  const centerX = left + plotW / 2;
  const meanY = top + plotH - mean / axisMax * plotH;
  const semHighY = top + plotH - semHigh / axisMax * plotH;
  const semLowY = top + plotH - semLow / axisMax * plotH;
  const barWidth = Math.min(260, plotW * .3);
  const pointSpread = Math.min(82, barWidth / Math.max(rows.length, 2));
  const points = rows.map(({ dataset, value }, index) => {
    const x = centerX + (index - (rows.length - 1) / 2) * pointSpread;
    const y = top + plotH - value / axisMax * plotH;
    const hoverLabel = `${dataset.label} · ${value.toFixed(1)}%`;
    const labelWidth = Math.max(114, hoverLabel.length * 7.1 + 20);
    const labelTop = y < top + 34 ? y + 18 : y - 47;
    return `<g class="dataset-point-group" tabindex="0" role="img" aria-label="${esc(dataset.label)}: ${value.toFixed(1)} percent expressing">
      <title>${esc(hoverLabel)}</title>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="${dataset.color}" class="dataset-point"></circle>
      <g class="dataset-point-label" transform="translate(${x.toFixed(1)} ${labelTop.toFixed(1)})">
        <rect x="${(-labelWidth / 2).toFixed(1)}" y="0" width="${labelWidth.toFixed(1)}" height="24" rx="6"></rect>
        <text x="0" y="16" text-anchor="middle">${esc(hoverLabel)}</text>
      </g>
    </g>`;
  }).join("");
  const cards = rows.map(({ dataset, metric, value }) => {
    const unavailable = D.region && metric.eligible_cells === 0;
    return `<article class="dataset-detail-card">
      <div class="dataset-detail-title"><span style="background:${dataset.color};"></span><div><strong>${esc(dataset.label)}</strong><small>${esc(dataset.sub)}</small></div></div>
      ${unavailable ? `<div class="dataset-unavailable">No eligible cells in this context</div>` : `<div class="dataset-detail-body">
        <div class="dataset-mini-donut" style="background:conic-gradient(${dataset.color} 0 ${value.toFixed(3)}%,#eee8e3 ${value.toFixed(3)}% 100%);"><span>${value.toFixed(1)}%</span></div>
        <dl><div><dt>Cells expr.</dt><dd>${fmt(metric.positive_cells)} <span>/ ${fmt(metric.eligible_cells)}</span></dd></div><div><dt>Mean expr.</dt><dd>${metric.mean_expression_positive == null ? "—" : Number(metric.mean_expression_positive).toFixed(2)}</dd></div></dl>
      </div>`}
    </article>`;
  }).join("");

  return `
    <div class="dataset-view-heading"><h2>Detection by dataset</h2><p>Per-dataset <i>${esc(D.info.symbol)}</i>+ fraction and expression within <b>${esc(D.contextName)}</b> cells.</p></div>
    <div class="dataset-toggles">${datasetToggles(D)}</div>
    ${rows.length ? `<div class="dataset-chart-wrap">
      <svg viewBox="0 0 ${svgW} ${svgH}" role="img" aria-label="Mean percent ${esc(D.info.symbol)} positive with standard error and individual selected datasets">
        <text x="${left + plotW / 2}" y="28" text-anchor="middle" class="dataset-chart-title">${esc(contextShort)} <tspan font-style="italic">${esc(D.info.symbol)}</tspan>+ detection</text>
        <text x="${left + plotW / 2}" y="49" text-anchor="middle" class="dataset-chart-subtitle">Bar = selected-dataset mean · error bars = ±SEM · hover points for dataset details</text>
        ${ticks}<line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotH}" class="dataset-axis"></line>
        <text x="24" y="${top + plotH / 2}" text-anchor="middle" transform="rotate(-90 24 ${top + plotH / 2})" class="dataset-axis-title">% ${esc(D.info.symbol)}+</text>
        <rect x="${(centerX - barWidth / 2).toFixed(1)}" y="${meanY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, top + plotH - meanY).toFixed(1)}" class="dataset-mean-bar"></rect>
        <line x1="${centerX}" y1="${semHighY.toFixed(1)}" x2="${centerX}" y2="${semLowY.toFixed(1)}" class="dataset-sem-whisker"></line>
        <line x1="${centerX - 24}" y1="${semHighY.toFixed(1)}" x2="${centerX + 24}" y2="${semHighY.toFixed(1)}" class="dataset-sem-cap"></line>
        <line x1="${centerX - 24}" y1="${semLowY.toFixed(1)}" x2="${centerX + 24}" y2="${semLowY.toFixed(1)}" class="dataset-sem-cap"></line>
        ${points}
        <text x="${centerX}" y="${top + plotH + 34}" text-anchor="middle" class="dataset-sem-summary">Mean ${mean.toFixed(1)}% · SEM ${sem.toFixed(1)}%</text>
      </svg>
    </div><div class="dataset-detail-grid">${cards}</div>` : `<div class="aggregate-empty">Select at least one dataset to populate this view.</div>`}`;
}

function viewContext(D) {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
      <span style="font-size:18px;font-weight:700;letter-spacing:-.01em;">Baseline coexpression</span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#fff;background:#c19a4e;padding:3px 7px;border-radius:5px;">Next</span></div>
    <div style="font-size:12.5px;color:#7b756a;margin-bottom:18px;line-height:1.5;">Gene context for <span class="mono">${esc(D.info.symbol)}</span>. More context analyses (differential coexpression, pathways, gene programs) will land here later.</div>
    <div style="border:1px dashed #ddd7cc;border-radius:11px;padding:20px 22px;background:#faf9f6;">
      <div style="font-size:12.5px;color:#7b756a;line-height:1.6;max-width:640px;">The gene-pair workflow inherits everything set elsewhere — the active <b style="color:#211f1b;">annotation source</b>, the <b style="color:#211f1b;">${esc(D.contextName)}</b> context, and the cluster <b style="color:#211f1b;">resolution</b>. Coexpression values are not computed until their canonical denominator and quadrant formulas are specified.</div>
    </div>`;
}

function render() {
  const D = derive();
  const body = { overview: viewOverview, identity: viewIdentity, aggregate: viewAggregate, dataset: viewByDataset, context: viewContext }[state.tab](D);
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
  return {
    generated_on: data.generated_on,
    genes,
    aliases,
    searchOptions,
    datasets,
  };
}

function selectGene(option, query = option.symbol) {
  state.gene = option.gene;
  state.geneQuery = option.symbol;
  state.geneMenuOpen = false;
  state.geneActiveIndex = 0;
  state.message = query.toLowerCase() !== option.symbol.toLowerCase() ? `${query} resolved to ${option.symbol}` : "";
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

document.getElementById("app").addEventListener("submit", (e) => {
  if (e.target.closest("[data-act='gene-form']")) {
    e.preventDefault();
    handleGeneSubmit();
  }
});

document.getElementById("app").addEventListener("focusin", (e) => {
  const input = e.target.closest("[data-role='gene-input']");
  if (input && suppressGeneFocusOpen) {
    suppressGeneFocusOpen = false;
    return;
  }
  if (!input || state.geneMenuOpen) return;
  state.geneQuery = input.value;
  state.geneMenuOpen = true;
  state.geneActiveIndex = 0;
  render();
  focusGeneInput(null, true);
});

document.getElementById("app").addEventListener("input", (e) => {
  const input = e.target.closest("[data-role='gene-input']");
  if (!input) return;
  const cursor = input.selectionStart;
  state.geneQuery = input.value;
  state.geneMenuOpen = true;
  state.geneActiveIndex = 0;
  state.message = "";
  render();
  focusGeneInput(cursor);
});

document.getElementById("app").addEventListener("keydown", (e) => {
  if (!e.target.closest("[data-role='gene-input']")) return;
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
    if (changed) render();
    return;
  }
  const act = el.getAttribute("data-act"), v = el.getAttribute("data-v");
  if (act !== "gene-select" && act !== "gene-form") {
    state.geneQuery = geneInfo(currentGene()).symbol;
    state.geneMenuOpen = false;
    state.geneActiveIndex = 0;
  }
  if (act !== "metric-help") state.metricHelp = null;
  switch (act) {
    case "gene-select": {
      const option = model.searchOptions.find((candidate) => candidate.gene === v);
      if (!option) return;
      selectGene(option, state.geneQuery);
      break;
    }
    case "tab": state.tab = v; break;
    case "metric-help": state.metricHelp = state.metricHelp === v ? null : v; break;
    case "source": state.source = v; state.region = v === "native" ? null : state.region; state.provOpen = false; break;
    case "prov": state.provOpen = !state.provOpen; break;
    case "dataset": state.datasets = { ...state.datasets, [v]: !state.datasets[v] }; break;
    case "region": state.region = state.region === v ? null : v; break;
    case "whole": state.region = null; break;
    case "res": state.resolution = v; break;
    case "agg": state.aggregation = v; break;
    case "node": { const ex = { ...state.expanded }; ex[v] ? delete ex[v] : ex[v] = true; state.expanded = ex; break; }
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
