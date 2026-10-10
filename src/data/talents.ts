import type { BonusBlock, StatKey } from '@/types/hero';

export type TalentCategory = 'attack' | 'defense' | 'economy';

export interface TalentNode {
  id: string;
  category: TalentCategory;
  name: string;
  desc: string;
  icon: string;
  maxLevel: number;
  /** 每级消耗的永久金币（按等级递增） */
  cost: (level: number) => number;
  /** 每级提供的属性加成 */
  stat?: StatKey;
  /** 百分比还是固定 */
  isPct?: boolean;
  bonus?: keyof BonusBlock;
  /** 特殊：基地生命、初始金币、刷新次数等 */
  special?: 'baseHp' | 'startGold' | 'refresh' | 'deployCap' | 'startLevel' | 'heroPool' | 'offlineRate';
  value: number;
}

const cost = (base: number) => (level: number) => Math.round(base * Math.pow(1.65, level));

export const TALENTS: TalentNode[] = [
  // 攻击天赋
  { id: 't_attack', category: 'attack', name: '力量训练', desc: '全队攻击力 +6%', icon: 'sword', maxLevel: 10, stat: 'attack', isPct: true, value: 0.06, cost: cost(30) },
  { id: 't_crit', category: 'attack', name: '致命打击', desc: '全队暴击率 +3%', icon: 'target', maxLevel: 8, stat: 'critRate', value: 0.03, cost: cost(45) },
  { id: 't_critDmg', category: 'attack', name: '狂暴之力', desc: '全队暴击伤害 +12%', icon: 'blade', maxLevel: 8, stat: 'critDamage', value: 0.12, cost: cost(50) },
  { id: 't_haste', category: 'attack', name: '迅捷步伐', desc: '全队攻击速度 +5%', icon: 'boot', maxLevel: 10, stat: 'attackSpeed', isPct: true, value: 0.05, cost: cost(40) },
  { id: 't_skill', category: 'attack', name: '奥术精通', desc: '技能伤害 +8%', icon: 'star', maxLevel: 10, stat: 'skillPower', isPct: true, value: 0.08, cost: cost(45) },
  { id: 't_cdr', category: 'attack', name: '冷却掌握', desc: '技能冷却缩减 +2%', icon: 'hourglass', maxLevel: 8, stat: 'cooldownReduction', value: 0.02, cost: cost(60) },
  { id: 't_area', category: 'attack', name: '扩散打击', desc: '技能范围 +6%', icon: 'ring', maxLevel: 8, bonus: 'area', value: 0.06, cost: cost(40) },
  { id: 't_boss', category: 'attack', name: '屠龙者', desc: '对精英与 Boss 伤害 +8%', icon: 'skull', maxLevel: 8, bonus: 'bossDmg', value: 0.08, cost: cost(55) },

  // 防御天赋
  { id: 't_hp', category: 'defense', name: '坚韧体魄', desc: '全队最大生命 +8%', icon: 'heart', maxLevel: 10, stat: 'maxHp', isPct: true, value: 0.08, cost: cost(30) },
  { id: 't_def', category: 'defense', name: '重甲防护', desc: '全队防御力 +10%', icon: 'armor', maxLevel: 8, stat: 'defense', isPct: true, value: 0.1, cost: cost(35) },
  { id: 't_baseHp', category: 'defense', name: '要塞加固', desc: '基地生命上限 +10', icon: 'shield', maxLevel: 10, special: 'baseHp', value: 10, cost: cost(50) },
  { id: 't_revive', category: 'defense', name: '不屈意志', desc: '英雄复活速度 +8%', icon: 'feather', maxLevel: 8, bonus: 'reviveSpeed', value: 0.08, cost: cost(40) },
  { id: 't_dodge', category: 'defense', name: '幽灵步法', desc: '全队闪避 +2%', icon: 'cloak', maxLevel: 8, stat: 'dodgeRate', value: 0.02, cost: cost(45) },
  { id: 't_block', category: 'defense', name: '坚守阵线', desc: '全队阻挡上限 +1', icon: 'wall', maxLevel: 4, stat: 'blockCapacity', value: 1, cost: cost(120) },
  { id: 't_heal', category: 'defense', name: '圣光恩泽', desc: '治疗效果 +10%', icon: 'cross', maxLevel: 6, bonus: 'healPower', value: 0.1, cost: cost(45) },

  // 经济天赋
  { id: 't_gold', category: 'economy', name: '财富嗅觉', desc: '金币收益 +8%', icon: 'coin', maxLevel: 10, bonus: 'goldGain', value: 0.08, cost: cost(30) },
  { id: 't_exp', category: 'economy', name: '经验学识', desc: '经验获取 +8%', icon: 'book', maxLevel: 10, bonus: 'expGain', value: 0.08, cost: cost(35) },
  { id: 't_luck', category: 'economy', name: '幸运女神', desc: '稀有奖励概率 +10%', icon: 'dice', maxLevel: 8, bonus: 'luck', value: 0.1, cost: cost(50) },
  { id: 't_refresh', category: 'economy', name: '洞察之眼', desc: '每局升级刷新次数 +1', icon: 'refresh', maxLevel: 5, special: 'refresh', value: 1, cost: cost(150) },
  { id: 't_startGold', category: 'economy', name: '启动资金', desc: '每局开始金币 +60', icon: 'bag', maxLevel: 8, special: 'startGold', value: 60, cost: cost(60) },
  { id: 't_deploy', category: 'economy', name: '战术编队', desc: '部署上限 +1', icon: 'flag', maxLevel: 2, special: 'deployCap', value: 1, cost: cost(400) },
  { id: 't_heroPool', category: 'economy', name: '英雄人脉', desc: '可选初始英雄池 +1', icon: 'user', maxLevel: 4, special: 'heroPool', value: 1, cost: cost(200) },
  { id: 't_offline', category: 'economy', name: '离线研究', desc: '离线收益 +25%', icon: 'clock', maxLevel: 5, special: 'offlineRate', value: 0.25, cost: cost(80) },
];

export const TALENT_MAP: Record<string, TalentNode> = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

export const CATEGORY_NAME: Record<TalentCategory, string> = {
  attack: '攻击天赋', defense: '防御天赋', economy: '经济天赋',
};
