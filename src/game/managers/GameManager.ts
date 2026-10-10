import Phaser from 'phaser';
import { BattleScene, type SceneInitData } from '../scenes/BattleScene';
import { BootScene } from '../scenes/BootScene';
import { GAME_H, GAME_W } from '../utils/Balance';
import { audio } from './AudioManager';
import { useSettingsStore } from '@/stores/settingsStore';
import type { BattleResult } from '@/types/game';

/**
 * Phaser 实例的生命周期管理。页面只挂载一个 Game 实例，
 * 战斗场景按需启动/停止，避免重复创建 WebGL 上下文。
 */
export class GameManager {
  private static _instance: GameManager | null = null;
  game: Phaser.Game | null = null;
  private container: HTMLElement | null = null;
  private resizeHandler: (() => void) | null = null;
  /** Phaser 尚未就绪时排队的战斗 */
  private pending: SceneInitData | null = null;
  private booted = false;
  /** 战斗结束回调（由 RunController 注册，避免循环依赖） */
  onBattleFinished: ((result: BattleResult) => void) | null = null;

  static get instance(): GameManager {
    if (!GameManager._instance) GameManager._instance = new GameManager();
    return GameManager._instance;
  }

  mount(parent: HTMLElement): Phaser.Game {
    if (this.game) return this.game;
    this.container = parent;
    this.booted = false;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: '#0b0f18',
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      powerPreference: 'high-performance',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
      },
      fps: { target: 60, min: 20 },
      audio: { noAudio: true },
      scene: [BootScene, BattleScene],
    } as Phaser.Types.Core.GameConfig);
    // BootScene 生成完全部纹理后发出 assets-ready，此时才能启动战斗
    this.game.events.once('assets-ready', () => {
      this.booted = true;
      if (this.pending) {
        const data = this.pending;
        this.pending = null;
        this.startBattle(data);
      }
    });
    this.game.events.on('battle-finished', (result: BattleResult) => {
      this.onBattleFinished?.(result);
    });
    this.resizeHandler = () => this.game?.scale.refresh();
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('orientationchange', this.resizeHandler);
    return this.game;
  }

  /** 启动一局战斗；Phaser 未就绪时先排队 */
  startBattle(data: SceneInitData): void {
    if (!this.game || !this.booted) {
      this.pending = data;
      return;
    }
    const mgr = this.game.scene;
    if (mgr.isActive('BattleScene') || mgr.isSleeping('BattleScene')) {
      mgr.stop('BattleScene');
    }
    mgr.start('BattleScene', data);
  }

  get battle(): BattleScene | null {
    if (!this.game) return null;
    const s = this.game.scene.getScene('BattleScene') as BattleScene | null;
    if (!s) return null;
    return this.game.scene.isActive('BattleScene') ? s : null;
  }

  stopBattle(): void {
    if (!this.game) return;
    if (this.game.scene.isActive('BattleScene')) this.game.scene.stop('BattleScene');
    audio.stopBgm();
  }

  isRunning(): boolean {
    return !!this.battle;
  }

  resize(): void {
    this.game?.scale.refresh();
  }

  fullscreen(): void {
    const el = this.container ?? document.documentElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  }

  applySettings(): void {
    const s = useSettingsStore();
    audio.applyVolumes();
    const b = this.battle;
    if (b) {
      b.setSpeed(s.defaultSpeed);
      b.setAutoPick(s.autoPick, s.customPriority);
    }
  }

  destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('orientationchange', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.game?.destroy(true);
    this.game = null;
    this.container = null;
    this.booted = false;
  }
}

export const gameManager = GameManager.instance;
