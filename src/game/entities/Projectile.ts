import Phaser from 'phaser';
import type { ProjKind } from '../art/characters';
import { buildProjectileGrid } from '../art/characters';
import { addSprite } from '../art/textures';
import { SPRITE_SCALE } from '../utils/Balance';
import { ensureRingColor, ringKey, burstKey, RING_FRAMES, BURST_FRAMES, buildBurstFrames } from '../art/effects';
import { pools } from '../managers/PoolManager';

export interface ProjectileOptions {
  kind: ProjKind;
  element: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  damage: number;
  pierce: number;
  radius: number;
  ownerUid: number;
  explodeRadius?: number;
  homing?: number;
  lifespan?: number;
  hostile?: boolean;
  skillId?: string;
  statusKind?: 'burn' | 'poison' | 'slow' | 'freeze' | 'corrode' | 'stun';
  statusDuration?: number;
  statusDps?: number;
  splitChance?: number;
  splitLeft?: number;
  /** 抛物线重力（投掷类） */
  gravity?: number;
  /** 是否在命中时产生击退 */
  knockback?: number;
}

export const PROJ_DEPTH = 300;

export class Projectile {
  sprite: Phaser.GameObjects.Sprite;
  opts: ProjectileOptions;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  vyGravity = 0;
  hitIds = new Set<number>();
  alive = true;
  glow?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, opts: ProjectileOptions) {
    this.opts = opts;
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.dx * opts.speed;
    this.vy = opts.dy * opts.speed;
    this.vyGravity = opts.gravity ?? 0;
    this.life = opts.lifespan ?? 3;

    const key = `proj_${opts.kind}_${opts.element}`;
    if (!scene.textures.exists(key)) {
      addSprite(scene, key, buildProjectileGrid(opts.kind, opts.element), 2);
    }
    const pool = pools.current?.projectileSprites;
    this.sprite = pool ? pool.take(opts.x, opts.y, key) : scene.add.sprite(opts.x, opts.y, key);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setScale(SPRITE_SCALE * 0.85);
    this.sprite.setDepth(PROJ_DEPTH);
    this.sprite.setRotation(Math.atan2(opts.dy, opts.dx));
    if (opts.hostile) this.sprite.setTint(0xff9a9a);
  }

  update(dt: number, target?: { x: number; y: number } | null): void {
    if (!this.alive) return;
    if (this.opts.homing && target) {
      const desired = Math.atan2(target.y - this.y, target.x - this.x);
      const cur = Math.atan2(this.vy, this.vx);
      const speed = Math.hypot(this.vx, this.vy);
      let diff = desired - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Math.min(Math.abs(diff), 8 * dt) * Math.sign(diff);
      const ang = cur + turn;
      this.vx = Math.cos(ang) * speed;
      this.vy = Math.sin(ang) * speed;
    }
    this.vy += this.vyGravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setRotation(Math.atan2(this.vy, this.vx));
    if (this.glow) this.glow.setPosition(this.x, this.y);
    if (this.life <= 0) this.alive = false;
    if (this.y < 80 || this.y > 900 || this.x < -60 || this.x > 1400) this.alive = false;
  }

  destroy(): void {
    this.alive = false;
    const pool = pools.current?.projectileSprites;
    if (pool) pool.give(this.sprite);
    else this.sprite.destroy();
    this.glow?.destroy();
  }
}

/* ------------------------------------------------------------------ */
/*  持续区域                                                          */
/* ------------------------------------------------------------------ */

export interface ZoneOptions {
  x: number;
  y: number;
  radius: number;
  duration: number;
  ownerUid: number;
  tickInterval: number;
  damagePerTick: number;
  color: number;
  element: string;
  kind: string;
  statusKind?: 'burn' | 'poison' | 'slow' | 'freeze' | 'corrode' | 'stun';
  statusDuration?: number;
  pull?: number;
  block?: boolean;
  /** 由敌人/Boss 释放，伤害英雄而非怪物 */
  hostile?: boolean;
  bandHeight?: number;
  tickVisual?: 'arrow' | 'spark' | 'none';
}

