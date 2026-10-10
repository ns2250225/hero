<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import HeroPortrait from '@/components/HeroPortrait.vue';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { runController } from '@/services/RunController';
import { CHALLENGES, MAPS } from '@/data/maps';
import { HERO_MAP, HEROES, MAGE_HEROES, RARITY_COLOR } from '@/data/heroes';
import type { ChallengeRule, GameMode } from '@/types/game';
import { layoutStarters, nextMapToUnlock } from '@/utils/placement';
import { audio } from '@/game/managers/AudioManager';

const player = usePlayerStore();
const ui = useUiStore();

const mode = ref<GameMode>('normal');
const mapId = ref(player.data.unlockedMaps[player.data.unlockedMaps.length - 1] ?? MAPS[0].id);
const rules = ref<ChallengeRule[]>([]);
const selected = ref<string[]>([]);

const unlockedMaps = computed(() => MAPS.filter((m) => player.data.unlockedMaps.includes(m.id)));
const availableHeroes = computed(() => HEROES.filter((h) => player.data.unlockedHeroes.includes(h.id)));
const cap = computed(() => (rules.value.includes('threeHeroes') ? Math.min(3, 6) : Math.min(6, 6)));
const canStart = computed(() => selected.value.length > 0);
const bestWaveOfMap = computed(() => player.data.bestWave[mapId.value] ?? 0);
const endlessUnlocked = computed(() =>
  MAPS.some((m) => (player.data.bestWave[m.id] ?? 0) >= 20) || player.data.bestWaveEndless > 0 || player.data.wins > 0,
);

function toggleHero(id: string) {
  audio.playSe('click');
  const idx = selected.value.indexOf(id);
  if (idx >= 0) selected.value.splice(idx, 1);
  else if (selected.value.length < cap.value) selected.value.push(id);
}

function pickMode(m: GameMode) {
  if (m === 'endless' && !endlessUnlocked.value) {
    ui.pushToast('通关任意地图的 20 波后解锁无尽模式', '#ff5a5a');
    return;
  }
  if (m === 'challenge' && unlockedMaps.value.length < 2) {
    ui.pushToast('至少解锁 2 张地图后开放挑战模式', '#ff5a5a');
    return;
  }
  mode.value = m;
  audio.playSe('click');
}

function toggleRule(id: ChallengeRule) {
  const i = rules.value.indexOf(id);
  if (i >= 0) rules.value.splice(i, 1);
  else rules.value.push(id);
  // 规则变化可能使已选英雄不合法
  if (rules.value.includes('magesOnly')) {
    selected.value = selected.value.filter((h) => MAGE_HEROES.includes(h));
  }
  if (rules.value.includes('threeHeroes') && selected.value.length > 3) {
    selected.value = selected.value.slice(0, 3);
  }
}

function start() {
  const err = runController.validateStarters(mode.value, rules.value, selected.value);
  if (err) {
    ui.pushToast(err, '#ff5a5a');
    return;
  }
  audio.playSe('recruit');
  runController.startRun({
    mode: mode.value,
    mapId: mapId.value,
    challengeRules: rules.value,
    starters: layoutStarters(selected.value, rules.value),
  });
}

function back() {
  ui.setScreen('menu');
}

const nextLocked = computed(() => nextMapToUnlock(player.data.unlockedMaps));

function buyMap(id: string, cost: number) {
  if (player.unlockMap(id, cost)) {
    audio.playSe('chest');
    mapId.value = id;
    ui.pushToast('新地图已解锁', '#ffd24a');
    void runController.persist();
  } else {
    ui.pushToast('永久金币不足', '#ff5a5a');
  }
}

// 初始站位由 RunState.autoPlace 计算，这里传入占位坐标
const selectedCfg = computed(() => selected.value.map((id) => HERO_MAP[id]).filter(Boolean));
void selectedCfg;
</script>

