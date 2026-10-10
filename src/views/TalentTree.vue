<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { CATEGORY_NAME, TALENTS, type TalentCategory, type TalentNode } from '@/data/talents';
import { formatNumber } from '@/utils/format';
import { audio } from '@/game/managers/AudioManager';

const player = usePlayerStore();
const ui = useUiStore();
const tab = ref<TalentCategory>('attack');

const list = computed(() => TALENTS.filter((t) => t.category === tab.value));

function levelOf(t: TalentNode): number {
  return player.data.talents[t.id] ?? 0;
}

function costOf(t: TalentNode): number {
  return t.cost(levelOf(t));
}

/** 固定值属性中以百分比显示的部分 */
const RATE_STATS = new Set(['critRate', 'critDamage', 'dodgeRate', 'cooldownReduction', 'lifeSteal']);

function nextDesc(t: TalentNode): string {
  if (levelOf(t) >= t.maxLevel) return '已达到最高等级';
  const total = (levelOf(t) + 1) * t.value;
  const pct = t.isPct || t.bonus || (t.stat && RATE_STATS.has(t.stat)) || t.special === 'offlineRate';
  const v = pct ? `+${Math.round(total * 100)}%` : `+${Math.round(total)}`;
  return `升级后合计：${v}`;
}

function buy(t: TalentNode) {
  const ok = player.buyTalent(t.id);
  if (ok) {
    audio.playSe('levelup');
    void persist();
  } else {
    ui.pushToast('永久金币不足或已满级', '#ff5a5a');
  }
}

function resetAll() {
  player.resetTalents();
  ui.pushToast('天赋已重置（返还 80% 金币）', '#8fd8ff');
  void persist();
}

async function persist() {
  const { runController } = await import('@/services/RunController');
  await runController.persist();
}

function back() {
  ui.setScreen('menu');
}
</script>

<template>
  <div class="view">
    <div class="head row">
      <button class="px-btn small" @click="back">返回</button>
      <span class="px-title">永久天赋树</span>
      <div class="spacer" />
      <button class="px-btn small danger" @click="resetAll">重置天赋</button>
      <span class="row px-small"><PixelIcon glyph="coin" :size="14" /><b class="gold">{{ formatNumber(player.data.permGold) }}</b></span>
    </div>

    <div class="tabs row">
      <button
        v-for="(name, key) in CATEGORY_NAME"
        :key="key"
        class="px-btn"
        :class="{ primary: tab === key }"
        @click="tab = key as TalentCategory"
      >
        {{ name }}
      </button>
      <span class="px-tiny px-dim">天赋永久生效，对每一次冒险都有效</span>
    </div>

    <div class="list scroll-y">
      <div v-for="t in list" :key="t.id" class="node px-panel" :class="{ maxed: levelOf(t) >= t.maxLevel }">
        <div class="row">
          <PixelIcon :glyph="t.icon" :size="30" />
          <div class="col" style="gap: 2px">
            <div class="row" style="gap: 6px">
              <span class="node-name">{{ t.name }}</span>
              <span class="px-tag">Lv.{{ levelOf(t) }} / {{ t.maxLevel }}</span>
            </div>
            <span class="px-tiny px-dim">{{ t.desc }}</span>
            <span class="px-tiny">{{ nextDesc(t) }}</span>
          </div>
          <div class="spacer" />
          <div class="col" style="gap: 4px; align-items: flex-end">
            <span class="cost" :class="{ poor: player.data.permGold < costOf(t) }">
              <PixelIcon glyph="coin" :size="12" />{{ levelOf(t) >= t.maxLevel ? '已满级' : formatNumber(costOf(t)) }}
            </span>
            <button
              class="px-btn small gold"
              :disabled="levelOf(t) >= t.maxLevel || player.data.permGold < costOf(t)"
              @click="buy(t)"
            >
              {{ levelOf(t) >= t.maxLevel ? '已满级' : '升级' }}
            </button>
          </div>
        </div>
        <div class="px-bar" style="margin-top: 6px">
          <i :style="{ width: (levelOf(t) / t.maxLevel) * 100 + '%', background: 'linear-gradient(180deg,#ffd88a,#c89820)' }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 10px;
  background: radial-gradient(ellipse at 50% 0%, #1c2740 0%, #0d1219 60%, #06090e 100%);
}
.head {
  gap: 10px;
}
.tabs {
  gap: 6px;
  flex-wrap: wrap;
}
.list {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 8px;
  align-content: start;
  overflow-y: auto;
  padding-right: 4px;
}
.node {
  display: flex;
  flex-direction: column;
}
.node.maxed {
  border-color: var(--gold);
}
.node-name {
  font-size: 11px;
  color: var(--text);
}
.cost {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--gold);
}
.cost.poor {
  color: #ff6a6a;
}
.gold {
  color: var(--gold);
}
</style>
