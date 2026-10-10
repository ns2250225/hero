<script setup lang="ts">
import { computed } from 'vue';
import PixelIcon from './PixelIcon.vue';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { RELIC_MAP, RELIC_RARITY_COLOR } from '@/data/relics';
import { SKILL_MAP } from '@/data/skills';
import { SYNERGY_MAP } from '@/data/synergies';
import { DEFENSE_DEF_MAP, SPECIAL_DEF_MAP } from '@/data/upgrades';
import { HERO_MAP } from '@/data/heroes';
import { PASSIVES } from '@/data/skills';
import { formatNumber } from '@/utils/format';

const ui = useUiStore();
const settings = useSettingsStore();
const hud = computed(() => ui.hud);

const relics = computed(() => (hud.value?.relics ?? []).map((id) => RELIC_MAP[id]).filter(Boolean));
const synergies = computed(() => (hud.value?.synergies ?? []).map((id) => SYNERGY_MAP[id]).filter(Boolean));
const defenses = computed(() =>
  Object.entries(hud.value?.defenses ?? {})
    .map(([id, lv]) => ({ def: DEFENSE_DEF_MAP[id], lv: Number(lv) }))
    .filter((d) => d.def),
);
const specials = computed(() =>
  Object.entries(hud.value?.specials ?? {})
    .map(([id, lv]) => ({ def: SPECIAL_DEF_MAP[id], lv: Number(lv) }))
    .filter((d) => d.def),
);
const passives = computed(() => {
  const rec = hud.value?.passives ?? {};
  return PASSIVES.filter((p) => (rec[p.id] ?? 0) > 0).map((p) => ({ cfg: p, lv: rec[p.id] }));
});
const skills = computed(() => {
  const seen = new Set<string>();
  const out: { id: string; level: number; hero: string; evolved: boolean }[] = [];
  for (const h of hud.value?.heroes ?? []) {
    for (const s of h.skills) {
      const key = `${h.uid}:${s.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: s.id, level: s.level, hero: HERO_MAP[h.heroId]?.name ?? '', evolved: SKILL_MAP[s.id]?.isEvolution ?? false });
    }
  }
  return out;
});
</script>

<template>
  <transition name="fade">
    <div v-if="hud" class="sanctum">
      <div class="tab-row">
        <span class="tab-title">冒险圣所</span>
        <span class="px-tiny px-dim">第 {{ hud.wave }} 波 · LV.{{ hud.level }} · {{ formatNumber(hud.kills) }} 击杀</span>
        <div class="spacer" />
        <button class="px-btn small" @click="settings.showFps = !settings.showFps">
          {{ settings.showFps ? '隐藏 FPS' : '显示 FPS' }}
        </button>
      </div>
      <div class="groups">
        <div class="group">
          <div class="gt">
            <PixelIcon glyph="relic" :size="14" />遗物 ({{ relics.length }})
          </div>
          <div class="items">
            <span
              v-for="r in relics"
              :key="r.id"
              class="item"
              :style="{ borderColor: RELIC_RARITY_COLOR[r.rarity] }"
              :title="r.desc"
            >
              <PixelIcon :glyph="r.icon" :size="18" />
              <span class="label">{{ r.name }}</span>
            </span>
            <span v-if="relics.length === 0" class="px-tiny px-dim">击败 Boss 或精英怪可以获得遗物</span>
          </div>
        </div>

        <div class="group">
          <div class="gt"><PixelIcon glyph="link" :size="14" />羁绊 ({{ synergies.length }})</div>
          <div class="items">
            <span
              v-for="s in synergies"
              :key="s.id"
              class="item"
              :style="{ borderColor: s.color }"
              :title="s.desc"
            >
              <PixelIcon glyph="link" :size="18" :tint="s.color" />
              <span class="label">{{ s.name }}</span>
            </span>
            <span v-if="synergies.length === 0" class="px-tiny px-dim">不同英雄同时上阵会激活羁绊</span>
          </div>
        </div>

        <div class="group">
          <div class="gt"><PixelIcon glyph="star" :size="14" />技能 ({{ skills.length }})</div>
          <div class="items">
            <span
              v-for="s in skills"
              :key="s.hero + s.id"
              class="item"
              :style="{ borderColor: s.evolved ? '#ffc83a' : '#3a4763' }"
              :title="SKILL_MAP[s.id]?.description"
            >
              <PixelIcon :glyph="SKILL_MAP[s.id]?.glyph ?? 'star'" :size="18" />
              <span class="label">{{ SKILL_MAP[s.id]?.name }} Lv.{{ s.level }}</span>
            </span>
            <span v-if="skills.length === 0" class="px-tiny px-dim">升级时可以学习与强化技能</span>
          </div>
        </div>

        <div class="group">
          <div class="gt"><PixelIcon glyph="shield" :size="14" />防线与特殊效果</div>
          <div class="items">
            <span v-for="d in defenses" :key="d.def.id" class="item" :title="d.def.desc">
              <PixelIcon :glyph="d.def.icon" :size="18" />
              <span class="label">{{ d.def.name }} Lv.{{ d.lv }}</span>
            </span>
            <span v-for="s in specials" :key="s.def.id" class="item" :title="s.def.desc">
              <PixelIcon :glyph="s.def.icon" :size="18" />
              <span class="label">{{ s.def.name }} Lv.{{ s.lv }}</span>
            </span>
            <span v-if="defenses.length + specials.length === 0" class="px-tiny px-dim">升级时可以获得防线设施</span>
          </div>
        </div>

        <div class="group">
          <div class="gt"><PixelIcon glyph="book" :size="14" />被动强化</div>
          <div class="items">
            <span v-for="p in passives" :key="p.cfg.id" class="item" :title="p.cfg.desc">
              <PixelIcon :glyph="p.cfg.glyph" :size="18" />
              <span class="label">{{ p.cfg.name }} Lv.{{ p.lv }}</span>
            </span>
            <span v-if="passives.length === 0" class="px-tiny px-dim">被动强化可以解锁技能进化</span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.sanctum {
  position: absolute;
  right: 8px;
  bottom: 104px;
  width: min(420px, 46vw);
  max-height: 46vh;
  overflow-y: auto;
  background: rgba(12, 16, 24, 0.92);
  border: 2px solid var(--line);
  box-shadow: 0 4px 0 #05070b;
  padding: 8px;
  z-index: 22;
  pointer-events: auto;
}
.tab-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.tab-title {
  color: var(--gold);
  font-size: 11px;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.gt {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: var(--text-dim);
  margin-bottom: 3px;
}
.items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid var(--line);
  background: #121722;
  padding: 2px 4px;
}
.label {
  font-size: 9px;
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
