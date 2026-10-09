import { GENE_BLURBS } from "../gene-descriptions.mjs";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { openNavigationExport } from '../public/navigation-export-client.mjs';
import { datasetMetrics, poolMetrics, spatialContexts, recommendationQuadrants, c7Population } from '../public/navigation-metrics.mjs';

const exportRoot = new URL('../../../navigation_export/', import.meta.url);
const requests = [];
globalThis.fetch = async url => {
  const name = new URL(url).pathname.split('/').pop();
  requests.push(name);
  return new Response(readFileSync(new URL(name, exportRoot)));
};
globalThis.location = { href: 'http://localhost/navigation-prototype.html' };
const data = await openNavigationExport('./navigation_export/');
const pomc = data.resolve('Pomc').candidates[0];
const { record } = await data.gene(pomc.index);
const rows = datasetMetrics(data.metadata, record);
assert.deepEqual(rows.map(row => row.positive), [5736, 6819, 4248]);
assert.deepEqual(rows.map(row => row.eligible), [39953, 41156, 21086]);
const pooled = poolMetrics(rows);
assert.equal(pooled.positive, 16803);
assert.equal(pooled.eligible, 102195);
assert.equal(pooled.percentExpressing, 100 * 16803 / 102195);
assert.equal(pooled.meanWhenDetected, (6719.7337614148855 + 8730.237195789814 + 9318.24841761589) / 16803);
const arc = poolMetrics(datasetMetrics(data.metadata, record, spatialContexts.ARC));
assert.equal(arc.positive, 1276 + 1178 + 1973);
assert.equal(arc.eligible, 6318 + 5103 + 5946);
await data.gene(pomc.index);
assert.equal(requests.filter(name => name.startsWith('genes-')).length, 1);
assert.ok(!requests.includes('recommendations.json.gz'));

// Unsupported mappings must not enter pooled denominators or become zero values.
const unsupported = structuredClone(record);
unsupported[1][0] = null; unsupported[2][0] = null;
unsupported[1][1] = { state: 'duplicate_dataset_mapping' }; unsupported[2][1] = null;
const unsupportedRows = datasetMetrics(data.metadata, unsupported);
assert.equal(unsupportedRows[0].percentExpressing, null);
assert.equal(unsupportedRows[1].state, 'duplicate_dataset_mapping');
assert.equal(poolMetrics(unsupportedRows).eligible, 21086);
const zero = structuredClone(record);
zero[2] = zero[2].map(stats => [stats[0].map(() => 0), stats[1].map(() => 0)]);
assert.equal(poolMetrics(datasetMetrics(data.metadata, zero)).percentExpressing, 0);
assert.equal(poolMetrics(datasetMetrics(data.metadata, zero)).meanWhenDetected, null);
const emptyContext = datasetMetrics(data.metadata, record, 'Periventricular hypothalamic nucleus, intermediate part');
assert.equal(emptyContext[2].state, 'no_eligible_cells');
assert.equal(emptyContext[2].percentExpressing, null);

// Exercise the actual page renderer and async navigation without starting the preview.
const app = { innerHTML: '', attributes:{}, setAttribute(key,value){this.attributes[key]=value}, addEventListener() {} };
const document = { querySelector: () => app, querySelectorAll: () => [] };
const context = vm.createContext({ document, location: { href: globalThis.location.href, search: '' },
  history: { replaceState() {} }, URL, URLSearchParams, console,
  GENE_BLURBS, openNavigationExport: async () => data, datasetMetrics, poolMetrics, spatialContexts, recommendationQuadrants, c7Population });
