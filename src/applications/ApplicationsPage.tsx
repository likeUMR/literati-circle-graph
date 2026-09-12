import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { applicationRecords } from './applicationData';
import { kplHomeData } from './kplHomeData';

const STATUS_LABEL = { ready: '数据就绪', demo: '可演示', 'needs-data': '待补数据', unimplemented: '未实现' } as const;
const TYPE_LABEL = { insight: '洞察', content: '内容', game: '互动', city: '城市', unimplemented: '未实现' } as const;
const ESPORTS_GAME_URL = 'https://origingame.dev/g/edg-5c15/play?v=29';
const ESPORTS_GAME_COVER = 'https://origingame.ai/api/covers/5c15lv6jai';
const ESPORTS_MANAGER_URL = 'https://gallery.liruochen.cn/html-wzry/';
const ESPORTS_MANAGER_COVER = 'https://gallery.liruochen.cn/images/html-wzry.png';
const TOURISM_MATERIAL_URL = '/assets/tourism-masonry.png';
const CAREER_CARD_COVER = '/assets/application-covers/career-card.jpg';
const HISTORY_TODAY_COVER = '/assets/application-covers/history-today.jpg';
const CareerCardTool = lazy(() => import('./tools/CareerCardTool').then(({ CareerCardTool }) => ({ default: CareerCardTool })));
const MatchPreviewTool = lazy(() => import('./tools/MatchPreviewTool').then(({ MatchPreviewTool }) => ({ default: MatchPreviewTool })));
const HistoryTodayTool = lazy(() => import('./tools/HistoryTodayTool').then(({ HistoryTodayTool }) => ({ default: HistoryTodayTool })));
const LIVE_APP_IDS = ['career-card', 'match-preview', 'history-today'] as const;
type LiveAppId = typeof LIVE_APP_IDS[number];
const isLiveApp = (id: string): id is LiveAppId => LIVE_APP_IDS.some((liveId) => liveId === id);

