import type { Dynasty, DynastyDataset } from './types';
import { kplData } from './kpl.generated';
let fullData: DynastyDataset | null = null;
let fullDataPromise: Promise<DynastyDataset> | null = null;
export function loadFullDataset(): Promise<DynastyDataset> {
  if (fullData) return Promise.resolve(fullData);
  fullDataPromise ??= import('./kpl.full.generated').then((module) => (fullData = module.kplData));
  return fullDataPromise;
}

// 1. 过滤掉引用了不存在 poet id 的 edge（防止数据笔误抛 d3-force "node not found"）
// 2. 过滤孤立 poet：只保留至少出现在一条 valid edge 上的诗人
function prune(raw: DynastyDataset): DynastyDataset {
  const validIds = new Set(raw.poets.map((p) => p.id));
  const validEdges = raw.edges.filter(
    (e) => validIds.has(e.source) && validIds.has(e.target),
  );
  if (import.meta.env.DEV && validEdges.length !== raw.edges.length) {
    const dropped = raw.edges.filter(
      (e) => !validIds.has(e.source) || !validIds.has(e.target),
    );
    const ids = new Set<string>();
    for (const e of dropped) {
      if (!validIds.has(e.source)) ids.add(e.source);
      if (!validIds.has(e.target)) ids.add(e.target);
    }
    console.warn(
      `[data] 丢弃 ${dropped.length} 条引用了未声明 poet id 的 edge，缺失 id：`,
      Array.from(ids),
    );
  }
  const used = new Set<string>();
  for (const e of validEdges) {
    used.add(e.source);
    used.add(e.target);
  }
  return {
    poets: raw.poets.filter((p) => used.has(p.id)),
    edges: validEdges,
  };
}

function buildVisualDataset(raw: DynastyDataset, displayRatio = 1): DynastyDataset {
  const ratio = Math.max(0.01, Math.min(1, displayRatio));
  const baselineRatio = 268 / 3399;
  const degree = new Map<string, number>();
  for (const edge of raw.edges) {
    const value = Math.max(1, edge.weight ?? 1);
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + value);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + value);
  }

  const limits = new Map<string, number>();
  for (const node of raw.poets) limits.set(node.type ?? 'Player', (limits.get(node.type ?? 'Player') ?? 0) + 1);
  const selected = new Set<string>();
  for (const type of limits.keys()) {
    raw.poets
      .filter((node) => node.type === type)
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, Math.max(1, Math.round((limits.get(type) ?? 0) * ratio)))
      .forEach((node) => selected.add(node.id));
  }

  const edgePriority: Record<string, number> = {
    ROSTERED_PLAYER: 8,
    USED_HERO: 7,
    FACED: 6,
    TEAMMATE_OF: 5,
    TEAMED_WITH: 4,
    FEATURED_PLAYER: 3,
    FEATURED_HERO: 2,
    PARTICIPATED_BY: 1,
  };
  const candidates = raw.edges
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((a, b) => {
      const priority = (edgePriority[b.relation] ?? 0) - (edgePriority[a.relation] ?? 0);
      return priority || (b.weight ?? 1) - (a.weight ?? 1);
    });

  // Keep the previous 1,800-edge default while 100% expands to the full graph.
  const edgeRatio = ratio <= baselineRatio
    ? ratio / baselineRatio
    : 1 + ((ratio - baselineRatio) / (1 - baselineRatio)) * ((raw.edges.length / 1800) - 1);
  const edgeLimit = Math.max(1, Math.min(raw.edges.length, Math.round(1800 * edgeRatio)));
  const visualEdges: typeof raw.edges = [];
  const edgeSet = new Set<typeof raw.edges[number]>();
  const connected = new Set<string>();
  for (const edge of candidates) {
    if (visualEdges.length >= edgeLimit) break;
    if (connected.has(edge.source) && connected.has(edge.target)) continue;
    visualEdges.push(edge);
    edgeSet.add(edge);
    connected.add(edge.source);
    connected.add(edge.target);
  }
  for (const edge of candidates) {
    if (visualEdges.length >= edgeLimit) break;
    if (edgeSet.has(edge)) continue;
    visualEdges.push(edge);
  }

  return prune({
    poets: raw.poets.filter((node) => selected.has(node.id)),
    edges: visualEdges,
  });
}

export function getDataset(dynasty: Dynasty, displayRatio = 1): DynastyDataset {
  void dynasty;
  const source = fullData ?? kplData;
  const baselineRatio = 268 / 3399;
  if (!fullData && displayRatio <= baselineRatio * 1.05) return source;
  const sourceRatio = fullData ? displayRatio : Math.min(1, displayRatio / baselineRatio);
  return displayRatio === 1 && fullData ? source : buildVisualDataset(source, sourceRatio);
}

// Detail panels use the complete relationship set so rankings and related-record
// counts stay truthful. The scene display ratio controls the visual sample size.
export function getDetailDataset(): DynastyDataset {
  return fullData ?? kplData;
}

export type { Dynasty, DynastyDataset, Poet, PoemEdge, Relation } from './types';

