import { useMemo, useState } from 'react';
import { kplData } from '../../data/kpl.generated';
import './MatchPreviewTool.css';

type Stats = Record<string, unknown>;
type Match = { id: string; name: string; type?: string; birth?: number; stats?: Stats };

const asText = (value: unknown) => (typeof value === 'string' ? value : '');
const asNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

const matches = (kplData.poets as Match[]).filter((item) => item.type === 'Match');
const seasons = (kplData.poets as Match[]).filter((item) => item.type === 'Season');

export interface MatchPreviewToolProps { onClose?: () => void }

export function MatchPreviewTool({ onClose }: MatchPreviewToolProps) {
  const seasonOptions = useMemo(() => seasons.slice().sort((a, b) => (b.birth ?? 0) - (a.birth ?? 0)), []);
  const [seasonId, setSeasonId] = useState(() => asText(seasonOptions[0]?.stats?.season_id));
  const seasonMatches = useMemo(() => matches.filter((m) => asText(m.stats?.season_id) === seasonId), [seasonId]);
  const [matchId, setMatchId] = useState(() => asText(seasonMatches[0]?.id));
  const selected = seasonMatches.find((m) => m.id === matchId) ?? seasonMatches[0];

  const selectSeason = (id: string) => {
    setSeasonId(id);
    const next = matches.find((m) => asText(m.stats?.season_id) === id);
    setMatchId(asText(next?.id));
  };

  const details = useMemo(() => {
    if (!selected?.stats) return null;
    const s = selected.stats;
    const teamA = asText(s.team_a_name) || '队伍 A';
    const teamB = asText(s.team_b_name) || '队伍 B';
    const teamAId = asText(s.team_a_club_id) || asText(s.team_a_id);
    const teamBId = asText(s.team_b_club_id) || asText(s.team_b_id);
    const selectedTimestamp = asNumber(s.start_timestamp);
    const history = matches.filter((m) => {
      const ms = m.stats;
      if (!ms || m.id === selected.id) return false;
      const aId = asText(ms.team_a_club_id) || asText(ms.team_a_id);
      const bId = asText(ms.team_b_club_id) || asText(ms.team_b_id);
      const matchTimestamp = asNumber(ms.start_timestamp);
      if (selectedTimestamp === undefined || matchTimestamp === undefined || matchTimestamp >= selectedTimestamp) return false;
      const stableIdsAvailable = Boolean(teamAId && teamBId && aId && bId);
      if (stableIdsAvailable) return (aId === teamAId && bId === teamBId) || (aId === teamBId && bId === teamAId);
      const a = asText(ms.team_a_name); const b = asText(ms.team_b_name);
      return (a === teamA && b === teamB) || (a === teamB && b === teamA);
    });
    const winsA = history.reduce((sum, m) => {
      const ms = m.stats;
      const winnerId = asText(ms?.winner_club_id) || asText(ms?.winner_team_id);
      const winner = asText(ms?.winner_team_name);
      return sum + ((teamAId && winnerId ? winnerId === teamAId : winner === teamA) ? 1 : 0);
    }, 0);
    const winsB = history.reduce((sum, m) => {
      const ms = m.stats; const winnerId = asText(ms?.winner_club_id) || asText(ms?.winner_team_id);
      return sum + ((teamBId && winnerId ? winnerId === teamBId : asText(ms?.winner_team_name) === teamB) ? 1 : 0);
    }, 0);
    return { s, teamA, teamB, historyCount: history.length, winsA, winsB };
  }, [selected]);

  const formatTime = (value: unknown) => {
    const text = asText(value); if (!text) return '时间待官方公布';
    const date = new Date(text); return Number.isNaN(date.getTime()) ? text : date.toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <section className="match-preview" aria-label="赛前预告">
      <header className="match-preview__header">
        <div><span className="match-preview__eyebrow">KPL MATCH CENTER</span><h2>赛前预告</h2><p>从官方赛程数据生成可核验的对阵信息与看点。</p></div>
        {onClose && <button className="match-preview__close" onClick={onClose} aria-label="关闭">×</button>}
      </header>
      <div className="match-preview__filters">
        <label>赛季<select value={seasonId} onChange={(e) => selectSeason(e.target.value)}>{seasonOptions.map((s) => <option key={s.id} value={asText(s.stats?.season_id)}>{s.name}</option>)}</select></label>
        <label>比赛<select value={selected?.id ?? ''} onChange={(e) => setMatchId(e.target.value)}>{seasonMatches.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      </div>
      {!details ? <div className="match-preview__empty">该赛季暂无可用比赛数据。</div> : (
        <article className="match-preview__card">
          <div className="match-preview__meta"><span>{asText(details.s.stage_name) || '赛程阶段未标注'}</span><strong>{asText(details.s.status_text) || '状态未知'}</strong></div>
          <div className="match-preview__teams"><div><b>{details.teamA}</b><small>{asText(details.s.team_a_group) ? `小组 ${asText(details.s.team_a_group)}` : '小组信息缺失'}</small></div><div className="match-preview__versus">VS</div><div className="match-preview__team--right"><b>{details.teamB}</b><small>{asText(details.s.team_b_group) ? `小组 ${asText(details.s.team_b_group)}` : '小组信息缺失'}</small></div></div>
          <div className="match-preview__facts"><div><span>开赛时间</span><b>{formatTime(details.s.start_time_china || details.s.start_time_utc)}</b></div><div><span>赛制</span><b>{asText(details.s.competition_format) || '赛制未标注'}</b></div><div><span>场馆</span><b>{[asText(details.s.venue_city), asText(details.s.venue_name)].filter(Boolean).join(' · ') || '场馆待公布'}</b></div><div><span>已有结果</span><b>{asNumber(details.s.team_a_score) !== undefined && asNumber(details.s.team_b_score) !== undefined ? `${details.s.team_a_score} : ${details.s.team_b_score}` : '尚无比分'}</b></div></div>
          <div className="match-preview__talk"><h3>数据看点</h3>{details.historyCount > 0 ? <p>双方在本场之前的官方记录中已有 <strong>{details.historyCount}</strong> 次交手，历史胜场为 <strong>{details.winsA} - {details.winsB}</strong>（{details.teamA} - {details.teamB}）。</p> : <p>当前数据集中没有早于本场的双方交手记录。</p>}<small>看点由 KPL_OFFICIAL 比赛节点的稳定俱乐部 ID、开赛时间与胜者字段计算。</small></div>
        </article>
      )}
    </section>
  );
}

export default MatchPreviewTool;
