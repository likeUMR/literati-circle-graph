import fs from 'node:fs';

const root = new URL('../../wangzhe-esports-knowledge-data/graph_v1/', import.meta.url);
const readJsonl = (name) => fs.readFileSync(new URL(name, root), 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
const nodes = readJsonl('nodes_all.jsonl').map((node) => ({
  id: node.id,
  name: node.name,
  type: node.label,
  birth: node.properties?.season_year,
  dynasty: '宋',
  stats: node.properties ?? {},
}));
const edges = readJsonl('edges_all.jsonl').map((edge) => ({
  source: edge.source,
  target: edge.target,
  relation: edge.type,
  weight: edge.primary_value ?? 1,
  sourceValue: edge.source_value ?? undefined,
  targetValue: edge.target_value ?? undefined,
  poem: { title: edge.type, body: `${edge.type} · ${edge.primary_value ?? 1}` },
}));
const output = `import type { DynastyDataset, Poet, PoemEdge } from './types';\n\nconst poets: Poet[] = ${JSON.stringify(nodes)};\nconst edges: PoemEdge[] = ${JSON.stringify(edges)};\nexport const kplData: DynastyDataset = { poets, edges };\n`;
fs.writeFileSync(new URL('../src/data/kpl.generated.ts', import.meta.url), output);
console.log(`Generated ${nodes.length} nodes and ${edges.length} edges`);
