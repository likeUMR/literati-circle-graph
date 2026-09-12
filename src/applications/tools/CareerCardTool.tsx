import { useMemo, useState } from 'react';
import { getDetailDataset } from '../../data';
import type { Poet } from '../../data';
import './CareerCardTool.css';

type StatRecord = Record<string, unknown>;

interface SeasonPerformance {
  season_id: string;
  team_id: string;
  match_count: number;
  kda: string;
  total_kills: number;
  avg_damage_share_pct: string;
  avg_kill_participation_pct: string;
}

interface HeroUsage {
  hero_id: string;
  games: number;
}

interface PlayerStats extends StatRecord {
  current_or_latest_player_name?: string;
  current_or_latest_short_name?: string;
  real_name?: string;
  latest_position_name?: string;
  avatar_url?: string | null;
  aliases_json?: string[];
  season_profile_count?: number;
  game_count?: number;
  game_wins?: number;
  game_win_rate?: number;
  hero_count?: number;
  top_heroes?: HeroUsage[];
  season_performance?: SeasonPerformance[];
  birth_date?: string | null;
  native_place?: string | null;
  career_start_date?: string | null;
  data_source?: string;
}

interface CareerCardToolProps {
  onClose?: () => void;
}

const dataset = getDetailDataset();
const nodeById = new Map(dataset.poets.map((node) => [node.id, node]));
const players = dataset.poets
  .filter((node) => node.type === 'Player')
  .sort((a, b) => (playerStats(b).game_count ?? 0) - (playerStats(a).game_count ?? 0));

function playerStats(node: Poet): PlayerStats {
  return (node.stats ?? {}) as PlayerStats;
}

