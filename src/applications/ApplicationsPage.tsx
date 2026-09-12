import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type Tone = 'amber' | 'cyan' | 'coral' | 'mint' | 'violet';
type Visual = 'arena' | 'poster' | 'map' | 'draft' | 'timeline' | 'signal' | 'cards' | 'radar';

interface Capability {
  id: string;
  kicker: string;
  title: string;
  copy: string;
  source: string;
  metric?: string;
  tone: Tone;
  visual: Visual;
  size: 'compact' | 'medium' | 'tall' | 'hero';
  featured?: boolean;
}

interface RouteStage {
  number: string;
  label: string;
  title: string;
  copy: string;
  input: string;
  output: string;
  proof: string;
  tone: Tone;
}

const routeStages: RouteStage[] = [
  { number: '01', label: 'READ', title: '读懂资产', copy: '把节点和关系变成可解释的战队、选手、英雄与赛季洞察。', input: '图谱节点 / 关系 / 时间', output: '战队 DNA、英雄池、宿敌指数', proof: '可复用洞察组件', tone: 'amber' },
  { number: '02', label: 'PACKAGE', title: '包装内容', copy: '同一条事实一次查询，多端输出成稿、海报、数据卡和视频脚本。', input: '洞察 + 比赛上下文', output: '赛前预告、战报、社媒内容包', proof: '发布时效 < 10 min', tone: 'cyan' },
  { number: '03', label: 'PLAY', title: '做成互动', copy: '把真实数据变成可以参与的选择、竞猜、剧情和训练挑战。', input: '阵容 / BP / 交手历史', output: '专属游戏、BP 竞猜、阵容挑战', proof: '互动完成率 / 留存', tone: 'coral' },
  { number: '04', label: 'CONNECT', title: '连接城市', copy: '将主场、赛程和粉丝行为组织成比赛日路线与城市电竞地图。', input: '地点 + 赛程 + 粉丝偏好', output: '打卡任务、观赛路线、联名权益', proof: '到场转化 / 消费核销', tone: 'mint' },
];

