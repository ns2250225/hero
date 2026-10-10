import Phaser from 'phaser';
import { HEROES } from '@/data/heroes';
import { ENEMIES } from '@/data/enemies';
import { BOSSES } from '@/data/bosses';
import { HERO_FRAME_NAMES, buildHeroGrid, buildWeaponGrid, buildEnemyGrid, buildBossGrid, ENEMY_FRAMES, BOSS_FRAMES } from '../art/characters';
import { addSprite } from '../art/textures';
import { ensureEffectTextures, GLOW_KEY, SOFT_KEY, SPARK_KEY, SQUARE_KEY } from '../art/effects';

/**
 * 启动场景：所有像素美术都在这里程序化生成并写入纹理管理器。
 * 由于没有任何外部图片，游戏可以完全离线运行。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    ensureEffectTextures(this);
    this.generateShared();
    // 分帧生成英雄/怪物纹理，避免阻塞首帧
    const tasks: (() => void)[] = [];
    for (const h of HEROES) {
      tasks.push(() => {
        for (const f of HERO_FRAME_NAMES) addSprite(this, `hero_${h.id}_${f}`, buildHeroGrid(h, f), 2);
        addSprite(this, `weapon_${h.id}`, buildWeaponGrid(h), 2);
      });
    }
    for (const e of ENEMIES) {
      tasks.push(() => {
        for (const f of ENEMY_FRAMES) addSprite(this, `en_${e.id}_${f}`, buildEnemyGrid(e, f), 2);
      });
    }
    for (const b of BOSSES) {
      tasks.push(() => {
        for (const f of BOSS_FRAMES) addSprite(this, `boss_${b.id}_${f}`, buildBossGrid(b, f), 2);
      });
    }
    // 同步生成（约 300 张小纹理，耗时可接受）
    for (const t of tasks) t();
    this.game.events.emit('assets-ready');
    this.scene.stop();
  }

  private generateShared(): void {
    if (!this.textures.exists('aura_awaken')) {
      const g = this.add.graphics();
      g.fillStyle(0xffd86a, 0.16);
      g.fillEllipse(24, 10, 46, 18);
      g.fillStyle(0xfff2a0, 0.22);
      g.fillEllipse(24, 10, 30, 11);
      g.generateTexture('aura_awaken', 48, 20);
      g.destroy();
    }
    for (const key of [GLOW_KEY, SOFT_KEY, SPARK_KEY, SQUARE_KEY]) {
      if (this.textures.exists(key)) continue;
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(4, 4, 4);
      g.generateTexture(key, 8, 8);
      g.destroy();
    }
  }
}
