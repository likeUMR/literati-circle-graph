export interface KplNavItem { label: string; href: string }
export interface KplStat { value: string | number; label: string }
export interface KplEntity { name: string }
export interface KplRoute { kicker: string; title: string; description: string; href: string }
export interface KplCategory { label: string; color: string; image: string }

export interface KplHomeData {
  brand: { name: string; tagline: string }
  nav: KplNavItem[]
  hero: {
    kicker: string
    titleLead: string
    titleMark: string
    titleTail: string
    subline: string
    ctaLabel: string
    ctaHref: string
    videoSrc: string
  }
  stats: KplStat[]
  entities: KplEntity[]
  routes: KplRoute[]
  categories: KplCategory[]
  footer: { tagline: string; copyright: string }
}

const publicBase = import.meta.env.BASE_URL;
const asset = (path: string) => `${publicBase}assets/${path}`;

export const kplHomeData: KplHomeData = {
  brand: { name: 'KPL', tagline: 'KNOWLEDGE ASSET' },
  nav: [
    { label: '星图总览', href: './' },
    { label: '应用路线', href: '#roadmap' },
    { label: '数据资产', href: '#assets' },
    { label: '应用案例', href: '#applications' },
  ],
  hero: {
    kicker: 'KPL KNOWLEDGE ASSET / 2026',
    titleLead: '让赛事资产',
    titleMark: '驱动更多',
    titleTail: '真实应用',
    subline: '',
    ctaLabel: '查看应用路线',
    ctaHref: '#roadmap',
    videoSrc: `${publicBase}recordings/kpl-hero.mp4`,
  },
  stats: [
    { value: 23, label: 'KPL 赛季' },
    { value: '2,875', label: '系列赛' },
    { value: '11,346', label: '小局' },
  ],
  entities: [
    { name: '赛季' }, { name: '俱乐部' }, { name: '选手' }, { name: '英雄' }, { name: '比赛' },
  ],
  routes: [
    { kicker: 'KNOWLEDGE GRAPH', title: '从星图发现关系', description: '筛选赛季、俱乐部、选手、英雄与比赛，聚焦可解释、可追溯的赛事关系。', href: './' },
    { kicker: 'APPLICATION LAYER', title: '从关系生成应用', description: '围绕真实赛事事实，生产洞察、内容、互动游戏与城市体验。', href: '#applications' },
  ],
  categories: [
    { label: '战队洞察', color: '#f2c94c', image: asset('application-routes/team-insight.jpg') },
    { label: '选手档案', color: '#ef6d88', image: asset('application-routes/player-profile.jpg') },
    { label: 'BP 互动', color: '#50b9c8', image: asset('application-routes/bp-interaction.jpg') },
    { label: '赛前内容', color: '#799bdd', image: asset('application-routes/pregame-content.jpg') },
    { label: '赛后内容', color: '#e98c55', image: asset('application-routes/postgame-content.jpg') },
    { label: '视频生产', color: '#68bea0', image: asset('application-routes/video-production.jpg') },
    { label: '历史内容', color: '#ab83c9', image: asset('application-routes/history-content.jpg') },
    { label: '互动游戏', color: '#e8bd3e', image: asset('application-routes/interactive-game.jpg') },
    { label: '城市体验', color: '#5ea7d7', image: asset('application-routes/city-experience.jpg') },
    { label: '社交传播', color: '#dc708b', image: asset('application-routes/social-sharing.jpg') },
  ],
  footer: { tagline: '让每一条数据更精彩', copyright: '2026 / V1' },
}
