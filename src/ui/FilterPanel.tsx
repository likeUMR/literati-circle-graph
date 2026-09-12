import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type NodeType } from '../state/store';
import { color, font } from '../styles/tokens';

const nodes: [NodeType, string][] = [['Season', '赛季'], ['Club', '俱乐部'], ['Player', '选手'], ['Hero', '英雄'], ['Match', '比赛']];
const edges = ['FACED', 'ROSTERED_PLAYER', 'USED_HERO', 'FEATURED_HERO', 'TEAMMATE_OF', 'TEAMED_WITH', 'PARTICIPATED_BY', 'NEXT_SEASON'];

export function FilterPanel() {
  const open = useAppStore((s) => s.filtersOpen);
  const toggle = useAppStore((s) => s.toggleFilters);
  const nodeState = useAppStore((s) => s.visibleNodeTypes);
  const edgeState = useAppStore((s) => s.visibleEdgeTypes);
  const toggleNode = useAppStore((s) => s.toggleNodeType);
  const toggleEdge = useAppStore((s) => s.toggleEdgeType);
  return <>
    <button onClick={toggle} style={{ position: 'fixed', left: 18, top: 18, zIndex: 8, color: color.textSecondary, border: `1px solid ${color.buttonBorder}`, borderRadius: 999, padding: '7px 12px', background: 'rgba(0,0,0,.5)', fontFamily: font.uiSans, fontSize: 12 }}>{open ? '收起筛选' : '筛选图谱'}</button>
    <AnimatePresence>{open && <motion.aside initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} style={{ position: 'fixed', left: 16, top: 62, width: 220, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto', zIndex: 7, padding: 14, borderRadius: 10, border: `1px solid ${color.panelBorder}`, background: color.panelBg, backdropFilter: 'blur(10px)', color: color.textSecondary, fontFamily: font.uiSans, fontSize: 12 }}>
      <Section title="节点类型">{nodes.map(([id, label]) => <Toggle key={id} label={label} active={nodeState[id]} onClick={() => toggleNode(id)} />)}</Section>
      <Section title="关系类型">{edges.map((id) => <Toggle key={id} label={id} active={edgeState[id] !== false} onClick={() => toggleEdge(id)} />)}</Section>
    </motion.aside>}</AnimatePresence>
  </>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section style={{ marginBottom: 16 }}><div style={{ color: color.goldActive, fontFamily: font.uiSerif, marginBottom: 7 }}>{title}</div>{children}</section>; }
function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: active ? color.textSecondary : color.textMuted, textAlign: 'left' }}><span>{label}</span><span style={{ color: active ? color.goldActive : color.textMuted }}>{active ? '●' : '○'}</span></button>; }
