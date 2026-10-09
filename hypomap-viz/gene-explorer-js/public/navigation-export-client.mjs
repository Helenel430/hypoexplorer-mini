// Browser loader for the generated export; copied to load.mjs during generation.
export async function openNavigationExport(baseUrl) {
  const base = new URL(baseUrl, globalThis.location?.href);
  const cache = new Map();
  async function read(path) {
    if (!cache.has(path)) {
      const pending = (async () => {
        const response = await fetch(new URL(path, base));
        if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
        let bytes = new Uint8Array(await response.arrayBuffer());
        // A host using Content-Encoding: gzip has already decompressed the body.
        if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
          const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
          bytes = new Uint8Array(await new Response(stream).arrayBuffer());
        }
        return JSON.parse(new TextDecoder().decode(bytes));
      })();
      cache.set(path, pending);
      pending.catch(() => cache.delete(path));
    }
    return cache.get(path);
  }
  const [manifest, metadata, index] = await Promise.all([
    read('manifest.json'), read('metadata.json.gz'), read('search-index.json.gz'),
  ]);
  function resolve(query) {
    const key = query.trim().toLowerCase();
    const matches = index.current_symbols[key] ?? index.aliases[key] ?? [];
    const candidates = [
      ...matches.map(i => ({ index: i, id: index.genes[i][0], symbol: index.genes[i][1], name: index.genes[i][2] })),
      ...((index.current_symbols[key] ? [] : index.outside_export_candidates[key]) ?? []).map(g => ({
        index: null, id: g.canonical_gene_id, symbol: g.canonical_symbol, name: g.marker_name,
      })),
    ];
    return { state: candidates.length > 1 ? 'disambiguation_required' :
      candidates.length === 1 && candidates[0].index !== null ? 'resolved' : 'gene_not_found', candidates };
  }
  function identity(i) {
    if (!Number.isInteger(i) || i < 0 || i >= manifest.gene_count) throw new Error('Invalid gene index');
    return { index: i, id: index.genes[i][0], symbol: index.genes[i][1], name: index.genes[i][2] };
  }
  async function gene(i) {
    if (!Number.isInteger(i) || i < 0 || i >= manifest.gene_count) throw new Error('Invalid gene index');
    const shard = Math.floor(i / manifest.shard_size);
    const records = await read(`genes-${String(shard).padStart(4, '0')}.json.gz`);
    return { identity: index.genes[i], record: records[i % manifest.shard_size] };
  }
  async function recommendations(i) {
    if (!Number.isInteger(i) || i < 0 || i >= manifest.gene_count) throw new Error('Invalid gene index');
    if (manifest.recommendations.state !== 'exported') return null;
    return (await read(manifest.recommendations.path))[i];
  }
  return { manifest, metadata, resolve, identity, gene, recommendations };
}

export function expressionMetrics(positive, logSum, eligible) {
  return { percentExpressing: eligible > 0 ? 100 * positive / eligible : null,
    meanWhenDetected: eligible > 0 && positive > 0 ? logSum / positive : null };
}
