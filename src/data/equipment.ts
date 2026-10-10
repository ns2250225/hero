import type { BonusBlock, StatKey } from '@/types/hero';

export type Slot = 'weapon' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'accessory';
export type Quality = 'common' | 'fine' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface AffixConfig {
  id: string;
  name: string;
  stat?: StatKey;
  bonus?: keyof BonusBlock;
  /** 每个品质等级的基础数值 */
  value: number;
  /** 每品质等级的增量 */
  perTier: number;
  /** 百分比属性 */
  isPct?: boolean;
  special?: string;
}

export const AFFIXES: AffixConfig[] = [
  { id: 'atkPct', name: '攻击力', stat: 'attack', value: 0.1, perTier: 0.05, isPct: true },
  { id: 'atkFlat', name: '固定攻击', stat: 'attack', value: 4, perTier: 3 },
  { id: 'hpPct', name: '最大生命', stat: 'maxHp', value: 0.1, perTier: 0.06, isPct: true },
  { id: 'hpFlat', name: '固定生命', stat: 'maxHp', value: 30, perTier: 22 },
  { id: 'defPct', name: '防御力', stat: 'defense', value: 0.12, perTier: 0.07, isPct: true },
  { id: 'atkSpeed', name: '攻击速度', stat: 'attackSpeed', value: 0.08, perTier: 0.04, isPct: true },
  { id: 'critRate', name: '暴击率', stat: 'critRate', value: 0.05, perTier: 0.025 },
  { id: 'critDmg', name: '暴击伤害', stat: 'critDamage', value: 0.15, perTier: 0.1 },
  { id: 'dodge', name: '闪避', stat: 'dodgeRate', value: 0.04, perTier: 0.02 },
  { id: 'cdr', name: '冷却缩减', stat: 'cooldownReduction', value: 0.05, perTier: 0.025 },
  { id: 'skillPower', name: '技能伤害', stat: 'skillPower', value: 0.1, perTier: 0.06, isPct: true },
  { id: 'lifeSteal', name: '吸血', stat: 'lifeSteal', value: 0.03, perTier: 0.015 },
  { id: 'range', name: '攻击范围', stat: 'attackRange', value: 0.06, perTier: 0.04, isPct: true },
  { id: 'area', name: '技能范围', bonus: 'area', value: 0.1, perTier: 0.06, isPct: true },
  { id: 'fireDmg', name: '火焰伤害', bonus: 'fireDmg', value: 0.15, perTier: 0.08 },
  { id: 'iceDmg', name: '冰霜伤害', bonus: 'iceDmg', value: 0.15, perTier: 0.08 },
  { id: 'lightningDmg', name: '雷电伤害', bonus: 'lightningDmg', value: 0.15, perTier: 0.08 },
  { id: 'poisonDmg', name: '毒素伤害', bonus: 'poisonDmg', value: 0.15, perTier: 0.08 },
  { id: 'summonCount', name: '召唤物数量', bonus: 'summonCount', value: 1, perTier: 0.5 },
  { id: 'projSplit', name: '投射物分裂概率', bonus: 'splitChance', value: 0.08, perTier: 0.05 },
  { id: 'killHeal', name: '击杀恢复生命', bonus: 'killHeal', value: 2, perTier: 1.5 },
  { id: 'critLightning', name: '暴击释放闪电', bonus: 'critLightning', value: 1, perTier: 0 },
  { id: 'shieldPeriodic', name: '周期性护盾', bonus: 'shieldPeriodic', value: 0.05, perTier: 0.03 },
  { id: 'goldGain', name: '金币收益', bonus: 'goldGain', value: 0.12, perTier: 0.07 },
  { id: 'bossDmg', name: '对 Boss 伤害', bonus: 'bossDmg', value: 0.15, perTier: 0.08 },
];

export const AFFIX_MAP: Record<string, AffixConfig> = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

export interface ItemBase {
  id: string;
  name: string;
  slot: Slot;
  icon: string;
  /** 影响可出现词条 */
  tags: string[];
}

