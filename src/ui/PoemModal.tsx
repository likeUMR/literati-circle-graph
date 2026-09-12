import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../state/store';
import { color, font } from '../styles/tokens';

export function PoemModal() {
  const modalPoem = useAppStore((s) => s.modalPoem);
  const closeModal = useAppStore((s) => s.closeModal);

  return (
    <AnimatePresence>
      {modalPoem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 3, 10, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 10,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              minWidth: 340,
              maxWidth: 'min(90vw, 720px)',
              minHeight: 280,
              maxHeight: '78vh',
              padding: '36px 32px 28px',
              background:
                'radial-gradient(ellipse at center, rgba(50, 36, 16, 0.95) 0%, #0A0A0A 75%)',
              border: `1px solid ${color.panelBorder}`,
              borderRadius: 8,
              boxShadow: '0 0 40px rgba(232, 193, 108, 0.2), inset 0 0 60px rgba(232, 193, 108, 0.06)',
              color: color.ancientText,
              fontFamily: font.ancient,
              display: 'flex',
              flexDirection: 'row-reverse',
              gap: 24,
              alignItems: 'flex-start',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: 8,
                left: 12,
                color: color.ancientText,
                opacity: 0.7,
                fontSize: 18,
              }}
              aria-label="关闭"
            >
              ×
            </button>

            <div
              style={{
                writingMode: 'vertical-rl',
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: '0.15em',
                lineHeight: 1.4,
                color: color.ancientText,
                textShadow: '0 0 8px rgba(232, 193, 108, 0.4)',
              }}
            >
              {modalPoem.title}
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 12, fontWeight: 400, letterSpacing: '0.1em' }}>
                KPL · {modalPoem.author}
              </div>
            </div>

            <div
              style={{
                writingMode: 'vertical-rl',
                fontSize: 22,
                lineHeight: 1.9,
                letterSpacing: '0.18em',
                maxHeight: '60vh',
                overflow: 'auto',
                paddingLeft: 4,
              }}
            >
              {modalPoem.body.split('\n').map((line, i) => (
                <div key={i} style={{ marginRight: 12 }}>
                  {line}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
