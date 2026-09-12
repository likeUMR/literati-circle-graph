import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { getDetailDataset } from '../data';
import { heroOfficialProfiles } from '../data/hero-official.generated';
import type { DynastyDataset, Poet } from '../data/types';
import { useAppStore } from '../state/store';
import { color, font } from '../styles/tokens';
import { relationLabel } from './graphLabels';

type Row = Record<string, unknown>;
type LinkedItem = { node: Poet; weight: number; relation: string };

const typeNames: Record<NonNullable<Poet['type']>, string> = {
  Season: '赛季', Club: '俱乐部', Player: '选手', Hero: '英雄', Match: '比赛',
};

const heroRoles: Record<string, string> = {
  '1': '坦克', '2': '法师', '3': '战士', '4': '刺客', '5': '射手', '6': '辅助',
};

const laneNames: Record<string, string> = {
  '1': '对抗路', '2': '中路', '3': '发育路', '4': '打野', '5': '游走',
};

const sectionTitleStyle: CSSProperties = {
  color: color.goldActive,
  fontFamily: font.uiSerif,
  fontSize: 14,
  marginBottom: 8,
};

const surfaceStyle: CSSProperties = {
  border: '1px solid rgba(232,193,108,.10)',
  borderRadius: 7,
  background: 'rgba(255,255,255,.035)',
};

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object') : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item)) : [];
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function number(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function percentage(value: unknown): string {
  if (value === null || value === undefined || value === '') return '暂无';
  const result = Number(value);
  return Number.isFinite(result) ? `${(result * 100).toFixed(1)}%` : '暂无';
}

function metricPercentage(value: unknown): string {
  if (value === null || value === undefined || value === '') return '暂无';
  const result = Number(value);
  return Number.isFinite(result) ? `${result.toFixed(1)}%` : '暂无';
}

function shortDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(parsed);
}

function imageFor(poet: Poet): string | undefined {
  const stats = poet.stats ?? {};
  const direct = stats.logo_url ?? stats.avatar_url ?? stats.player_logo ?? stats.icon_url;
  if (typeof direct === 'string' && direct.startsWith('http')) return direct;
  if (Array.isArray(stats.avatar_urls)) {
    const avatar = stats.avatar_urls.find((item) => typeof item === 'string' && item.startsWith('http'));
    if (typeof avatar === 'string') return avatar;
  }
  if (Array.isArray(stats.logo_urls)) {
    const logos = stats.logo_urls.filter((item): item is string => typeof item === 'string' && item.startsWith('http'));
    if (logos.length) return logos[logos.length - 1];
  }
  if (poet.type === 'Hero') {
    const id = stats.hero_id ?? poet.id.split(':').pop();
    return `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg`;
  }
  return undefined;
}

function displayNameFor(poet: Poet): string {
  if (poet.type !== 'Player') return poet.name;
  const explicit = text(poet.stats?.current_or_latest_short_name);
  if (explicit) return explicit;
  const full = text(poet.stats?.current_or_latest_player_name) || poet.name;
  return (full.split('.').pop() || full).replace(/[（(][^）)]*[）)]$/, '').trim() || poet.name;
}

function nodeForRawId(data: DynastyDataset, type: NonNullable<Poet['type']>, value: unknown): Poet | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const prefix = type.toLowerCase();
  const id = raw.startsWith(`${prefix}:`) ? raw : `${prefix}:${raw}`;
  return data.poets.find((node) => node.id === id);
}

function clubForTeamId(data: DynastyDataset, value: unknown): Poet | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const suffix = raw.includes('_') ? raw.slice(raw.lastIndexOf('_') + 1) : raw.replace(/^club:/, '');
  return nodeForRawId(data, 'Club', suffix);
}

function linkedItems(poet: Poet, data: DynastyDataset, relation: string, type?: Poet['type']): LinkedItem[] {
  const byId = new Map(data.poets.map((node) => [node.id, node]));
  const buckets = new Map<string, LinkedItem>();
  for (const edge of data.edges) {
    if (edge.relation !== relation) continue;
    const otherId = edge.source === poet.id ? edge.target : edge.target === poet.id ? edge.source : '';
    const node = byId.get(otherId);
    if (!node || (type && node.type !== type)) continue;
    const current = buckets.get(node.id);
    if (current) current.weight += edge.weight ?? 1;
    else buckets.set(node.id, { node, weight: edge.weight ?? 1, relation });
  }
  return [...buckets.values()].sort((a, b) => b.weight - a.weight);
}

