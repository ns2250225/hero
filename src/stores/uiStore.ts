import { defineStore } from 'pinia';
import type {
  BattleResult, BossBarState, ChallengeRule, GameEventPayload, GameMode, HudState, UpgradeCard,
} from '@/types/game';
import type { MerchantOffer } from '@/data/events';
import type { EquipmentItem } from '@/game/utils/equipment';

export interface Toast {
  id: number;
  text: string;
  color: string;
}

export interface WaveWarning {
  wave: number;
  boss: boolean;
}

export interface EventModalState {
  eventId: string;
  title: string;
  desc: string;
  options: GameEventPayload['options'];
  multi?: boolean;
  offers?: MerchantOffer[];
}

export type Screen =
  | 'menu' | 'select' | 'battle' | 'result' | 'heroes' | 'equipment' | 'talents'
  | 'achievements' | 'settings' | 'codex' | 'save' | 'challenges';

export const useUiStore = defineStore('ui', {
  state: () => ({
    screen: 'menu' as Screen,
    hud: null as HudState | null,
    bossBar: { visible: false, name: '', title: '', hp: 0, maxHp: 0, shield: false, enraged: false } as BossBarState,
    levelUp: {
      open: false,
      cards: [] as UpgradeCard[],
      locked: null as UpgradeCard | null,
      refreshes: 0,
      pending: 0,
    },
    eventModal: null as EventModalState | null,
    waveWarning: null as WaveWarning | null,
    toasts: [] as Toast[],
    toastId: 1,
    checkpointRequest: 0,
    checkpointSavedAt: 0,
    lastResult: null as BattleResult | null,
    loading: null as string | null,
    heroDetailUid: null as number | null,
    battleLoot: [] as EquipmentItem[],
    showPauseMenu: false,
    showAutoPanel: false,
    pendingStart: null as { mode: GameMode; mapId: string; rules: ChallengeRule[]; starters: { heroId: string; x: number; y: number }[] } | null,
    lastStrategy: 'manual' as string,
  }),

  actions: {
    setScreen(s: Screen) {
      this.screen = s;
    },
    setHud(h: HudState) {
      this.hud = h;
    },
    setBossBar(b: BossBarState) {
      this.bossBar = b;
    },
    openLevelUp(cards: UpgradeCard[], refreshes: number, pending: number) {
      this.levelUp = { open: true, cards, locked: null, refreshes, pending };
    },
    closeLevelUp() {
      this.levelUp.open = false;
      this.levelUp.cards = [];
      this.levelUp.locked = null;
    },
    setLevelUpCards(cards: UpgradeCard[]) {
      this.levelUp.cards = cards;
    },
    setRefreshes(n: number) {
      this.levelUp.refreshes = n;
    },
    setPendingLevelUps(n: number) {
      this.levelUp.pending = n;
    },
    setLocked(card: UpgradeCard | null) {
      this.levelUp.locked = card;
    },
    openEvent(payload: EventModalState) {
      this.eventModal = payload;
    },
    closeEvent() {
      this.eventModal = null;
    },
    setWaveWarning(w: WaveWarning | null) {
      this.waveWarning = w;
    },
    pushToast(text: string, color = '#ffffff') {
      const t: Toast = { id: this.toastId++, text, color };
      this.toasts.push(t);
      if (this.toasts.length > 5) this.toasts.shift();
      window.setTimeout(() => {
        this.toasts = this.toasts.filter((x) => x.id !== t.id);
      }, 3200);
    },
    requestCheckpoint() {
      this.checkpointRequest++;
    },
    setCheckpointSaved() {
      this.checkpointSavedAt = Date.now();
    },
    addBattleEquipment(item: EquipmentItem) {
      if (!this.battleLoot.some((x) => x.uid === item.uid)) this.battleLoot.push(item);
    },
    clearBattleLoot() {
      this.battleLoot = [];
    },
    finishBattle(result: BattleResult) {
      this.lastResult = result;
      this.screen = 'result';
      this.levelUp.open = false;
      this.eventModal = null;
      this.bossBar.visible = false;
      this.showPauseMenu = false;
    },
    setHeroDetail(uid: number | null) {
      this.heroDetailUid = uid;
    },
    setLoading(msg: string | null) {
      this.loading = msg;
    },
    setPendingStart(p: typeof this.pendingStart) {
      this.pendingStart = p;
    },
  },
});
