import { useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3 } from 'three';
import type { PoemEdge } from '../data/types';
import type { PositionedPoet } from './layouts/force';
import { colorForPoet } from '../utils/colorHash';
import { line as lineToken } from '../styles/tokens';
import { buildEdgeCurve, type LineStyle } from './lineCurves';

interface Props {
  poets: PositionedPoet[];
  edges: PoemEdge[];
  focusId?: string | null;
  lineStyle: LineStyle;
  onSelectEdge?: (edge: PoemEdge) => void;
  selectedEdgeId?: string | null;
}

function computeBoost(edge: PoemEdge, focusId: string | null | undefined): number {
  // 未选中 → 全部均匀亮度
  if (!focusId) return lineToken.normalBoost;
  // 选中节点的所有相邻关系高亮，方向不再影响可见性
  if (edge.source === focusId || edge.target === focusId) return lineToken.focusBoost;
  return lineToken.dimBoost;
}

export function Edges({ poets, edges, focusId = null, lineStyle, onSelectEdge, selectedEdgeId = null }: Props) {
  const geometry = useMemo(() => {
    const idToPos = new Map<string, Vector3>();
    for (const p of poets) idToPos.set(p.id, new Vector3(p.x, p.y, p.z));

    const validEdges = edges.filter(
      (e) => e.source !== e.target && idToPos.has(e.source) && idToPos.has(e.target),
    );

    // 直线 / 神经 / 弧线类策略可用更少段数
    const segs = lineStyle === 'straight' ? 1
      : lineStyle === 'quadratic' || lineStyle === 'neural' ? 32
      : lineToken.curveSegments;
    const totalSegs = validEdges.length * segs;
    const positions = new Float32Array(totalSegs * 2 * 3);
    const colors = new Float32Array(totalSegs * 2 * 3);

    let posCursor = 0;
    let colCursor = 0;
    let edgeIndex = 0;

    for (const e of validEdges) {
      const a = idToPos.get(e.source)!;
      const b = idToPos.get(e.target)!;
      const pairKey = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`;
      const points = buildEdgeCurve(lineStyle, a, b, pairKey, `${pairKey}#${edgeIndex}`, segs);
      edgeIndex += 1;

      const baseColor = new Color(colorForPoet(e.source));
      const boost = selectedEdgeId === `${e.source}|${e.target}|${e.relation}` ? lineToken.focusBoost : computeBoost(e, focusId);
      const denom = points.length - 1;

      for (let i = 0; i < points.length - 1; i += 1) {
        const t0 = i / denom;
        const t1 = (i + 1) / denom;
        const a0 = Math.max(lineToken.tailMin, Math.pow(1 - t0, lineToken.tailFalloffPower));
        const a1 = Math.max(lineToken.tailMin, Math.pow(1 - t1, lineToken.tailFalloffPower));
        const p0 = points[i];
        const p1 = points[i + 1];

        positions[posCursor++] = p0.x;
        positions[posCursor++] = p0.y;
        positions[posCursor++] = p0.z;
        positions[posCursor++] = p1.x;
        positions[posCursor++] = p1.y;
        positions[posCursor++] = p1.z;

        colors[colCursor++] = baseColor.r * boost * a0;
        colors[colCursor++] = baseColor.g * boost * a0;
        colors[colCursor++] = baseColor.b * boost * a0;
        colors[colCursor++] = baseColor.r * boost * a1;
        colors[colCursor++] = baseColor.g * boost * a1;
        colors[colCursor++] = baseColor.b * boost * a1;
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    return geo;
  }, [poets, edges, focusId, lineStyle, selectedEdgeId]);

  return (
    <lineSegments geometry={geometry} frustumCulled={false} onClick={(event) => {
      if (!onSelectEdge || event.index == null) return;
      const segs = lineStyle === 'straight' ? 1 : lineStyle === 'quadratic' || lineStyle === 'neural' ? 32 : lineToken.curveSegments;
      const edge = validEdgeAtIndex(edges, event.index, segs);
      if (edge) onSelectEdge(edge);
    }}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={lineToken.materialOpacity}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}

function validEdgeAtIndex(edges: PoemEdge[], segmentIndex: number, segs: number): PoemEdge | undefined {
  return edges[Math.floor(segmentIndex / segs)];
}