function allConnections(poet: Poet, data: DynastyDataset): LinkedItem[] {
  const byId = new Map(data.poets.map((node) => [node.id, node]));
  const buckets = new Map<string, LinkedItem>();
  for (const edge of data.edges) {
    const otherId = edge.source === poet.id ? edge.target : edge.target === poet.id ? edge.source : '';
    const node = byId.get(otherId);
    if (!node || node.id === poet.id) continue;
    const key = `${node.id}|${edge.relation}`;
    const current = buckets.get(key);
    if (current) current.weight += edge.weight ?? 1;
    else buckets.set(key, { node, weight: edge.weight ?? 1, relation: edge.relation });
  }
  return [...buckets.values()].sort((a, b) => b.weight - a.weight);
}

function relationCount(poet: Poet, data: DynastyDataset): number {
  return new Set(data.edges.flatMap((edge) => {
    if (edge.source === poet.id) return [edge.target];
    if (edge.target === poet.id) return [edge.source];
    return [];
  })).size;
}

function openNode(node?: Poet) {
  if (node) useAppStore.getState().openPanel(node.id);
}

function Section({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return <section style={{ marginTop: 18 }}>
    <div style={{ ...sectionTitleStyle, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span>{title}</span>
      {meta && <span style={{ color: color.textMuted, fontFamily: font.uiSans, fontSize: 10 }}>{meta}</span>}
    </div>
    {children}
  </section>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div style={{ ...surfaceStyle, padding: '12px 10px', color: color.textMuted, lineHeight: 1.65 }}>{children}</div>;
}

function StatGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
    {items.map(([label, value]) => <div key={label} style={{ ...surfaceStyle, padding: '8px 7px', minWidth: 0 }}>
      <div style={{ color: color.textMuted, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ color: color.goldActive, fontSize: 14, marginTop: 3, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{value === '' || value === null || value === undefined ? '暂无' : value}</div>
    </div>)}
  </div>;
}

function TagList({ values }: { values: string[] }) {
  if (!values.length) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{values.map((value) => <span key={value} style={{ padding: '4px 8px', borderRadius: 999, color: color.textSecondary, background: 'rgba(241,195,107,.09)', border: '1px solid rgba(241,195,107,.18)', fontSize: 11 }}>{value}</span>)}</div>;
}

function NodeButton({ node, detail, image = true }: { node: Poet; detail?: ReactNode; image?: boolean }) {
  const source = image ? imageFor(node) : undefined;
  return <button onClick={() => openNode(node)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', textAlign: 'left', ...surfaceStyle }}>
    {image && (source ? <img src={source} alt="" loading="lazy" style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: node.type === 'Club' ? 6 : '50%', objectFit: 'cover', background: 'rgba(255,255,255,.06)' }} /> : <span style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(241,195,107,.1)', color: color.goldActive, fontFamily: font.uiSerif }}>{displayNameFor(node).slice(-1)}</span>)}
    <span style={{ minWidth: 0, flex: 1 }}>
      <span style={{ display: 'block', color: color.textPrimary, fontFamily: font.uiSerif, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayNameFor(node)}</span>
      {detail && <span style={{ display: 'block', marginTop: 2, color: color.textMuted, fontSize: 10, lineHeight: 1.35 }}>{detail}</span>}
    </span>
    <span aria-hidden="true" style={{ color: color.goldActive, fontSize: 15 }}>›</span>
  </button>;
}

function RankedNodes({ items, unit, limit = 10 }: { items: LinkedItem[]; unit: string; limit?: number }) {
  if (!items.length) return <EmptyState>当前收录数据中暂无可展示记录。</EmptyState>;
  return <div style={{ display: 'grid', gap: 5 }}>
    {items.slice(0, limit).map((item, index) => <div key={item.node.id} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) auto', alignItems: 'center', gap: 7 }}>
      <span style={{ color: index < 3 ? color.goldActive : color.textMuted, fontSize: 11, textAlign: 'center' }}>{index + 1}</span>
      <NodeButton node={item.node} detail={`${typeNames[item.node.type ?? 'Player']}详情`} />
      <span style={{ color: color.goldActive, fontSize: 11, whiteSpace: 'nowrap' }}>{Math.round(item.weight)} {unit}</span>
    </div>)}
  </div>;
}

function HeroDetails({ poet, data }: { poet: Poet; data: DynastyDataset }) {
  const stats = poet.stats ?? {};
  const roles = strings(stats.official_roles).map((value) => heroRoles[value] ?? `定位 ${value}`);
  const lanes = strings(stats.competitive_positions).map((value) => laneNames[value] ?? `分路 ${value}`);
  const seasonMetrics = rows(stats.season_metrics).filter((item) => number(item.match_count) > 0).sort((a, b) => text(b.season_id).localeCompare(text(a.season_id)));
  const heroId = text(stats.hero_id) || poet.id.split(':').pop() || '';
  const officialProfile = heroOfficialProfiles[heroId];
  const graphSkills = rows(stats.skills);
  const skills = graphSkills.length ? graphSkills : (officialProfile?.skills ?? []) as Row[];
  const players = linkedItems(poet, data, 'USED_HERO', 'Player');
  const clubs = linkedItems(poet, data, 'USED_HERO', 'Club');
  const matches = linkedItems(poet, data, 'FEATURED_HERO', 'Match');
  const partners = linkedItems(poet, data, 'TEAMED_WITH', 'Hero');
  const opponents = linkedItems(poet, data, 'FACED', 'Hero');
  const intro = text(stats.introduction);
  const gameCount = number(stats.game_count);

  return <>
    <Section title="英雄档案"><TagList values={[...roles, ...lanes]} />
      <p style={{ margin: '9px 0 0', color: color.textSecondary, lineHeight: 1.75 }}>{intro || `在当前收录的 KPL 职业赛数据中，${poet.name}累计登场 ${gameCount} 小局，由 ${number(stats.player_count)} 位选手使用，覆盖 ${number(stats.club_count)} 家俱乐部。`}</p>
    </Section>
    <Section title="职业赛表现" meta="按已收录小局统计"><StatGrid items={[
      ['登场小局', gameCount], ['获胜小局', number(stats.game_wins)], ['小局胜率', percentage(stats.game_win_rate)],
      ['使用选手', number(stats.player_count)], ['使用俱乐部', number(stats.club_count)], ['有记录赛季', seasonMetrics.length],
    ]} /></Section>
    <Section title="技能与官方资料" meta={officialProfile ? '王者荣耀官网' : '资料待补充'}>
      {skills.length ? <div style={{ display: 'grid', gap: 7 }}>{skills.map((skill, index) => <div key={`${text(skill.name)}-${index}`} style={{ ...surfaceStyle, padding: '10px', display: 'grid', gridTemplateColumns: text(skill.icon) ? '42px minmax(0, 1fr)' : '1fr', gap: 9 }}>
        {text(skill.icon) && <img src={text(skill.icon)} alt="" loading="lazy" style={{ width: 42, height: 42, borderRadius: 6, objectFit: 'cover', background: 'rgba(255,255,255,.06)' }} />}
        <div style={{ minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}><span style={{ color: color.textPrimary, fontFamily: font.uiSerif }}>{text(skill.name) || `技能 ${index + 1}`}</span><span style={{ color: color.textMuted, fontSize: 9, textAlign: 'right' }}>{text(skill.cooldown) && `冷却 ${text(skill.cooldown)}`}{text(skill.cost) && ` · 消耗 ${text(skill.cost)}`}</span></div>{text(skill.description) && <div style={{ color: color.textMuted, lineHeight: 1.65, marginTop: 4 }}>{text(skill.description)}</div>}</div>
      </div>)}</div> : <EmptyState>当前赛事数据和王者荣耀官网旧版资料页均未提供该英雄的技能文本。此处不使用非官方内容补齐。</EmptyState>}
      {officialProfile?.sourceUrl && <a href={officialProfile.sourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: color.goldActive, fontSize: 10, textDecoration: 'none' }}>查看王者荣耀官网英雄资料 ↗</a>}
    </Section>
    {officialProfile?.story && <Section title="英雄故事" meta="王者荣耀官网"><div style={{ ...surfaceStyle, padding: '11px', color: color.textSecondary, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{officialProfile.story}</div></Section>}
    <Section title="选手使用排行" meta={`${players.length} 位选手`}><RankedNodes items={players} unit="局" limit={12} /></Section>
    <Section title="俱乐部使用排行" meta={`${clubs.length} 家俱乐部`}><RankedNodes items={clubs} unit="局" limit={10} /></Section>
    <Section title="赛季表现" meta={`${seasonMetrics.length} 个有登场记录的赛季`}>
      {seasonMetrics.length ? <div style={{ display: 'grid', gap: 6 }}>{seasonMetrics.slice(0, 14).map((item) => {
        const season = nodeForRawId(data, 'Season', item.season_id);
        const bestPlayer = nodeForRawId(data, 'Player', item.player_id);
        const content = <div style={{ ...surfaceStyle, padding: '9px 10px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: color.textPrimary, fontFamily: font.uiSerif }}>{season?.name ?? text(item.season_id)}</span><span style={{ color: color.goldActive }}>{number(item.match_count)} 局 · {percentage(item.win_cr)}</span></div>{text(item.player_name) && <div style={{ color: color.textMuted, marginTop: 4 }}>当季代表选手：{text(item.player_name)}{number(item.best_player_win_cr) > 0 ? ` · 胜率 ${percentage(item.best_player_win_cr)}` : ''}</div>}</div>;
        return <div key={text(item.season_id)}>{season ? <button onClick={() => openNode(season)} style={{ width: '100%', textAlign: 'left' }}>{content}</button> : content}{bestPlayer && <button onClick={() => openNode(bestPlayer)} style={{ color: color.goldActive, fontSize: 10, margin: '4px 0 0 10px' }}>查看代表选手 ›</button>}</div>;
      })}</div> : <EmptyState>暂无按赛季拆分的登场记录。</EmptyState>}
    </Section>
    <Section title="近期收录比赛" meta={`${matches.length} 场`}><div style={{ display: 'grid', gap: 5 }}>{matches.slice(0, 8).map((item) => <NodeButton key={item.node.id} node={item.node} detail={`本场登场 ${Math.round(item.weight)} 局`} image={false} />)}</div></Section>
    <Section title="常见阵容搭档" meta="同局共同登场"><RankedNodes items={partners} unit="次" limit={8} /></Section>
    <Section title="常见对位英雄" meta="同局对方登场"><RankedNodes items={opponents} unit="次" limit={8} /></Section>
  </>;
}

function PlayerDetails({ poet, data }: { poet: Poet; data: DynastyDataset }) {
  const stats = poet.stats ?? {};
  const topHeroes = rows(stats.top_heroes).map((item) => ({ node: nodeForRawId(data, 'Hero', item.hero_id), games: number(item.games) })).filter((item): item is { node: Poet; games: number } => Boolean(item.node));
  const performances = rows(stats.season_performance).sort((a, b) => text(b.season_id).localeCompare(text(a.season_id)));
  const seasons = strings(stats.season_ids).map((id) => nodeForRawId(data, 'Season', id)).filter((node): node is Poet => Boolean(node)).reverse();
  const clubs = strings(stats.club_ids).map((id) => nodeForRawId(data, 'Club', id)).filter((node): node is Poet => Boolean(node));
  const teammates = linkedItems(poet, data, 'TEAMMATE_OF', 'Player');
  const opponents = linkedItems(poet, data, 'FACED', 'Player');
  const matches = linkedItems(poet, data, 'FEATURED_PLAYER', 'Match');
  const alias = strings(stats.aliases_json).filter((value) => value !== poet.name);

  return <>
    <Section title="选手档案"><StatGrid items={[
      ['真实姓名', text(stats.real_name) || '暂无公开信息'], ['比赛 ID', displayNameFor(poet)], ['常用位置', text(stats.latest_position_name) || '暂无'],
      ['参赛赛季', number(stats.season_profile_count)], ['出场小局', number(stats.game_count)], ['小局胜率', percentage(stats.game_win_rate)],
    ]} />{alias.length > 0 && <div style={{ marginTop: 9 }}><TagList values={alias} /></div>}</Section>
    <Section title="英雄池" meta={`使用过 ${number(stats.hero_count)} 位英雄`}>
      {topHeroes.length ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{topHeroes.map((item, index) => <NodeButton key={item.node.id} node={item.node} detail={`第 ${index + 1} 位 · ${item.games} 局`} />)}</div> : <EmptyState>暂无英雄使用记录。</EmptyState>}
    </Section>
    <Section title="赛季表现" meta={`${performances.length} 个赛季有详细指标`}>
      {performances.length ? <div style={{ display: 'grid', gap: 7 }}>{performances.map((item) => {
        const season = nodeForRawId(data, 'Season', item.season_id);
        const club = clubForTeamId(data, item.team_id);
        return <div key={text(item.player_season_key) || text(item.season_id)} style={{ ...surfaceStyle, padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><button onClick={() => openNode(season)} style={{ color: color.textPrimary, fontFamily: font.uiSerif, textAlign: 'left' }}>{season?.name ?? text(item.season_id)}</button><span style={{ color: color.goldActive }}>KDA {text(item.kda) || '暂无'}</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginTop: 8, color: color.textMuted, fontSize: 10 }}><span>{number(item.match_count)} 局</span><span>{number(item.total_kills)} 击杀</span><span>参团 {metricPercentage(item.avg_kill_participation_pct)}</span><span>输出 {metricPercentage(item.avg_damage_share_pct)}</span><span>承伤 {metricPercentage(item.avg_damage_taken_share_pct)}</span><span>经济 {metricPercentage(item.avg_gold_share_pct)}</span></div>
          {club && <button onClick={() => openNode(club)} style={{ marginTop: 7, color: color.goldActive, fontSize: 10 }}>{club.name} · 查看俱乐部 ›</button>}
        </div>;
      })}</div> : <EmptyState>该选手暂无赛季级 KDA、输出或经济占比数据。</EmptyState>}
    </Section>
    <Section title="效力俱乐部" meta={`${clubs.length} 家`}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{clubs.map((node) => <NodeButton key={node.id} node={node} />)}</div></Section>
    <Section title="参赛履历" meta={`${seasons.length} 个赛季`}><div style={{ display: 'grid', gap: 5 }}>{seasons.map((node) => <NodeButton key={node.id} node={node} image={false} />)}</div></Section>
    <Section title="高频队友" meta="同场共同出战"><RankedNodes items={teammates} unit="局" limit={10} /></Section>
    <Section title="交手最多的选手" meta="对方阵容"><RankedNodes items={opponents} unit="局" limit={10} /></Section>
    <Section title="近期收录比赛" meta={`${matches.length} 场`}><div style={{ display: 'grid', gap: 5 }}>{matches.slice(0, 10).map((item) => <NodeButton key={item.node.id} node={item.node} detail={`出战 ${Math.round(item.weight)} 局`} image={false} />)}</div></Section>
  </>;
}

function ClubDetails({ poet, data }: { poet: Poet; data: DynastyDataset }) {
  const stats = poet.stats ?? {};
  const aliases = strings(stats.aliases).filter((name) => name !== poet.name);
  const seasons = strings(stats.season_ids).map((id) => nodeForRawId(data, 'Season', id)).filter((node): node is Poet => Boolean(node)).reverse();
  const players = linkedItems(poet, data, 'ROSTERED_PLAYER', 'Player');
  const heroes = linkedItems(poet, data, 'USED_HERO', 'Hero');
  const opponents = linkedItems(poet, data, 'FACED', 'Club');
  const matches = linkedItems(poet, data, 'PARTICIPATED_BY', 'Match');
  const titles = data.poets.filter((node) => node.type === 'Season' && node.stats?.champion_club_id === poet.id);
  const runnerUps = data.poets.filter((node) => node.type === 'Season' && node.stats?.runner_up_club_id === poet.id);

  return <>
    <Section title="俱乐部概览"><StatGrid items={[
      ['系列赛', number(stats.match_count)], ['系列赛胜场', number(stats.match_wins)], ['系列赛胜率', percentage(stats.match_win_rate)],
      ['出战小局', number(stats.game_count)], ['小局胜场', number(stats.game_wins)], ['参赛赛季', seasons.length],
    ]} />{aliases.length > 0 && <div style={{ marginTop: 10 }}><div style={{ color: color.textMuted, fontSize: 10, marginBottom: 6 }}>历史名称</div><TagList values={aliases} /></div>}</Section>
    <Section title="赛事荣誉" meta={`${titles.length} 冠 · ${runnerUps.length} 亚`}>
      {titles.length || runnerUps.length ? <div style={{ display: 'grid', gap: 6 }}>{titles.map((node) => <NodeButton key={node.id} node={node} detail="冠军" image={false} />)}{runnerUps.map((node) => <NodeButton key={node.id} node={node} detail="亚军" image={false} />)}</div> : <EmptyState>在当前收录的赛季冠亚军记录中，暂无该俱乐部的领奖台记录。</EmptyState>}
    </Section>
    <Section title="代表选手" meta={`${players.length} 位有出场记录`}><RankedNodes items={players} unit="局" limit={14} /></Section>
    <Section title="常用英雄" meta={`${heroes.length} 位英雄`}><RankedNodes items={heroes} unit="局" limit={12} /></Section>
    <Section title="主要对手" meta="按交手小局排序"><RankedNodes items={opponents} unit="局" limit={12} /></Section>
    <Section title="参赛赛季" meta={`${seasons.length} 个`}><div style={{ display: 'grid', gap: 5 }}>{seasons.map((node) => <NodeButton key={node.id} node={node} image={false} />)}</div></Section>
    <Section title="近期收录比赛" meta={`${matches.length} 场`}><div style={{ display: 'grid', gap: 5 }}>{matches.slice(0, 12).map((item) => <NodeButton key={item.node.id} node={item.node} detail={`本场获得 ${Math.round(item.weight)} 个小局胜场`} image={false} />)}</div></Section>
  </>;
}

function SeasonDetails({ poet, data }: { poet: Poet; data: DynastyDataset }) {
  const stats = poet.stats ?? {};
  const champion = nodeForRawId(data, 'Club', stats.champion_club_id);
  const runnerUp = nodeForRawId(data, 'Club', stats.runner_up_club_id);
  const clubs = linkedItems(poet, data, 'PARTICIPATED_BY', 'Club');
  const players = linkedItems(poet, data, 'FEATURED_PLAYER', 'Player');
  const heroes = linkedItems(poet, data, 'FEATURED_HERO', 'Hero');
  const matches = linkedItems(poet, data, 'HAS_MATCH', 'Match').sort((a, b) => text(b.node.stats?.start_time_china).localeCompare(text(a.node.stats?.start_time_china)));
  const adjacent = linkedItems(poet, data, 'NEXT_SEASON', 'Season');

  return <>
    <Section title="赛季概览"><StatGrid items={[
      ['赛事状态', text(stats.status) === 'active' ? '进行中' : '已结束'], ['比赛场数', number(stats.match_count)], ['比赛小局', number(stats.game_count)],
      ['参赛俱乐部', number(stats.club_count)], ['收录选手', number(stats.known_player_count)], ['有登场英雄', number(stats.known_hero_count)],
    ]} />{text(stats.season_time_description) && <p style={{ color: color.textMuted, lineHeight: 1.7, margin: '9px 0 0' }}>赛事时间：{text(stats.season_time_description)}</p>}</Section>
    <Section title="最终名次">{champion || runnerUp ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>{champion && <NodeButton node={champion} detail="冠军" />}{runnerUp && <NodeButton node={runnerUp} detail="亚军" />}</div> : <EmptyState>该赛季暂无可确认的冠亚军记录。</EmptyState>}</Section>
    <Section title="参赛俱乐部" meta={`${clubs.length} 家`}><RankedNodes items={clubs} unit="系列赛胜场" limit={20} /></Section>
    <Section title="高频出场选手" meta={`${players.length} 位`}><RankedNodes items={players} unit="局" limit={12} /></Section>
    <Section title="英雄赛场热度" meta={`${heroes.length} 位`}><RankedNodes items={heroes} unit="局" limit={12} /></Section>
    <Section title="重点比赛档案" meta={`当前星图收录 ${matches.length} 场`}><div style={{ display: 'grid', gap: 5 }}>{matches.map((item) => <NodeButton key={item.node.id} node={item.node} detail={shortDate(item.node.stats?.start_time_china) || text(item.node.stats?.stage_name)} image={false} />)}</div></Section>
    <Section title="前后赛季"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{adjacent.map((item) => <NodeButton key={item.node.id} node={item.node} image={false} />)}</div></Section>
  </>;
}

function playerNodeFromRound(data: DynastyDataset, player: Row): Poet | undefined {
  return nodeForRawId(data, 'Player', player.player_id);
}

function HeroPick({ player, data }: { player: Row; data: DynastyDataset }) {
  const playerNode = playerNodeFromRound(data, player);
  const heroNode = nodeForRawId(data, 'Hero', player.hero_id);
  const displayName = text(player.player_name_short) || text(player.player_name) || playerNode?.name || '未知选手';
  return <div style={{ ...surfaceStyle, padding: '7px 8px', minWidth: 0 }}>
    <button disabled={!playerNode} onClick={() => openNode(playerNode)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 5, textAlign: 'left' }}><span style={{ color: color.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span><span style={{ color: color.textMuted, fontSize: 10 }}>{text(player.position_name)}</span></button>
    <button disabled={!heroNode} onClick={() => openNode(heroNode)} style={{ color: color.goldActive, fontSize: 10, marginTop: 3 }}>{text(player.hero_name) || heroNode?.name || '英雄未记录'}{heroNode ? ' ›' : ''}</button>
  </div>;
}

function MatchDetails({ poet, data }: { poet: Poet; data: DynastyDataset }) {
  const stats = poet.stats ?? {};
  const rounds = rows(stats.rounds);
  const [openRounds, setOpenRounds] = useState<Set<string>>(() => new Set(rounds.length ? [text(rounds[0].game_id)] : []));
  const teamA = nodeForRawId(data, 'Club', stats.team_a_club_id);
  const teamB = nodeForRawId(data, 'Club', stats.team_b_club_id);
  const allPlayers = rounds.flatMap((round) => rows(round.players));
  const uniquePlayers = [...new Map(allPlayers.map((player) => [text(player.player_id) || text(player.player_name), player])).values()];
  const rosterA = uniquePlayers.filter((player) => text(player.side) === 'A');
  const rosterB = uniquePlayers.filter((player) => text(player.side) === 'B');
  const season = nodeForRawId(data, 'Season', stats.season_id);
  const matchStatus = text(stats.winner_side) || text(stats.winner_club_id) ? '已结束' : text(stats.status_text) || '待确认';

  const toggleRound = (id: string) => setOpenRounds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return <>
    <Section title="比赛信息"><StatGrid items={[
      ['赛事阶段', text(stats.stage_name)], ['赛制', text(stats.competition_format) || `BO${number(stats.bo_total)}`], ['比赛状态', matchStatus],
      ['开赛时间', shortDate(stats.start_time_china)], ['比赛地点', [text(stats.venue_city), text(stats.venue_name)].filter(Boolean).join(' · ')], ['实际局数', rounds.length],
    ]} />{season && <div style={{ marginTop: 7 }}><NodeButton node={season} detail="返回所属赛季" image={false} /></div>}</Section>
    <Section title="最终比分"><div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'stretch' }}>
      <TeamCard node={teamA} name={text(stats.team_a_name)} score={text(stats.team_a_score)} group={text(stats.team_a_group)} winner={text(stats.winner_side) === 'A'} />
      <div style={{ alignSelf: 'center', color: color.textMuted, fontSize: 10 }}>VS</div>
      <TeamCard node={teamB} name={text(stats.team_b_name)} score={text(stats.team_b_score)} group={text(stats.team_b_group)} winner={text(stats.winner_side) === 'B'} />
    </div></Section>
    <Section title="完整参赛阵容" meta={`${uniquePlayers.length} 位选手`}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {[{ label: text(stats.team_a_name), list: rosterA }, { label: text(stats.team_b_name), list: rosterB }].map((team) => <div key={team.label} style={{ minWidth: 0 }}><div style={{ color: color.textMuted, fontSize: 10, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.label}</div><div style={{ display: 'grid', gap: 5 }}>{team.list.map((player) => { const node = playerNodeFromRound(data, player); return node ? <NodeButton key={text(player.player_id)} node={node} detail={text(player.position_name)} /> : <div key={text(player.player_name)} style={{ ...surfaceStyle, padding: 8 }}>{text(player.player_name)}</div>; })}</div></div>)}
    </div></Section>
    <Section title="逐局详情" meta={`${rounds.length} 局 · 点击展开阵容`}><div style={{ display: 'grid', gap: 7 }}>{rounds.map((round, index) => {
      const id = text(round.game_id) || String(index);
      const expanded = openRounds.has(id);
      const players = rows(round.players);
      return <div key={id} style={surfaceStyle}>
        <button onClick={() => toggleRound(id)} style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}><span style={{ color: color.textPrimary, fontFamily: font.uiSerif }}>第 {number(round.round_number) || index + 1} 局 · {text(round.winner_team_name)}获胜</span><span style={{ color: color.goldActive }}>{number(round.series_score_after_game_a)} : {number(round.series_score_after_game_b)} <span style={{ marginLeft: 8 }}>{expanded ? '−' : '+'}</span></span></button>
        {expanded && <div style={{ padding: '0 9px 10px' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>{players.map((player, playerIndex) => <HeroPick key={`${text(player.player_id)}-${playerIndex}`} player={player} data={data} />)}</div>{text(round.official_playback_url) && <a href={text(round.official_playback_url)} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 9, color: color.goldActive, fontSize: 11, textDecoration: 'none' }}>观看本局官方回放 ↗</a>}</div>}
      </div>;
    })}</div></Section>
  </>;
}

function TeamCard({ node, name, score, group, winner }: { node?: Poet; name: string; score: string; group: string; winner: boolean }) {
  const content = <><div style={{ color: winner ? color.goldActive : color.textPrimary, fontFamily: font.uiSerif, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || '未知队伍'}</div><div style={{ color: winner ? color.goldActive : color.textSecondary, fontSize: 25, marginTop: 3 }}>{score || '—'}</div><div style={{ color: color.textMuted, fontSize: 10 }}>{winner ? '胜方' : group ? `${group} 组` : '参赛方'}</div></>;
  return node ? <button onClick={() => openNode(node)} style={{ ...surfaceStyle, minWidth: 0, padding: '10px 7px', textAlign: 'center' }}>{content}</button> : <div style={{ ...surfaceStyle, minWidth: 0, padding: '10px 7px', textAlign: 'center' }}>{content}</div>;
}

function MoreConnections({ poet, data }: { poet: Poet; data: DynastyDataset }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const connections = useMemo(() => allConnections(poet, data), [poet, data]);
  return <Section title="更多关系" meta={`${connections.length} 组关联`}><div style={{ display: 'grid', gap: 5 }}>{connections.slice(0, 28).map((item) => {
    const key = `${item.node.id}|${item.relation}`;
    return <div key={key}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto 22px', alignItems: 'center', gap: 5 }}><NodeButton node={item.node} detail={typeNames[item.node.type ?? 'Player']} image={false} /><span style={{ color: color.textMuted, fontSize: 10, whiteSpace: 'nowrap' }}>{relationLabel(item.relation)} · {Math.round(item.weight)}</span><button onClick={() => setExpanded(expanded === key ? null : key)} aria-label="展开关系说明" style={{ color: color.goldActive, fontSize: 15 }}>{expanded === key ? '−' : '+'}</button></div>
      {expanded === key && <div style={{ margin: '4px 0 2px 8px', padding: '8px 10px', borderLeft: '1px solid rgba(241,195,107,.25)', color: color.textMuted, lineHeight: 1.6 }}>{displayNameFor(poet)}与{displayNameFor(item.node)}之间记录了 {Math.round(item.weight)} 次“{relationLabel(item.relation)}”关系。点击名称可继续查看对方的完整详情。</div>}
    </div>;
  })}</div></Section>;
}

function DetailContent({ poet, data }: { poet: Poet; data: DynastyDataset }) {
  if (poet.type === 'Hero') return <HeroDetails poet={poet} data={data} />;
  if (poet.type === 'Player') return <PlayerDetails poet={poet} data={data} />;
  if (poet.type === 'Club') return <ClubDetails poet={poet} data={data} />;
  if (poet.type === 'Season') return <SeasonDetails poet={poet} data={data} />;
  return <MatchDetails poet={poet} data={data} />;
}

export function PoetPanel() {
  const panelOpen = useAppStore((state) => state.panelOpen);
  const selectedPoetId = useAppStore((state) => state.selectedPoetId);
  const closePanel = useAppStore((state) => state.closePanel);
  const data = getDetailDataset();
  const poet = useMemo(() => data.poets.find((node) => node.id === selectedPoetId) ?? null, [data.poets, selectedPoetId]);
  const count = useMemo(() => poet ? relationCount(poet, data) : 0, [poet, data]);
  const image = poet ? imageFor(poet) : undefined;

  useEffect(() => {
    document.querySelector<HTMLElement>('[data-node-detail-scroll]')?.scrollTo({ top: 0 });
  }, [selectedPoetId]);

  return <AnimatePresence>{panelOpen && poet && <motion.aside
    key={poet.id}
    initial={{ x: 36, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 36, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 220, damping: 26 }}
    style={{ position: 'fixed', right: 16, top: 70, bottom: 16, width: 410, maxWidth: 'calc(100vw - 24px)', border: `1px solid ${color.panelBorder}`, borderRadius: 10, background: color.panelBg, backdropFilter: 'blur(10px)', boxShadow: '0 18px 60px rgba(0,0,0,.36)', color: color.textSecondary, fontFamily: font.uiSans, fontSize: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 6 }}
  >
    <header style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 12px 12px 15px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(180deg, rgba(241,195,107,.055), transparent)' }}>
      {image ? <img src={image} alt={`${displayNameFor(poet)}形象`} style={{ width: 48, height: 48, flex: '0 0 auto', borderRadius: poet.type === 'Club' ? 8 : '50%', objectFit: 'cover', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(241,195,107,.22)' }} /> : <div style={{ width: 48, height: 48, flex: '0 0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', color: color.goldActive, fontFamily: font.uiSerif, fontSize: 19, background: 'rgba(241,195,107,.09)', border: '1px solid rgba(241,195,107,.18)' }}>{displayNameFor(poet).slice(-1)}</div>}
      <div style={{ minWidth: 0, flex: 1 }}><div style={{ color: color.textPrimary, fontFamily: font.uiSerif, fontSize: 19, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayNameFor(poet)}</div><div style={{ marginTop: 3, color: color.textMuted, fontSize: 10 }}>{typeNames[poet.type ?? 'Player']} · {count} 个关联节点 · 可继续点击探索</div></div>
      <button onClick={closePanel} aria-label="关闭详情" title="关闭" style={{ width: 28, height: 28, flex: '0 0 auto', borderRadius: '50%', color: color.textMuted, fontSize: 18 }}>×</button>
    </header>
    <div data-node-detail-scroll style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 13px 16px 15px' }}>
      <DetailContent poet={poet} data={data} />
      <MoreConnections poet={poet} data={data} />
      <section style={{ marginTop: 20, padding: '11px 0 2px', borderTop: '1px solid rgba(255,255,255,.07)', color: color.textMuted, fontSize: 10, lineHeight: 1.6 }}>数据来源：KPL 官方公开赛事数据。胜率、排行和关联次数均由当前收录记录计算；资料缺失处不会用推测内容补齐。</section>
    </div>
  </motion.aside>}</AnimatePresence>;
}
