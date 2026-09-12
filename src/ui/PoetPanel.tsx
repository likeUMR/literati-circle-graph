import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useAppStore } from '../state/store';
import { getDataset } from '../data';
import { totalRecipients } from '../utils/group';
import { color, font } from '../styles/tokens';
import type { Poet } from '../data/types';
import { relationLabel } from './graphLabels';

const labels: Record<string, string> = {
  game_count: '登场小局', game_wins: '获胜小局', game_win_rate: '小局胜率',
  player_count: '关联选手', club_count: '关联俱乐部', match_count: '系列赛数', game_count_total: '小局数',
  win_rate: '系列赛胜率', series_win_rate: '系列赛胜率', champion_count: '冠军数',
  current_or_latest_player_name: '当前比赛 ID', latest_position_name: '常用位置', real_name: '真实姓名',
  current_or_latest_short_name: '常用名称', latest_position_code: '位置编号', season_count: '参赛赛季',
  hero_name: '英雄名称', club_name: '俱乐部名称', season_name: '赛季名称', team_name: '战队名称',
  appearances: '出场次数', position_name: '位置',
  season_profile_count: '参赛赛季数', hero_count: '使用英雄数',
  season_year: '赛季年份', stage_name: '赛事阶段', competition_format: '赛制', bo_total: '最大局数',
  start_time_china: '开赛时间', venue_city: '比赛城市', round_count: '实际局数',
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
  const hidden = ['id', 'source', 'data_source', 'updated_at', 'source_endpoint', 'hero_id', 'player_id', 'club_id', 'season_id', 'icon_ref', 'hero_icon', 'logo_url', 'logo_urls', 'icon_url', 'avatar_url', 'avatar_urls', 'position_code', 'latest_position_code', 'top_heroes', 'aliases_json', 'season_ids', 'club_ids', 'team_season_ids', 'official_roles', 'competitive_positions', 'timestamp', 'collected_at', 'status_code', 'source_start_time_field', 'team_a_id', 'team_b_id', 'winner_side', 'winner_team_id', 'winner_club_id', 'official_match_playback_url', 'rounds'];
  return Object.entries(poet.stats).filter(([key, value]) => Boolean(displayValue(key, value)) && !hidden.some((x) => key === x || key.includes(x)) && !key.endsWith('_id') && !key.endsWith('_url') && !key.endsWith('_urls') && !key.endsWith('_code') && !key.endsWith('_at') && !key.endsWith('_json'))
    .map(([key, value]) => [labels[key] ?? key, displayValue(key, value)] as [string, string])
    .filter(([label]) => !label.includes('properties') && !label.includes('history') && !label.includes('metrics'))
    .slice(0, 6);
}