const capabilities: Capability[] = [
  { id: 'team-game', kicker: 'IP GAME', title: '战队专属游戏', copy: '将队史、宿敌与招牌英雄转化为可玩的俱乐部叙事。', source: '战队 × 选手 × 英雄', metric: '一键换队', tone: 'amber', visual: 'arena', size: 'hero', featured: true },
  { id: 'player-card', kicker: 'FAN IDENTITY', title: '选手生涯卡', copy: '自动汇总效力轨迹、常用英雄与高光赛季。', source: '选手 × 赛季', tone: 'cyan', visual: 'cards', size: 'medium' },
  { id: 'bp-quiz', kicker: 'LIVE PLAY', title: 'BP 竞猜', copy: '从真实阵容关系生成赛前竞猜与解题挑战。', source: '635 局 BP 数据', metric: '实时互动', tone: 'coral', visual: 'draft', size: 'tall' },
  { id: 'rivalry', kicker: 'RIVALRY', title: '宿敌对决', copy: '把历史交手强度变成挑战关卡与胜负叙事。', source: '战队 × 战队', tone: 'violet', visual: 'signal', size: 'compact' },
  { id: 'fan-studio', kicker: 'CONTENT STUDIO', title: '粉丝内容工厂', copy: '选择战队、选手和比赛，即时生成一套专属应援内容。', source: '偏好 × 图谱事实', metric: '千人千面', tone: 'coral', visual: 'poster', size: 'hero', featured: true },
  { id: 'preview', kicker: 'MATCH DAY', title: '赛前预告', copy: '近期状态、历史交手和看点自动成稿。', source: '比赛 × 战绩', tone: 'mint', visual: 'signal', size: 'medium' },
  { id: 'today', kicker: 'ARCHIVE', title: '历史上的今天', copy: '让十年赛事档案持续回到内容流。', source: '23 个赛季', tone: 'amber', visual: 'timeline', size: 'tall' },
  { id: 'recap', kicker: 'AUTO RECAP', title: '智能战报', copy: '比分、阵容和关键关系组成结构化赛后内容。', source: '2,875 场比赛', tone: 'cyan', visual: 'radar', size: 'compact' },
  { id: 'city-map', kicker: 'CITY EXPERIENCE', title: '城市电竞地图', copy: '把主场、赛程、打卡与本地消费组织成比赛日路线。', source: '城市 × 战队 × 赛程', metric: '连接线下', tone: 'mint', visual: 'map', size: 'hero', featured: true },
  { id: 'route', kicker: 'MATCH ROUTE', title: '观赛路线', copy: '从到站、场馆到赛后活动的一站式动线。', source: '场馆 × 活动', tone: 'violet', visual: 'map', size: 'medium' },
  { id: 'checkin', kicker: 'CITY BADGE', title: '城市打卡任务', copy: '用战队故事串起场馆、商圈和限定纪念章。', source: '地点 × IP', tone: 'amber', visual: 'cards', size: 'tall' },
  { id: 'radar', kicker: 'TEAM DNA', title: '战队 DNA', copy: '从阵容偏好、选手关系和历史成绩提炼战队特征。', source: '111,313 条关系', tone: 'cyan', visual: 'radar', size: 'tall' },
  { id: 'hero-pool', kicker: 'PLAYER INSIGHT', title: '英雄池画像', copy: '呈现选手跨赛季的使用、胜率与搭配倾向。', source: '55,840 条出场', tone: 'mint', visual: 'draft', size: 'medium' },
  { id: 'highlights', kicker: 'VIDEO ENGINE', title: '高光短视频', copy: '图谱负责识别人物与比赛，视频链路负责寻找画面。', source: '比赛 × 高光', tone: 'coral', visual: 'poster', size: 'tall' },
  { id: 'story', kicker: 'STORY ENGINE', title: '经典战役重演', copy: '真实对局成为分支剧情、问答和关键决策。', source: '比赛 × 小局', tone: 'violet', visual: 'arena', size: 'medium' },
  { id: 'social', kicker: 'SOCIAL KIT', title: '社交内容包', copy: '一场比赛同时产出封面、短文案与数据卡。', source: '单次查询，多端输出', tone: 'amber', visual: 'poster', size: 'compact' },
  { id: 'brand', kicker: 'BRAND LAB', title: '品牌联名内容', copy: '让赞助权益进入互动玩法和个性化物料。', source: '品牌 × 场景', tone: 'cyan', visual: 'cards', size: 'medium' },
  { id: 'trend', kicker: 'META WATCH', title: '版本趋势', copy: '追踪英雄热度、组合关系与赛季环境迁移。', source: '英雄 × 赛季', tone: 'coral', visual: 'timeline', size: 'tall' },
  { id: 'memory', kicker: 'DIGITAL MEMORY', title: '数字纪念票', copy: '依据到场比赛生成专属、可追溯的观赛记忆。', source: '粉丝 × 比赛', tone: 'mint', visual: 'cards', size: 'compact' },
  { id: 'lineup', kicker: 'MANAGER MODE', title: '阵容挑战', copy: '用真实队友关系和英雄搭配构建策略题。', source: '选手 × 英雄 × 队友', tone: 'violet', visual: 'draft', size: 'medium' },
];

const columns = [
  ['team-game', 'player-card', 'bp-quiz', 'rivalry'],
  ['preview', 'fan-studio', 'today', 'recap'],
  ['radar', 'hero-pool', 'highlights', 'social'],
  ['city-map', 'route', 'checkin'],
  ['story', 'brand', 'trend', 'memory', 'lineup'],
];

const offsets = [44, 142, 78, 186, 22];
const speeds = [0.035, -0.025, 0.018, -0.032, 0.028];

