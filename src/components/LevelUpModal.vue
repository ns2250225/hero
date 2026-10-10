<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from './PixelIcon.vue';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { runController } from '@/services/RunController';
import { RARITY_COLOR, RARITY_LABEL } from '@/data/upgrades';
import type { UpgradeCard } from '@/types/game';
import { STRATEGY_NAME } from '@/game/utils/autoPick';

const ui = useUiStore();
const settings = useSettingsStore();
const locked = ref<UpgradeCard | null>(null);
const hovered = ref<UpgradeCard | null>(null);

const state = computed(() => ui.levelUp);
const cards = computed(() => state.value.cards);
const rarityWeight: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

const sorted = computed(() => cards.value.slice().sort((a, b) => rarityWeight[a.rarity] - rarityWeight[b.rarity]));

function pick(card: UpgradeCard) {
  ui.setLocked(null);
  locked.value = null;
  runController.chooseCard(card);
}

function refresh() {
  runController.refreshCards();
}

function toggleLock(card: UpgradeCard, ev: Event) {
  ev.stopPropagation();
  if (locked.value?.key === card.key) {
    locked.value = null;
    ui.setLocked(null);
  } else {
    locked.value = card;
    ui.setLocked(card);
  }
}

function strategyChanged(v: string) {
  settings.autoPick = v as typeof settings.autoPick;
  const scene = runController;
  void scene;
  useUiStore().pushToast(`自动升级：${STRATEGY_NAME[v as keyof typeof STRATEGY_NAME]}`, '#8fd8ff');
  const battle = (window as unknown as { __battleScene?: { setAutoPick: (s: string, p: string[]) => void } }).__battleScene;
  battle?.setAutoPick(v, settings.customPriority);
  if (v !== 'manual') ui.closeLevelUp();
}
</script>

<template>
  <div v-if="state.open" class="modal-mask">
    <div class="levelup">
      <div class="head row">
        <span class="px-title">升级！ 选择强化</span>
        <span class="px-tag">剩余 {{ state.pending }} 次</span>
        <div class="spacer" />
        <select class="px-select" :value="settings.autoPick" @change="strategyChanged(($event.target as HTMLSelectElement).value)">
          <option v-for="(name, key) in STRATEGY_NAME" :key="key" :value="key">{{ name }}</option>
        </select>
        <button class="px-btn small primary" :disabled="state.refreshes <= 0" @click="refresh">
          <PixelIcon glyph="refresh" :size="12" />刷新 ({{ state.refreshes }})
        </button>
      </div>

      <div class="cards">
        <div
          v-for="c in sorted"
          :key="c.key"
          class="px-card"
          :class="[`rarity-${c.rarity}`, { locked: locked?.key === c.key }]"
          @click="pick(c)"
          @mouseenter="hovered = c"
          @mouseleave="hovered = null"
        >
          <div class="card-head">
            <PixelIcon :glyph="c.icon" :size="30" />
            <div class="card-title">
              <div :style="{ color: RARITY_COLOR[c.rarity] }">{{ c.title }}</div>
              <span class="px-tiny px-dim">{{ RARITY_LABEL[c.rarity] }}</span>
            </div>
            <button class="lock-btn" :class="{ on: locked?.key === c.key }" title="锁定后刷新其他选项" @click="toggleLock(c, $event)">
              {{ locked?.key === c.key ? '🔒' : '🔓' }}
            </button>
          </div>
          <div class="card-desc">{{ c.desc }}</div>
          <div v-if="c.levelText" class="px-tiny px-dim">{{ c.levelText }}</div>
          <div class="card-foot">
            <span v-for="t in c.tags" :key="t" class="px-tag">{{ tagName(t) }}</span>
          </div>
        </div>
      </div>

      <div class="hint px-tiny px-dim">
        点击卡片应用强化 · 锁定后可刷新其他选项 · 每次升级至少提供 3 个有效选项
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const TAG_NAMES: Record<string, string> = {
  dps: '输出',
  survival: '生存',
  summon: '召唤',
  economy: '经济',
};

export function tagName(t: string): string {
  return TAG_NAMES[t] ?? t;
}

export default { name: 'LevelUpModal' };
</script>

<style scoped>
.levelup {
  width: min(1000px, 96vw);
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: floatUp 0.18s;
}
.head {
  background: linear-gradient(180deg, #232c40, #141a26);
  border: 2px solid var(--line);
  padding: 8px 12px;
}
.px-select {
  background: #121722;
  color: var(--text);
  border: 2px solid var(--line);
  padding: 4px 6px;
  font-family: inherit;
  font-size: 10px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 700px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.card-title {
  flex: 1;
  font-size: 11px;
  line-height: 1.4;
}
.lock-btn {
  font-size: 14px;
  opacity: 0.5;
}
.lock-btn.on {
  opacity: 1;
}
.card-desc {
  font-size: 10px;
  color: var(--text-dim);
  min-height: 32px;
  line-height: 1.5;
  margin-bottom: 6px;
}
.card-foot {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.hint {
  text-align: center;
}
</style>
