import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type NodeType } from '../state/store';
import { color, font } from '../styles/tokens';
import { relationLabel } from './graphLabels';

const nodes: [NodeType, string][] = [['Season', '赛季'], ['Club', '俱乐部'], ['Player', '选手'], ['Hero', '英雄'], ['Match', '比赛']];
const edges = ['FACED', 'ROSTERED_PLAYER', 'USED_HERO', 'FEATURED_HERO', 'TEAMMATE_OF', 'TEAMED_WITH', 'PARTICIPATED_BY', 'NEXT_SEASON'];
const themes: Record<string, string> = { Season: '#E8C16C', Club: '#69A7FF', Player: '#FF6B7A', Hero: '#52D6C5', Match: '#A78BFA', FACED: '#FF6B7A', ROSTERED_PLAYER: '#69A7FF', USED_HERO: '#52D6C5', FEATURED_HERO: '#3FB8A7', TEAMMATE_OF: '#D29BFF', TEAMED_WITH: '#B98BE0', PARTICIPATED_BY: '#E8C16C', NEXT_SEASON: '#F1C36B' };

export function FilterPanel() {
  const open = useAppStore((s) => s.filtersOpen);
  const toggle = useAppStore((s) => s.toggleFilters);
  const nodeState = useAppStore((s) => s.visibleNodeTypes);
  const edgeState = useAppStore((s) => s.visibleEdgeTypes);
  const toggleNode = useAppStore((s) => s.toggleNodeType);
  const toggleEdge = useAppStore((s) => s.toggleEdgeType);
  const displayRatio = useAppStore((s) => s.displayRatio);
  const setDisplayRatio = useAppStore((s) => s.setDisplayRatio);
  return <>
    <button onClick={toggle} style={{ position: 'fixed', left: 18, top: 18, zIndex: 8, color: color.textSecondary, border: `1px solid ${color.buttonBorder}`, borderRadius: 999, padding: '7px 12px', background: 'rgba(0,0,0,.5)', fontFamily: font.uiSans, fontSize: 12 }}>{open ? '收起筛选' : '筛选图谱'}</button>
    <AnimatePresence>{open && <motion.aside initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} style={{ position: 'fixed', left: 16, top: 62, width: 220, maxHeight: 'calc(100vh - 210px)', overflowY: 'auto', zIndex: 7, padding: 14, borderRadius: 10, border: `1px solid ${color.panelBorder}`, background: color.panelBg, backdropFilter: 'blur(10px)', color: color.textSecondary, fontFamily: font.uiSans, fontSize: 12 }}>
      <Section title="展示比例">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input aria-label="星图展示比例" type="range" min={1} max={100} step={1} value={Math.round(displayRatio * 100)} onChange={(event) => setDisplayRatio(Number(event.target.value) / 100)} style={{ flex: 1, accentColor: color.goldActive }} />
          <span style={{ minWidth: 38, color: color.goldActive, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(displayRatio * 100)}%</span>
        </div>
      </Section>
      <Section title="节点类型">{nodes.map(([id, label]) => <Toggle key={id} label={label} active={nodeState[id]} tone={themes[id]} onClick={() => toggleNode(id)} />)}</Section>
      <Section title="关系类型">{edges.map((id) => <Toggle key={id} label={relationLabel(id)} active={edgeState[id] !== false} tone={themes[id]} onClick={() => toggleEdge(id)} />)}</Section>
    </motion.aside>}</AnimatePresence>
  </>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section style={{ marginBottom: 16 }}><div style={{ color: color.goldActive, fontFamily: font.uiSerif, marginBottom: 7 }}>{title}</div>{children}</section>; }
function Toggle({ label, active, tone, onClick }: { label: string; active: boolean; tone?: string; onClick: () => void }) { return <button onClick={onClick} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: active ? color.textSecondary : color.textMuted, textAlign: 'left' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i style={{ width: 7, height: 7, borderRadius: '50%', background: active ? tone : 'transparent', border: `1px solid ${active ? tone : color.textMuted}`, boxShadow: active ? `0 0 7px ${tone}` : 'none' }} />{label}</span><span style={{ color: active ? tone : color.textMuted }}>{active ? '●' : '○'}</span></button>; }
