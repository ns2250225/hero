import Phaser from 'phaser';
import type { BonusBlock, HeroConfig, HeroInstance, HeroStats } from '@/types/hero';
import { HERO_MAP, STAR_STAT_MULT } from '@/data/heroes';
import { SKILL_MAP, skillParams } from '@/data/skills';
import { SPRITE_SCALE, REVIVE_TIME, ANIM } from '../utils/Balance';
import { computeHeroStats, type Mods } from '../utils/stats';
import { heroSpriteKey, buildHeroGrid, buildWeaponGrid, HERO_FRAME_NAMES, type HeroFrameName } from '../art/characters';
import { addSprite } from '../art/textures';

export interface SkillRuntime {
  id: string;
  level: number;
  cd: number;
  evolved: boolean;
}

export class Hero {
  readonly inst: HeroInstance;
  readonly cfg: HeroConfig;
  sprite: Phaser.GameObjects.Sprite;
  weapon: Phaser.GameObjects.Image | null = null;
  aura: Phaser.GameObjects.Sprite | null = null;
  shieldGfx: Phaser.GameObjects.Graphics | null = null;
  stats: HeroStats;
  bonus: BonusBlock = {};
  skills: SkillRuntime[] = [];
  attackCooldown = 0;
  down = false;
  shield = 0;
  freezeTimer = 0;
  homeX: number;
  homeY: number;
  awakened = false;
  private scene: Phaser.Scene;
  private animLock = 0;
  private castGlow = 0;
  private hitFlash = 0;
  private attackFrame: HeroFrameName = 'atkA';
  private animAccum = 0;
  private idleFlip = false;
  private lastWeaponAngle = 0;

  constructor(scene: Phaser.Scene, inst: HeroInstance) {
    this.scene = scene;
    this.inst = inst;
    this.cfg = HERO_MAP[inst.heroId];
    this.homeX = inst.x;
    this.homeY = inst.y;
    this.shield = inst.shield ?? 0;
    this.awakened = inst.star >= 5;
    const empty = computeHeroStats(inst, { flat: {}, pct: {}, bonus: {} });
    this.stats = empty.stats;
    this.bonus = empty.bonus;

    this.sprite = scene.add.sprite(inst.x, inst.y, heroSpriteKey(this.cfg.id, 'idleA'));
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(SPRITE_SCALE);
    this.sprite.setDepth(this.computeDepth(inst.y));

    const wkey = `weapon_${this.cfg.id}`;
    if (!scene.textures.exists(wkey)) addSprite(scene, wkey, buildWeaponGrid(this.cfg), 2);
    this.weapon = scene.add.image(inst.x + 8, inst.y - 20, wkey);
    this.weapon.setOrigin(0.08, 0.5);
    this.weapon.setScale(SPRITE_SCALE * 0.8);
    this.weapon.setDepth(this.computeDepth(inst.y) + 1);

    for (const s of inst.skills) {
      this.skills.push({ id: s.id, level: s.level, cd: 0.4 + Math.random() * 1.6, evolved: s.evolved });
    }
    this.syncDown();
    this.buildAura();
  }

  get alive(): boolean {
    return !this.down;
  }

  private computeDepth(y: number): number {
    return 20 + y * 0.1;
  }

