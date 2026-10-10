<script setup lang="ts">
import { computed } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { ACHIEVEMENTS } from '@/data/achievements';
import { RELICS, RELIC_RARITY_COLOR } from '@/data/relics';
import { formatNumber } from '@/utils/format';
import { audio } from '@/game/managers/AudioManager';

const player = usePlayerStore();
const ui = useUiStore();

const unlocked = computed(() => ACHIEVEMENTS.filter((a) => player.data.achievements[a.id]));
const locked = computed(() => ACHIEVEMENTS.filter((a) => !player.data.achievements[a.id] && !a.hidden));
const ratio = computed(() => Math.round((unlocked.value.length / ACHIEVEMENTS.length) * 100));

function unlockRelic(id: string) {
  const ok = player.unlockRelic(id);
  if (ok) {
    audio.playSe('chest');
    ui.pushToast('遗物已解锁，会出现在后续冒险中', '#ffb02e');
    void persist();
  } else {
    ui.pushToast('永久金币不足', '#ff5a5a');
  }
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
      <span class="px-title">成就与遗物</span>
      <span class="px-tag">完成度 {{ ratio }}%（{{ unlocked.length }}/{{ ACHIEVEMENTS.length }}）</span>
      <div class="spacer" />
      <span class="row px-small"><PixelIcon glyph="coin" :size="14" /><b class="gold">{{ formatNumber(player.data.permGold) }}</b></span>
    </div>

    <div class="body">
      <div class="px-panel col scroll-y" style="flex: 1.2">
        <div class="panel-title"><PixelIcon glyph="trophy" :size="14" />成就</div>
        <div class="ach-grid">
          <div v-for="a in ACHIEVEMENTS" :key="a.id" class="ach" :class="{ done: player.data.achievements[a.id], hidden: a.hidden && !player.data.achievements[a.id] }">
            <PixelIcon :glyph="a.icon" :size="22" :tint="player.data.achievements[a.id] ? '#ffd24a' : '#5b6579'" />
            <div class="col" style="gap: 1px; flex: 1; min-width: 0">
              <span class="px-small">{{ a.hidden && !player.data.achievements[a.id] ? '???' : a.name }}</span>
              <span class="px-tiny px-dim">{{ a.hidden && !player.data.achievements[a.id] ? '隐藏成就' : a.desc }}</span>
            </div>
            <span class="px-tiny" :class="player.data.achievements[a.id] ? 'done-text' : 'px-dim'">
              {{ player.data.achievements[a.id] ? '已完成' : `+${a.reward}` }}
            </span>
          </div>
        </div>
        <div v-if="locked.length === 0" class="px-tiny px-dim">全部可见成就已完成！</div>
      </div>

      <div class="px-panel col scroll-y" style="flex: 1">
        <div class="panel-title"><PixelIcon glyph="relic" :size="14" />遗物解锁</div>
        <div class="relic-list">
          <div v-for="r in RELICS" :key="r.id" class="relic" :style="{ borderColor: RELIC_RARITY_COLOR[r.rarity] }">
            <PixelIcon :glyph="r.icon" :size="24" :tint="RELIC_RARITY_COLOR[r.rarity]" />
            <div class="col" style="gap: 1px; flex: 1; min-width: 0">
              <span class="px-small" :style="{ color: RELIC_RARITY_COLOR[r.rarity] }">{{ r.name }}</span>
              <span class="px-tiny px-dim">{{ r.desc }}</span>
            </div>
            <span v-if="player.data.unlockedRelics.includes(r.id)" class="px-tiny" style="color: #7aff9a">已解锁</span>
            <button
              v-else
              class="px-btn small gold"
              :disabled="player.data.permGold < r.unlockCost"
              @click="unlockRelic(r.id)"
            >
              {{ r.unlockCost }}
            </button>
          </div>
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
  flex-wrap: wrap;
}
.body {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
}
@media (max-width: 860px) {
  .body {
    flex-direction: column;
  }
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
  font-size: 10px;
  margin-bottom: 6px;
}
.ach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 5px;
}
.ach {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #242d40;
  background: #121722;
  padding: 5px 6px;
}
.ach.done {
  border-color: var(--gold);
  background: #1a1f14;
}
.ach.hidden {
  opacity: 0.6;
}
.done-text {
  color: #7aff9a;
}
.relic-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.relic {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line);
  background: #121722;
  padding: 5px 6px;
}
.gold {
  color: var(--gold);
}
</style>
