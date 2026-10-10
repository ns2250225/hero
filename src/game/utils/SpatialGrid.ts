export interface GridItem<T> {
  x: number;
  y: number;
  ref: T;
  alive: boolean;
}

/** 均匀空间网格，用于范围查询与索敌 */
export class SpatialGrid<T> {
  private cells = new Map<number, GridItem<T>[]>();
  private cellSize: number;
  private cols: number;
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number, cellSize = 96) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize) + 1;
  }

  clear() {
    this.cells.clear();
  }

  private key(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  insert(x: number, y: number, ref: T) {
    const cx = Math.max(0, Math.floor(x / this.cellSize));
    const cy = Math.max(0, Math.floor(y / this.cellSize));
    const k = this.key(cx, cy);
    let arr = this.cells.get(k);
    if (!arr) {
      arr = [];
      this.cells.set(k, arr);
    }
    arr.push({ x, y, ref, alive: true });
  }

  query(x: number, y: number, radius: number, out: T[]): T[] {
    out.length = 0;
    const minX = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxX = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minY = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxY = Math.min(this.cols - 1, Math.floor((y + radius) / this.cellSize));
    const r2 = radius * radius;
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const it of arr) {
          const dx = it.x - x;
          const dy = it.y - y;
          if (dx * dx + dy * dy <= r2) out.push(it.ref);
        }
      }
    }
    return out;
  }
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
