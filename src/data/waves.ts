import type { GameMode, WaveProgress } from '@/types/game';
import type { MapConfig } from './maps';
import { ENEMIES, ENEMY_MIN_WAVE } from './enemies';
import { BOSSES } from './bosses';

/** 出自 PRD 7.3 的基础难度曲线 */
export function baseWaveMultiplier(wave: number): number {
  return 1 + wave * 0.1 + Math.pow(wave, 1.2) * 0.02;
}

/**
 * 怪物生命倍率。普通 / 挑战模式沿用基础曲线；
 * 无尽模式 20 波后按指数爬升（每波 +9%），与英雄的乘法成长抗衡，保证后期仍有强度墙。
 */
export function getWaveMultiplier(wave: number, mode: GameMode = 'normal'): number {
  const base = baseWaveMultiplier(wave);
  if (mode !== 'endless' || wave <= 20) return base;
  return base * Math.pow(1.09, wave - 20);
}

/**
 * 怪物攻击倍率。无尽模式成长慢于生命（每波 +4%）：
 * 推图压力来自越来越肉的海量怪物，而非后期一刀秒杀英雄。
 */
export function getWaveAttackMultiplier(wave: number, mode: GameMode = 'normal'): number {
  const base = baseWaveMultiplier(wave);
  if (mode !== 'endless' || wave <= 20) return base;
  return base * Math.pow(1.04, wave - 20);
}

/** 怪物数量随波次增长（单通道高密度） */
export function getWaveCount(wave: number): number {
  return Math.round(8 + wave * 3.4 + Math.pow(wave, 1.45) * 0.55);
}

export function isBossWave(wave: number, mode: GameMode): boolean {
  if (mode === 'endless') return wave % 10 === 0;
  return wave === 10 || wave === 20;
}

export function isEliteWave(wave: number, mode: GameMode): boolean {
  if (mode === 'endless') return wave % 10 === 5;
  return wave === 15;
}

export function bossForWave(wave: number, map: MapConfig): string {
  if (wave === 10) return map.bossIds[0];
  if (wave === 20) return map.bossIds[1];
  // 无尽模式循环所有 Boss
  const idx = Math.floor((wave - 1) / 10) % BOSSES.length;
  return BOSSES[idx].id;
}

export interface WaveGenOptions {
  wave: number;
  mode: GameMode;
  map: MapConfig;
  /** 返回 [0,1) 的随机数 */
  rand: () => number;
  /** 额外数量倍率（挑战模式 / 事件） */
  extraCount?: number;
}

/** 单个怪物的出场计划 */
export interface SpawnEntry {
  enemyId: string;
  at: number;
  elite: boolean;
}

export function buildWave(o: WaveGenOptions): WaveProgress {
  const { wave, mode, map, rand } = o;
  const entries: SpawnEntry[] = [];
  const waveCount = Math.round(getWaveCount(wave) * map.countMult * (o.extraCount ?? 1));

  const pool = ENEMIES.filter((e) => (ENEMY_MIN_WAVE[e.id] ?? 1) <= wave);
  const normalPool = pool.filter((e) => !e.special);
  const specialPool = pool.filter((e) => e.special);
  // 越高波次特殊怪比例越高（无尽模式后期上限更高）
  const specialCap = mode === 'endless' ? 0.75 : 0.55;
  const specialRatio = Math.min(specialCap, 0.04 + wave * 0.024);
  const eliteCap = mode === 'endless' ? 0.32 : 0.22;
  const eliteChance = isEliteWave(wave, mode) ? (mode === 'endless' ? 0.5 : 0.4) : Math.min(eliteCap, wave * 0.006);
  const dense = getWaveMultiplier(wave, mode);

  let t = 0;
  const baseInterval = Math.max(0.09, 0.62 - wave * 0.019) / (1 + (map.countMult - 1) * 0.5);
  for (let i = 0; i < waveCount; i++) {
    const useSpecial = specialPool.length > 0 && rand() < specialRatio;
    const src = useSpecial ? specialPool : normalPool;
    const cfg = src[Math.floor(rand() * src.length) % src.length];
    const elite = rand() < eliteChance;
    entries.push({ enemyId: cfg.id, at: t, elite });
    // 随机生成间隔，允许同时出现多只
    const jitter = baseInterval * (0.45 + rand() * 1.25);
    t += jitter;
    if (dense > 2.2 && rand() < 0.25) t = Math.max(0, t - baseInterval * 0.5);
  }

  const bossId = isBossWave(wave, mode) ? bossForWave(wave, map) : undefined;
  const bossAlive = !!bossId;

  return {
    wave,
    phase: 'spawning',
    queue: entries,
    queueIndex: 0,
    waveTime: 0,
    intermission: 0,
    bossId,
    bossSpawned: false,
    bossAlive,
  };
}

export function waveCategory(wave: number): string {
  if (wave === 10 || wave === 20) return 'BOSS';
  if (wave > 20) return wave % 10 === 0 ? 'BOSS' : '无尽';
  if (wave <= 3) return '基础怪物';
  if (wave <= 5) return '快速怪物潮';
  if (wave <= 9) return '混合怪物';
  if (wave <= 14) return '特殊怪物';
  if (wave === 15) return '精英怪物潮';
  return '高密度怪物潮';
}

export const INTERMISSION_TIME = 4;
