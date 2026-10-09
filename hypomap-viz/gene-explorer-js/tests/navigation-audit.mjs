// Final comparison against the independent five-gene FVP reference.
// Run from the app directory: node tests/navigation-audit.mjs
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { openNavigationExport } from '../public/navigation-export-client.mjs';
import { datasetMetrics, poolMetrics, recommendationQuadrants, c7Population } from '../public/navigation-metrics.mjs';

const root = new URL('../../../', import.meta.url);
const payload = name => readFileSync(new URL(`navigation_export/${name}`,root));
globalThis.fetch = async url => new Response(payload(new URL(url).pathname.split('/').pop()));
const data = await openNavigationExport('http://localhost/navigation_export/');
const reference = JSON.parse(readFileSync(new URL('fvp_export/gene_metrics_vertical_slice.json',root),'utf8'));
const closeMetric=(actual,expected)=>actual===expected||(Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<=1e-12);
const audit = { date:process.argv[2]||new Date().toISOString().slice(0,10), status:'passed', expression_blocks_checked:0,
  recommendation_pairs_checked:0, aliases_checked:[], genes:[] };
for (const expectedGene of reference.genes) {
  assert.equal(expectedGene.state,'resolved');
  const symbol=expectedGene.resolver.canonical_gene.canonical_symbol;
  const resolution=data.resolve(symbol);
  assert.equal(resolution.state,'resolved');
  const identity=resolution.candidates[0];
  const {record}=await data.gene(identity.index);
  const contexts=[['Whole hypothalamus',expectedGene.metrics.whole_dataset],
    ...Object.entries(expectedGene.metrics.by_hypomap_region)];
  for (const [context,expected] of contexts) {
    for (const actual of datasetMetrics(data.metadata,record,context)) {
      const ref=expected.dataset_metrics[actual.id];
      assert.equal(actual.positive,ref.positive_cells,`${symbol}/${context}/${actual.id}: positive`);
      assert.equal(actual.eligible,ref.eligible_cells,`${symbol}/${context}/${actual.id}: eligible`);
      assert.ok(Math.abs(actual.logSum-ref.sum_log_expression_positive)<=Math.max(1e-9,Math.abs(ref.sum_log_expression_positive)*1e-12));
      assert.ok(closeMetric(actual.percentExpressing,ref.percent_expressing));
      assert.ok(closeMetric(actual.meanWhenDetected,ref.mean_expression_positive));
      audit.expression_blocks_checked++;
    }
  }
  const pooled=poolMetrics(datasetMetrics(data.metadata,record));
  const recommendation=await data.recommendations(identity.index);
  assert.equal(recommendation[2],pooled.positive);
  assert.equal(c7Population(data.metadata,recommendation[1]).reduce((sum,row)=>sum+row.eligible,0),pooled.eligible);
  const partners=[];
  for (const [index,both] of recommendation[3]) {
    const partner=await data.gene(index);
    const quadrant=recommendationQuadrants(data.metadata,recommendation,partner.record);
    assert.equal(quadrant.counts.both,both);
    assert.equal(quadrant.counts.both+quadrant.counts.queryOnly,pooled.positive);
    assert.equal(quadrant.eligible,pooled.eligible);
    assert.ok(Math.abs(Object.values(quadrant.percentages).reduce((a,b)=>a+b,0)-100)<1e-10);
    partners.push({symbol:data.identity(index).symbol,both_positive:both,conditional_percent:100*both/pooled.positive,quadrants:quadrant.counts});
    audit.recommendation_pairs_checked++;
  }
  audit.genes.push({symbol,positive:pooled.positive,eligible:pooled.eligible,percent:pooled.percentExpressing,mean:pooled.meanWhenDetected,partners});
}
for (const [alias,symbol] of [['Cyr61','Ccn1'],['Gm8773','Fam237b'],['pOmC','Pomc']]) {
  assert.equal(data.resolve(alias).candidates[0].symbol,symbol);
  audit.aliases_checked.push({alias,symbol});
}
const manifest=JSON.parse(payload('manifest.json'));
for (const {path} of manifest.files) assert.deepEqual(readFileSync(new URL(`../dist/navigation_export/${path}`,import.meta.url)),payload(path));
for (const name of ['navigation-prototype.html','navigation-metrics.mjs','navigation-export-client.mjs']) {
  assert.deepEqual(readFileSync(new URL(`../dist/${name}`,import.meta.url)),readFileSync(new URL(`../public/${name}`,import.meta.url)));
}
assert.deepEqual(readFileSync(new URL('../dist/gene-descriptions.mjs',import.meta.url)),readFileSync(new URL('../gene-descriptions.mjs',import.meta.url)));
audit.production_payloads_checked=manifest.files.length;
writeFileSync(new URL('docs/navigation_validation_results.json',root),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({status:audit.status,genes:audit.genes.map(g=>({symbol:g.symbol,positive:g.positive,eligible:g.eligible,percent:g.percent,mean:g.mean})),expression_blocks:audit.expression_blocks_checked,top5_pairs:audit.recommendation_pairs_checked,production_payloads:audit.production_payloads_checked},null,2));
