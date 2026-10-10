import { usePlayerStore, type PermanentData } from '@/stores/playerStore';
import { useSettingsStore, type SettingsState } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { SaveService, computeOfflineReward } from './SaveService';
import { createRun, deserializeRun, serializeRun } from '@/game/utils/RunState';
import { gameManager } from '@/game/managers/GameManager';
import { audio } from '@/game/managers/AudioManager';
import type { BattleResult, ChallengeRule, GameMode, UpgradeCard } from '@/types/game';
import { HEROES, MAGE_HEROES } from '@/data/heroes';
import type { EquipmentItem } from '@/game/utils/equipment';
import { defaultPermanent } from '@/stores/playerStore';

export interface StartOptions {
  mode: GameMode;
  mapId: string;
  challengeRules: ChallengeRule[];
  starters: { heroId: string; x: number; y: number }[];
}

/** 全局应用控制器：负责存档、开局、结算与离线收益 */
class RunController {
  private initialized = false;
  private autosaveTimer: number | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    gameManager.onBattleFinished = (result) => {
      void this.finishBattle(result);
    };
    const player = usePlayerStore();
    const settings = useSettingsStore();
    const ui = useUiStore();

    const [perma, loadedSettings] = await Promise.all([SaveService.loadPermanent(), SaveService.loadSettings()]);
    player.hydrate(perma);
    settings.hydrate(loadedSettings);
    audio.applyVolumes();

