import Phaser from 'phaser';
import type { BossConfig, EnemyAbility, EnemyConfig } from '@/types/enemy';
import { ENEMY_MAP } from '@/data/enemies';
import { BOSS_MAP } from '@/data/bosses';
import { SPRITE_SCALE } from '../utils/Balance';
import { buildEnemyGrid, buildBossGrid, ENEMY_FRAMES, BOSS_FRAMES, type EnemyFrameName, type BossFrameName } from '../art/characters';
import { addSprite } from '../art/textures';
import { pools } from '../managers/PoolManager';
import { shade, lighten } from '../art/icons';

export interface StatusState {
  slow: number;
  freeze: number;
  burn: number;
  burnDmg: number;
  poison: number;
  poisonDmg: number;
  corrode: number;
  stun: number;
}

export function emptyStatus(): StatusState {
  return { slow: 0, freeze: 0, burn: 0, burnDmg: 0, poison: 0, poisonDmg: 0, corrode: 0, stun: 0 };
}

let nextId = 1;

export class Enemy {
  readonly id: number;
  cfg: EnemyConfig;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  elite: boolean;
  mult: number;
  /** 攻击成长倍率（无尽模式慢于生命成长） */
  atkMult: number;
  speed: number;
  status: StatusState = emptyStatus();
  sprite: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Graphics | null = null;
  attackCd = 0;
  chargeTimer = 0;
  chargeActive = 0;
  healCd = 2;
  summonCd = 4;
  stealthTimer = 0;
  stealthOn = false;
  facing = -1;
  blockedBy: number | null = null;
  alive = true;
  breachDone = false;
  animAccum = 0;
  animFlip = false;
  hitFlash = 0;
  targetHeroUid: number | null = null;
  specialTimer = 0;
  private scene: Phaser.Scene;
  private baseScale: number;

  constructor(scene: Phaser.Scene, cfg: EnemyConfig, x: number, y: number, mult: number, elite: boolean, atkMult = mult) {
    this.scene = scene;
    this.id = nextId++;
    this.cfg = cfg;
    this.x = x;
    this.y = y;
    this.mult = mult;
    this.atkMult = atkMult;
    this.elite = elite;
    const eliteHp = elite ? 3.4 : 1;
    const eliteAtk = elite ? 1.8 : 1;
    const eliteSpeed = elite ? 0.92 : 1;
    this.maxHp = Math.round(cfg.maxHp * mult * eliteHp);
    this.hp = this.maxHp;
    this.speed = cfg.moveSpeed * eliteSpeed * (1 + Math.min(0.35, (mult - 1) * 0.05));
    this.baseScale = cfg.scale * (elite ? 1.45 : 1) * SPRITE_SCALE * 0.92;
    void eliteAtk;

    const key = `en_${cfg.id}_moveA`;
    if (!scene.textures.exists(key)) {
      for (const f of ENEMY_FRAMES) addSprite(scene, `en_${cfg.id}_${f}`, buildEnemyGrid(cfg, f), 2);
    }
    // 从对象池取出精灵并重置状态（无池时直接创建）
    const pool = pools.current?.enemySprites;
    this.sprite = pool ? pool.take(x, y, key) : scene.add.sprite(x, y, key);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(this.baseScale);
    this.sprite.setDepth(this.depth());
    this.sprite.setFlipX(true);
    if (elite) this.sprite.setTint(0xffe0a0);
  }

  get attackPower(): number {
    return this.cfg.attack * this.atkMult * (this.elite ? 1.8 : 1);
  }

  get abilities(): EnemyAbility[] {
    return this.cfg.abilities;
  }

  has(a: EnemyAbility): boolean {
    return this.cfg.abilities.includes(a);
  }

  get flying(): boolean {
    return this.has('flying');
  }

  get isRanged(): boolean {
    return this.has('ranged');
  }

  depth(): number {
    return 20 + this.y * 0.1;
  }

  setFrame(f: EnemyFrameName) {
    const key = `en_${this.cfg.id}_${f}`;
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
    this.sprite.setScale(this.baseScale);
  }

  updateVisual(dt: number, frozen: boolean) {
    this.animAccum += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const interval = frozen ? 0.5 : this.status.stun > 0 ? 0.4 : 0.24;
    if (this.animAccum > interval) {
      this.animAccum = 0;
      this.animFlip = !this.animFlip;
    }
    this.setFrame(this.animFlip ? 'moveB' : 'moveA');
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setDepth(this.depth());
    if (this.hitFlash > 0) {
      // 受击闪红：保留轮廓，避免持续受击时变成纯白剪影
      this.sprite.setAlpha(1);
      this.sprite.setTint(0xff9a9a);
    } else if (this.stealthOn) {
      this.sprite.setAlpha(0.35);
      this.sprite.clearTint();
      if (this.elite) this.sprite.setTint(0xffe0a0);
    } else {
      this.sprite.setAlpha(1);
      this.sprite.clearTint();
      if (this.elite) this.sprite.setTint(0xffe0a0);
    }
    if (this.hp < this.maxHp) this.drawHpBar();
    else this.hpBar?.clear();
  }