const html = readFileSync(new URL('../public/navigation-prototype.html', import.meta.url), 'utf8');
const source = html.split('<script type="module">')[1].split('</script>')[0].replace(/^import .*;$/gm, '');
vm.runInContext(source, context);
await vm.runInContext("openGene('Cyr61')", context);
assert.match(app.innerHTML, /Resolved Cyr61 to Ccn1/);
assert.match(app.innerHTML, /matched as Cyr61/);
assert.doesNotMatch(app.innerHTML, /illustrative placeholders/);
await vm.runInContext("openGene('Pomc')", context);
assert.match(app.innerHTML, /16,803/);
assert.match(app.innerHTML, /102,195/);
assert.match(app.innerHTML, /ARC · Arcuate hypothalamic nucleus/);
vm.runInContext("selectedDatasets=['GSE207736'];page='breakdown';render()", context);
assert.match(app.innerHTML, /5,736/);
assert.doesNotMatch(app.innerHTML, /NaN|Infinity/);
vm.runInContext("geneRecord=" + JSON.stringify(zero) + ";render()", context);
assert.match(app.innerHTML, /No available dataset values/);
assert.doesNotMatch(app.innerHTML, /NaN|Infinity/);
// Recommendation identity lookup does not download partner expression shards.
const shardsBeforeRecommendations = requests.filter(name => name.startsWith('genes-')).length;
const recommendations = await data.recommendations(pomc.index);
assert.equal(recommendations[2], 16803);
assert.deepEqual(recommendations[3][0], [26112, 16781]);
assert.equal(data.identity(recommendations[3][0][0]).symbol, 'Malat1');
assert.equal(requests.filter(name => name.startsWith('genes-')).length, shardsBeforeRecommendations);
assert.equal(requests.filter(name => name === 'recommendations.json.gz').length, 1);
await vm.runInContext("openGene('Pomc')", context);
assert.match(app.innerHTML, /99\.9% of Pomc-positive cells also detect Malat1/);
assert.match(app.innerHTML, /16,781 \/ 16,803 cells/);
for (const label of ['Dowsett10xnuc', 'Rupp10x', 'CampbellDropseq']) assert.ok(app.innerHTML.includes(label));
assert.doesNotMatch(app.innerHTML, /Pending checkpoint 3|r =/);
await vm.runInContext("comparePartner('malat1')", context);
assert.match(app.innerHTML, /Pomc → Malat1/);
assert.match(app.innerHTML, /16,781 \/ 16,803 query-positive cells/);
vm.runInContext("comparePartner('Agrp')", context);
assert.match(app.innerHTML, /Pair score unavailable/);
vm.runInContext("comparePartner('linc1405')", context);
assert.match(app.innerHTML, /Select a partner/);
vm.runInContext("comparePartner('not-a-real-gene-xyz')", context);
assert.match(app.innerHTML, /No exported gene found/);
assert.equal(requests.filter(name => name === 'recommendations.json.gz').length, 1);

// Recommendation errors leave expression visible and can be retried.
const originalRecommendations = data.recommendations;
data.recommendations = async () => { throw new Error('Simulated recommendation failure'); };
const originalConsoleError = console.error;
console.error = () => {};
await vm.runInContext('loadRecommendations()', context);
console.error = originalConsoleError;
assert.match(app.innerHTML, /Could not load recommendations/);
assert.match(app.innerHTML, /16,803/);
data.recommendations = originalRecommendations;
await vm.runInContext('loadRecommendations()', context);
assert.match(app.innerHTML, /99\.9% of Pomc-positive cells also detect Malat1/);

// A delayed old-gene response cannot overwrite a newer selection.
let deliverOld;
data.recommendations = () => new Promise(resolve => { deliverOld = resolve; });
const oldLoad = vm.runInContext('loadRecommendations()', context);
data.recommendations = originalRecommendations;
await vm.runInContext("openGene('Agrp')", context);
deliverOld(recommendations);
await oldLoad;
assert.match(app.innerHTML, /Agrp-positive cells also detect Malat1/);
assert.match(app.innerHTML, /29,451 \/ 29,471 cells/);
assert.doesNotMatch(app.innerHTML, /Pomc-positive cells/);

// Short lists and zero-positive records stay short and have no invented scores.
vm.runInContext("recommendationRecord=[selectedIdentity.index,[0],0,[]];render()", context);
assert.match(app.innerHTML, /conditional co-detection is undefined/);
vm.runInContext("recommendationRecord=[selectedIdentity.index,[0],10,[[26112,5]]];selectedPartner=null;render()", context);
assert.equal((app.innerHTML.match(/data-partner-index=/g) || []).length, 1);
assert.match(app.innerHTML, /50\.0% of Agrp-positive cells also detect Malat1/);
assert.doesNotMatch(app.innerHTML, /NaN|Infinity/);
// Real missing and zero-expression genes have distinct presentations.
await vm.runInContext("openGene('not-a-real-gene-xyz')", context);
assert.match(app.innerHTML, /Gene not found/);
assert.match(app.innerHTML, /missing gene does not mean zero expression/);
assert.match(app.innerHTML, /value="not-a-real-gene-xyz"/);
assert.doesNotMatch(app.innerHTML, /expressing-donut|partner-option/);
assert.equal(app.attributes['aria-busy'], 'false');
await vm.runInContext("openGene('Platr11')", context);
assert.match(app.innerHTML, /No expression detected/);
assert.match(app.innerHTML, /81,109 eligible cells in 2 supported datasets/);
assert.match(app.innerHTML, /Some datasets are unavailable/);
assert.match(app.innerHTML, /Mean expression is undefined/);
assert.match(app.innerHTML, /conditional co-detection is undefined/);
assert.match(app.innerHTML, /style="fill:#526575"/);
assert.doesNotMatch(app.innerHTML, /NaN|Infinity|Unavailable%/);

