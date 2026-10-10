/** 极简字符栅格，用于程序化生成像素矩阵 */
export class Grid {
  readonly w: number;
  readonly h: number;
  private cells: string[][];

  constructor(w: number, h: number, fill = '.') {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }

  set(x: number, y: number, ch: string) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    this.cells[yi][xi] = ch;
  }

  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '.';
    return this.cells[y][x];
  }

  rect(x: number, y: number, w: number, h: number, ch: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
  }

  /** 椭圆（含边框可另画） */
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / Math.max(0.001, rx);
        const dy = (y - cy) / Math.max(0.001, ry);
        if (dx * dx + dy * dy <= 1.02) this.set(x, y, ch);
      }
    }
  }

  /** 上半椭圆（穹顶），底部平直 */
  dome(cx: number, baseY: number, rx: number, ry: number, ch: string) {
    for (let y = Math.floor(baseY - ry); y <= Math.ceil(baseY); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / Math.max(0.001, rx);
        const dy = (y - baseY) / Math.max(0.001, ry);
        if (dx * dx + dy * dy <= 1.02) this.set(x, y, ch);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, ch: string) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (let guard = 0; guard < 512; guard++) {
      this.set(x, y, ch);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** 用 ch2 描边（把已有像素的外圈染成新字符） */
  outline(ch: string, ch2: string, includeDiagonals = true) {
    const copy = this.cells.map((r) => r.slice());
    const dirs = includeDiagonals
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (copy[y][x] !== '.') continue;
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
          if (copy[ny][nx] === ch) {
            this.cells[y][x] = ch2;
            break;
          }
        }
      }
    }
  }

  mirrorX(ch: string, axis: number) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < axis; x++) {
        const v = this.cells[y][x];
        if (v === '.') continue;
        const mx = axis * 2 - x;
        if (mx >= 0 && mx < this.w) this.cells[y][mx] = v;
      }
    }
    void ch;
  }

  replace(from: string, to: string) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.cells[y][x] === from) this.cells[y][x] = to;
  }

  rows(): string[] {
    return this.cells.map((r) => r.join(''));
  }

  clone(): Grid {
    const g = new Grid(this.w, this.h);
    g.cells = this.cells.map((r) => r.slice());
    return g;
  }
}

export type Palette = Record<string, string>;