  private drawHpBar() {
    if (!this.hpBar) {
      this.hpBar = pools.current?.enemyBars.take() ?? this.scene.add.graphics();
      this.hpBar.setDepth(this.depth() + 5);
    }
    const w = this.elite ? 34 : 22;
    const h = this.elite ? 4 : 3;
    const x = this.x - w / 2;
    const y = this.y - this.cfg.scale * SPRITE_SCALE * 30 - (this.elite ? 12 : 6);
    const pct = Math.max(0, Math.min(1, this.hp / this.maxHp));
    this.hpBar.clear();
    this.hpBar.fillStyle(0x101018, 0.85);
    this.hpBar.fillRect(x - 1, y - 1, w + 2, h + 2);
    this.hpBar.fillStyle(this.elite ? 0xffd86a : 0x4ade80, 1);
    this.hpBar.fillRect(x, y, w * pct, h);
    this.hpBar.setDepth(this.depth() + 5);
  }

  applyDamage(amount: number): { died: boolean; dealt: number } {
    if (!this.alive) return { died: false, dealt: 0 };
    let dmg = amount;
    // 盾牌怪正面减伤
    if (this.has('shield')) dmg *= 0.35;
    if (this.status.corrode > 0) dmg *= 1 + 0.18 * Math.min(4, this.status.corrode);
    if (this.status.freeze > 0) dmg *= 1.15;
    this.hp -= dmg;
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return { died: true, dealt: dmg };
    }
    return { died: false, dealt: dmg };
  }

  applyStatus(s: Partial<StatusState>, duration: number, dmgPerSec = 0) {
    if (s.freeze) this.status.freeze = Math.max(this.status.freeze, duration);
    if (s.slow) this.status.slow = Math.max(this.status.slow, duration);
    if (s.burn) {
      this.status.burn = Math.max(this.status.burn, duration);
      this.status.burnDmg = Math.max(this.status.burnDmg, dmgPerSec);
    }
    if (s.poison) {
      this.status.poison = Math.max(this.status.poison, duration);
      this.status.poisonDmg = Math.max(this.status.poisonDmg, dmgPerSec);
    }
    if (s.corrode) this.status.corrode = Math.max(this.status.corrode, duration);
    if (s.stun) this.status.stun = Math.max(this.status.stun, duration);
  }

  tickStatus(dt: number): number {
    let dot = 0;
    const st = this.status;
    if (st.freeze > 0) st.freeze -= dt;
    if (st.slow > 0) st.slow -= dt;
    if (st.stun > 0) st.stun -= dt;
    if (st.corrode > 0) st.corrode -= dt;
    if (st.burn > 0) {
      st.burn -= dt;
      dot += st.burnDmg * dt;
    }
    if (st.poison > 0) {
      st.poison -= dt;
      dot += st.poisonDmg * dt;
    }
    return dot;
  }

  get moveScale(): number {
    let s = 1;
    if (this.status.freeze > 0) return 0;
    if (this.status.stun > 0) return 0;
    if (this.status.slow > 0) s *= 0.45;
    if (this.chargeActive > 0) s *= 2.4;
    return s;
  }

  /** 回收：精灵与血条归还对象池，清理状态效果 */
  destroy() {
    this.alive = false;
    this.status = emptyStatus();
    const p = pools.current;
    if (p) {
      p.enemySprites.give(this.sprite);
      if (this.hpBar) p.enemyBars.give(this.hpBar);
    } else {
      this.sprite.destroy();
      this.hpBar?.destroy();
    }
    this.hpBar = null;
  }
}