function matchTeams(poet: Poet) {
  const s = poet.stats ?? {};
  const value = (key: string) => typeof s[key] === 'string' || typeof s[key] === 'number' ? String(s[key]) : '';
  const teams = [{ name: value('team_a_name'), score: value('team_a_score'), group: value('team_a_group') }, { name: value('team_b_name'), score: value('team_b_score'), group: value('team_b_group') }];
  const rounds = Array.isArray(s.rounds) ? s.rounds as Array<Record<string, unknown>> : [];
  const players = rounds.flatMap((round) => Array.isArray(round.players) ? round.players as Array<Record<string, unknown>> : []);
  const uniquePlayers = [...new Map(players.map((p) => [String(p.player_id ?? p.player_name), p])).values()];
  return { teams, rounds, players: uniquePlayers };
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

function friendlyConnections(poet: Poet, data: ReturnType<typeof getDataset>) {
  const byId = new Map(data.poets.map((p) => [p.id, p]));
  const buckets = new Map<string, { id: string; relation: string; weight: number }>();
  for (const edge of data.edges) {
    const other = edge.source === poet.id ? edge.target : edge.target === poet.id ? edge.source : null;
    if (!other || other === poet.id || !byId.has(other)) continue;
    const key = `${other}|${edge.relation}`;
    const item = buckets.get(key) ?? { id: other, relation: edge.relation, weight: 0 };
    item.weight += edge.weight ?? 1;
    buckets.set(key, item);
  }
  return [...buckets.values()].sort((a, b) => b.weight - a.weight).slice(0, 24).map((item) => ({ ...item, node: byId.get(item.id)! }));
}

export function PoetPanel() {
  const panelOpen = useAppStore((s) => s.panelOpen);
  const selectedPoetId = useAppStore((s) => s.selectedPoetId);
  const dynasty = useAppStore((s) => s.dynasty);
  const closePanel = useAppStore((s) => s.closePanel);
  const [expandedConnection, setExpandedConnection] = useState<string | null>(null);

  const data = getDataset(dynasty);
  const poet = useMemo(
    () => data.poets.find((p) => p.id === selectedPoetId) ?? null,
    [data.poets, selectedPoetId],
  );

  const recipientCount = useMemo(() => (poet ? totalRecipients(poet.id, data.edges) : 0), [poet, data]);
  const connections = useMemo(() => (poet ? friendlyConnections(poet, data) : []), [poet, data]);
  const overview = poet?.type === 'Hero' ? '英雄数据、版本表现与职业赛场关联' : poet?.type === 'Player' ? '职业选手生涯与赛场表现' : poet?.type === 'Club' ? '俱乐部历史、阵容与对抗网络' : poet?.type === 'Season' ? '赛事阶段、参赛队伍与版本环境' : 'KPL 比赛与数据记录';
  const match = poet?.type === 'Match' && poet ? matchTeams(poet) : null;

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
          <div style={{ marginTop: 12, color: color.textMuted, fontSize: 12, lineHeight: 1.65 }}>{overview}</div>
          {match && <section style={{ marginTop: 14 }}><div style={{ color: color.goldActive, fontFamily: font.uiSerif, fontSize: 13, marginBottom: 7 }}>对阵双方</div><div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}><TeamCard team={match.teams[0]} /><div style={{ color: color.textMuted, fontSize: 11 }}>VS</div><TeamCard team={match.teams[1]} /></div>{match.rounds.length > 0 && <div style={{ marginTop: 12, color: color.textMuted, fontSize: 11 }}>本场共 {match.rounds.length} 局</div>}{match.players.length > 0 && <div style={{ marginTop: 12 }}><div style={{ color: color.goldActive, fontFamily: font.uiSerif, fontSize: 13, marginBottom: 6 }}>参赛选手 · {match.players.length} 人</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>{match.players.map((p, i) => <div key={`${String(p.player_id)}-${i}`} style={{ padding: '6px 7px', borderRadius: 5, background: 'rgba(255,255,255,.04)', color: color.textSecondary, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(p.player_name_short || p.player_name || '未知选手')}<span style={{ color: color.textMuted, marginLeft: 5 }}>{String(p.position_name || '')}</span><div style={{ color: color.goldActive, fontSize: 10 }}>{String(p.hero_name || '')}</div></div>)}</div></div>}</section>}
          <div style={{ marginTop: 14, overflowY: 'auto', flex: 1, paddingRight: 5 }}>
            <div style={{ color: color.goldActive, fontFamily: font.uiSerif, fontSize: 13, marginBottom: 7 }}>关联网络 · {connections.length} 个重点节点</div>
            {connections.length === 0 && <div style={{ padding: '18px 0', color: color.textMuted, textAlign: 'center' }}>当前筛选条件下暂无关联记录</div>}
            {connections.map((item) => {
              const key = `${item.id}|${item.relation}`;
              const expanded = expandedConnection === key;
              return <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => useAppStore.getState().openPanel(item.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', color: color.textSecondary, fontFamily: font.uiSerif, fontSize: 13 }}>
                    <span style={{ color: color.goldActive }}>{item.node.name}</span><span style={{ color: color.textMuted, fontFamily: font.uiSans, fontSize: 11 }}> · {item.node.type === 'Player' ? '选手' : item.node.type === 'Club' ? '俱乐部' : item.node.type === 'Hero' ? '英雄' : item.node.type === 'Match' ? '比赛' : '赛季'}</span>
                  </button>
                  <span style={{ color: color.textMuted, fontSize: 11, whiteSpace: 'nowrap' }}>{relationLabel(item.relation)} · {Math.round(item.weight)}</span>
                  <button onClick={() => setExpandedConnection(expanded ? null : key)} aria-label="展开关系详情" style={{ color: color.textMuted, fontSize: 14 }}>{expanded ? '−' : '+'}</button>
                </div>
                {expanded && <div style={{ margin: '7px 0 2px', padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,.04)', color: color.textMuted, fontSize: 11, lineHeight: 1.6 }}>
                  <div>关系：{relationLabel(item.relation)}</div><div>聚合记录：{Math.round(item.weight)} 条 / 次</div><div>点击名称可继续查看该节点的赛季、阵容和比赛关联。</div>
                </div>}
              </div>;
            })}
            {typeof poet?.stats?.introduction === 'string' && poet.stats.introduction && <section style={{ marginTop: 18 }}><div style={{ color: color.goldActive, fontFamily: font.uiSerif, fontSize: 13, marginBottom: 6 }}>官方介绍</div><div style={{ color: color.textMuted, lineHeight: 1.7 }}>{poet.stats.introduction as string}</div></section>}
            <section style={{ marginTop: 18, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.07)' }}><div style={{ color: color.textMuted, fontSize: 10 }}>数据来源 · KPL 官方公开数据</div></section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function TeamCard({ team }: { team: { name: string; score: string; group: string } }) { return <div style={{ minWidth: 0, padding: '10px 8px', borderRadius: 7, background: 'rgba(255,255,255,.05)', textAlign: 'center' }}><div style={{ color: color.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name || '未知队伍'}</div><div style={{ color: color.goldActive, fontSize: 22, marginTop: 2 }}>{team.score || '—'}</div>{team.group && <div style={{ color: color.textMuted, fontSize: 10 }}>{team.group}</div>}</div>; }
