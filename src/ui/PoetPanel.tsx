import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { getDataset } from '../data';
import { groupBySender, totalRecipients } from '../utils/group';
import { color, font } from '../styles/tokens';
import type { Poet } from '../data/types';

const labels: Record<string, string> = {
  game_count: '登场小局', game_wins: '获胜小局', game_win_rate: '小局胜率',
  player_count: '关联选手', club_count: '关联俱乐部', match_count: '系列赛数', game_count_total: '小局数',
  win_rate: '系列赛胜率', series_win_rate: '系列赛胜率', champion_count: '冠军数',
  current_or_latest_player_name: '当前比赛 ID', latest_position_name: '常用位置', real_name: '真实姓名',
  current_or_latest_short_name: '常用名称', latest_position_code: '位置编号', season_count: '参赛赛季',
  hero_name: '英雄名称', club_name: '俱乐部名称', season_name: '赛季名称', team_name: '战队名称',
  appearances: '出场次数', position_name: '位置',
  season_profile_count: '参赛赛季数', hero_count: '使用英雄数',
};
const relationLabels: Record<string, string> = {
  FACED: '交手', ROSTERED_PLAYER: '所属阵容', USED_HERO: '使用英雄', FEATURED_HERO: '队伍使用',
  TEAMMATE_OF: '共同出场', TEAMED_WITH: '共同效力', PARTICIPATED_BY: '参赛队伍', NEXT_SEASON: '下一个赛季',
};

function displayValue(key: string, value: unknown): string {
  if (value === null || value === undefined || typeof value === 'object') return '';
  if (key.includes('rate') || key.includes('ratio') || key.endsWith('_cr')) {
    const n = Number(value); return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : String(value);
  }
  return String(value);
}

function friendlyStats(poet: Poet): [string, string][] {
  if (!poet.stats) return [];
  const hidden = ['id', 'source', 'data_source', 'updated_at', 'source_endpoint', 'hero_id', 'player_id', 'club_id', 'season_id', 'icon_ref', 'hero_icon', 'logo_url', 'logo_urls', 'icon_url', 'avatar_url', 'avatar_urls', 'position_code', 'latest_position_code', 'top_heroes', 'aliases_json', 'season_ids', 'club_ids', 'team_season_ids', 'official_roles', 'competitive_positions'];
  return Object.entries(poet.stats).filter(([key, value]) => Boolean(displayValue(key, value)) && !hidden.some((x) => key === x || key.includes(x)) && !key.endsWith('_id') && !key.endsWith('_url') && !key.endsWith('_urls') && !key.endsWith('_code') && !key.endsWith('_at') && !key.endsWith('_json'))
    .map(([key, value]) => [labels[key] ?? key, displayValue(key, value)] as [string, string])
    .filter(([label]) => !label.includes('properties') && !label.includes('history') && !label.includes('metrics'))
    .slice(0, 6);
}

function imageFor(poet: Poet): string | undefined {
  const stats = poet.stats ?? {};
  const direct = stats.logo_url ?? stats.avatar_url ?? stats.player_logo ?? stats.icon_url;
  if ((!direct || typeof direct !== 'string') && Array.isArray(stats.logo_urls) && typeof stats.logo_urls[0] === 'string') return stats.logo_urls[0];
  if (typeof direct === 'string' && direct.startsWith('http')) return direct;
  if (poet.type === 'Hero') {
    const id = stats.hero_id ?? poet.id.split(':').pop();
    return `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg`;
  }
  return undefined;
}

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
            maxWidth: 'min(420px, calc(100vw - 24px))',
            background: color.panelBg,
            border: `1px solid ${color.panelBorder}`,
            borderRadius: 12,
            padding: '14px 12px 14px 16px',
            overflow: 'hidden',
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
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, fontFamily: font.uiSerif, fontSize: 18, color: color.textPrimary }}>
              {imageFor(poet) && <img src={imageFor(poet)} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${color.panelBorder}` }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{poet.name}</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginTop: 12 }}>
              {friendlyStats(poet).map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.05)', padding: '7px 6px', borderRadius: 6 }}>
                  <div style={{ color: color.textMuted, fontSize: 10 }}>{label}</div>
                  <div style={{ color: color.goldActive, fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
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
                    {g.recipientName} <span style={{ color: color.textMuted, fontSize: 11 }}>· {relationLabels[g.relation] ?? '关联'}</span>
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
                          {relationLabels[poem.title] ?? poem.title} · {poem.body.split('·').pop()?.trim()}
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