/** Boss：更大、有技能循环 */
export class Boss {
  readonly id: number;
  cfg: BossConfig;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mult: number;
  /** 攻击成长倍率（无尽模式慢于生命成长） */
  atkMult: number;
  speed: number;
  sprite: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  alive = true;
  shielded = false;
  enraged = false;
  skillCd = 3;
  skillIndex = 0;
  attackCd = 0;
  breachDone = false;
  hitFlash = 0;
  animAccum = 0;
  animFlip = false;
  status: StatusState = emptyStatus();
  scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, cfg: BossConfig, x: number, y: number, mult: number, atkMult = mult) {
    this.scene = scene;
    this.id = nextId++;
    this.cfg = cfg;
    this.x = x;
    this.y = y;
    this.mult = mult;
    this.atkMult = atkMult;
    this.maxHp = Math.round(cfg.maxHp * mult);
    this.hp = this.maxHp;
    this.speed = cfg.moveSpeed;

    const key = `boss_${cfg.id}_idleA`;
    if (!scene.textures.exists(key)) {
      for (const f of BOSS_FRAMES) addSprite(scene, `boss_${cfg.id}_${f}`, buildBossGrid(cfg, f), 2);
    }
    this.sprite = scene.add.sprite(x, y, key);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(SPRITE_SCALE * 1.25);
    this.sprite.setDepth(20 + y * 0.1);
    this.sprite.setFlipX(true);
    this.hpBar = scene.add.graphics();
  }

  get attackPower(): number {
    return this.cfg.attack * this.atkMult;
  }

  depth(): number {
    return 20 + this.y * 0.1;
  }

  setFrame(f: BossFrameName) {
    const key = `boss_${this.cfg.id}_${f}`;
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
  }

  updateVisual(dt: number) {
    this.animAccum += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.animAccum > 0.36) {
      this.animAccum = 0;
      this.animFlip = !this.animFlip;
    }
    if (this.hitFlash > 0) {
      this.setFrame('hurt');
      this.sprite.setTint(0xff9a9a);
    } else {
      this.setFrame(this.animFlip ? 'idleB' : 'idleA');
      this.sprite.clearTint();
      if (this.enraged) this.sprite.setTint(0xff9a6a);
    }
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setDepth(this.depth());
    // 受击时绘制小血条
    this.hpBar.clear();
    if (this.hp < this.maxHp) {
      const w = 60;
      const h = 5;
      const bx = this.x - w / 2;
      const by = this.y - 78;
      this.hpBar.fillStyle(0x101018, 0.9);
      this.hpBar.fillRect(bx - 1, by - 1, w + 2, h + 2);
      this.hpBar.fillStyle(this.enraged ? 0xff5a3a : 0xff8a3a, 1);
      this.hpBar.fillRect(bx, by, w * (this.hp / this.maxHp), h);
      this.hpBar.setDepth(this.depth() + 6);
    }
  }

  applyDamage(amount: number): { died: boolean; dealt: number } {
    if (!this.alive) return { died: false, dealt: 0 };
    let dmg = amount;
    if (this.shielded) dmg *= 0.45;
    if (this.status.corrode > 0) dmg *= 1 + 0.18 * Math.min(4, this.status.corrode);
    this.hp -= dmg;
    this.hitFlash = 0.1;
    if (!this.enraged && this.hp / this.maxHp < 0.35) {
      this.enraged = true;
      this.skillCd = Math.min(this.skillCd, 1.2);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return { died: true, dealt: dmg };
    }
    return { died: false, dealt: dmg };
  }

  applyStatus(s: Partial<StatusState>, duration: number, dmgPerSec = 0) {
    if (s.burn) {
      this.status.burn = Math.max(this.status.burn, duration);
      this.status.burnDmg = Math.max(this.status.burnDmg, dmgPerSec);
    }
    if (s.poison) {
      this.status.poison = Math.max(this.status.poison, duration);
      this.status.poisonDmg = Math.max(this.status.poisonDmg, dmgPerSec);
    }
    if (s.corrode) this.status.corrode = Math.max(this.status.corrode, duration);
    if (s.slow) this.status.slow = Math.max(this.status.slow, duration);
    if (s.freeze) this.status.freeze = Math.max(this.status.freeze, duration * 0.35);
  }

  tickStatus(dt: number): number {
    let dot = 0;
    const st = this.status;
    if (st.slow > 0) st.slow -= dt;
    if (st.freeze > 0) st.freeze -= dt;
    if (st.corrode > 0) st.corrode -= dt;
    if (st.burn > 0) {
      st.burn -= dt;
      dot += st.burnDmg * dt;
    }
    if (st.poison > 0) {
      st.poison -= dt;
      dot += st.poisonDmg * dt;
    }
    return dot;
  }

  get moveScale(): number {
    let s = 1;
    if (this.status.freeze > 0) s *= 0.15;
    else if (this.status.slow > 0) s *= 0.5;
    if (this.enraged) s *= 1.35;
    return s;
  }

  destroy() {
    this.alive = false;
    this.sprite.destroy();
    this.hpBar.destroy();
  }
}

export function makeEliteTint(color: string): number {
  return parseInt(shade(color, -0.2).replace('#', ''), 16);
}

export function enemyConfig(id: string): EnemyConfig | undefined {
  return ENEMY_MAP[id];
}

export function bossConfig(id: string): BossConfig | undefined {
  return BOSS_MAP[id];
}

export { lighten };
