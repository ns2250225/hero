import type { Enemy, Boss } from '../entities/Enemy';
import type { Hero } from '../entities/Hero';
import { LAYOUT } from '../utils/Balance';

export type Targetable = Enemy | Boss;

/** 索敌优先级（PRD 8.1）：最接近防线的优先 */
export function scoreTarget(e: Targetable): number {
  let score = -e.x; // x 越小越靠左，优先级越高
  if (e instanceof Object && 'elite' in e && (e as Enemy).elite) score += 40;
  return score;
}

export interface TargetingOptions {
  preferElite?: boolean;
  preferLowHp?: boolean;
  preferFlying?: boolean;
  maxX?: number;
  ignoreStealth?: boolean;
}

export function pickBest(
  candidates: Targetable[],
  from: { x: number; y: number },
  opts: TargetingOptions = {},
): Targetable | null {
  let best: Targetable | null = null;
  let bestScore = -Infinity;
  for (const e of candidates) {
    if (!e.alive) continue;
    if (opts.ignoreStealth !== true) {
      const stealth = (e as Enemy).stealthOn;
      if (stealth) continue;
    }
    if (opts.preferFlying !== undefined) {
      const fl = (e as Enemy).flying ?? false;
      if (opts.preferFlying && !fl) continue;
    }
    let s = -e.x;
    const isElite = 'elite' in e && (e as Enemy).elite;
    const isBoss = 'cfg' in e && 'title' in (e as Boss).cfg;
    if (opts.preferElite && (isElite || isBoss)) s += 260;
    if (isElite) s += 25;
    if (isBoss) s += 12;
    if (opts.preferLowHp) s += (1 - e.hp / e.maxHp) * 200;
    s -= Math.abs(e.y - from.y) * 0.12;
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  void LAYOUT;
  return best;
}

/** 在半径内按 x 排序（最靠左优先） */
export function sortByClosestToBase(list: Targetable[]): Targetable[] {
  return list.slice().sort((a, b) => a.x - b.x);
}

export function nearestTo(x: number, y: number, list: Targetable[]): Targetable | null {
  let best: Targetable | null = null;
  let bd = Infinity;
  for (const e of list) {
    if (!e.alive) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

export function lowestHp(list: Targetable[]): Targetable | null {
  let best: Targetable | null = null;
  let bh = Infinity;
  for (const e of list) {
    if (!e.alive) continue;
    if (e.hp < bh) {
      bh = e.hp;
      best = e;
    }
  }
  return best;
}

/** 最密集处（用于陨石/毒雾等范围技能） */
export function densestCluster(list: Targetable[], radius: number, minX = 0): { x: number; y: number; count: number } | null {
  let best: { x: number; y: number; count: number } | null = null;
  const r2 = radius * radius;
  for (const e of list) {
    if (!e.alive || e.x < minX) continue;
    let count = 0;
    for (const o of list) {
      if (!o.alive) continue;
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= r2) count++;
    }
    if (!best || count > best.count) best = { x: e.x, y: e.y, count };
  }
  return best;
}

/** 英雄的阻挡判定：返回被该英雄阻挡的敌人列表 */
export function shouldBlock(hero: Hero, enemy: Enemy): boolean {
  if (hero.down) return false;
  if (hero.stats.blockCapacity <= 0) return false;
  if (enemy.flying) return false;
  const dx = enemy.x - hero.homeX;
  const dy = Math.abs(enemy.y - hero.homeY);
  const reach = 30 + (hero.cfg.attackType === 'melee' ? 12 : 0);
  return dx > 0 && dx < reach && dy < 42;
}
