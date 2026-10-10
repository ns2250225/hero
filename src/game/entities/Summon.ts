import Phaser from 'phaser';
import { buildSummonGrid, SUMMON_FRAMES, type SummonKind, type SummonFrameName } from '../art/characters';

export type { SummonKind, SummonFrameName };
import { addSprite } from '../art/textures';
import { SPRITE_SCALE } from '../utils/Balance';
import { shade } from '../art/icons';

export interface SummonOptions {
  kind: SummonKind;
  x: number;
  y: number;
  ownerUid: number;
  damage: number;
  hp: number;
  duration: number;
  speed: number;
  attackSpeed: number;
  range: number;
  /** golem 会阻挡敌人 */
  blocks: number;
  /** turret 固定不动 */
  stationary: boolean;
  /** drone/ghost 飞行 */
  flying: boolean;
  color?: string;
  /** 爆炸死亡 */
  explodeOnDeath?: boolean;
  /** 附加暗影伤害 */
  shadow?: boolean;
}

export const SUMMON_TARGET_DEPTH = 250;

export class Summon {
  readonly id: number;
  static nextId = 1;
  opts: SummonOptions;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  life: number;
  sprite: Phaser.GameObjects.Sprite;
  alive = true;
  attackCd = 0;
  blockedIds: number[] = [];
  animAccum = 0;
  animFlip = false;
  targetId: number | null = null;
  hitFlash = 0;
  baseScale: number;
  scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, opts: SummonOptions) {
    this.scene = scene;
    this.id = Summon.nextId++;
    this.opts = opts;
    this.x = opts.x;
    this.y = opts.y;
    this.hp = opts.hp;
    this.maxHp = opts.hp;
    this.life = opts.duration;
    this.baseScale = SPRITE_SCALE * (opts.kind === 'golem' ? 1.15 : opts.kind === 'turret' ? 1.0 : 0.9);
    const key = `sm_${opts.kind}_idleA`;
    if (!scene.textures.exists(key)) {
      for (const f of SUMMON_FRAMES) addSprite(scene, `sm_${opts.kind}_${f}`, buildSummonGrid(opts.kind, f), 2);
    }
    this.sprite = scene.add.sprite(opts.x, opts.y, key);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(this.baseScale);
    this.sprite.setDepth(SUMMON_TARGET_DEPTH);
    if (opts.color) this.sprite.setTint(parseInt(shade(opts.color, -0.1).replace('#', ''), 16));
  }

  setFrame(f: SummonFrameName) {
    const key = `sm_${this.opts.kind}_${f}`;
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
    this.sprite.setScale(this.baseScale);
  }

  updateVisual(dt: number) {
    this.animAccum += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.animAccum > 0.3) {
      this.animAccum = 0;
      this.animFlip = !this.animFlip;
    }
    this.setFrame(this.animFlip ? 'idleB' : 'idleA');
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setDepth(SUMMON_TARGET_DEPTH);
    if (this.hitFlash > 0) this.sprite.setTint(0xff9a9a);
    else if (this.opts.color) this.sprite.setTint(parseInt(shade(this.opts.color, -0.1).replace('#', ''), 16));
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.hitFlash = 0.1;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  destroy() {
    this.alive = false;
    this.sprite.destroy();
  }
}