export function ApplicationsPage() {
  const [videoReady, setVideoReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { brand, nav, hero, stats, entities, routes, categories, footer } = kplHomeData;

  useEffect(() => { videoRef.current?.play().catch(() => undefined); }, [hero.videoSrc]);
  useEffect(() => {
    if (!activeApp) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setActiveApp(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [activeApp]);

  return <main className="kpl-site">
    <header className="kpl-header">
      <a className="kpl-logo" href="#home" aria-label="KPL 知识资产首页"><span className="kpl-logo-mark">K</span><span><b>{brand.name}</b><small>{brand.tagline}</small></span></a>
      <nav className={menuOpen ? 'kpl-nav open' : 'kpl-nav'}>{nav.map((item) => <a href={item.href} key={item.label} onClick={() => setMenuOpen(false)}>{item.label}</a>)}</nav>
      <div className="kpl-header-actions"><span className="kpl-data-state"><i /> DATA ONLINE</span><a className="kpl-enter" href="./">进入星图 <b>↗</b></a><button className="kpl-menu" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="打开导航"><i /><i /></button></div>
    </header>

    <section className="kpl-hero" id="home" onClick={(event) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      window.location.assign('./');
    }}>
      <div className="kpl-hero-media"><video ref={videoRef} autoPlay muted loop playsInline onPlaying={() => setVideoReady(true)} className={videoReady ? 'ready' : ''}><source src={hero.videoSrc} type="video/mp4" /></video><div className="kpl-hero-wash" /></div>
      <a className="kpl-hero-navigation" href="./" aria-label="进入 KPL 星图" title="进入 KPL 星图" />
      <div className="kpl-hero-content"><p className="kpl-kicker"><span>●</span> {hero.kicker}</p><h1>{hero.titleLead}<br /><mark>{hero.titleMark}</mark>{hero.titleTail}</h1><p className="kpl-hero-sub">{hero.subline}</p><a className="kpl-primary-entry" href={hero.ctaHref}><span>↓</span><b>{hero.ctaLabel}</b></a></div>
      <div className="kpl-hero-bottom" id="assets"><div className="kpl-stats">{stats.map((stat) => <span key={stat.label}><b>{stat.value}</b>{stat.label}</span>)}</div><div className="kpl-entity-strip"><small>CORE<br />ENTITIES</small>{entities.map((entity) => <span key={entity.name}><i />{entity.name}</span>)}<span className="kpl-mini-brand">KPL<br /><small>KNOWLEDGE ASSET</small></span></div></div>
      <button className="kpl-scroll" type="button" onClick={() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' })} aria-label="继续浏览">⌄</button>
    </section>

    <div className="kpl-page" id="roadmap">
      <section className="kpl-routes">{routes.map((route) => <a className="kpl-route" href={route.href} key={route.kicker}><div><small>{route.kicker}</small><h2>{route.title}</h2><p>{route.description}</p></div><b>↗</b></a>)}</section>
      <section className="kpl-section"><div className="kpl-section-title"><div><small>ASSET APPLICATION ROUTE</small><h2>资产应用路线</h2></div><span>10 个方向</span></div><div className="kpl-category-grid">{categories.map((category, index) => <a className="kpl-category" href="#applications" key={category.label} style={{ '--category-color': category.color } as CSSProperties}><img src={category.image} alt="" loading="lazy" /><span>{String(index + 1).padStart(2, '0')}</span><b>{category.label}</b><i>↗</i></a>)}</div></section>
      <section className="kpl-section" id="applications">
        <div className="kpl-section-title"><div><small>FIRST BATCH / V1</small><h2><span className="kpl-star">✦</span> 首批应用</h2></div><span>12 项应用</span></div>
        <div className="kpl-gallery"><div className="kpl-application-track">
          {applicationRecords.concat(applicationRecords).map((application, index) => {
            const isDuplicate = index >= applicationRecords.length;
            const coverImage = application.id === 'career-card' ? CAREER_CARD_COVER : application.id === 'history-today' ? HISTORY_TODAY_COVER : isDuplicate || application.status === 'unimplemented' ? undefined : application.id === 'team-manager' ? ESPORTS_MANAGER_COVER : application.type === 'city' ? TOURISM_MATERIAL_URL : application.type === 'game' ? ESPORTS_GAME_COVER : undefined;
            const card = <><div className={'kpl-application-cover ' + (coverImage ? 'has-image' : '')}>{coverImage && <img src={coverImage} alt="" />}<span>{application.label}</span><small>{TYPE_LABEL[application.type]}</small></div><div className="kpl-application-meta"><div><b>{application.title}</b><small>{application.evidence.metric ?? application.summary}</small></div><em className={'status-' + application.status}>{isLiveApp(application.id) ? '打开 ↗' : STATUS_LABEL[application.status]}</em></div></>;
            const style = { '--card-color': categories[index % categories.length].color } as CSSProperties;
            const key = application.id + '-' + index;
            if (isLiveApp(application.id)) return <button className="kpl-application-card kpl-app-button" type="button" onClick={() => setActiveApp(application.id)} key={key} style={style}>{card}</button>;
            if (application.status === 'unimplemented') return <article className="kpl-application-card" key={key} style={style}>{card}</article>;
            if (application.type === 'game') return <a className="kpl-application-card" href={application.id === 'team-manager' ? ESPORTS_MANAGER_URL : ESPORTS_GAME_URL} target="_blank" rel="noreferrer" key={key} style={style}>{card}</a>;
            if (application.type === 'city') return <a className="kpl-application-card" href={TOURISM_MATERIAL_URL} target="_blank" rel="noreferrer" key={key} style={style}>{card}</a>;
            return <article className="kpl-application-card" key={key} style={style}>{card}</article>;
          })}
        </div></div>
      </section>
      <section className="kpl-brand-bar"><span>✦</span><div><b>{brand.name}</b><small>{brand.tagline}</small></div><p>{footer.tagline}</p></section>
    </div>
    <footer className="kpl-footer"><span>{brand.name} KNOWLEDGE ASSET</span><span>{footer.tagline}</span><span>{footer.copyright}</span></footer>
    {activeApp && <div className="kpl-tool-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveApp(null); }}><div className="kpl-tool-dialog" role="dialog" aria-modal="true" aria-label={applicationRecords.find((application) => application.id === activeApp)?.title}><button ref={closeButtonRef} className="kpl-tool-exit" type="button" aria-label="关闭应用" onClick={() => setActiveApp(null)}>×</button><Suspense fallback={<p className="kpl-tool-loading">正在加载赛事数据…</p>}>{activeApp === 'career-card' ? <CareerCardTool /> : activeApp === 'match-preview' ? <MatchPreviewTool /> : <HistoryTodayTool />}</Suspense></div></div>}
  </main>;
}
