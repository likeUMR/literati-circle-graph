export const relationLabels: Record<string, string> = {
  FACED: '交手对抗',
  ROSTERED_PLAYER: '效力阵容',
  USED_HERO: '使用英雄',
  FEATURED_HERO: '赛场登场英雄',
  FEATURED_PLAYER: '比赛出场选手',
  TEAMMATE_OF: '同期队友',
  TEAMED_WITH: '同阵容英雄',
  PARTICIPATED_BY: '参赛俱乐部',
  NEXT_SEASON: '赛季时间顺序',
  HAS_MATCH: '包含比赛',
  NEXT_MATCH: '比赛时间顺序',
};

export function relationLabel(type: string): string {
  return relationLabels[type] ?? '其他关联';
}
