import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { getDataset } from '../data';
import { groupBySender, totalRecipients } from '../utils/group';
import { color, font } from '../styles/tokens';

export function PoetPanel() {
  const panelOpen = useAppStore((s) => s.panelOpen);
  const selectedPoetId = useAppStore((s) => s.selectedPoetId);
  const dynasty = useAppStore((s) => s.dynasty);
  const closePanel = useAppStore((s) => s.closePanel);
  const openModal = useAppStore((s) => s.openModal);

  const data = getDataset(dynasty);
  const poet = useMemo(
    () => data.poets.find((p) => p.id === selectedPoetId) ?? null,
    [data.poets, selectedPoetId],
  );

  const groups = useMemo(() => {
    if (!poet) return [];
    return groupBySender(poet.id, data.edges, data.poets);
  }, [poet, data]);

  const recipientCount = useMemo(() => (poet ? totalRecipients(poet.id, data.edges) : 0), [poet, data]);

  return (
    <AnimatePresence>
      {panelOpen && poet && (
        <motion.aside
          key={poet.id}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          style={{
            position: 'fixed',
            right: 16,
            top: 96,
            bottom: 130,
            width: 320,
            maxWidth: 'calc(100vw - 32px)',
            background: color.panelBg,
            border: `1px solid ${color.panelBorder}`,
            borderRadius: 12,
            padding: '14px 14px 14px 18px',
            color: color.textSecondary,
            fontFamily: font.uiSans,
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(6px)',
            zIndex: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: font.uiSerif, fontSize: 16, color: color.textPrimary }}>
              {poet.name}
              <span style={{ marginLeft: 8, fontSize: 12, color: color.textMuted, fontFamily: font.uiSans }}>
                {poet.type ?? '节点'} · {recipientCount} 个关联
              </span>
            </div>
            <button
              onClick={closePanel}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                color: color.textMuted,
                fontSize: 16,
                lineHeight: '20px',
              }}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
          {poet.stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
              {Object.entries(poet.stats).slice(0, 6).map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.05)', padding: '7px 6px', borderRadius: 6 }}>
                  <div style={{ color: color.textMuted, fontSize: 10 }}>{label}</div>
                  <div style={{ color: color.goldActive, fontSize: 13, marginTop: 2 }}>{String(value)}</div>
                </div>
              ))}
            </div>
          )}
          {groups.length === 0 ? (
            <div style={{ padding: '24px 0', color: color.textMuted, textAlign: 'center' }}>
              暂无关联记录
            </div>
          ) : (
            <div
              style={{
                marginTop: 10,
                overflowY: 'auto',
                flex: 1,
                paddingRight: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {groups.map((g) => (
                <div key={g.recipientId}>
                  <div
                    style={{
                      fontFamily: font.uiSerif,
                      color: color.goldActive,
                      fontSize: 13,
                      marginBottom: 4,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {g.recipientName} <span style={{ color: color.textMuted, fontSize: 11 }}>[{g.relation}]</span>
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                    {g.poems.slice(0, 3).map((poem, i) => (
                      <li key={`${poem.title}-${i}`}>
                        <button
                          onClick={() =>
                            openModal({
                              title: poem.title,
                              body: poem.body,
                              author: poet.name,
                            })
                          }
                          style={{
                            textAlign: 'left',
                            padding: '4px 0',
                            color: color.textSecondary,
                            fontFamily: font.uiSerif,
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            display: 'block',
                            width: '100%',
                          }}
                        >
                          {poem.title} · {poem.body}
                        </button>
                      </li>
                    ))}
                    {g.poems.length > 3 && (
                      <li style={{ color: color.textMuted, fontSize: 11, marginTop: 2 }}>...还有 {g.poems.length - 3} 首</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
