export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Role = 'front' | 'mid' | 'back';
export type Element =
  | 'physical'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'poison'
  | 'holy'
  | 'shadow'
  | 'summon'
  | 'mech';

export interface HeroStats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  attackSpeed: number; // 每秒攻击次数
  attackRange: number;
  critRate: number; // 0~1
  critDamage: number; // 倍率，例如 1.5
  dodgeRate: number; // 0~1
  cooldownReduction: number; // 0~0.6
  skillPower: number; // 倍率，1 为基础
  lifeSteal: number; // 0~1
  blockCapacity: number;
}

export type StatKey = keyof HeroStats;

/** 非 HeroStats 的额外加成（全队或单个英雄） */
export type BonusKey =
  | 'area'
  | 'projectiles'
  | 'pierce'
  | 'duration'
  | 'summonCount'
  | 'summonPower'
  | 'summonSpeed'
  | 'mechPower'
  | 'dotPower'
  | 'physicalDmg'
  | 'fireDmg'
  | 'iceDmg'
  | 'lightningDmg'
  | 'poisonDmg'
  | 'holyDmg'
  | 'shadowDmg'
  | 'goldGain'
  | 'expGain'
  | 'luck'
  | 'freezeDuration'
  | 'splitChance'
  | 'killHeal'
  | 'critLightning'
  | 'shieldPeriodic'
  | 'reviveSpeed'
  | 'healPower'
  | 'eliteDmg'
  | 'bossDmg';

export type BonusBlock = Partial<Record<BonusKey, number>>;

export interface StatMods {
  flat: Partial<Record<StatKey, number>>;
  pct: Partial<Record<StatKey, number>>;
  bonus: BonusBlock;
}

export type NormalAttackKind =
  | 'slash'
  | 'arrow'
  | 'fireball'
  | 'ice'
  | 'lightning'
  | 'knife'
  | 'holy'
  | 'holySword'
  | 'magic'
  | 'bullet'
  | 'flask'
  | 'shadow';

export interface HeroPalette {
  skin: string;
  hair: string;
  body: string;
  body2: string;
  accent: string;
  weapon: string;
  weapon2: string;
}

export type HeadGear = 'helmet' | 'hood' | 'wizard' | 'hair' | 'halo' | 'goggles' | 'horned' | 'bandana';
export type WeaponArt = 'sword' | 'bow' | 'staff' | 'dagger' | 'mace' | 'book' | 'gun' | 'flask' | 'scythe' | 'holySword';

export interface HeroConfig {
  id: string;
  name: string;
  profession: string;
  rarity: Rarity;
  role: Role;
  element: Element;
  tags: string[];
  baseStats: HeroStats;
  attackType: 'melee' | 'ranged' | 'magic';
  attackRange: number;
  normalAttack: NormalAttackKind;
  skills: string[]; // 第一个为专属技能，其余为可学习技能池
  spriteKey: string;
  palette: HeroPalette;
  headGear: HeadGear;
  weaponArt: WeaponArt;
  cape?: boolean;
  desc: string;
  awakenDesc: string;
  unlockCost: number;
}

export interface SkillInstance {
  id: string;
  level: number;
  cd: number;
  evolved: boolean;
}

export interface HeroInstance {
  uid: number;
  heroId: string;
  star: number;
  dupes: number; // 当前星级下累积的重复数量
  x: number;
  y: number;
  hp: number;
  shield: number;
  downTimer: number;
  reviveUsed: boolean;
  skills: SkillInstance[];
  mods: StatMods;
  damageDealt: number;
}