  private buildAura(): void {
    if (this.aura) {
      this.aura.destroy();
      this.aura = null;
    }
    if (!this.awakened) return;
    const key = 'aura_awaken';
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.add.graphics();
      g.fillStyle(0xffd86a, 0.16);
      g.fillEllipse(24, 10, 46, 18);
      g.fillStyle(0xfff2a0, 0.22);
      g.fillEllipse(24, 10, 30, 11);
      g.generateTexture(key, 48, 20);
      g.destroy();
    }
    this.aura = this.scene.add.sprite(this.homeX, this.homeY - 2, key);
    this.aura.setOrigin(0.5, 0.5);
    this.aura.setDepth(this.computeDepth(this.homeY) - 1);
    this.aura.setBlendMode(Phaser.BlendModes.ADD);
  }

  /** 用最新全局加成刷新属性 */
  refreshStats(globalMods: Mods): void {
    const prevMax = this.stats?.maxHp ?? 0;
    const { stats, bonus } = computeHeroStats(this.inst, globalMods);
    this.stats = stats;
    this.bonus = bonus;
    if (prevMax > 0 && stats.maxHp !== prevMax) {
      const ratio = Math.max(0.15, this.inst.hp / prevMax);
      this.inst.hp = Math.min(stats.maxHp, Math.round(stats.maxHp * ratio));
    }
    const wasAwakened = this.awakened;
    this.awakened = this.inst.star >= 5;
    if (wasAwakened !== this.awakened) this.buildAura();
    // 同步技能实例
    this.skills = this.inst.skills.map((s) => {
      const old = this.skills.find((x) => x.id === s.id);
      return { id: s.id, level: s.level, cd: old?.cd ?? 0.5, evolved: s.evolved };
    });
  }

  /** 每帧把 hp/shield 回写到英雄实例，供 UI 与存档使用 */
  flushToInstance(): void {
    this.inst.shield = this.shield;
    if (this.down && this.inst.downTimer <= 0) this.down = false;
  }

  syncDown(): void {
    this.down = this.inst.downTimer > 0 || this.inst.hp <= 0;
  }

  moveTo(x: number, y: number): void {
    this.homeX = x;
    this.homeY = y;
    this.inst.x = x;
    this.inst.y = y;
  }

  /** 更新视觉表现（不推进游戏逻辑，逻辑在 BattleScene） */
  updateVisual(dtSec: number): void {
    this.animLock = Math.max(0, this.animLock - dtSec);
    this.castGlow = Math.max(0, this.castGlow - dtSec);
    this.hitFlash = Math.max(0, this.hitFlash - dtSec);
    this.animAccum += dtSec;
    if (this.animAccum > ANIM.heroIdle / 1000) {
      this.animAccum = 0;
      this.idleFlip = !this.idleFlip;
    }

    this.sprite.setPosition(this.homeX, this.homeY);
    this.sprite.setDepth(this.computeDepth(this.homeY));
    // 星级越高体型越大（PRD 1.3：成长必须有明显的视觉变化）
    this.sprite.setScale(SPRITE_SCALE * (1 + (Math.min(5, this.inst.star) - 1) * 0.06));
    if (this.aura) {
      this.aura.setPosition(this.homeX, this.homeY - 2);
      this.aura.setDepth(this.computeDepth(this.homeY) - 1);
    }

    if (this.down) {
      this.setFrame('death');
      this.sprite.setAlpha(0.5);
      this.weapon?.setVisible(false);
      this.aura?.setVisible(false);
      return;
    }
    this.sprite.setAlpha(1);
    this.weapon?.setVisible(true);
    if (this.aura) this.aura.setVisible(true);

    const frame: HeroFrameName = this.hitFlash > 0
      ? 'hurt'
      : this.castGlow > 0
        ? 'cast'
        : this.animLock > 0
          ? this.attackFrame
          : this.idleFlip
            ? 'idleB'
            : 'idleA';
    this.setFrame(frame);

    if (this.hitFlash > 0) this.sprite.setTint(0xffb0b0);
    else if (this.freezeTimer > 0) this.sprite.setTint(0xa0e0ff);
    else if (this.awakened) this.sprite.setTint(0xfff0c0);
    else if (this.inst.star >= 4) this.sprite.setTint(0xffe8b0);
    else this.sprite.clearTint();

    if (this.weapon) {
      this.weapon.setDepth(this.computeDepth(this.homeY) + 1);
      if (this.animLock <= 0 && this.castGlow <= 0 && this.hitFlash <= 0) {
        // 待机时武器持握
        this.weapon.setRotation(0.35);
        this.weapon.setPosition(this.homeX + 6, this.homeY - 22 - (this.idleFlip ? 1 : 0));
        this.weapon.setFlipY(false);
        this.weapon.setVisible(true);
      }
    }
    if (this.shield > 0) this.drawShield();
    else this.shieldGfx?.clear();
  }

  private drawShield(): void {
    if (!this.shieldGfx) {
      this.shieldGfx = this.scene.add.graphics();
    }
    const pct = Math.min(1, this.shield / Math.max(1, this.stats.maxHp * 0.6));
    this.shieldGfx.clear();
    this.shieldGfx.lineStyle(2, 0x8fd8ff, 0.35 + 0.4 * pct);
    this.shieldGfx.strokeCircle(this.homeX, this.homeY - 20, 22 + pct * 6);
    this.shieldGfx.setDepth(this.computeDepth(this.homeY) + 2);
  }

  private setFrame(f: HeroFrameName): void {
    const key = heroSpriteKey(this.cfg.id, f);
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
  }

  playAttack(): void {
    this.animLock = ANIM.heroAttack / 1000;
    this.attackFrame = Math.random() < 0.5 ? 'atkA' : 'atkB';
  }

  playCast(): void {
    this.castGlow = ANIM.heroCast / 1000;
    this.animLock = Math.max(this.animLock, this.castGlow);
  }

  playHurt(): void {
    this.hitFlash = ANIM.heroHurt / 1000;
  }

  aimAt(tx: number, ty: number): void {
    if (!this.weapon) return;
    const hx = this.homeX + 4;
    const hy = this.homeY - 20;
    const ang = Math.atan2(ty - hy, tx - hx);
    this.lastWeaponAngle = ang;
    this.weapon.setRotation(ang);
    this.weapon.setPosition(hx + Math.cos(ang) * 14, hy + Math.sin(ang) * 14);
    this.weapon.setFlipY(Math.abs(ang) > Math.PI / 2);
  }

  /** 受到伤害，返回实际伤害；-1 表示闪避 */
  takeDamage(amount: number): number {
    if (this.down) return 0;
    if (Math.random() < this.stats.dodgeRate) return -1;
    let dmg = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      this.inst.shield = this.shield;
      dmg -= absorbed;
      if (absorbed > 0) this.flashShield();
    }
    const real = Math.max(1, dmg - this.stats.defense * 0.25);
    this.inst.hp -= real;
    this.playHurt();
    if (this.inst.hp <= 0) this.die();
    return real;
  }

  private flashShield(): void {
    const g = this.scene.add.graphics();
    g.setDepth(this.computeDepth(this.homeY) + 3);
    g.lineStyle(3, 0x8fd8ff, 0.9);
    g.strokeCircle(this.homeX, this.homeY - 20, 24);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 240,
      onComplete: () => g.destroy(),
    });
  }

  heal(amount: number): number {
    if (this.down) return 0;
    const before = this.inst.hp;
    this.inst.hp = Math.min(this.stats.maxHp, this.inst.hp + amount);
    return this.inst.hp - before;
  }

  addShield(amount: number): void {
    this.shield += amount;
    this.inst.shield = this.shield;
  }

  die(): void {
    this.inst.hp = 0;
    this.inst.downTimer = REVIVE_TIME * (1 - Math.min(0.7, this.bonus.reviveSpeed ?? 0));
    this.down = true;
  }

  revive(hpPct: number): void {
    this.inst.hp = Math.max(1, Math.round(this.stats.maxHp * hpPct));
    this.inst.downTimer = 0;
    this.down = false;
    this.shield = 0;
    this.inst.shield = 0;
  }

  get hpPct(): number {
    return Math.max(0, this.inst.hp / Math.max(1, this.stats.maxHp));
  }

  skillParamsOf(skillId: string): ReturnType<typeof skillParams> | null {
    const cfg = SKILL_MAP[skillId];
    if (!cfg) return null;
    const inst = this.skills.find((s) => s.id === skillId);
    return skillParams(cfg, inst?.level ?? 1);
  }

  starMult(): number {
    return STAR_STAT_MULT[Math.min(5, Math.max(1, this.inst.star))];
  }

  destroy(): void {
    this.sprite.destroy();
    this.weapon?.destroy();
    this.aura?.destroy();
    this.shieldGfx?.destroy();
  }

  static createTexturesFor(scene: Phaser.Scene, heroId: string): void {
    const cfg = HERO_MAP[heroId];
    if (!cfg) return;
    for (const frame of HERO_FRAME_NAMES) {
      const key = heroSpriteKey(heroId, frame);
      if (scene.textures.exists(key)) continue;
      addSprite(scene, key, buildHeroGrid(cfg, frame), 2);
    }
    const wkey = `weapon_${heroId}`;
    if (!scene.textures.exists(wkey)) addSprite(scene, wkey, buildWeaponGrid(cfg), 2);
  }
}
