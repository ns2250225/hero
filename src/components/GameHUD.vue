<script setup lang="ts">
import { computed } from 'vue';
import PixelIcon from './PixelIcon.vue';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { runController } from '@/services/RunController';
import { HERO_MAP, RARITY_COLOR } from '@/data/heroes';
import { RELIC_MAP } from '@/data/relics';
import { SKILL_MAP } from '@/data/skills';
import { SYNERGY_MAP } from '@/data/synergies';
import { DEFENSE_DEF_MAP, SPECIAL_DEF_MAP } from '@/data/upgrades';
import { formatTime } from '@/utils/format';

const ui = useUiStore();
const settings = useSettingsStore();

const hud = computed(() => ui.hud);
const expPct = computed(() => {
  if (!hud.value) return 0;
  return Math.min(100, (hud.value.exp / Math.max(1, hud.value.expNext)) * 100);
});
const hpPct = computed(() => {
  if (!hud.value) return 0;
  return Math.max(0, Math.min(100, (hud.value.baseHp / Math.max(1, hud.value.baseMaxHp)) * 100));
});

const relics = computed(() => (hud.value?.relics ?? []).map((id) => RELIC_MAP[id]).filter(Boolean));
const synergies = computed(() => (hud.value?.synergies ?? []).map((id) => SYNERGY_MAP[id]).filter(Boolean));
const defenses = computed(() => Object.entries(hud.value?.defenses ?? {}).map(([id, lv]) => ({ def: DEFENSE_DEF_MAP[id], lv: lv as number })).filter((d) => d.def));
const specials = computed(() => Object.entries(hud.value?.specials ?? {}).map(([id, lv]) => ({ def: SPECIAL_DEF_MAP[id], lv: lv as number })).filter((d) => d.def));

function cycleSpeed() {
  const cur = hud.value?.speed ?? 1;
  const next = cur === 1 ? 2 : cur === 2 ? 4 : 1;
  runController.setSpeed(next);
  settings.defaultSpeed = next;
}

function togglePause() {
  const paused = !(hud.value?.paused ?? false);
  runController.setPaused(paused);
}

function skipWave() {
  const scene = (window as unknown as { __battleScene?: { skipIntermission: () => void } }).__battleScene;
  scene?.skipIntermission();
}

const heroList = computed(() => hud.value?.heroes ?? []);
</script>

