import Phaser from 'phaser';
import { makePixelTexture, type PixelSpriteOptions } from './PixelFactory';
import type { SpriteDef } from './characters';

export function def(scale = 1): PixelSpriteOptions {
  return { pixels: [], palette: {}, scale };
}

export function addSprite(scene: Phaser.Scene, key: string, s: SpriteDef, scale = 1): boolean {
  if (scene.textures.exists(key)) return false;
  makePixelTexture(scene, key, { pixels: s.pixels, palette: s.palette, scale }, true);
  return true;
}

/** 生成一个矩形光带纹理（用于激光、剑气拖尾） */
export function addStreak(scene: Phaser.Scene, key: string, color: number, w = 64, h = 6, alpha = 0.9): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(color, alpha * 0.35);
  g.fillRect(0, 0, w, h);
  g.fillStyle(color, alpha);
  g.fillRect(w * 0.15, h * 0.25, w * 0.7, h * 0.5);
  g.fillStyle(0xffffff, alpha);
  g.fillRect(w * 0.3, h * 0.4, w * 0.4, h * 0.2);
  g.generateTexture(key, w, h);
  g.destroy();
}
