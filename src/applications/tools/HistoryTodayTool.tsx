import { useEffect, useMemo, useState } from 'react';
import { kplData } from '../../data/kpl.generated';
import './HistoryTodayTool.css';

export interface HistoryTodayToolProps {
  onClose?: () => void;
}

interface MatchRecord {
  id: string;
  date: string;
  monthDay: string;
  season: string;
  stage: string;
  format: string;
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  winner: string;
  venue: string;
  playbackUrl?: string;
}

type MatchStats = Record<string, unknown>;

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const numberField = (stats: MatchStats, key: string) =>
  typeof stats[key] === 'number' ? stats[key] : null;
const stringField = (stats: MatchStats, key: string) =>
  typeof stats[key] === 'string' ? stats[key] : '';

function readMatches(): MatchRecord[] {
  return kplData.poets.flatMap((node) => {
    if (node.type !== 'Match' || !node.stats) return [];
    const stats = node.stats;
    const chinaTime = stringField(stats, 'start_time_china');
    const date = chinaTime.slice(0, 10);
    const scoreA = numberField(stats, 'team_a_score');
    const scoreB = numberField(stats, 'team_b_score');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || scoreA === null || scoreB === null) return [];

    const venueCity = stringField(stats, 'venue_city');
    const venueName = stringField(stats, 'venue_name');
    return [{
      id: stringField(stats, 'match_id') || node.id,
      date,
      monthDay: date.slice(5),
      season: stringField(stats, 'season_name') || '赛季未标注',
      stage: stringField(stats, 'stage_name'),
      format: stringField(stats, 'competition_format'),
      teamA: stringField(stats, 'team_a_name'),
      scoreA,
      teamB: stringField(stats, 'team_b_name'),
      scoreB,
      winner: stringField(stats, 'winner_team_name'),
      venue: venueName || venueCity,
      playbackUrl: stringField(stats, 'official_match_playback_url') || undefined,
    }];
  }).sort((a, b) => b.date.localeCompare(a.date));
}

const ALL_MATCHES = readMatches();

function daysInMonth(month: number) {
  return new Date(Date.UTC(2000, month, 0)).getUTCDate();
}

function toMonthDay(month: number, day: number) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftDate(month: number, day: number, amount: number) {
  const date = new Date(Date.UTC(2000, month - 1, day + amount));
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function ordinal(monthDay: string) {
  const [month, day] = monthDay.split('-').map(Number);
  return Math.round((Date.UTC(2000, month - 1, day) - Date.UTC(2000, 0, 1)) / 86_400_000);
}

function closestAvailableDate(selected: string) {
  const availableDates = Array.from(new Set(ALL_MATCHES.map((match) => match.monthDay)));
  const selectedOrdinal = ordinal(selected);
  return availableDates.sort((a, b) => {
    const distance = (value: string) => {
      const delta = Math.abs(ordinal(value) - selectedOrdinal);
      return Math.min(delta, 366 - delta);
    };
    return distance(a) - distance(b) || a.localeCompare(b);
  })[0];
}

function displayMonthDay(monthDay: string) {
  const [month, day] = monthDay.split('-').map(Number);
  return `${month} 月 ${day} 日`;
}

export function HistoryTodayTool({ onClose }: HistoryTodayToolProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const monthDay = toMonthDay(month, day);
  const matches = useMemo(
    () => ALL_MATCHES.filter((match) => match.monthDay === monthDay),
    [monthDay],
  );
  const nearestDate = matches.length === 0 ? closestAvailableDate(monthDay) : undefined;

  useEffect(() => {
    if (day > daysInMonth(month)) setDay(daysInMonth(month));
  }, [day, month]);

  useEffect(() => {
    if (!onClose) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const moveDay = (amount: number) => {
    const next = shiftDate(month, day, amount);
    setMonth(next.month);
    setDay(next.day);
  };

  const jumpTo = (value: string) => {
    const [nextMonth, nextDay] = value.split('-').map(Number);
    setMonth(nextMonth);
    setDay(nextDay);
  };

  return (
    <section className="history-today-tool" aria-labelledby="history-today-title">
      <header className="history-today-header">
        <div>
          <small>KPL ARCHIVE / OFFICIAL DATA</small>
          <h2 id="history-today-title">历史上的今天</h2>
          <p>从 KPL 官方比赛档案中，查找历年同月同日发生的对局。</p>
        </div>
        {onClose && (
          <button className="history-today-close" type="button" onClick={onClose} aria-label="关闭历史上的今天" title="关闭">
            ×
          </button>
        )}
      </header>

      <div className="history-today-datebar">
        <button type="button" onClick={() => moveDay(-1)} aria-label="前一天" title="前一天">←</button>
        <div className="history-today-selectors" aria-label="选择查询日期">
          <label>
            <span>月份</span>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((value) => <option value={value} key={value}>{value} 月</option>)}
            </select>
          </label>
          <i>/</i>
          <label>
            <span>日期</span>
            <select value={day} onChange={(event) => setDay(Number(event.target.value))}>
              {Array.from({ length: daysInMonth(month) }, (_, index) => index + 1).map((value) => (
                <option value={value} key={value}>{value} 日</option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={() => moveDay(1)} aria-label="后一天" title="后一天">→</button>
      </div>

      <div className="history-today-summary">
        <div><strong>{String(month).padStart(2, '0')}</strong><span>MONTH</span></div>
        <b>/</b>
        <div><strong>{String(day).padStart(2, '0')}</strong><span>DAY</span></div>
        <p>{matches.length > 0 ? <><strong>{matches.length}</strong> 场历史比赛</> : '当日暂无收录比赛'}</p>
      </div>

      <div className="history-today-results" aria-live="polite">
        {matches.length > 0 ? (
          <ol>
            {matches.map((match) => (
              <li key={match.id}>
                <div className="history-match-date"><strong>{match.date.slice(0, 4)}</strong><span>{displayMonthDay(match.monthDay)}</span></div>
                <article>
                  <div className="history-match-meta">
                    <span>{match.season}</span>
                    {match.stage && <span>{match.stage}</span>}
                    {match.format && <span>{match.format}</span>}
                  </div>
                  <div className="history-match-score">
                    <strong className={match.winner === match.teamA ? 'winner' : ''}>{match.teamA}</strong>
                    <div><b>{match.scoreA}</b><i>:</i><b>{match.scoreB}</b></div>
                    <strong className={match.winner === match.teamB ? 'winner' : ''}>{match.teamB}</strong>
                  </div>
                  <footer>
                    <span>{match.venue || '场地未标注'}</span>
                    {match.playbackUrl && <a href={match.playbackUrl} target="_blank" rel="noreferrer">官方回放 ↗</a>}
                  </footer>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <div className="history-today-empty">
            <span>00</span>
            <h3>这一天暂无比赛记录</h3>
            <p>当前档案共收录 {ALL_MATCHES.length} 场可检索比赛。</p>
            {nearestDate && <button type="button" onClick={() => jumpTo(nearestDate)}>查看最近比赛日 · {displayMonthDay(nearestDate)}</button>}
          </div>
        )}
      </div>

      <footer className="history-today-source">
        <span><i /> 数据来源：KPL 官方赛事接口</span>
        <span>{ALL_MATCHES.length} 场比赛可检索</span>
      </footer>
    </section>
  );
}

export default HistoryTodayTool;
