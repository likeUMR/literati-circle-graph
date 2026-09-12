import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { getDataset } from '../data';
import { computeInDegree, computeOutDegree, rankBy } from '../utils/degree';
import { colorForPoet } from '../utils/colorHash';
import { color, font } from '../styles/tokens';

const ROWS = 6;
const COLS = 3;
const LIMIT = ROWS * COLS;

export function Legend() {
  const dynasty = useAppStore((s) => s.dynasty);
  const panelOpen = useAppStore((s) => s.panelOpen);
  const selectedPoetId = useAppStore((s) => s.selectedPoetId);
  const openPanel = useAppStore((s) => s.openPanel);
  const setSelectedPoet = useAppStore((s) => s.setSelectedPoet);
  const displayRatio = useAppStore((s) => s.displayRatio);

  const data = getDataset(dynasty, displayRatio);
  const mode: 'in' | 'out' = panelOpen ? 'out' : 'in';

  const ranked = useMemo(() => {
    const deg = mode === 'in' ? computeInDegree(data.edges) : computeOutDegree(data.edges);
    return rankBy(data.poets, deg, LIMIT);
  }, [data, mode]);

  return (
    <footer
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '14px 18px 18px',
        background: 'linear-gradient(to top, rgba(2,3,10,0.95), rgba(2,3,10,0.0))',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 16,
        zIndex: 4,
      }}
    >
      <div
        style={{
          width: 32,
          fontFamily: font.uiSerif,
          fontSize: 13,
          color: color.textMuted,
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          letterSpacing: '0.2em',
          paddingBottom: 4,
        }}
      >
        {mode === 'in' ? '关联最多' : '出边最多'}
      </div>
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridAutoRows: 26,
          rowGap: 4,
          columnGap: 16,
          maxWidth: 720,
        }}
      >
        {ranked.map(({ poet, count }) => {
          const isSelected = poet.id === selectedPoetId;
          return (
            <button
              key={poet.id}
              onClick={() => (panelOpen ? openPanel(poet.id) : setSelectedPoet(poet.id))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 10px',
                height: 24,
                borderRadius: 999,
                background: isSelected ? color.goldActive : 'transparent',
                color: isSelected ? color.goldText : color.textSecondary,
                fontFamily: font.uiSans,
                fontSize: 12,
                fontWeight: isSelected ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 160ms ease',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: colorForPoet(poet.id),
                  boxShadow: `0 0 6px ${colorForPoet(poet.id)}`,
                }}
              />
              <span style={{ fontFamily: font.uiSerif }}>{poet.name}</span>
              <span style={{ marginLeft: 'auto', opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
