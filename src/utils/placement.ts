import { MAPS } from '@/data/maps';
import { HEROES } from '@/data/heroes';
import { LAYOUT } from '@/game/utils/Balance';

export interface StarterPlacement {
  heroId: string;
  x: number;
  y: number;
}

const ROW_X: Record<string, number> = { front: LAYOUT.frontRowX, mid: LAYOUT.midRowX, back: LAYOUT.backRowX };

/**
 * 推荐站位（PRD 5.4）：防御靠右、远程靠左、辅助远离怪物。
 * 同一职责的英雄在通道内纵向展开，并交错排列避免重叠。
 * 返回的只是相对位置，不构成独立通道。
 */
export function formationSlot(role: string, index: number): { x: number; y: number } {
  const span = LAYOUT.laneBottom - LAYOUT.laneTop;
  const rowsPerColumn = 3;
  const col = Math.floor(index / rowsPerColumn);
  const row = index % rowsPerColumn;
  const y = LAYOUT.laneTop + 10 + row * ((span - 20) / (rowsPerColumn - 1));
  const x = (ROW_X[role] ?? LAYOUT.backRowX) - col * 46 + (row % 2) * 14;
  return {
    x: Math.max(LAYOUT.heroMinX, Math.min(LAYOUT.heroMaxX, x)),
    y: Math.max(LAYOUT.laneTop, Math.min(LAYOUT.laneBottom, y)),
  };
}

export function layoutStarters(heroIds: string[], rules: string[] = []): StarterPlacement[] {
  const counts: Record<string, number> = { front: 0, mid: 0, back: 0 };
  const sorted = heroIds.slice().sort((a, b) => {
    const ra = roleRank(HEROES.find((h) => h.id === a)?.role ?? 'back');
    const rb = roleRank(HEROES.find((h) => h.id === b)?.role ?? 'back');
    return ra - rb;
  });
  const placed: StarterPlacement[] = [];
  for (const id of sorted) {
    const cfg = HEROES.find((h) => h.id === id);
    if (!cfg) continue;
    const pos = formationSlot(cfg.role, counts[cfg.role]++);
    placed.push({ heroId: id, ...pos });
  }
  void rules;
  return placed;
}

function roleRank(role: string): number {
  return role === 'front' ? 0 : role === 'mid' ? 1 : 2;
}

export function mapUnlockCost(order: number): number {
  return [0, 0, 400, 900, 1600, 2600, 4000, 6000][Math.min(order - 1, 7)] ?? 0;
}

export function nextMapToUnlock(unlocked: string[]): { id: string; cost: number } | null {
  const next = MAPS.find((m) => !unlocked.includes(m.id));
  if (!next) return null;
  return { id: next.id, cost: mapUnlockCost(next.order) };
}
