import { useEffect, useRef } from 'react';
import { applicationRecords, capabilityTiles } from './applicationData';

interface GsapTimeline {
  set: (target: Element | Element[], vars: Record<string, unknown>, position?: number | string) => GsapTimeline;
  to: (target: Element | Element[], vars: Record<string, unknown>, position?: number | string) => GsapTimeline;
  fromTo: (target: Element | Element[], fromVars: Record<string, unknown>, toVars: Record<string, unknown>, position?: number | string) => GsapTimeline;
}

interface GsapGlobal {
  registerPlugin: (plugin: unknown) => void;
  timeline: (config: Record<string, unknown>) => GsapTimeline;
  context: (callback: () => void, scope: Element) => { revert: () => void };
  utils: { random: (min: number, max: number) => number };
}

declare global {
  interface Window {
    gsap?: GsapGlobal;
    ScrollTrigger?: { refresh: () => void };
  }
}

const capabilities = capabilityTiles;

const assetFacts = [
  ['23', 'KPL 赛季', '2016 — 2026'], ['37', '俱乐部', '战队与城市'], ['332', '选手', '生涯与阵容'], ['132', '英雄', '使用与搭配'],
  ['2,875', '系列赛', '11,346 个小局'], ['55,840', '英雄出场', '选手 × 英雄'], ['635', 'BP 小局', '具备禁选数据'], ['111,313', '关系', '3,399 个节点'],
] as const;
const assetCapabilities = ['事实检索', '关系发现', '特征计算', '内容溯源', '批量生产'];

const playerSlots = [
  ['AG.一诺', '射手', '公孙离'], ['AG.长生', '中路', '海月'], ['AG.轩染', '对抗路', '夏洛特'],
  ['AG.钟意', '打野', '镜'], ['AG.大帅', '游走', '少司缘'],
] as const;

