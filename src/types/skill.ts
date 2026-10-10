import type { Element } from './hero';

export type SkillKind =
  | 'whirlwind'
  | 'swordWave'
  | 'bladeStorm'
  | 'multiShot'
  | 'pierceShot'
  | 'rain'
  | 'fireball'
  | 'flameStorm'
  | 'meteor'
  | 'fireWall'
  | 'icicle'
  | 'frostNova'
  | 'blizzard'
  | 'chain'
  | 'thunderField'
  | 'spear'
  | 'poisonBomb'
  | 'poisonFog'
  | 'corrode'
  | 'holySmite'
  | 'healRing'
  | 'holyShield'
  | 'homing'
  | 'voidPull'
  | 'soulReap'
  | 'summonSkeleton'
  | 'summonGhost'
  | 'summonGolem'
  | 'turret'
  | 'drones';

export interface SkillLevelScale {
  damage: number; // 每级伤害倍率增量
  count: number; // 每级数量增量
  area: number; // 每级范围增量（比例）
  cooldown: number; // 每级冷却缩减（比例）
  pierce: number;
  duration: number; // 每级持续时间增量（秒）
}

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  element: Element;
  kind: SkillKind;
  maxLevel: number;
  cooldown: number;
  baseDamage: number; // 攻击力倍率
  range: number;
  projectileCount: number;
  radius: number;
  duration: number;
  pierce: number;
  scale: SkillLevelScale;
  evolutionId?: string;
  evolveRequires?: string; // 进化所需被动强化 id
  isEvolution?: boolean;
  status?: 'slow' | 'freeze' | 'burn' | 'poison' | 'corrode' | 'stun';
  glyph: string;
}