// Shard loading removes old metrics, reports busy, and recovers after failure.
const originalGene = data.gene;
let releaseShard;
data.gene = () => new Promise((resolve,reject) => { releaseShard = {resolve,reject}; });
const shardLoad = vm.runInContext("openGene('Pomc')", context);
await new Promise(resolve => setImmediate(resolve));
assert.match(app.innerHTML, /Loading expression for Pomc/);
assert.equal(app.attributes['aria-busy'], 'true');
assert.doesNotMatch(app.innerHTML, /expressing-donut/);
console.error = () => {};
releaseShard.reject(new Error('Simulated shard failure'));
await shardLoad;
console.error = originalConsoleError;
assert.match(app.innerHTML, /Data could not be loaded/);
assert.match(app.innerHTML, /data-search-retry/);
assert.equal(app.attributes['aria-busy'], 'false');
data.gene = originalGene;
await vm.runInContext('retrySearch()', context);
assert.match(app.innerHTML, /16,803/);
assert.doesNotMatch(app.innerHTML, /Data could not be loaded/);

// A late shard cannot replace a newer query or clear its missing-gene state.
data.gene = () => new Promise(resolve => { releaseShard = {resolve}; });
const staleShard = vm.runInContext("openGene('Pomc')", context);
await new Promise(resolve => setImmediate(resolve));
await vm.runInContext("openGene('not-a-real-gene-xyz')", context);
releaseShard.resolve({record});await staleShard;
assert.match(app.innerHTML, /Gene not found/);
assert.doesNotMatch(app.innerHTML, /expressing-donut/);
data.gene = originalGene;

// Initial index loading and failure can be retried without reloading the page.
const retryApp = { innerHTML:'', attributes:{}, setAttribute(key,value){this.attributes[key]=value}, addEventListener(){} };
let rejectIndex;
let indexAttempts = 0;
const retryContext = vm.createContext({ document:{querySelector:()=>retryApp,querySelectorAll:()=>[]},
  location:{href:globalThis.location.href,search:''},history:{replaceState(){}},URL,URLSearchParams,
  console:{...console,error(){}},GENE_BLURBS,datasetMetrics,poolMetrics,spatialContexts,recommendationQuadrants,c7Population,
  openNavigationExport:()=> { indexAttempts++;return indexAttempts===1?new Promise((resolve,reject)=>{rejectIndex=reject}):Promise.resolve(data); } });
vm.runInContext(source, retryContext);
assert.match(retryApp.innerHTML, /Loading gene index/);
assert.equal(retryApp.attributes['aria-busy'], 'true');
rejectIndex(new Error('Simulated index failure'));
await new Promise(resolve=>setImmediate(resolve));
assert.match(retryApp.innerHTML, /Could not load the gene index/);
await vm.runInContext('retrySearch()',retryContext);
assert.equal(indexAttempts,2);
assert.equal(retryApp.attributes['aria-busy'],'false');
assert.doesNotMatch(retryApp.innerHTML, /Data could not be loaded|Loading gene index/);
// Top 5 intersections plus same-population partner marginals recover all four quadrants.
const malat = await data.gene(26112);
const quadrants = recommendationQuadrants(data.metadata,recommendations,malat.record);
assert.deepEqual(quadrants.counts,{both:16781,queryOnly:22,partnerOnly:85198,neither:194});
assert.equal(quadrants.eligible,102195);
assert.equal(Object.values(quadrants.counts).reduce((a,b)=>a+b,0),102195);
assert.ok(Math.abs(Object.values(quadrants.percentages).reduce((a,b)=>a+b,0)-100)<1e-10);
const subsetRecommendation=[pomc.index,[0],5736,[[26112,5736]]];
const subsetQuadrants=recommendationQuadrants(data.metadata,subsetRecommendation,malat.record);
assert.equal(subsetQuadrants.eligible,39953);
assert.deepEqual(subsetQuadrants.counts,{both:5736,queryOnly:0,partnerOnly:34217,neither:0});
assert.throws(()=>recommendationQuadrants(data.metadata,[pomc.index,[0],1,[[26112,2]]],malat.record),/Invalid pair counts/);
await vm.runInContext("openGene('Pomc')",context);
await vm.runInContext("comparePartner('Malat1')",context);
assert.match(app.innerHTML,/Pomc × Malat1/);
assert.match(app.innerHTML,/85,198/);
assert.match(app.innerHTML,/Neither detected/);
vm.runInContext("openMetricHelp='pair-method';render()",context);
assert.match(app.innerHTML,/All eligible cells/);
assert.match(app.innerHTML,/Cells detecting both genes/);
vm.runInContext('openMetricHelp=null;render()',context);

