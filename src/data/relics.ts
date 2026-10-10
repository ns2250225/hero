import type { BonusBlock, StatKey } from '@/types/hero';

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RelicConfig {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rarity: RelicRarity;
  /** 对全队英雄属性的百分比/固定加成 */
  mods?: Partial<Record<StatKey, number>>;
  /** 非属性类加成 */
  bonus?: BonusBlock;
  /** 特殊触发标记，由战斗系统识别 */
  flag?: 'critLightning' | 'phoenix' | 'undeadPact' | 'execute' | 'bounty' | 'waveHeal' | 'guardTotem';
  /** 基地生命上限加成 */
  baseHp?: number;
  /** 基地护盾 */
  baseShield?: number;
  unlockCost: number;
}

export const RELICS: RelicConfig[] = [
  { id: 'thorEye', name: '雷神之眼', desc: '暴击时释放闪电，对周围敌人造成 120% 攻击力伤害', icon: 'bolt', rarity: 'epic', flag: 'critLightning', unlockCost: 0 },
  { id: 'splitMirror', name: '分裂魔镜', desc: '投射物有 25% 概率分裂为两支', icon: 'mirror', rarity: 'epic', bonus: { splitChance: 0.25 }, unlockCost: 0 },
  { id: 'hourglass', name: '时间沙漏', desc: '全队技能冷却缩减 15%', icon: 'hourglass', rarity: 'rare', mods: { cooldownReduction: 0.15 }, unlockCost: 0 },
  { id: 'greedyCoin', name: '贪婪金币', desc: '金币收益 +40%', icon: 'coin', rarity: 'common', bonus: { goldGain: 0.4 }, unlockCost: 0 },
  { id: 'vampFang', name: '吸血獠牙', desc: '全队获得 6% 吸血', icon: 'fang', rarity: 'rare', mods: { lifeSteal: 0.06 }, unlockCost: 120 },
  { id: 'phoenixFeather', name: '不死羽毛', desc: '每名英雄首次死亡立即原地复活并恢复 60% 生命', icon: 'feather', rarity: 'legendary', flag: 'phoenix', unlockCost: 300 },
  { id: 'undeadPact', name: '亡灵契约', desc: '每击杀 40 个敌人召唤 2 只骷髅战士', icon: 'skull', rarity: 'epic', flag: 'undeadPact', unlockCost: 200 },
  { id: 'flameHeart', name: '火焰之心', desc: '火焰伤害 +30%，持续伤害时间 +50%', icon: 'fire', rarity: 'rare', bonus: { fireDmg: 0.3, duration: 0.5 }, unlockCost: 150 },
  { id: 'frostCrown', name: '冰霜王冠', desc: '冰冻与减速持续 +40%，冰霜伤害 +15%', icon: 'crown', rarity: 'rare', bonus: { freezeDuration: 0.4, iceDmg: 0.15 }, unlockCost: 150 },
  { id: 'luckyDice', name: '幸运骰子', desc: '稀有奖励概率大幅提升', icon: 'dice', rarity: 'common', bonus: { luck: 1 }, unlockCost: 100 },
  { id: 'giantHeart', name: '巨人之心', desc: '全队最大生命 +25%', icon: 'heart', rarity: 'rare', mods: { maxHp: 0.25 }, unlockCost: 100 },
  { id: 'mechCore', name: '机械核心', desc: '炮台与无人机伤害 +40%，持续时间 +50%', icon: 'gear', rarity: 'epic', bonus: { mechPower: 0.4, duration: 0.5 }, unlockCost: 250 },
  { id: 'stormRing', name: '风暴指环', desc: '雷电伤害 +30%，攻击速度 +12%', icon: 'ring', rarity: 'rare', bonus: { lightningDmg: 0.3 }, mods: { attackSpeed: 0.12 }, unlockCost: 150 },
  { id: 'venomSac', name: '剧毒囊袋', desc: '毒素伤害 +35%', icon: 'flask', rarity: 'rare', bonus: { poisonDmg: 0.35 }, unlockCost: 150 },
  { id: 'shadowCloak', name: '暗影披风', desc: '暗影伤害 +30%，全队闪避 +8%', icon: 'cloak', rarity: 'epic', bonus: { shadowDmg: 0.3 }, mods: { dodgeRate: 0.08 }, unlockCost: 200 },
  { id: 'holySymbol', name: '神圣徽记', desc: '治疗效果 +40%，全队防御 +15%', icon: 'cross', rarity: 'rare', bonus: { healPower: 0.4 }, mods: { defense: 0.15 }, unlockCost: 150 },
  { id: 'warpaint', name: '战纹图腾', desc: '全队攻击力 +18%', icon: 'totem', rarity: 'rare', mods: { attack: 0.18 }, unlockCost: 150 },
  { id: 'guardTotem', name: '守护图腾', desc: '基地生命上限 +40，并获得 20 点护盾', icon: 'shield', rarity: 'epic', flag: 'guardTotem', baseHp: 40, baseShield: 20, unlockCost: 200 },
  { id: 'bannerOfTide', name: '潮汐战旗', desc: '每波开始时全队恢复 15% 生命', icon: 'flag', rarity: 'epic', flag: 'waveHeal', unlockCost: 200 },
  { id: 'executionerBlade', name: '斩首之刃', desc: '对生命值低于 30% 的敌人伤害 +60%', icon: 'blade', rarity: 'legendary', flag: 'execute', unlockCost: 400 },
  { id: 'summonHorn', name: '召唤号角', desc: '召唤物数量 +2，召唤物伤害 +30%', icon: 'horn', rarity: 'legendary', bonus: { summonCount: 2, summonPower: 0.3 }, unlockCost: 400 },
  { id: 'bountyContract', name: '赏金契约', desc: '精英怪与 Boss 掉落翻倍', icon: 'scroll', rarity: 'epic', flag: 'bounty', unlockCost: 250 },
];

export const RELIC_MAP: Record<string, RelicConfig> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

export const RELIC_RARITY_NAME: Record<RelicRarity, string> = {
  common: '普通', rare: '稀有', epic: '史诗', legendary: '传说',
};
export const RELIC_RARITY_COLOR: Record<RelicRarity, string> = {
  common: '#d8d8d8', rare: '#4aa8ff', epic: '#b76cff', legendary: '#ffb02e',
};
export const RELIC_WEIGHTS: Record<RelicRarity, number> = { common: 40, rare: 30, epic: 22, legendary: 8 };
