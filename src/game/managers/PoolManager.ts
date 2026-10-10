import Phaser from 'phaser';

/**
 * 通用对象池（PRD 6.5）。
 */
export class Pool<T> {
  private free: T[] = [];
  private created = 0;
  private readonly factory: () => T;
  private readonly onReset?: (item: T) => void;
  private readonly max: number;

  constructor(factory: () => T, onReset?: (item: T) => void, max = 1200) {
    this.factory = factory;
    this.onReset = onReset;
    this.max = max;
  }

  obtain(): T {
    const it = this.free.pop();
    if (it) {
      this.onReset?.(it);
      return it;
    }
    this.created++;
    return this.factory();
  }

  release(item: T): boolean {
    if (this.free.length >= this.max) return false;
    this.free.push(item);
    return true;
  }

  get size(): number {
    return this.created;
  }

  get available(): number {
    return this.free.length;
  }

  drain(): T[] {
    const out = this.free;
    this.free = [];
    return out;
  }
}

/**
 * 精灵对象池：怪物、投射物死亡后不销毁，而是隐藏并回收，
 * 下次生成时重置纹理、位置、动画状态后复用（PRD 6.5：创建/激活/回收/重置）。
 */
export class SpritePool {
  private pool: Pool<Phaser.GameObjects.Sprite>;
  private scene: Phaser.Scene;
  reused = 0;

  constructor(scene: Phaser.Scene, max = 800) {
    this.scene = scene;
    this.pool = new Pool<Phaser.GameObjects.Sprite>(
      () => this.scene.add.sprite(0, 0, '__DEFAULT'),
      (s) => {
        this.reused++;
        s.setActive(true);
        s.setVisible(true);
      },
      max,
    );
  }

  take(x: number, y: number, key: string): Phaser.GameObjects.Sprite {
    const s = this.pool.obtain();
    s.setTexture(key);
    s.setPosition(x, y);
    s.setAlpha(1);
    s.clearTint();
    s.setScale(1);
    s.setRotation(0);
    s.setFlip(false, false);
    s.setOrigin(0.5, 0.5);
    s.setBlendMode(Phaser.BlendModes.NORMAL);
    s.setDepth(0);
    return s;
  }

  give(s: Phaser.GameObjects.Sprite): void {
    if (!s.scene) return; // 已随场景销毁
    s.setActive(false);
    s.setVisible(false);
    if (!this.pool.release(s)) s.destroy();
  }

  get created(): number {
    return this.pool.size;
  }

  destroy(): void {
    for (const s of this.pool.drain()) if (s.scene) s.destroy();
  }
}

/** Graphics 对象池（怪物血条） */
export class GraphicsPool {
  private pool: Pool<Phaser.GameObjects.Graphics>;

  constructor(scene: Phaser.Scene, max = 600) {
    this.pool = new Pool<Phaser.GameObjects.Graphics>(
      () => scene.add.graphics(),
      (g) => {
        g.setActive(true);
        g.setVisible(true);
        g.setAlpha(1);
      },
      max,
    );
  }

  take(): Phaser.GameObjects.Graphics {
    return this.pool.obtain();
  }

  give(g: Phaser.GameObjects.Graphics): void {
    if (!g.scene) return;
    g.clear();
    g.setActive(false);
    g.setVisible(false);
    if (!this.pool.release(g)) g.destroy();
  }

  destroy(): void {
    for (const g of this.pool.drain()) if (g.scene) g.destroy();
  }
}

/** 战斗场景共享的池集合 */
export interface BattlePools {
  enemySprites: SpritePool;
  enemyBars: GraphicsPool;
  projectileSprites: SpritePool;
}

export const pools: { current: BattlePools | null } = { current: null };

export function createBattlePools(scene: Phaser.Scene): BattlePools {
  const p: BattlePools = {
    enemySprites: new SpritePool(scene, 700),
    enemyBars: new GraphicsPool(scene, 700),
    projectileSprites: new SpritePool(scene, 900),
  };
  pools.current = p;
  return p;
}

export function destroyBattlePools(): void {
  const p = pools.current;
  if (!p) return;
  p.enemySprites.destroy();
  p.enemyBars.destroy();
  p.projectileSprites.destroy();
  pools.current = null;
}