// Partner load failures recover, and late responses cannot change another selected pair.
data.gene=async()=>{throw new Error('Simulated partner failure')};
console.error=()=>{};
await vm.runInContext("comparePartner('Meg3')",context);
console.error=originalConsoleError;
assert.match(app.innerHTML,/Retry quadrants/);
data.gene=originalGene;
await vm.runInContext('loadPair()',context);
assert.match(app.innerHTML,/Pomc × Meg3/);
let resolveOldPartner;
data.gene=()=>new Promise(resolve=>{resolveOldPartner=resolve});
const oldPair=vm.runInContext("comparePartner('Malat1')",context);
assert.match(app.innerHTML,/Loading comparison/);
data.gene=originalGene;
await vm.runInContext("comparePartner('Meg3')",context);
resolveOldPartner(malat);await oldPair;
assert.match(app.innerHTML,/Pomc × Meg3/);
assert.doesNotMatch(app.innerHTML,/Pomc × Malat1/);
await vm.runInContext("comparePartner('Agrp')",context);
assert.match(app.innerHTML,/Pair score unavailable/);
assert.doesNotMatch(app.innerHTML,/quadrant-table/);
// Prototype formatting retains measured whole values and honest C7 availability.
const c7 = c7Population(data.metadata,[0,1,2]);
assert.equal(c7.reduce((sum,row)=>sum+row.eligible,0),102195);
assert.equal(c7.find(row=>row.label==='C7-1: GLU').eligible,32216);
assert.equal(c7.find(row=>row.label==='Unannotated C7').eligible,18658);
assert.equal(c7Population(data.metadata,[0]).reduce((sum,row)=>sum+row.eligible,0),39953);
await vm.runInContext("comparePartner('Malat1')",context);
assert.match(app.innerHTML,/coexpression-donut/);
assert.match(app.innerHTML,/coexpression-legend/);
assert.match(app.innerHTML,/data-quadrant="both"/);
assert.match(app.innerHTML,/C7-1: GLU · 32,216 cells/);
assert.match(app.innerHTML,/Unannotated C7 · 18,658 cells/);
assert.doesNotMatch(app.innerHTML,/data-population-expand|data-c7-population/);
vm.runInContext("expandedQuadrant='both';render()",context);
assert.match(app.innerHTML,/Both detected · C7 split/);
assert.match(app.innerHTML,/C7 composition is not yet available/);
assert.doesNotMatch(app.innerHTML,/c7-rows/);
vm.runInContext("selectPopulation('C7-1: GLU')",context);
assert.match(app.innerHTML,/C7 co-expression unavailable/);
assert.match(app.innerHTML,/32,216 eligible cells/);
assert.doesNotMatch(app.innerHTML,/16,781 cells|85,198 cells/);
assert.doesNotMatch(app.innerHTML,/coexpression-donut|coexpression-matrix/);
vm.runInContext("selectPopulation('Unannotated C7')",context);
assert.match(app.innerHTML,/18,658 eligible cells/);
vm.runInContext("selectPopulation('whole')",context);
assert.match(app.innerHTML,/85,198 cells/);
assert.doesNotMatch(app.innerHTML,/C7 co-expression unavailable/);
await vm.runInContext("comparePartner('Meg3')",context);
assert.equal(vm.runInContext('expandedQuadrant',context),null);
assert.equal(vm.runInContext('coexpressionPopulation',context),'whole');
console.log('Passed: prior integration, prototype donut/legend/matrix, C7 population totals, unannotated retention, quadrant expansion, unavailable C7 values, and selection resets.');
