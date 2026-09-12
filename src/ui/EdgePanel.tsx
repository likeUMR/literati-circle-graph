import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../state/store';
import { getDataset } from '../data';
import { color, font } from '../styles/tokens';
import { relationLabel } from './graphLabels';

export function EdgePanel() {
  const edgeId = useAppStore((s) => s.selectedEdgeId);
  const close = useAppStore((s) => s.closePanel);
  const data = getDataset('宋');
  const edge = data.edges.find((e) => `${e.source}|${e.target}|${e.relation}` === edgeId);
  const byId = new Map(data.poets.map((p) => [p.id, p.name]));
  return <AnimatePresence>{edge && <motion.aside initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }} style={{ position: 'fixed', right: 16, top: 96, bottom: 130, width: 340, maxWidth: 'calc(100vw - 32px)', zIndex: 6, padding: '16px 18px', border: `1px solid ${color.panelBorder}`, borderRadius: 12, background: color.panelBg, backdropFilter: 'blur(10px)', color: color.textSecondary, fontFamily: font.uiSans }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ color: color.goldActive, fontFamily: font.uiSerif, fontSize: 16 }}>{byId.get(edge.source) ?? edge.source}</div><div style={{ color: color.textMuted, margin: '3px 0' }}>↓ {relationLabel(edge.relation)} ↓</div><div style={{ color: color.textPrimary, fontFamily: font.uiSerif, fontSize: 16 }}>{byId.get(edge.target) ?? edge.target}</div></div><button onClick={close} aria-label="关闭" style={{ color: color.textMuted, fontSize: 18 }}>×</button></header>
    <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{[['关系类型', relationLabel(edge.relation)], ['关联强度', edge.weight ?? 1], ['起点数据', edge.sourceValue ?? '—'], ['终点数据', edge.targetValue ?? '—']].map(([k, v]) => <div key={String(k)} style={{ padding: 9, borderRadius: 6, background: 'rgba(255,255,255,.05)' }}><div style={{ color: color.textMuted, fontSize: 10 }}>{k}</div><div style={{ marginTop: 3, color: color.goldActive }}>{String(v)}</div></div>)}</div>
    <div style={{ marginTop: 18, color: color.textMuted, lineHeight: 1.7 }}>该关系由 KPL 聚合图谱生成。点击关联节点可继续探索，详细比赛证据将在比赛模式中按需展开。</div>
  </motion.aside>}</AnimatePresence>;
}
