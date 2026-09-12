export type ApplicationType = 'game' | 'content' | 'city' | 'insight';
export type ApplicationStatus = 'demo' | 'ready' | 'needs-data';

export interface ApplicationRecord {
  id: string;
  type: ApplicationType;
  title: string;
  label: string;
  summary: string;
  source: string[];
  query: { entities: string[]; relations: string[]; filters?: Record<string, string> };
  output: { format: 'card' | 'poster' | 'game' | 'map' | 'video'; fields: string[]; template: string };
  evidence: { metric?: string; refs: string[] };
  status: ApplicationStatus;
}

export const applicationRecords: ApplicationRecord[] = [
  { id: 'team-dna', type: 'insight', title: '战队 DNA', label: 'INSIGHT', summary: '用阵容稳定性、招牌英雄、宿敌和赛季成绩提炼战队风格。', source: ['club', 'player', 'hero', 'match', 'season'], query: { entities: ['club'], relations: ['ROSTERED_PLAYER', 'USED_HERO', 'FACED', 'PARTICIPATED_IN'] }, output: { format: 'card', fields: ['风格标签', '核心选手', '招牌英雄', '宿敌指数'], template: 'team-dna-v1' }, evidence: { metric: '可追溯到比赛与小局', refs: ['graph_v1/edges_all.jsonl'] }, status: 'ready' },
  { id: 'career-card', type: 'content', title: '选手生涯卡', label: 'PLAYER', summary: '自动汇总选手效力轨迹、常用英雄与高光赛季。', source: ['player', 'club', 'season', 'hero'], query: { entities: ['player'], relations: ['ROSTERED_PLAYER', 'USED_HERO', 'PARTICIPATED_IN'] }, output: { format: 'card', fields: ['生涯时间线', '效力战队', '英雄池', '赛季荣誉'], template: 'player-career-v1' }, evidence: { metric: '55,840 条英雄出场', refs: ['normalized/player_season_profiles.jsonl'] }, status: 'ready' },
  { id: 'bp-quiz', type: 'game', title: 'BP 竞猜', label: 'LIVE', summary: '从真实禁选记录生成赛前预测题，答对即可解锁阵容卡。', source: ['match', 'game', 'hero', 'player'], query: { entities: ['game'], relations: ['PICKED', 'BANNED', 'FEATURED_PLAYER'], filters: { has_bp: 'true' } }, output: { format: 'game', fields: ['禁用位', '选择位', '正确率', '积分'], template: 'bp-quiz-v1' }, evidence: { metric: '635 个具备 BP 数据的小局', refs: ['normalized/game_bp_drafts.jsonl'] }, status: 'demo' },
  { id: 'match-preview', type: 'content', title: '赛前预告', label: 'MATCH', summary: '将近期状态、历史交手和招牌英雄自动组织成一张对阵卡。', source: ['match', 'club', 'player', 'hero'], query: { entities: ['match'], relations: ['FACED', 'USED_HERO', 'FEATURED_PLAYER'] }, output: { format: 'poster', fields: ['对阵双方', '近况', '历史交手', '看点'], template: 'match-preview-v1' }, evidence: { metric: '单次查询，多端输出', refs: ['normalized/matches.jsonl'] }, status: 'ready' },
  { id: 'smart-recap', type: 'content', title: '智能战报', label: 'REPORT', summary: '比分、阵容和关键关系组成结构化赛后内容。', source: ['match', 'game', 'player', 'hero'], query: { entities: ['match'], relations: ['HAS_GAME', 'FEATURED_PLAYER', 'FEATURED_HERO'] }, output: { format: 'card', fields: ['比分', 'MVP', '关键英雄', '赛后结论'], template: 'match-recap-v1' }, evidence: { metric: '2,875 场系列赛', refs: ['normalized/matches_complete_nested.jsonl'] }, status: 'ready' },
  { id: 'highlight-short', type: 'content', title: '高光短视频', label: 'VIDEO', summary: '图谱识别人物与比赛，视频链路匹配对应画面和封面。', source: ['match', 'game', 'player', 'video'], query: { entities: ['match', 'player'], relations: ['FEATURED_PLAYER', 'HAS_GAME'] }, output: { format: 'video', fields: ['标题', '时间码', '选手', '封面文案'], template: 'highlight-reel-v1' }, evidence: { metric: '已有视频自动切分能力', refs: ['KPL_vedio_official_auto_cut'] }, status: 'demo' },
  { id: 'history-today', type: 'content', title: '历史上的今天', label: 'ARCHIVE', summary: '从十年赛事档案中自动召回同日经典比赛与选手故事。', source: ['season', 'match', 'player'], query: { entities: ['match'], relations: ['NEXT_MATCH', 'PARTICIPATED_IN'], filters: { date: 'today' } }, output: { format: 'card', fields: ['日期', '经典比赛', '关键选手', '历史结果'], template: 'on-this-day-v1' }, evidence: { metric: '23 个赛季档案', refs: ['graph_v1/nodes/season.jsonl'] }, status: 'ready' },
  { id: 'team-manager', type: 'game', title: '战队经理', label: 'GAME', summary: '根据历史阵容完成选人、BP 和赛季挑战。', source: ['club', 'player', 'hero', 'season'], query: { entities: ['club', 'season'], relations: ['ROSTERED_PLAYER', 'USED_HERO', 'TEAMED_WITH'] }, output: { format: 'game', fields: ['选人', 'BP', '阵容化学反应', '赛季目标'], template: 'team-manager-v1' }, evidence: { metric: '换队即可复用模板', refs: ['graph_v1/edges/rostered_player.jsonl'] }, status: 'demo' },
  { id: 'classic-replay', type: 'game', title: '经典战役重演', label: 'STORY', summary: '把真实对局转化为分支剧情和关键决策。', source: ['match', 'game', 'player', 'hero'], query: { entities: ['match'], relations: ['HAS_GAME', 'FEATURED_PLAYER', 'FEATURED_HERO'] }, output: { format: 'game', fields: ['剧情节点', '关键选择', '历史结局', '替代结局'], template: 'classic-replay-v1' }, evidence: { metric: '真实比赛作为关卡素材', refs: ['normalized/games.jsonl'] }, status: 'demo' },
  { id: 'city-map', type: 'city', title: '城市电竞地图', label: 'CITY', summary: '将主场、赛程、打卡与本地活动组织成比赛日路线。', source: ['club', 'match', 'city_poi'], query: { entities: ['club', 'match', 'city'], relations: ['HOME_IN', 'HOSTED_AT', 'HAPPENS_ON'] }, output: { format: 'map', fields: ['主场战队', '比赛入口', '场馆', '打卡路线'], template: 'city-matchday-v1' }, evidence: { metric: '需补充场馆与 POI 数据', refs: ['city_poi / ticket / venue'] }, status: 'needs-data' },
  { id: 'check-in', type: 'city', title: '城市打卡任务', label: 'CHECK-IN', summary: '用战队故事串起场馆、商圈和限定数字纪念章。', source: ['club', 'player', 'city_poi', 'event'], query: { entities: ['city', 'club'], relations: ['HOME_IN', 'RELATED_TO'], filters: { active: 'true' } }, output: { format: 'map', fields: ['任务点', '故事卡', '完成条件', '纪念章'], template: 'city-checkin-v1' }, evidence: { metric: '可接入线下活动核销', refs: ['event / venue / brand'] }, status: 'needs-data' },
  { id: 'social-kit', type: 'content', title: '社交内容包', label: 'SOCIAL', summary: '一场比赛同时产出封面、短文案、数据卡和话题标签。', source: ['match', 'club', 'player', 'hero'], query: { entities: ['match'], relations: ['FACED', 'FEATURED_PLAYER', 'FEATURED_HERO'] }, output: { format: 'poster', fields: ['封面', '短文案', '数据卡', '话题标签'], template: 'social-kit-v1' }, evidence: { metric: '一次查询，多端发布', refs: ['normalized/matches.jsonl'] }, status: 'ready' },
];

export const capabilityTiles = applicationRecords.map(({ title, label }) => [title, label] as const);
