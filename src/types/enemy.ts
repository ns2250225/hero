export type EnemyAbility =
  | 'shield'
  | 'charge'
  | 'explode'
  | 'healer'
  | 'summoner'
  | 'flying'
  | 'split'
  | 'stealth'
  | 'giant'
  | 'ranged'
  | 'fast';

export type EnemyShape =
  | 'slime'
  | 'skeleton'
  | 'goblin'
  | 'wolf'
  | 'bat'
  | 'mushroom'
  | 'imp'
  | 'spider'
  | 'shieldman'
  | 'boar'
  | 'bomber'
  | 'shaman'
  | 'necro'
  | 'eye'
  | 'bigslime'
  | 'ghost'
  | 'ogre'
  | 'archer';

export interface EnemyConfig {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  attackRange: number;
  attackSpeed: number;
  expReward: number;
  goldReward: number;
  baseDamage: number; // 突破防线造成的伤害
  abilities: EnemyAbility[];
  spriteKey: string;
  shape: EnemyShape;
  colors: [string, string, string];
  scale: number;
  special: boolean;
  desc: string;
}

export type BossSkillKind =
  | 'summon'
  | 'roots'
  | 'fireBreath'
  | 'meteor'
  | 'freeze'
  | 'poisonFog'
  | 'laser'
  | 'missiles'
  | 'shadowPulse'
  | 'barrage'
  | 'shield'
  | 'charge';

export type BossShape = 'tree' | 'skullLord' | 'dragon' | 'giant' | 'queen' | 'mech' | 'demon' | 'star';

export interface BossConfig {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  attackRange: number;
  attackSpeed: number;
  expReward: number;
  goldReward: number;
  skills: BossSkillKind[];
  summonIds: string[];
  shape: BossShape;
  colors: [string, string, string, string];
  desc: string;
}

export interface EnemySave {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  elite: boolean;
  boss: boolean;
  mult: number;
  /** 攻击成长倍率；旧存档缺省时回落到 mult */
  atkMult?: number;
}
