import { useAppStore } from '../state/store';
import { color, font } from '../styles/tokens';

const baseBtn = {
  padding: '6px 14px',
  borderRadius: 999,
  background: color.buttonBg,
  borderWidth: 1,
  borderStyle: 'solid' as const,
  borderColor: color.buttonBorder,
  color: color.textSecondary,
  fontFamily: font.uiSans,
  fontSize: 12,
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap' as const,
};

const activeBtn = {
  ...baseBtn,
  color: color.redAccent,
  borderColor: 'rgba(255, 90, 77, 0.55)',
};

export function ControlBar() {
  const autoRotate = useAppStore((s) => s.autoRotate);
  const toggleAutoRotate = useAppStore((s) => s.toggleAutoRotate);
  const resetGlobalView = useAppStore((s) => s.resetGlobalView);

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 220,             // 避免与底部 18 项图例重叠
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          pointerEvents: 'auto',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '92vw',
        }}
      >
        <button onClick={resetGlobalView} style={baseBtn}>
          重置视角
        </button>
        <button onClick={toggleAutoRotate} style={autoRotate ? activeBtn : baseBtn}>
          {autoRotate ? '暂停巡游' : '开始巡游'}
        </button>
      </div>
    </div>
  );
}