export const ITEM_BASES: ItemBase[] = [
  { id: 'shortSword', name: '短剑', slot: 'weapon', icon: 'sword', tags: ['physical'] },
  { id: 'longBow', name: '长弓', slot: 'weapon', icon: 'bow', tags: ['physical'] },
  { id: 'oakStaff', name: '橡木法杖', slot: 'weapon', icon: 'staff', tags: ['magic'] },
  { id: 'fireStaff', name: '烈焰法杖', slot: 'weapon', icon: 'staff', tags: ['fire'] },
  { id: 'frostStaff', name: '霜语法杖', slot: 'weapon', icon: 'staff', tags: ['ice'] },
  { id: 'stormStaff', name: '雷霆法杖', slot: 'weapon', icon: 'staff', tags: ['lightning'] },
  { id: 'venomFlask', name: '毒液喷壶', slot: 'weapon', icon: 'flask', tags: ['poison'] },
  { id: 'boneWand', name: '骨杖', slot: 'weapon', icon: 'wand', tags: ['summon'] },
  { id: 'mechRifle', name: '机械长枪', slot: 'weapon', icon: 'gun', tags: ['mech'] },
  { id: 'shadowDagger', name: '暗影匕首', slot: 'weapon', icon: 'dagger', tags: ['shadow'] },
  { id: 'leatherCap', name: '皮帽', slot: 'helmet', icon: 'cap', tags: [] },
  { id: 'ironHelm', name: '铁盔', slot: 'helmet', icon: 'helm', tags: ['tank'] },
  { id: 'mageHat', name: '法师帽', slot: 'helmet', icon: 'hat', tags: ['magic'] },
  { id: 'leatherArmor', name: '皮甲', slot: 'armor', icon: 'armor', tags: [] },
  { id: 'plateArmor', name: '板甲', slot: 'armor', icon: 'plate', tags: ['tank'] },
  { id: 'robe', name: '法袍', slot: 'armor', icon: 'robe', tags: ['magic'] },
  { id: 'leatherGloves', name: '皮手套', slot: 'gloves', icon: 'gloves', tags: [] },
  { id: 'powerGauntlet', name: '力量护手', slot: 'gloves', icon: 'gauntlet', tags: ['physical'] },
  { id: 'swiftBoots', name: '迅捷之靴', slot: 'boots', icon: 'boots', tags: [] },
  { id: 'heavyBoots', name: '重装战靴', slot: 'boots', icon: 'boots2', tags: ['tank'] },
  { id: 'rubyRing', name: '红宝石戒指', slot: 'accessory', icon: 'ring', tags: [] },
  { id: 'luckyCharm', name: '幸运护符', slot: 'accessory', icon: 'charm', tags: [] },
  { id: 'skullTotem', name: '骷髅图腾', slot: 'accessory', icon: 'totem', tags: ['summon'] },
  { id: 'manaOrb', name: '法力宝珠', slot: 'accessory', icon: 'orb', tags: ['magic'] },
];

export const SLOT_NAME: Record<Slot, string> = {
  weapon: '武器', helmet: '头盔', armor: '护甲', gloves: '手套', boots: '鞋子', accessory: '饰品',
};

export const QUALITY_NAME: Record<Quality, string> = {
  common: '普通', fine: '优秀', rare: '稀有', epic: '史诗', legendary: '传说', mythic: '神话',
};

export const QUALITY_COLOR: Record<Quality, string> = {
  common: '#d8d8d8', fine: '#5fd85f', rare: '#4aa8ff', epic: '#b76cff', legendary: '#ffb02e', mythic: '#ff5a5a',
};

export const QUALITY_TIER: Record<Quality, number> = {
  common: 0, fine: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};

export const QUALITY_AFFIX_COUNT: Record<Quality, number> = {
  common: 1, fine: 2, rare: 3, epic: 4, legendary: 5, mythic: 6,
};

export interface AffixRoll {
  id: string;
  value: number;
}

export interface EquipmentItem {
  uid: string;
  baseId: string;
  quality: Quality;
  level: number;
  affixes: AffixRoll[];
  /** 战斗中临时掉落（不进入永久背包） */
  temp?: boolean;
  equippedBy?: string;
}

export const QUALITY_WEIGHTS: Record<Quality, number> = {
  common: 40, fine: 28, rare: 18, epic: 9, legendary: 4, mythic: 1,
};