export function ApplicationsPage() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const grid = gridRef.current;
    if (!gsap || !ScrollTrigger || !grid) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const wrap = grid.querySelector('.grid-wrap');
      const items = Array.from(grid.querySelectorAll('.grid__item'));
      const inners = Array.from(grid.querySelectorAll('.grid__item-inner'));
      if (!wrap) return;

      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: wrap, start: 'top bottom+=5%', end: 'bottom top-=5%', scrub: true },
      });

      timeline
        .set(items, {
          transformOrigin: '50% 0%',
          z: () => gsap.utils.random(-5000, -2000),
          rotationX: () => gsap.utils.random(-65, -25),
          filter: 'brightness(0%)',
        })
        .to(items, {
          xPercent: () => gsap.utils.random(-150, 150),
          yPercent: () => gsap.utils.random(-300, 300),
          rotationX: 0,
          filter: 'brightness(160%)',
        }, 0)
        .to(wrap, { z: 6500 }, 0)
        .fromTo(inners, { scale: 2 }, { scale: 0.5 }, 0);
    }, grid);

    ScrollTrigger.refresh();
    return () => context.revert();
  }, []);

  return (
    <main className="applications-page">
      <header className="topbar">
        <span className="brand-mark">K</span>
        <span className="brand-name">KPL KNOWLEDGE ASSET</span>
        <span className="topbar-count">01 ASSET / 12 DATA-BACKED CASES</span>
      </header>

      <section className="intro">
        <p className="eyebrow">FROM KNOWLEDGE GRAPH TO EXPERIENCE</p>
        <h1>十年赛事事实<br /><em>沉淀为内容资产</em></h1>
        <p className="intro-statement">将分散的赛事事实转化为可计算的战队 DNA、选手标签、经典对局和城市关系，再驱动游戏、物料与线下场景生产。</p>
        <p className="scroll-hint">向下滚动</p>
      </section>

      <section className="asset-ledger" aria-label="KPL 知识资产规模">
        <div className="ledger-intro"><span className="ledger-tag">ASSET LEDGER / 2026</span><h2>一份资产，五种调用能力</h2><p>每个结论都能回溯到比赛、小局和官方来源；每个模板都可以替换战队节点后批量复用。</p><div className="capability-list">{assetCapabilities.map((item) => <span key={item}>{item}</span>)}</div></div>
        <div className="fact-grid">{assetFacts.map(([value, label, note]) => <div className="asset-fact" key={label}><b>{value}</b><span>{label}</span><small>{note}</small></div>)}</div>
      </section>

      <section className="perspective-section" id="capability-grid">
        <div className="grid" ref={gridRef}>
          <div className="grid-wrap">
            {capabilities.map(([title, label], index) => (
              <article className={`grid__item tone-${(index % 5) + 1}`} key={title}>
                <div className="grid__item-inner">
                  <span className="tile-no">{String(index + 1).padStart(2, '0')}</span>
                  <span className="tile-cross" />
                  <strong>{title}</strong>
                  <small>{label}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="section-statement" aria-hidden="true">
          <span>GRAPH</span><i>→</i><span>EXPERIENCE</span>
        </div>
      </section>

      <section className="application-index" id="application-index">
        <div className="index-heading">
          <p>APPLICATION INDEX / 应用清单</p>
          <h2>从关系中生长<br />在场景中落地</h2>
          <div className="asset-stats">
            <span><b>23</b> 赛季</span><span><b>3,399</b> 节点</span><span><b>111,313</b> 关系</span>
          </div>
        </div>

        <div className="showcase-list">
          <article className="showcase showcase-game">
            <div className="showcase-copy"><div className="group-number">01 / GAME</div><h3>战队 IP 游戏</h3><p>把真实阵容、英雄池与队友关系变成可操作的战队经理关卡。换一支队伍，模板就能重新计算。</p><div className="showcase-meta"><span>成都 AG 超玩会</span><span>TEAM MANAGER / v1</span></div><div className="source-line">ROSTERED_PLAYER · USED_HERO · TEAMED_WITH</div></div>
            <div className="product-screen manager-screen">
              <div className="screen-top"><span>AG CAMP · 2026 S1</span><b>阵容编辑器</b><span className="live-dot">LIVE DATA</span></div>
              <div className="manager-head"><div className="club-lockup"><img src="/assets/ag-logo.png" alt="成都AG超玩会" /><div><b>成都AG超玩会</b><small>五人首发 / 历史胜率 68.4%</small></div></div><div className="chemistry"><small>阵容化学反应</small><strong>87<span>/100</span></strong><i><em /></i></div></div>
              <div className="player-row">{playerSlots.map(([name, role, hero]) => <div className="player-slot" key={name}><span className="slot-role">{role}</span><strong>{name}</strong><small>{hero}</small><div className="slot-bar"><i /></div></div>)}</div>
              <div className="draft-row"><div><small>禁用位</small><span>盾山</span><span>东皇太一</span><span>大乔</span></div><div><small>待选英雄</small><b>镜</b><b>公孙离</b><b>海月</b></div><button>确认阵容 ↗</button></div>
            </div>
          </article>

          <article className="showcase showcase-content">
            <div className="showcase-copy"><div className="group-number">02 / CONTENT</div><h3>粉丝内容生产</h3><p>同一场比赛的事实查询，自动切成海报、选手卡、战报与社交封面，保留每一条数据的来源。</p><div className="showcase-meta"><span>一场比赛 · 四种输出</span><span>CONTENT KIT / v1</span></div><div className="source-line">FEATURED_PLAYER · FEATURED_HERO · HAS_GAME</div></div>
            <div className="product-screen content-screen">
              <div className="screen-top"><span>CONTENT STUDIO / MATCH 2875</span><b>内容生产台</b><span>4 OUTPUTS READY</span></div>
              <div className="content-canvas"><div className="poster-card"><div className="poster-kicker">KPL SPRING PLAYOFF</div><div className="poster-score"><b>AG</b><strong>3 : 2</strong><b>狼队</b></div><div className="poster-rule" /><small>决胜局 · 26:41 · 巅峰对决</small></div><div className="career-card"><img src="/assets/ag-logo.png" alt="AG" /><span>PLAYER CARD / 01</span><b>一诺</b><small>射手 · 332 场记录</small><div className="mini-stats"><i><b>68%</b>胜率</i><i><b>12</b>招牌英雄</i></div></div><div className="social-card"><span>社交封面</span><div className="social-line" /><strong>这一次，<em>我们再进一局</em></strong><small>#AG超玩会 #KPL</small></div></div>
              <div className="output-strip"><span>1080 × 1440 <b>海报</b></span><span>1920 × 1080 <b>封面</b></span><span>1080 × 1080 <b>数据卡</b></span><button>批量导出 ↓</button></div>
            </div>
          </article>

          <article className="showcase showcase-city">
            <div className="showcase-copy"><div className="group-number">03 / CITY</div><h3>城市电竞地图</h3><p>把主场战队、赛程与城市活动串成一条比赛日路线。场馆与 POI 接入后即可发布为城市体验。</p><div className="showcase-meta"><span>上海 · EDG.M 主场试算</span><span>城市数据待接入</span></div><div className="source-line">HOME_IN · HOSTED_AT · HAPPENS_ON</div></div>
            <div className="product-screen city-screen">
              <div className="screen-top"><span>CITY MATCHDAY / SHANGHAI</span><b>比赛日路线</b><span className="pending">POI PENDING</span></div>
              <div className="map-canvas"><div className="map-grid" /><div className="map-label label-one">静安区 <small>主场区域</small></div><div className="map-label label-two">电竞场馆 <small>待接入</small></div><div className="map-label label-three">粉丝集合点 <small>待接入</small></div><div className="route-line" /><div className="map-pin pin-home"><img src="/assets/edgm-logo.png" alt="EDG.M" /><b>EDG.M</b><small>主场战队</small></div><div className="map-pin pin-venue"><span>02</span><b>比赛场馆</b><small>数据待接入</small></div><div className="route-step"><b>01</b><span>集合 / 14:00</span><small>战队故事卡</small></div><div className="route-step second"><b>02</b><span>观赛 / 18:00</span><small>数字纪念票</small></div></div>
              <div className="city-footer"><span><b>今日路线</b> 2 个节点 · 1 场比赛</span><span className="pending">场馆 / 票务 / POI 待接入</span><button>查看数据缺口 ↗</button></div>
            </div>
          </article>
        </div>
        <div className="data-contract-note"><span>DATA CONTRACT / v1</span><strong>{applicationRecords.length} 个可演示案例已接入前端</strong><small>前端只渲染 title / label / summary；数据端保留 source、query、output、evidence 与 status。</small></div>
      </section>

      <footer className="page-footer">
        <span>KPL KNOWLEDGE ASSET</span><span>DATA BECOMES EXPERIENCE</span><span>2026</span>
      </footer>
    </main>
  );
}
