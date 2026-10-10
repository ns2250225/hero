import { HERO_MAP } from '@/data/heroes';
import { buildHeroGrid } from './characters';

const cache = new Map<string, string>();

/** 用英雄待机帧生成头像 data URL，供 Vue 界面使用 */
export function heroPortraitUrl(heroId: string, size = 64, awakened = false): string {
  const key = `${heroId}|${size}|${awakened ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cfg = HERO_MAP[heroId];
  if (!cfg) return '';
  const def = buildHeroGrid(cfg, awakened ? 'awakenIdle' : 'idleA');
  const rows = def.pixels;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  // 裁剪透明边缘，让头像居中饱满
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '.' || rows[y][x] === ' ') continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.max(cw, ch);
  const scale = Math.max(1, Math.floor(size / side));
  const cvs = document.createElement('canvas');
  cvs.width = side * scale;
  cvs.height = side * scale;
  const ctx = cvs.getContext('2d');
  if (!ctx) return '';
  const ox = Math.floor((side - cw) / 2);
  const oy = side - ch;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const c = rows[y][x];
      if (!c || c === '.' || c === ' ') continue;
      const color = def.palette[c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect((x - minX + ox) * scale, (y - minY + oy) * scale, scale, scale);
    }
  }
  const url = cvs.toDataURL();
  cache.set(key, url);
  return url;
}

export function isHeroGlyph(glyph: string): boolean {
  return glyph.startsWith('hero_');
}

export function heroIdFromGlyph(glyph: string): string {
  return glyph.replace(/^hero_/, '');
}
