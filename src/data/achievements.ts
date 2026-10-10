export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  reward: number;
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstBlood', name: '首杀', desc: '击杀第一个怪物', icon: 'sword', reward: 20 },
  { id: 'wave5', name: '初露锋芒', desc: '抵达第 5 波', icon: 'flag', reward: 40 },
  { id: 'wave10', name: '半程勇者', desc: '抵达第 10 波', icon: 'flag', reward: 80 },
  { id: 'wave20', name: '通关勇士', desc: '通关任意地图的 20 波', icon: 'crown', reward: 200 },
  { id: 'wave30', name: '无尽行者', desc: '在无尽模式抵达第 30 波', icon: 'infinity', reward: 300 },
  { id: 'wave50', name: '潮水不退', desc: '在无尽模式抵达第 50 波', icon: 'infinity', reward: 800 },
  { id: 'kills500', name: '怪物屠宰场', desc: '单局击杀 500 个怪物', icon: 'skull', reward: 120 },
  { id: 'kills2000', name: '无尽屠杀', desc: '单局击杀 2000 个怪物', icon: 'skull', reward: 400 },
  { id: 'dmg100k', name: '十万伤害', desc: '单局造成 100000 点伤害', icon: 'blade', reward: 150 },
  { id: 'dmg1m', name: '百万输出', desc: '单局造成 1000000 点伤害', icon: 'blade', reward: 600 },
  { id: 'star5', name: '五星觉醒', desc: '将任意英雄升至 5 星', icon: 'star', reward: 500 },
  { id: 'fullTeam', name: '满编战队', desc: '同时部署 6 名英雄', icon: 'user', reward: 200 },
  { id: 'evolution', name: '技能进化', desc: '完成一次技能进化', icon: 'spark', reward: 250 },
  { id: 'allSynergy', name: '羁绊大师', desc: '单局同时激活 4 个羁绊', icon: 'link', reward: 300 },
  { id: 'noLoss', name: '完美防线', desc: '基地未受到任何伤害通关', icon: 'shield', reward: 500, hidden: true },
  { id: 'speedrun', name: '速通专家', desc: '在 8 分钟内通关一张地图', icon: 'clock', reward: 400, hidden: true },
  { id: 'challengeWin', name: '挑战者', desc: '完成任意挑战模式', icon: 'trophy', reward: 400 },
  { id: 'bossHunter', name: 'Boss 猎人', desc: '单局击败 3 个 Boss', icon: 'boss', reward: 350 },
  { id: 'collector', name: '收藏家', desc: '解锁 8 名英雄', icon: 'book', reward: 300 },
  { id: 'richMan', name: '富甲一方', desc: '累计获得 20000 永久金币', icon: 'coin', reward: 500 },
  { id: 'firstWin', name: '初战告捷', desc: '完成第一次冒险结算', icon: 'flag', reward: 30 },
  { id: 'maxLevel', name: '巅峰等级', desc: '单局队伍等级达到 40 级', icon: 'level', reward: 300 },
  { id: 'relicHunter', name: '遗物猎人', desc: '单局收集 6 件遗物', icon: 'relic', reward: 250 },
  { id: 'equipMaster', name: '装备大师', desc: '单局掉落 20 件装备', icon: 'armor', reward: 250 },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export const ACHIEVEMENT_ICONS: Record<string, string> = {};