function CardVisual({ kind }: { kind: Visual }) {
  if (kind === 'map') return <div className="visual map-visual"><i /><i /><i /><span /></div>;
  if (kind === 'poster') return <div className="visual poster-visual"><b>KPL</b><span>NOW / CREATE</span><i /></div>;
  if (kind === 'arena') return <div className="visual arena-visual"><span className="arena-core">VS</span><i /><i /></div>;
  if (kind === 'draft') return <div className="visual draft-visual">{[1, 2, 3, 4, 5].map((n) => <i key={n}>{n}</i>)}</div>;
  if (kind === 'timeline') return <div className="visual timeline-visual"><span /><span /><span /><span /></div>;
  if (kind === 'signal') return <div className="visual signal-visual"><i /><i /><i /><i /><i /></div>;
  if (kind === 'cards') return <div className="visual cards-visual"><i /><i /><i /></div>;
  return <div className="visual radar-visual"><i /><span /><b /></div>;
}

function CapabilityCard({ item }: { item: Capability }) {
  return (
    <article className={`capability-card ${item.size} tone-${item.tone} ${item.featured ? 'featured' : ''}`}>
      <div className="card-index">{item.id.slice(0, 2).toUpperCase()}</div>
      <div className="card-kicker">{item.kicker}</div>
      <CardVisual kind={item.visual} />
      <div className="card-content">
        <h2>{item.title}</h2>
        <p>{item.copy}</p>
      </div>
      <footer>
        <span>{item.source}</span>
        {item.metric && <strong>{item.metric}</strong>}
      </footer>
    </article>
  );
}

export function ApplicationsPage() {
  const [scrollY, setScrollY] = useState(0);
  const itemMap = useMemo(() => new Map(capabilities.map((item) => [item.id, item])), []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <main className="applications-page">
      <header className="page-header">
        <div className="brand-lockup"><span className="brand-mark">K</span><span>KPL KNOWLEDGE ASSET</span></div>
        <div className="asset-count"><b>01</b> ASSET <i /> <b>20</b> APPLICATIONS</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">FROM GRAPH TO EXPERIENCE / 2026</p>
          <h1>知识连接事实<br /><em>创意让它发生</em></h1>
        </div>
        <div className="intro-copy">
          <span className="pulse-dot" />
          <p>同一套 KPL 知识资产，持续驱动游戏、内容与城市体验。</p>
        </div>
      </section>

      <section className="route-section" aria-label="从知识资产到应用的路线">
        <div className="route-heading">
          <p className="eyebrow">ONE ASSET / FOUR MOVES</p>
          <h2>从事实，到体验</h2>
          <p>先建立可复用的洞察，再把洞察编译成内容、互动和线下场景。每一步都有明确的输入、产出与验证。</p>
        </div>
        <div className="route-track">
          {routeStages.map((stage, index) => (
            <article className={`route-stage tone-${stage.tone}`} key={stage.number}>
              <div className="route-stage-top"><b>{stage.number}</b><span>{stage.label}</span></div>
              <h3>{stage.title}</h3>
              <p>{stage.copy}</p>
              <dl>
                <div><dt>输入</dt><dd>{stage.input}</dd></div>
                <div><dt>产出</dt><dd>{stage.output}</dd></div>
              </dl>
              <footer><i />{stage.proof}</footer>
              {index < routeStages.length - 1 && <span className="route-arrow" aria-hidden="true">→</span>}
            </article>
          ))}
        </div>
      </section>

      <section className="masonry-stage" aria-label="KPL 衍生应用矩阵">
        <div className="grid-plane">
          {columns.map((ids, columnIndex) => (
            <div
              className={`capability-column column-${columnIndex + 1}`}
              key={columnIndex}
              style={{ '--column-shift': `${offsets[columnIndex] + scrollY * speeds[columnIndex]}px` } as CSSProperties}
            >
              {ids.map((id) => {
                const item = itemMap.get(id);
                return item ? <CapabilityCard item={item} key={item.id} /> : null;
              })}
            </div>
          ))}
        </div>
      </section>

      <footer className="page-footer">
        <span>23 SEASONS</span><i /><span>3,399 NODES</span><i /><span>111,313 RELATIONS</span>
      </footer>
    </main>
  );
}
