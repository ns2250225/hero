import Phaser from 'phaser';

export interface PixelSpriteOptions {
  /** 逻辑像素矩阵，每个字符对应一个调色板颜色 */
  pixels: string[];
  /** 字符 → 十六进制颜色 */
  palette: Record<string, string>;
  /** 单个像素的放大倍数 */
  scale?: number;
}

export const TRANSPARENT = ' ';

/**
 * 把字符矩阵绘制成纹理。这是本项目所有像素美术的唯一来源，
 * 因此无需外部图片资源、可完全离线运行。
 */
export function makePixelTexture(
  scene: Phaser.Scene,
  key: string,
  opts: PixelSpriteOptions,
  overwrite = false,
): void {
  if (scene.textures.exists(key)) {
    if (!overwrite) return;
    scene.textures.remove(key);
  }
  const scale = opts.scale ?? 1;
  const h = opts.pixels.length;
  const w = Math.max(...opts.pixels.map((r) => r.length));
  const canvas = scene.textures.createCanvas(key, w * scale, h * scale);
  if (!canvas) return;
  const ctx = canvas.getContext();
  for (let y = 0; y < h; y++) {
    const row = opts.pixels[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === TRANSPARENT || ch === '.') continue;
      const color = opts.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  canvas.refresh();
}

/** 生成一张纯色纹理（用于胶囊、光条、地面）*/
export function makeRectTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  color: number,
  alpha = 1,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRect(0, 0, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 生成圆形光晕纹理 */
export function makeGlowTexture(scene: Phaser.Scene, key: string, radius: number, color: number): void {
  if (scene.textures.exists(key)) return;
  const size = radius * 2;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const grd = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  const hex = `#${color.toString(16).padStart(6, '0')}`;
  grd.addColorStop(0, hex);
  grd.addColorStop(0.35, hex);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();
  canvas.refresh();
  const c = scene.textures.get(key) as Phaser.Textures.CanvasTexture;
  if (c && c.source && c.source[0]) {
    // 让径向渐变保留透明度
  }
}

/** 生成菱形/方块粒子纹理 */
export function makeParticleTexture(scene: Phaser.Scene, key: string, size: number, color: number, shape: 'square' | 'diamond' | 'spark' = 'square'): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  if (shape === 'square') {
    g.fillRect(0, 0, size, size);
  } else if (shape === 'diamond') {
    g.beginPath();
    g.moveTo(size / 2, 0);
    g.lineTo(size, size / 2);
    g.lineTo(size / 2, size);
    g.lineTo(0, size / 2);
    g.closePath();
    g.fillPath();
  } else {
    g.fillRect(size / 2 - 1, 0, 2, size);
    g.fillRect(0, size / 2 - 1, size, 2);
  }
  g.generateTexture(key, size, size);
  g.destroy();
}