<template>
  <div v-if="hud" class="hud">
    <!-- 顶部状态条 -->
    <div class="top px-panel">
      <div class="stat">
        <span class="label">波次</span>
        <span class="value">{{ hud.wave }}<em v-if="hud.maxWave">/{{ hud.maxWave }}</em></span>
      </div>
      <div class="stat">
        <span class="label">基地</span>
        <div class="inline-bar">
          <div class="px-bar" style="width: 84px; height: 12px">
            <i :style="{ width: hpPct + '%', background: 'linear-gradient(180deg,#ff9a9a,#c02020)' }" />
          </div>
          <span class="value small">{{ hud.baseHp }}<em v-if="hud.baseMaxHp !== 100">/{{ hud.baseMaxHp }}</em></span>
          <span v-if="hud.baseShield > 0" class="shield-tag">+{{ hud.baseShield }}</span>
        </div>
      </div>
      <div class="stat"><span class="label">等级</span><span class="value">LV.{{ hud.level }}</span></div>
      <div class="stat"><PixelIcon glyph="coin" :size="14" /><span class="value">{{ hud.gold }}</span></div>
      <div class="stat"><PixelIcon glyph="skull" :size="14" /><span class="value">{{ hud.kills }}</span></div>
      <div class="stat"><PixelIcon glyph="clock" :size="14" /><span class="value">{{ formatTime(hud.time) }}</span></div>
      <div class="stat"><PixelIcon glyph="raid" :size="14" /><span class="value">{{ hud.enemies }}</span></div>
      <div class="spacer" />
      <div v-if="settings.showFps" class="stat px-dim px-tiny">FPS {{ Math.round(hud.fps) }}</div>
      <button class="px-btn small" @click="togglePause">
        <PixelIcon :glyph="hud.paused ? 'raid' : 'wall2'" :size="12" />{{ hud.paused ? '继续' : '暂停' }}
      </button>
      <button class="px-btn small gold" @click="cycleSpeed">×{{ hud.speed }}</button>
    </div>

    <!-- 波次提示 -->
    <transition name="fade">
      <div v-if="hud.phase === 'intermission'" class="wave-banner px-panel">
        <span>下一波 {{ Math.ceil(hud.intermission) }} 秒</span>
        <button class="px-btn small primary" @click="skipWave">提前开始</button>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="hud.eliteWave" class="elite-banner">精英怪物潮</div>
    </transition>

    <!-- 底部控制区（PRD 3.2：y=620~720） -->
    <div class="bottom px-panel">
      <div class="exp-row">
        <span class="lv">LV.{{ hud.level }}</span>
        <div class="px-bar" style="flex: 1; height: 10px">
          <i :style="{ width: expPct + '%', background: 'linear-gradient(180deg,#bfe9ff,#3f9fd8)' }" />
        </div>
        <span class="px-tiny px-dim">{{ hud.exp }}/{{ hud.expNext }}</span>
        <span class="mini" :title="relics.map((r) => r.name).join('、')"><PixelIcon glyph="relic" :size="12" />{{ relics.length }}</span>
        <span class="mini" :title="synergies.map((s) => s.name).join('、')"><PixelIcon glyph="link" :size="12" />{{ synergies.length }}</span>
        <span class="mini" :title="[...defenses.map((d) => d.def.name), ...specials.map((s) => s.def.name)].join('、')"><PixelIcon glyph="shield" :size="12" />{{ defenses.length + specials.length }}</span>
      </div>
      <div class="hero-row">
        <div
          v-for="h in heroList"
          :key="h.uid"
          class="hero-chip"
          :class="{ down: h.down }"
          :style="{ borderColor: RARITY_COLOR[HERO_MAP[h.heroId]?.rarity ?? 'common'] }"
          :title="`${HERO_MAP[h.heroId]?.name} — 点击查看详情`"
          @click="ui.setHeroDetail(h.uid)"
        >
          <PixelIcon :glyph="HERO_MAP[h.heroId]?.spriteKey ?? 'user'" :size="34" :awakened="h.star >= 5" />
          <div class="chip-info">
            <div class="chip-name">
              {{ HERO_MAP[h.heroId]?.name }}<span class="stars">{{ '★'.repeat(h.star) }}</span>
            </div>
            <div class="px-bar" style="height: 5px">
              <i :style="{ width: Math.max(0, Math.min(100, (h.hp / Math.max(1, h.maxHp)) * 100)) + '%', background: h.down ? '#666' : 'linear-gradient(180deg,#7aff9a,#28a04a)' }" />
            </div>
            <div class="skill-pips">
              <span v-for="s in h.skills" :key="s.id" class="pip" :title="SKILL_MAP[s.id]?.name">
                <PixelIcon :glyph="SKILL_MAP[s.id]?.glyph ?? 'star'" :size="11" :tint="s.cd <= 0.05 ? undefined : '#5b6579'" />
              </span>
            </div>
          </div>
          <div v-if="h.down" class="down-timer">{{ Math.ceil(h.downTimer) }}s</div>
        </div>
        <div v-for="n in Math.max(0, hud.deployCap - heroList.length)" :key="'empty' + n" class="hero-chip empty">
          <span class="px-tiny px-dim">空位</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}
.hud > * {
  pointer-events: auto;
}
.top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border-left: none;
  border-right: none;
  border-top: none;
}
.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  white-space: nowrap;
}
.stat .label {
  color: var(--text-dim);
  font-size: 9px;
}
.stat .value {
  color: var(--text);
  text-shadow: 1px 1px 0 #000;
}
.stat .value em {
  font-style: normal;
  color: var(--text-dim);
  font-size: 9px;
}
.stat .value.small {
  font-size: 9px;
}
.inline-bar {
  display: flex;
  align-items: center;
  gap: 4px;
}
.shield-tag {
  color: #8fd8ff;
  font-size: 9px;
}
.wave-banner {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  font-size: 11px;
  animation: floatUp 0.2s;
}
.elite-banner {
  position: absolute;
  top: 112px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd24a;
  font-size: 13px;
  text-shadow: 2px 2px 0 #000;
  animation: pulse 1.2s infinite;
}
.bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px 8px;
  border-left: none;
  border-right: none;
  border-bottom: none;
}
.exp-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.exp-row .lv {
  font-size: 10px;
  color: var(--exp);
}
.mini {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: var(--text-dim);
  cursor: help;
}
.hero-row {
  display: flex;
  gap: 6px;
  align-items: stretch;
  overflow-x: auto;
  flex: 1;
}
.hero-chip {
  border: 2px solid var(--line);
  background: #121722;
  padding: 2px 5px 2px 2px;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 128px;
  transition: transform 0.08s;
}
.hero-chip:hover {
  transform: translateY(-2px);
}
.hero-chip.down {
  filter: grayscale(0.85);
}
.hero-chip.empty {
  min-width: 70px;
  justify-content: center;
  border-style: dashed;
  opacity: 0.45;
}
.chip-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}
.chip-name {
  font-size: 9px;
  white-space: nowrap;
}
.chip-name .stars {
  color: var(--gold);
  margin-left: 3px;
  font-size: 8px;
}
.down-timer {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 8px;
  color: #ff8a8a;
  background: rgba(0, 0, 0, 0.7);
  padding: 0 2px;
}
.skill-pips {
  display: flex;
  gap: 1px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
