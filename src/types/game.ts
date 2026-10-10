import type { BonusBlock, HeroInstance, StatKey, Rarity } from './hero';
import type { EnemySave } from './enemy';

export type GameMode = 'normal' | 'endless' | 'challenge';

export type ChallengeRule = 'threeHeroes' | 'doubleSpeed' | 'magesOnly' | 'oneHp' | 'fastCooldown' | 'bossRush';

export type CardCategory =
  | 'recruit' | 'star' | 'heroStat' | 'skillLearn' | 'skillUp' | 'evolve'
  | 'team' | 'passive' | 'special' | 'summon' | 'economy' | 'defense'
  | 'capacity' | 'replace';

export type CardRarity = Rarity;

export interface UpgradeCard {
  key: string;
  category: CardCategory;
  rarity: CardRarity;
  title: string;
  desc: string;
  icon: string;
  levelText?: string;
  heroUid?: number;
  heroId?: string;
  skillId?: string;
  passiveId?: string;
  stat?: StatKey;
  value?: number;
  effectId?: string;
  replaceUid?: number;
  tags: string[];
}

export type DefenseId = 'arrowTower' | 'lineShield' | 'autoRepair' | 'lightning' | 'fireTrap' | 'slowField';
export type SpecialEffectId = 'killExplode' | 'critLightning' | 'splitShot' | 'executioner' | 'frostTouch' | 'chainKill';

export type AutoPickStrategy = 'manual' | 'dps' | 'survival' | 'summon' | 'balanced' | 'custom';

export interface RunStats {
  kills: number;
  totalDamage: number;
  maxHit: number;
  goldEarned: number;
  elitesKilled: number;
  bossesKilled: number;
  heroesRecruited: number;
  evolutions: number;
  breaches: number;
  maxStar: number;
  synergies: string[];
  synergyFlags: string[];
  equipmentFound: string[];
}

export interface WaveProgress {
  wave: number;
  phase: 'placement' | 'spawning' | 'clearing' | 'intermission' | 'done';
  queue: { enemyId: string; at: number; elite: boolean }[];
  queueIndex: number;
  waveTime: number;
  intermission: number;
  bossId?: string;
  bossSpawned: boolean;
  bossAlive: boolean;
}

export interface RunState {
  version: number;
  seed: number;
  rngState: number;
  mode: GameMode;
  mapId: string;
  challengeRules: ChallengeRule[];
  maxWave: number;
  wave: WaveProgress;
  elapsedTime: number;
  baseHp: number;
  baseMaxHp: number;
  baseShield: number;
  teamLevel: number;
  teamExp: number;
  gold: number;
  refreshes: number;
  deployCap: number;
  heroes: HeroInstance[];
  nextUid: number;
  teamMods: { flat: Partial<Record<StatKey, number>>; pct: Partial<Record<StatKey, number>>; bonus: BonusBlock };
  passives: Record<string, number>;
  relics: string[];
  defenses: Partial<Record<DefenseId, number>>;
  specials: Partial<Record<SpecialEffectId, number>>;
  pendingLevelUps: number;
  autoPick: AutoPickStrategy;
  customPriority: string[];
  stats: RunStats;
  enemies: EnemySave[];
  killCounter: number;
  eventsSeen: string[];
  curses: string[];
  curseAppliedBaseHp?: boolean;
}

export interface BattleSave {
  version: number;
  savedAt: number;
  run: RunState;
}

export type RandomEventId = 'merchant' | 'blessing' | 'curse' | 'raid' | 'chest' | 'rescue';

export interface EventOption {
  id: string;
  title: string;
  desc: string;
  cost?: number;
  icon: string;
  disabled?: boolean;
}

export interface GameEventPayload {
  eventId: string;
  title: string;
  desc: string;
  options: EventOption[];
  multi?: boolean;
  offers?: unknown[];
}

export interface BattleResultStats {
  kills: number;
  elites: number;
  bosses: number;
  evolutions: number;
  breaches: number;
  maxStar: number;
  synergies: string[];
  relics: number;
  equipment: number;
  recruited: number;
}

export interface BattleResult {
  victory: boolean;
  mode: GameMode;
  mapId: string;
  wave: number;
  kills: number;
  totalDamage: number;
  maxHit: number;
  time: number;
  goldEarned: number;
  permGold: number;
  equipment: string[];
  achievements: string[];
  newRecord: boolean;
  teamLevel: number;
  heroes: { heroId: string; star: number; damage: number }[];
  stats?: BattleResultStats;
}

export interface HudHeroSkill {
  id: string;
  level: number;
  cd: number;
}

export interface HudHero {
  uid: number;
  heroId: string;
  star: number;
  hp: number;
  maxHp: number;
  shield: number;
  x: number;
  y: number;
  down: boolean;
  downTimer: number;
  damage: number;
  skills: HudHeroSkill[];
}

export interface HudState {
  wave: number;
  maxWave: number;
  baseHp: number;
  baseMaxHp: number;
  baseShield: number;
  gold: number;
  level: number;
  exp: number;
  expNext: number;
  kills: number;
  time: number;
  speed: number;
  paused: boolean;
  phase: WaveProgress['phase'];
  intermission: number;
  enemies: number;
  fps: number;
  refreshes: number;
  canSkipWave: boolean;
  eliteWave: boolean;
  heroes: HudHero[];
  relics: string[];
  synergies: string[];
  defenses: Partial<Record<DefenseId, number>>;
  specials: Partial<Record<SpecialEffectId, number>>;
  passives: Record<string, number>;
  deployCap: number;
}

export interface BossBarState {
  visible: boolean;
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  shield: boolean;
  enraged: boolean;
}
