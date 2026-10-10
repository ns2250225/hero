import type { GameMode, WaveProgress } from '@/types/game';
import type { MapConfig } from './maps';
import { ENEMIES, ENEMY_MIN_WAVE } from './enemies';
import { BOSSES } from './bosses';

/** 出自 PRD 7.3 的难度曲线 */
export function getWaveMultiplier(wave: number): number {
  return 1 + wave * 0.1 + Math.pow(wave, 1.2) * 0.02;
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
  const mult = getWaveMultiplier(wave) * map.hpMult;
  const entries: SpawnEntry[] = [];
  const waveCount = Math.round(getWaveCount(wave) * map.countMult * (o.extraCount ?? 1));

  const pool = ENEMIES.filter((e) => (ENEMY_MIN_WAVE[e.id] ?? 1) <= wave);
  const normalPool = pool.filter((e) => !e.special);
  const specialPool = pool.filter((e) => e.special);
  // 越高波次特殊怪比例越高
  const specialRatio = Math.min(0.55, 0.04 + wave * 0.024);
  const eliteChance = isEliteWave(wave, mode) ? 0.4 : Math.min(0.22, wave * 0.006);
  const dense = getWaveMultiplier(wave);

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
