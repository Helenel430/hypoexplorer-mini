import { expressionMetrics } from './navigation-export-client.mjs';

export const spatialContexts = {
  PVN: 'Paraventricular hypothalamic nucleus',
  ZI: 'Zona incerta',
  LHA: 'Lateral hypothalamic area',
  DMH: 'Dorsomedial nucleus of the hypothalamus',
  VMH: 'Ventromedial hypothalamic nucleus',
  PVp: 'Periventricular hypothalamic nucleus, posterior part',
  ARC: 'Arcuate hypothalamic nucleus',
};

export function datasetMetrics(metadata, record, context = 'Whole hypothalamus') {
  const contextIndex = metadata.contexts.indexOf(context);
  if (contextIndex < 0) throw new Error(`Unknown expression context: ${context}`);
  return metadata.datasets.map((id, i) => {
    const mapping = record[1][i];
    const statistics = record[2][i];
    const eligible = metadata.eligible_cells[id][contextIndex];
    const supported = Array.isArray(mapping) && statistics !== null;
    const positive = supported ? statistics[0][contextIndex] : null;
    const logSum = supported ? statistics[1][contextIndex] : null;
    return {
      id, label: metadata.study_cards[i].HypoMap_label,
      color: ['#9dc4dc', '#5d94b7', '#315f83'][i], mapping,
      state: !supported ? mapping?.state || 'gene_not_found' :
        eligible === 0 ? 'no_eligible_cells' : positive === 0 ? 'not_detected' : 'available',
      eligible, positive, logSum,
      ...(supported ? expressionMetrics(positive, logSum, eligible) :
        { percentExpressing: null, meanWhenDetected: null }),
    };
  });
}

export function poolMetrics(rows) {
  const supported = rows.filter(row => Array.isArray(row.mapping) && row.eligible > 0);
  const eligible = supported.reduce((sum, row) => sum + row.eligible, 0);
  const positive = supported.reduce((sum, row) => sum + row.positive, 0);
  const logSum = supported.reduce((sum, row) => sum + row.logSum, 0);
  return { eligible, positive, logSum, supportedDatasets: supported.length,
    ...expressionMetrics(positive, logSum, eligible) };
}

// The Top 5 intersection and both marginals describe the same dataset population.
export function recommendationQuadrants(metadata, recommendation, partnerRecord) {
  const [queryIndex, datasets, queryPositive, partners] = recommendation;
  const partnerIndex = partnerRecord[0];
  const intersection = partners.find(([i]) => i === partnerIndex);
  if (!intersection || partnerIndex === queryIndex) throw new Error('Pair intersection unavailable');
  let eligible = 0, partnerPositive = 0;
  for (const d of datasets) {
    if (!Array.isArray(partnerRecord[1][d]) || !partnerRecord[2][d]) throw new Error('Unsupported partner mapping');
    eligible += metadata.eligible_cells[metadata.datasets[d]][0];
    partnerPositive += partnerRecord[2][d][0][0];
  }
  const both = intersection[1];
  const counts = { both, queryOnly: queryPositive - both, partnerOnly: partnerPositive - both,
    neither: eligible - queryPositive - partnerPositive + both };
  if (!Number.isInteger(eligible) || eligible <= 0 ||
      Object.values(counts).some(n => !Number.isInteger(n) || n < 0) ||
      Object.values(counts).reduce((a,b) => a+b, 0) !== eligible) throw new Error('Invalid pair counts');
  return { eligible, counts,
    percentages: Object.fromEntries(Object.entries(counts).map(([key,n]) => [key,100*n/eligible])) };
}

export function c7Population(metadata, datasets) {
  const colors = ['#2563a6','#4f8dcc','#9bbddd','#78a9d5','#b9cfe2','#e4ebf1','#d1deea','#aeb9c3'];
  return metadata.c7_labels.map((label,i) => ({ label, color: colors[i],
    eligible: datasets.reduce((sum,d) => sum + metadata.c7_eligible_cells[metadata.datasets[d]][i],0) }));
}