function statString(node: Poet | undefined, key: string): string | undefined {
  const value = node?.stats?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

function statList(node: Poet | undefined, key: string): string | undefined {
  const value = node?.stats?.[key];
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value.join(' / ')
    : undefined;
}

function clubForTeam(teamId: string): Poet | undefined {
  const suffix = teamId.slice(teamId.indexOf('_') + 1);
  return nodeById.get(`club:${suffix}`);
}

function formatPercent(value: number | undefined): string {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '暂无';
}

function initials(name: string): string {
  return name.replace(/^.*\./, '').slice(0, 2).toUpperCase();
}

export function CareerCardTool({ onClose }: CareerCardToolProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(players[0]?.id ?? '');

  const matches = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    const pool = keyword
      ? players.filter((player) => {
          const stats = playerStats(player);
          const terms = [player.name, stats.real_name, stats.current_or_latest_player_name, ...(stats.aliases_json ?? [])];
          return terms.some((term) => term?.toLocaleLowerCase().includes(keyword));
        })
      : players;
    return pool.slice(0, 8);
  }, [query]);

  const player = nodeById.get(selectedId);
  const stats = player ? playerStats(player) : undefined;
  const seasonRows = (stats?.season_performance ?? [])
    .map((row) => ({
      ...row,
      season: nodeById.get(`season:${row.season_id}`),
      club: clubForTeam(row.team_id),
    }))
    .sort((a, b) => a.season_id.localeCompare(b.season_id));
  const heroRows = (stats?.top_heroes ?? [])
    .map((usage) => ({ usage, hero: nodeById.get(`hero:${usage.hero_id}`) }))
    .filter((row): row is { usage: HeroUsage; hero: Poet } => Boolean(row.hero))
    .slice(0, 6);
  const teammateRows = player
    ? dataset.edges
        .filter((edge) => edge.relation === 'TEAMMATE_OF' && (edge.source === player.id || edge.target === player.id))
        .map((edge) => ({
          edge,
          teammate: nodeById.get(edge.source === player.id ? edge.target : edge.source),
        }))
        .filter((row): row is { edge: (typeof dataset.edges)[number]; teammate: Poet } => Boolean(row.teammate))
        .sort((a, b) => (b.edge.weight ?? 0) - (a.edge.weight ?? 0))
        .slice(0, 5)
    : [];

  const selectPlayer = (id: string) => {
    setSelectedId(id);
    setQuery('');
  };

  return (
    <section className="career-tool" aria-label="KPL 选手生涯卡">
      <header className="career-tool__header">
        <div>
          <small>KPL OFFICIAL DATA / PLAYER PROFILE</small>
          <h1>选手生涯卡</h1>
        </div>
        {onClose && <button type="button" className="career-tool__close" onClick={onClose} aria-label="关闭选手生涯卡" title="关闭">×</button>}
      </header>

      <div className="career-tool__layout">
        <aside className="career-search">
          <label htmlFor="career-player-search">搜索选手</label>
          <div className="career-search__input-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              id="career-player-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID、姓名或曾用名"
              autoComplete="off"
            />
          </div>
          <p>{query ? `找到 ${matches.length} 位匹配选手` : `已收录 ${players.length} 位选手`}</p>
          <div className="career-search__results" role="listbox" aria-label="选手列表">
            {matches.map((candidate) => {
              const candidateStats = playerStats(candidate);
              const active = candidate.id === selectedId;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? 'is-active' : ''}
                  key={candidate.id}
                  onClick={() => selectPlayer(candidate.id)}
                >
                  <span>{initials(candidate.name)}</span>
                  <b>{candidate.name}</b>
                  <small>{candidateStats.latest_position_name || '位置未记录'}</small>
                </button>
              );
            })}
            {matches.length === 0 && <div className="career-search__empty">没有匹配选手，试试其他姓名或曾用名。</div>}
          </div>
        </aside>

        <main className="career-profile">
          {!player || !stats ? (
            <div className="career-profile__empty">请从左侧选择一位选手查看生涯记录。</div>
          ) : (
            <>
              <section className="career-identity">
                <div className="career-avatar">
                  <span>{initials(player.name)}</span>
                  {stats.avatar_url && (
                    <img
                      src={stats.avatar_url}
                      alt={`${player.name} 选手头像`}
                      onError={(event) => { event.currentTarget.hidden = true; }}
                    />
                  )}
                </div>
                <div className="career-identity__copy">
                  <div className="career-identity__tags">
                    <span>{stats.latest_position_name || '位置未记录'}</span>
                    <span>{stats.data_source === 'KPL_OFFICIAL' ? 'KPL 官方数据' : stats.data_source || '数据源未记录'}</span>
                  </div>
                  <h2>{player.name}</h2>
                  {stats.real_name && <p>{stats.real_name}</p>}
                  <dl>
                    {stats.birth_date && <div><dt>出生日期</dt><dd>{stats.birth_date}</dd></div>}
                    {stats.native_place && <div><dt>籍贯</dt><dd>{stats.native_place}</dd></div>}
                    {stats.career_start_date && <div><dt>职业起始</dt><dd>{stats.career_start_date}</dd></div>}
                    <div><dt>资料赛季</dt><dd>{stats.season_profile_count ?? seasonRows.length} 个</dd></div>
                  </dl>
                </div>
              </section>

              <section className="career-metrics" aria-label="选手生涯数据">
                <div><small>小局数</small><strong>{stats.game_count?.toLocaleString() ?? '暂无'}</strong></div>
                <div><small>胜场</small><strong>{stats.game_wins?.toLocaleString() ?? '暂无'}</strong></div>
                <div><small>小局胜率</small><strong>{formatPercent(stats.game_win_rate)}</strong></div>
                <div><small>使用英雄</small><strong>{stats.hero_count ?? '暂无'}</strong></div>
              </section>

              <section className="career-section">
                <div className="career-section__title"><h3>赛季轨迹</h3><span>{seasonRows.length} 条官方赛季表现</span></div>
                {seasonRows.length ? (
                  <div className="career-timeline">
                    {seasonRows.map((row) => (
                      <article key={`${row.season_id}:${row.team_id}`}>
                        <i aria-hidden="true" />
                        <div className="career-timeline__heading">
                          <div><strong>{row.season?.name ?? row.season_id}</strong><span>{row.club?.name ?? row.team_id}</span></div>
                          <b>{row.match_count} 小局</b>
                        </div>
                        <dl>
                          <div><dt>KDA</dt><dd>{row.kda || '暂无'}</dd></div>
                          <div><dt>击杀</dt><dd>{row.total_kills}</dd></div>
                          <div><dt>输出占比</dt><dd>{row.avg_damage_share_pct ? `${row.avg_damage_share_pct}%` : '暂无'}</dd></div>
                          <div><dt>参团率</dt><dd>{Number(row.avg_kill_participation_pct) > 0 ? `${row.avg_kill_participation_pct}%` : '未收录'}</dd></div>
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : <div className="career-inline-empty">暂无可展示的赛季表现记录。</div>}
              </section>

              <div className="career-evidence-grid">
                <section className="career-section">
                  <div className="career-section__title"><h3>常用英雄</h3><span>累计出场</span></div>
                  {heroRows.length ? <div className="career-heroes">
                    {heroRows.map(({ hero, usage }, index) => (
                      <article key={hero.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <div><strong>{hero.name}</strong><small>{statList(hero, 'official_roles') || statString(hero, 'hero_name') || '英雄'}</small></div>
                        <b>{usage.games}<small>局</small></b>
                      </article>
                    ))}
                  </div> : <div className="career-inline-empty">暂无可匹配的英雄出场记录。</div>}
                </section>

                <section className="career-section">
                  <div className="career-section__title"><h3>队友证据</h3><span>TEAMMATE_OF</span></div>
                  {teammateRows.length ? <div className="career-teammates">
                    {teammateRows.map(({ edge, teammate }) => (
                      <article key={teammate.id}>
                        <span>{initials(teammate.name)}</span>
                        <div><strong>{teammate.name}</strong><small>共同出场小局</small></div>
                        <b>{edge.weight ?? 0}</b>
                      </article>
                    ))}
                  </div> : <div className="career-inline-empty">当前数据中暂无队友共现记录。</div>}
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  );
}

export default CareerCardTool;