<template>
  <div class="select-view">
    <div class="bg" />
    <div class="content">
      <div class="head row">
        <button class="px-btn small" @click="back">返回</button>
        <span class="px-title">准备冒险</span>
        <div class="spacer" />
        <div class="modes row">
          <button class="px-btn small" :class="{ primary: mode === 'normal' }" @click="pickMode('normal')">普通模式</button>
          <button class="px-btn small" :class="{ primary: mode === 'endless', gold: endlessUnlocked && mode !== 'endless' }" @click="pickMode('endless')">
            无尽模式 {{ endlessUnlocked ? '' : '🔒' }}
          </button>
          <button class="px-btn small" :class="{ primary: mode === 'challenge' }" @click="pickMode('challenge')">
            挑战模式 {{ unlockedMaps.length >= 2 ? '' : '🔒' }}
          </button>
        </div>
      </div>

      <div class="panels">
        <!-- 地图 -->
        <div class="px-panel maps">
          <div class="panel-title"><PixelIcon glyph="map" :size="14" />选择地图</div>
          <div class="map-list scroll-y">
            <button
              v-for="m in unlockedMaps"
              :key="m.id"
              class="map-item"
              :class="{ active: mapId === m.id }"
              @click="mapId = m.id"
            >
              <div class="row">
                <span class="map-name">{{ m.name }}</span>
                <div class="spacer" />
                <span class="px-tiny px-dim">难度 ×{{ m.hpMult.toFixed(1) }}</span>
              </div>
              <div class="px-tiny px-dim map-desc">{{ m.desc }}</div>
              <div class="row px-tiny">
                <span class="px-dim">最高波次 {{ player.data.bestWave[m.id] ?? 0 }} / 20</span>
                <div class="spacer" />
                <span v-for="b in m.bossIds" :key="b" class="px-dim">·</span>
              </div>
            </button>
            <div v-for="m in MAPS.filter((x) => !player.data.unlockedMaps.includes(x.id))" :key="m.id" class="map-item locked">
              <span class="map-name px-dim">{{ m.name }} 🔒</span>
              <div class="px-tiny px-dim">在上一张地图达到 20 波后免费解锁</div>
              <button
                v-if="nextLocked?.id === m.id"
                class="px-btn small gold"
                :disabled="player.data.permGold < nextLocked.cost"
                @click.stop="buyMap(m.id, nextLocked.cost)"
              >
                花费 {{ nextLocked.cost }} 永久金币提前解锁
              </button>
            </div>
          </div>
        </div>

        <!-- 初始英雄 -->
        <div class="px-panel heroes">
          <div class="panel-title">
            <PixelIcon glyph="user" :size="14" />选择初始英雄
            <span class="px-tiny px-dim">（{{ selected.length }}/{{ cap }}）</span>
          </div>
          <div class="hero-grid scroll-y">
            <button
              v-for="h in availableHeroes"
              :key="h.id"
              class="hero-item"
              :class="{ active: selected.includes(h.id), disabled: rules.includes('magesOnly') && !MAGE_HEROES.includes(h.id) }"
              :style="{ borderColor: selected.includes(h.id) ? RARITY_COLOR[h.rarity] : undefined }"
              :disabled="rules.includes('magesOnly') && !MAGE_HEROES.includes(h.id)"
              @click="toggleHero(h.id)"
            >
              <HeroPortrait :hero-id="h.id" :star="player.data.heroStars[h.id] ?? 1" :size="42" show-name />
              <div class="px-tiny px-dim hero-desc">{{ h.desc }}</div>
            </button>
          </div>
        </div>

        <!-- 挑战规则 -->
        <div class="px-panel rules" v-if="mode === 'challenge'">
          <div class="panel-title"><PixelIcon glyph="trophy" :size="14" />挑战规则</div>
          <div class="rule-list">
            <button
              v-for="c in CHALLENGES"
              :key="c.id"
              class="rule-item"
              :class="{ active: rules.includes(c.id) }"
              @click="toggleRule(c.id)"
            >
              <span>{{ c.name }}</span>
              <span class="px-tiny px-dim">{{ c.desc }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="foot row">
        <span class="px-tiny px-dim">
          {{ mode === 'normal' ? '每张地图 20 波，击败最终 Boss 获胜' : mode === 'endless' ? '波次无限增长，尽可能坚持更久' : '特殊规则下的极限挑战' }}
        </span>
        <div class="spacer" />
        <span v-if="mode === 'normal'" class="px-tiny px-dim">本图最高波次 {{ bestWaveOfMap }}</span>
        <button class="px-btn primary big" :disabled="!canStart" @click="start">
          <PixelIcon glyph="sword" :size="16" />开始战斗
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-view {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, #23324f 0%, #101724 60%, #06090e 100%);
}
.content {
  position: relative;
  z-index: 2;
  width: 96vw;
  max-width: 1180px;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.head {
  gap: 12px;
}
.modes {
  gap: 5px;
}
.panels {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  grid-template-rows: auto auto;
  gap: 10px;
  min-height: 0;
}
.maps {
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.rules {
  grid-column: 2;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--gold);
  margin-bottom: 8px;
}
.map-list,
.hero-grid,
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 46vh;
  overflow-y: auto;
}
.map-item {
  text-align: left;
  border: 2px solid #2f3a52;
  background: #131a26;
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--text);
}
.map-item:hover {
  border-color: var(--line);
}
.map-item.active {
  border-color: var(--gold);
  background: #1c2637;
}
.map-item.locked {
  opacity: 0.6;
  cursor: not-allowed;
}
.map-name {
  font-size: 11px;
}
.map-desc {
  line-height: 1.5;
}
.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 6px;
  max-height: 40vh;
}
.hero-item {
  border: 2px solid #2f3a52;
  background: #131a26;
  padding: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.hero-item:hover {
  border-color: var(--line);
}
.hero-item.active {
  background: #1c2637;
  box-shadow: inset 0 0 0 1px rgba(255, 210, 74, 0.35);
}
.hero-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.hero-desc {
  line-height: 1.4;
  text-align: center;
}
.rule-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border: 2px solid #2f3a52;
  background: #131a26;
  padding: 5px 8px;
  font-size: 10px;
  color: var(--text);
}
.rule-item.active {
  border-color: var(--epic);
  background: #241a34;
}
.foot {
  gap: 10px;
}
.foot .big {
  padding: 12px 26px;
}
</style>
