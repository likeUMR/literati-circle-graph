import { useMemo, useState } from 'react';
import { color, font } from '../styles/tokens';
import { useAppStore } from '../state/store';
import { getDataset } from '../data';
import type { Poet } from '../data/types';

function matches(p: Poet, q: string): boolean {
  if (!q) return false;
  const ql = q.trim().toLowerCase();
  if (!ql) return false;
  if (p.name.includes(q)) return true;
  if (p.zi?.includes(q)) return true;
  if (p.hao?.includes(q)) return true;
  if (p.id.toLowerCase().includes(ql)) return true;
  return false;
}

export function Header() {
  const dynasty = useAppStore((s) => s.dynasty);
  const search = useAppStore((s) => s.searchQuery);
  const setSearch = useAppStore((s) => s.setSearchQuery);
  const openPanel = useAppStore((s) => s.openPanel);
  const displayRatio = useAppStore((s) => s.displayRatio);

  const [focused, setFocused] = useState(false);

  const data = getDataset(dynasty, displayRatio);

  const candidates = useMemo(() => {
    if (!search.trim()) return [] as Poet[];
    return data.poets.filter((p) => matches(p, search.trim())).slice(0, 8);
  }, [data, search]);

  const showDropdown = focused && candidates.length > 0;

  return (
    <header
      style={{
        position: 'fixed',
        top: 14,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '0 18px',
        pointerEvents: 'none',
        zIndex: 7,
      }}
    >
      <div style={{ width: 180 }} />
      <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
        <div
          style={{
            fontFamily: font.uiSerif,
            color: color.textSecondary,
            letterSpacing: '0.45em',
            fontSize: 22,
            paddingLeft: '0.45em',
            textShadow: '0 0 12px rgba(232, 193, 108, 0.4)',
          }}
        >
          KPL 星图
        </div>
      </div>
      <div style={{ width: 200, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'auto', position: 'relative' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder="搜索选手、俱乐部、英雄..."
          style={{
            width: 180,
            height: 30,
            padding: '0 12px',
            borderRadius: showDropdown ? '15px 15px 0 0' : 999,
            border: `1px solid ${color.buttonBorder}`,
            background: 'rgba(0, 0, 0, 0.55)',
            color: color.textSecondary,
            fontFamily: font.uiSans,
            fontSize: 13,
            outline: 'none',
          }}
        />
        {showDropdown && (
          <ul
            style={{
              position: 'absolute',
              top: 30,
              right: 0,
              width: 180,
              margin: 0,
              padding: 0,
              listStyle: 'none',
              background: 'rgba(0, 0, 0, 0.92)',
              border: `1px solid ${color.buttonBorder}`,
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              maxHeight: 240,
              overflowY: 'auto',
              backdropFilter: 'blur(6px)',
            }}
          >
            {candidates.map((p) => (
              <li key={p.id}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    openPanel(p.id);
                    setSearch('');
                    setFocused(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontFamily: font.uiSerif,
                    fontSize: 13,
                    color: color.textSecondary,
                  }}
                >
                  {p.name}
                  {p.type && <span style={{ marginLeft: 8, color: color.textMuted, fontSize: 11 }}>{p.type}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <a
        className="star-map-applications-link"
        href="applications.html"
        aria-label="前往 KPL 应用展示"
      >
        <span>应用展示</span>
        <b aria-hidden="true">↗</b>
      </a>
    </header>
  );
}