    // 离线收益（PRD 20.4）
    if (perma && perma.lastSeenAt) {
      const rate = (perma.talents['t_offline'] ?? 0) * 0.25;
      const reward = computeOfflineReward(perma.lastSeenAt, rate);
      if (reward.gold > 0) {
        player.addGold(reward.gold);
        const hours = (reward.seconds / 3600).toFixed(1);
        ui.pushToast(`离线 ${hours} 小时，获得 ${reward.gold} 永久金币`, '#ffd24a');
      }
    }
    await this.persist();
  }

  async persist(): Promise<void> {
    const player = usePlayerStore();
    const settings = useSettingsStore();
    await Promise.all([SaveService.savePermanent(player.data), SaveService.saveSettings(toRawSettings(settings))]);
  }

  startAutosave(): void {
    if (this.autosaveTimer !== null) return;
    this.autosaveTimer = window.setInterval(() => {
      void this.persist();
    }, 30000);
  }

  /** 开始一局冒险 */
  startRun(opts: StartOptions): void {
    const player = usePlayerStore();
    const ui = useUiStore();
    const run = createRun({
      mode: opts.mode,
      mapId: opts.mapId,
      challengeRules: opts.challengeRules,
      starters: opts.starters,
      perma: player.data,
    });
    ui.clearBattleLoot();
    ui.setScreen('battle');
    void SaveService.saveBattle(run);
    gameManager.startBattle({ run, resume: false, equipped: player.data.equipped });
  }

  /** 继续未完成的冒险 */
  async continueRun(): Promise<boolean> {
    const run = await SaveService.loadBattle();
    if (!run) return false;
    const player = usePlayerStore();
    const ui = useUiStore();
    ui.clearBattleLoot();
    ui.setScreen('battle');
    gameManager.startBattle({ run, resume: true, equipped: player.data.equipped });
    return true;
  }

  async hasSave(): Promise<boolean> {
    const run = await SaveService.loadBattle();
    return !!run;
  }

  /** 战斗检查点保存 */
  async saveCheckpoint(): Promise<void> {
    const scene = gameManager.battle;
    if (!scene) return;
    scene.snapshotEnemies();
    await saveRunAsync(scene.run);
    useUiStore().setCheckpointSaved();
  }

  /** 结算 */
  async finishBattle(result: BattleResult): Promise<void> {
    const player = usePlayerStore();
    const ui = useUiStore();
    const scene = gameManager.battle;

    // 结算装备入包
    const loot: EquipmentItem[] = scene ? scene.getEquipmentFound() : [...ui.battleLoot];
    for (const item of loot) player.addEquipment(item);

    const newRecord = this.isRecord(result);
    const achievements = player.checkAchievements({
      wave: result.wave,
      mode: result.mode,
      kills: result.kills,
      totalDamage: result.totalDamage,
      maxHit: result.maxHit,
      time: result.time,
      victory: result.victory,
      maxStar: result.stats?.maxStar ?? 1,
      heroCount: result.heroes.length,
      evolutions: result.stats?.evolutions ?? 0,
      synergies: result.stats?.synergies.length ?? 0,
      bossesKilled: result.stats?.bosses ?? 0,
      relics: result.stats?.relics ?? 0,
      equipment: result.stats?.equipment ?? 0,
      breaches: result.stats?.breaches ?? 0,
      teamLevel: result.teamLevel,
      challenge: [],
    });
    player.recordRun({ ...result, newRecord }, achievements);
    if (result.mode === 'challenge' && result.victory) {
      const key = result.mapId;
      if (!player.data.challengesWon.includes(key)) player.data.challengesWon.push(key);
    }
    ui.clearBattleLoot();
    // 结算期间保留战斗画面（定格在最后一帧），离开结算页时 GameView 卸载并销毁 Phaser
    await SaveService.clearBattle();
    await this.persist();
    ui.finishBattle({ ...result, newRecord, achievements });
  }

  private isRecord(result: BattleResult): boolean {
    const d = usePlayerStore().data;
    if (result.mode === 'endless') return result.wave > d.bestWaveEndless;
    return result.wave > (d.bestWave[result.mapId] ?? 0);
  }

  /** 投降 / 放弃本局 */
  async abandon(): Promise<void> {
    const scene = gameManager.battle;
    if (scene) {
      scene.snapshotEnemies();
      await SaveService.saveBattle(scene.run);
    }
    gameManager.stopBattle();
    useUiStore().setScreen('menu');
    useUiStore().closeLevelUp();
    useUiStore().closeEvent();
    useUiStore().setBossBar({ visible: false, name: '', title: '', hp: 0, maxHp: 0, shield: false, enraged: false });
  }

  /** 刷新卡片 */
  refreshCards(): void {
    const scene = gameManager.battle;
    const ui = useUiStore();
    if (!scene) return;
    const locked = ui.levelUp.locked;
    const cards = scene.refreshCards(locked);
    if (cards.length === 0) {
      ui.pushToast('没有刷新次数了', '#ff5a5a');
      return;
    }
    ui.setLevelUpCards(cards);
    audio.playSe('click');
  }

  chooseCard(card: UpgradeCard): void {
    const scene = gameManager.battle;
    audio.playSe('click');
    if (card.category === 'evolve') audio.playSe('evolution');
    if (card.category === 'star') audio.playSe('starUp');
    if (!scene) return;
    scene.chooseCard(card);
  }

  resolveEvent(optionId: string): void {
    const scene = gameManager.battle;
    const ui = useUiStore();
    const ev = ui.eventModal;
    if (!scene || !ev) return;
    const ok = scene.resolveEvent(ev.eventId, optionId, ev.offers);
    if (ok) {
      audio.playSe('click');
      if (ev.multi) {
        // 商人可继续购买：移除已购商品，并刷新可负担状态
        const options = ev.options
          .filter((o) => o.id !== optionId)
          .map((o) => ({ ...o, disabled: scene.run.gold < (o.cost ?? 0) }));
        if (options.length === 0) this.closeEvent();
        else ui.openEvent({ ...ev, options, offers: ev.offers?.filter((o) => o.id !== optionId) });
      } else {
        this.closeEvent();
      }
    } else {
      ui.pushToast('无法选择该选项', '#ff5a5a');
    }
  }

  /** 事件 UI 完成后手动关闭 */
  closeEvent(): void {
    useUiStore().closeEvent();
    gameManager.battle?.closeEventPause();
  }

  setSpeed(s: number): void {
    gameManager.battle?.setSpeed(s);
    useSettingsStore().defaultSpeed = s;
  }

  setPaused(p: boolean): void {
    gameManager.battle?.setPaused(p);
  }

  async resetAll(): Promise<void> {
    const player = usePlayerStore();
    await SaveService.resetAll();
    player.resetAll();
    await this.persist();
  }

  async exportSave(): Promise<string> {
    const player = usePlayerStore();
    const settings = useSettingsStore();
    const run = await SaveService.loadBattle();
    return SaveService.exportBundle(player.data, toRawSettings(settings), run);
  }

  async importSave(text: string): Promise<{ ok: boolean; message: string }> {
    const res = SaveService.importBundle(text);
    if (!res.ok || !res.bundle) return { ok: false, message: res.message };
    const player = usePlayerStore();
    const settings = useSettingsStore();
    const bundle = res.bundle;
    player.hydrate(bundle.permanent);
    if (bundle.settings) settings.hydrate(bundle.settings);
    if (bundle.battle) {
      const run = deserializeRun(bundle.battle);
      if (run) await SaveService.saveBattle(run);
    } else {
      await SaveService.clearBattle();
    }
    await this.persist();
    return { ok: true, message: '存档导入成功' };
  }

  /** 挑战模式可用英雄校验 */
  validateStarters(mode: GameMode, rules: ChallengeRule[], heroes: string[]): string | null {
    const cap = rules.includes('threeHeroes') ? 3 : 6;
    if (heroes.length === 0) return '请至少选择一名英雄';
    if (heroes.length > cap) return `本模式最多选择 ${cap} 名英雄`;
    if (rules.includes('magesOnly')) {
      for (const h of heroes) {
        if (!MAGE_HEROES.includes(h)) return '本模式只能部署法师类英雄';
      }
    }
    void mode;
    void HEROES;
    return null;
  }
}

function toRawSettings(s: ReturnType<typeof useSettingsStore>): SettingsState {
  return JSON.parse(JSON.stringify(s.$state)) as SettingsState;
}

async function saveRunAsync(run: Parameters<typeof serializeRun>[0]): Promise<void> {
  await SaveService.saveBattle(run);
}

export const runController = new RunController();
export { defaultPermanent, saveRunAsync };