export class Zone {
  opts: ZoneOptions;
  x: number;
  y: number;
  life: number;
  tick = 0;
  alive = true;
  gfx: Phaser.GameObjects.Graphics;
  particles?: Phaser.GameObjects.Particles.ParticleEmitter;
  blocks = false;
  private pulse = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, opts: ZoneOptions) {
    this.scene = scene;
    this.opts = opts;
    this.x = opts.x;
    this.y = opts.y;
    this.life = opts.duration;
    this.blocks = !!opts.block;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(120);
    this.draw();
    if (opts.kind === 'flame' || opts.kind === 'poisonFog' || opts.kind === 'blizzard' || opts.kind === 'fireWall' || opts.kind === 'corrode') {
      this.particles = scene.add.particles(0, 0, 'particle_soft', {
        x: opts.x,
        y: opts.y,
        speedY: opts.kind === 'blizzard' ? { min: 60, max: 150 } : { min: -70, max: -20 },
        speedX: { min: -24, max: 24 },
        lifespan: 800,
        quantity: 1,
        frequency: 70,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: opts.color,
        blendMode: Phaser.BlendModes.ADD,
      });
      this.particles.setDepth(121);
    }
  }

  private draw(): void {
    const o = this.opts;
    const pct = Math.max(0, Math.min(1, this.life / o.duration));
    const alpha = 0.10 + 0.07 * (0.5 + 0.5 * Math.sin(this.pulse)) + 0.06 * pct;
    this.gfx.clear();
    if (o.kind === 'fireWall') {
      const h = o.bandHeight ?? 40;
      this.gfx.fillStyle(o.color, alpha + 0.1);
      this.gfx.fillRect(this.x - 8, this.y - h, 16, h * 2);
      this.gfx.fillStyle(o.color, 0.5 * pct + 0.2);
      this.gfx.fillRect(this.x - 4, this.y - h, 8, h * 2);
    } else {
      this.gfx.fillStyle(o.color, alpha);
      this.gfx.fillCircle(this.x, this.y, o.radius);
      this.gfx.lineStyle(2, o.color, 0.35 * pct + 0.18);
      this.gfx.strokeCircle(this.x, this.y, o.radius);
    }
    if (o.pull) {
      for (let i = 0; i < 3; i++) {
        const r = o.radius * (0.3 + i * 0.24 + 0.06 * Math.sin(this.pulse * 2 + i));
        this.gfx.lineStyle(2, o.color, 0.55);
        this.gfx.strokeCircle(this.x, this.y, r);
      }
    }
  }

  /** 返回 false 表示已过期 */
  update(dt: number): boolean {
    this.life -= dt;
    this.tick -= dt;
    this.pulse += dt * 5;
    if (this.particles) this.particles.setPosition(this.x, this.y);
    this.draw();
    if (this.life <= 0) {
      this.destroy();
      return false;
    }
    return true;
  }

  get ready(): boolean {
    if (this.tick <= 0) {
      this.tick = this.opts.tickInterval;
      return true;
    }
    return false;
  }

  destroy(): void {
    this.alive = false;
    this.gfx.destroy();
    this.particles?.destroy();
  }
}

/* ------------------------------------------------------------------ */
/*  临时特效（光圈、爆裂、闪电、斩击）                                 */
/* ------------------------------------------------------------------ */

export class EffectsManager {
  private scene: Phaser.Scene;
  private active: { obj: Phaser.GameObjects.GameObject; until: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  ring(x: number, y: number, radius: number, color: string, duration = 320): void {
    ensureRingColor(this.scene, color);
    const scale = (radius * 2) / 32;
    const sprite = this.scene.add.sprite(x, y, ringKey(color, 0));
    sprite.setDepth(650);
    sprite.setScale(scale * 0.25);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.setOrigin(0.5, 0.5);
    const frames = Array.from({ length: RING_FRAMES }, (_, i) => ringKey(color, i));
    sprite.setTexture(frames[0]);
    const animKey = `ringanim_${color.replace('#', '')}`;
    if (!this.scene.anims.exists(animKey)) {
      this.scene.anims.create({
        key: animKey,
        frames: frames.map((f) => ({ key: f })),
        frameRate: 22,
        repeat: 0,
      });
    }
    sprite.play(animKey);
    this.scene.tweens.add({
      targets: sprite,
      scaleX: scale,
      scaleY: scale,
      alpha: { from: 0.95, to: 0 },
      duration,
      onComplete: () => sprite.destroy(),
    });
  }

  burst(x: number, y: number, color: string, scale = 1): void {
    if (!this.scene.textures.exists(burstKey(color, 0))) {
      buildBurstFrames(color).forEach((f, i) => addSprite(this.scene, burstKey(color, i), f, 1));
    }
    const frames = Array.from({ length: BURST_FRAMES }, (_, i) => burstKey(color, i));
    const key = `burstanim_${color.replace('#', '')}`;
    if (!this.scene.anims.exists(key)) {
      this.scene.anims.create({ key, frames: frames.map((f) => ({ key: f })), frameRate: 24, repeat: 0 });
    }
    const sprite = this.scene.add.sprite(x, y, frames[0]);
    sprite.setDepth(660);
    sprite.setScale(scale);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.play(key);
    this.scene.time.delayedCall(320, () => sprite.destroy());
  }

  bolt(x1: number, y1: number, x2: number, y2: number, color: string): void {
    const g = this.scene.add.graphics();
    g.setDepth(640);
    g.lineStyle(4, 0xffffff, 0.35);
    this.drawBolt(g, x1, y1, x2, y2, 10);
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 1);
    this.drawBolt(g, x1, y1, x2, y2, 6);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 180,
      onComplete: () => g.destroy(),
    });
  }

  private drawBolt(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, jitter: number): void {
    const segs = 6;
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
      const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
      g.lineTo(px, py);
    }
    g.lineTo(x2, y2);
    g.strokePath();
  }

  slash(heroX: number, heroY: number, angle: number, radius: number, color: string): void {
    const g = this.scene.add.graphics();
    g.setDepth(heroY * 0.1 + 30);
    const c = Phaser.Display.Color.HexStringToColor(color).color;
    g.lineStyle(6, c, 0.85);
    g.beginPath();
    g.arc(heroX, heroY - 20, radius, angle - 0.7, angle + 0.7, false);
    g.strokePath();
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.arc(heroX, heroY - 20, radius - 4, angle - 0.55, angle + 0.55, false);
    g.strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 170,
      onComplete: () => g.destroy(),
    });
  }

  /** 通用一次性对象登记（便于场景关闭时清理） */
  track(obj: Phaser.GameObjects.GameObject, ms: number): void {
    this.active.push({ obj, until: this.scene.time.now + ms });
  }

  cleanup(): void {
    for (const a of this.active) {
      if (a.obj.active) (a.obj as Phaser.GameObjects.Sprite).destroy();
    }
    this.active.length = 0;
  }
}
