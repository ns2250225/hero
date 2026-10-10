import Phaser from 'phaser';

export interface FloatTextOptions {
  x: number;
  y: number;
  text: string;
  color: string;
  size?: number;
  duration?: number;
  rise?: number;
  crit?: boolean;
}

export const DAMAGE_COLORS = {
  normal: '#ffffff',
  crit: '#ffe14d',
  hurt: '#ff5a5a',
  heal: '#5affa0',
  ice: '#8fd8ff',
  poison: '#9cff4a',
  fire: '#ff9a3a',
  lightning: '#ffe84a',
  holy: '#fff2a0',
  shadow: '#c070ff',
  exp: '#8fd8ff',
  gold: '#ffd24a',
} as const;

export type DamageKind = keyof typeof DAMAGE_COLORS;

/**
 * 伤害数字合并：同一目标的短时间内多次伤害会累加到一个文本上（PRD 21.4 / 28.2）
 */
export class FloatingTextManager {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Text[] = [];
  private active: { obj: Phaser.GameObjects.Text; tween?: Phaser.Tweens.Tween }[] = [];
  private recent = new Map<string, { obj: Phaser.GameObjects.Text; value: number; at: number }>();
  private maxActive: number;

  constructor(scene: Phaser.Scene, maxActive = 90) {
    this.scene = scene;
    this.maxActive = maxActive;
  }

  private obtain(): Phaser.GameObjects.Text | null {
    if (this.active.length >= this.maxActive) return null;
    const t = this.pool.pop();
    if (t) return t;
    const obj = this.scene.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#101018',
      strokeThickness: 4,
    });
    obj.setOrigin(0.5, 0.5);
    obj.setDepth(900);
    obj.setResolution(2);
    return obj;
  }

  /**
   * 合并窗口内的重复伤害（同一 anchor key）。
   * kind 用于上色，value 为伤害值（正数）。
   */
  damage(anchorKey: string, x: number, y: number, value: number, kind: DamageKind, mergeMs = 220): void {
    const now = this.scene.time.now;
    const existing = this.recent.get(anchorKey);
    if (existing && now - existing.at < mergeMs && existing.obj.active) {
      existing.value += value;
      existing.at = now;
      existing.obj.setText(this.format(existing.value));
      existing.obj.setScale(Math.min(1.35, 1 + Math.log10(Math.max(1, existing.value)) * 0.06));
      return;
    }
    const obj = this.obtain();
    if (!obj) return;
    obj.setText(this.format(value));
    obj.setColor(DAMAGE_COLORS[kind]);
    obj.setAlpha(1);
    obj.setScale(kind === 'crit' ? 1.25 : 1);
    obj.setPosition(x + Phaser.Math.Between(-8, 8), y);
    obj.setActive(true);
    obj.setVisible(true);
    this.active.push({ obj });
    this.recent.set(anchorKey, { obj, value, at: now });
    const rise = kind === 'crit' ? 46 : 34;
    this.scene.tweens.add({
      targets: obj,
      y: y - rise,
      alpha: { from: 1, to: 0 },
      duration: kind === 'crit' ? 780 : 600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.release(obj);
        this.recent.delete(anchorKey);
      },
    });
  }

  private format(v: number): string {
    const n = Math.round(v);
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
    return `${n}`;
  }

  text(opts: FloatTextOptions): void {
    const obj = this.obtain();
    if (!obj) return;
    obj.setText(opts.text);
    obj.setColor(opts.color);
    obj.setAlpha(1);
    obj.setScale(1);
    obj.setPosition(opts.x, opts.y);
    obj.setActive(true);
    obj.setVisible(true);
    this.active.push({ obj });
    this.scene.tweens.add({
      targets: obj,
      y: opts.y - (opts.rise ?? 40),
      alpha: { from: 1, to: 0 },
      duration: opts.duration ?? 900,
      ease: 'Cubic.easeOut',
      onComplete: () => this.release(obj),
    });
  }

  private release(obj: Phaser.GameObjects.Text) {
    const idx = this.active.findIndex((a) => a.obj === obj);
    if (idx >= 0) this.active.splice(idx, 1);
    obj.setActive(false);
    obj.setVisible(false);
    if (this.pool.length < 200) this.pool.push(obj);
    else obj.destroy();
  }

  clear(): void {
    for (const a of this.active) {
      this.scene.tweens.killTweensOf(a.obj);
      a.obj.setActive(false);
      a.obj.setVisible(false);
      this.pool.push(a.obj);
    }
    this.active.length = 0;
    this.recent.clear();
  }

  destroy(): void {
    for (const a of this.active) a.obj.destroy();
    for (const p of this.pool) p.destroy();
    this.active.length = 0;
    this.pool.length = 0;
  }
}
