import { buildRingGrid, buildBurstGrid, type SpriteDef } from './characters';
import { addSprite } from './textures';

export const RING_FRAMES = 8;
export const RING_SIZE = 32;
export const BURST_FRAMES = 5;

export function buildRingFrames(color: string): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (let i = 0; i < RING_FRAMES; i++) {
    const radius = ((i + 1) / RING_FRAMES) * (RING_SIZE / 2 - 1);
    out.push(buildRingGrid(color, radius, 1.6 + i * 0.5, RING_SIZE));
  }
  return out;
}

export function buildBurstFrames(color: string): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (let i = 0; i < BURST_FRAMES; i++) out.push(buildBurstGrid(color, i));
  return out;
}

export const RING_COLORS = ['#ff9a3a', '#8fd8ff', '#ffe84a', '#9cff4a', '#fff2a0', '#c070ff', '#ffffff', '#ff6a6a'];

export function ringKey(color: string, frame: number): string {
  return `ring_${color.replace('#', '')}_${frame}`;
}

export function burstKey(color: string, frame: number): string {
  return `burst_${color.replace('#', '')}_${frame}`;
}

export const GLOW_KEY = 'glow_soft';
export const SPARK_KEY = 'particle_spark';
export const SOFT_KEY = 'particle_soft';
export const SQUARE_KEY = 'particle_square';

/** 生成所有通用特效纹理 */
export function ensureEffectTextures(scene: Phaser.Scene): void {
  for (const c of RING_COLORS) {
    if (scene.textures.exists(ringKey(c, 0))) continue;
    buildRingFrames(c).forEach((f, i) => addSprite(scene, ringKey(c, i), f, 1));
  }
  for (const c of RING_COLORS) {
    if (scene.textures.exists(burstKey(c, 0))) continue;
    buildBurstFrames(c).forEach((f, i) => addSprite(scene, burstKey(c, i), f, 1));
  }
  if (!scene.textures.exists(GLOW_KEY)) {
    const g = scene.add.graphics();
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(0xffffff, 0.05 * i);
      g.fillCircle(32, 32, i * 4);
    }
    g.generateTexture(GLOW_KEY, 64, 64);
    g.destroy();
  }
  if (!scene.textures.exists(SPARK_KEY)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(3, 0, 2, 8);
    g.fillRect(0, 3, 8, 2);
    g.generateTexture(SPARK_KEY, 8, 8);
    g.destroy();
  }
  if (!scene.textures.exists(SOFT_KEY)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(4, 4, 4);
    g.generateTexture(SOFT_KEY, 8, 8);
    g.destroy();
  }
  if (!scene.textures.exists(SQUARE_KEY)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture(SQUARE_KEY, 4, 4);
    g.destroy();
  }
  if (!scene.textures.exists('streak')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(0, 2, 64, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 3, 64, 2);
    g.generateTexture('streak', 64, 8);
    g.destroy();
  }
}

export function ensureRingColor(scene: Phaser.Scene, color: string): void {
  if (scene.textures.exists(ringKey(color, 0))) return;
  buildRingFrames(color).forEach((f, i) => addSprite(scene, ringKey(color, i), f, 1));
}
