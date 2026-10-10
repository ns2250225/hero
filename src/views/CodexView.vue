<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import { useUiStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { ENEMIES } from '@/data/enemies';
import { BOSSES } from '@/data/bosses';
import { MAPS } from '@/data/maps';
import { RELICS, RELIC_RARITY_COLOR } from '@/data/relics';
import { SKILLS, ELEMENT_COLORS, describeSkillLevel } from '@/data/skills';
import { SYNERGIES } from '@/data/synergies';
import { AFFIXES } from '@/data/equipment';

const ui = useUiStore();
const player = usePlayerStore();
type Tab = 'enemy' | 'boss' | 'relic' | 'skill' | 'synergy' | 'map' | 'affix';
const tab = ref<Tab>('enemy');

const TABS: { key: Tab; name: string; icon: string }[] = [
  { key: 'enemy', name: '怪物', icon: 'skull' },
  { key: 'boss', name: 'Boss', icon: 'boss' },
  { key: 'relic', name: '遗物', icon: 'relic' },
  { key: 'skill', name: '技能', icon: 'star' },
  { key: 'synergy', name: '羁绊', icon: 'link' },
  { key: 'map', name: '地图', icon: 'map' },
  { key: 'affix', name: '装备词条', icon: 'armor' },
];

const enemies = computed(() => ENEMIES);
const bosses = computed(() => BOSSES);
const relics = computed(() => RELICS);
const skills = computed(() => SKILLS);
const synergies = computed(() => SYNERGIES);
const maps = computed(() => MAPS);
const affixes = computed(() => AFFIXES);

function seen(kind: 'enemies' | 'bosses' | 'relics' | 'equipment', id: string): boolean {
  const arr = kind === 'enemies' ? player.data.seenEnemies : kind === 'bosses' ? player.data.seenBosses : kind === 'relics' ? player.data.seenRelics : player.data.seenEquipment;
  return arr.includes(id);
}

function back() {
  ui.setScreen('menu');
}

function abilityText(list: string[]): string {
  const names: Record<string, string> = {
    shield: '正面减伤', charge: '周期性加速', explode: '靠近自爆', healer: '治疗周围',
    summoner: '召唤援军', flying: '飞行', split: '死亡分裂', stealth: '周期性隐身',
    giant: '巨型高血', ranged: '远程攻击', fast: '高速移动',
  };
  return list.map((a) => names[a] ?? a).join(' · ') || '无特殊能力';
}

function statLine(t: { stat?: string; bonus?: string; value: number; perTier: number }): string {
  const name = t.stat ?? t.bonus ?? '';
  return `${name} ${t.value >= 1 ? t.value.toFixed(0) : Math.round(t.value * 100) + '%'}（每品质 +${t.perTier})`;
}
</script>

<template>
  <div class="view">
    <div class="head row">
      <button class="px-btn small" @click="back">返回</button>
      <span class="px-title">图鉴</span>
      <div class="spacer" />
      <div class="row wrap" style="gap: 4px">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="px-btn small"
          :class="{ primary: tab === t.key }"
          @click="tab = t.key"
        >
          <PixelIcon :glyph="t.icon" :size="12" />{{ t.name }}
        </button>
      </div>
    </div>

    <div class="content scroll-y">
      <!-- 怪物 -->
      <div v-if="tab === 'enemy'" class="grid">
        <div v-for="e in enemies" :key="e.id" class="entry px-panel">
          <div class="row">
            <PixelIcon glyph="skull" :size="30" :tint="e.colors[0]" />
            <div class="col" style="gap: 1px">
              <span class="name">{{ e.name }} <span v-if="e.special" class="px-tag">特殊</span></span>
              <span class="px-tiny px-dim">{{ e.desc }}</span>
            </div>
          </div>
          <div class="stats">
            <span>生命 {{ e.maxHp }}</span>
            <span>攻击 {{ e.attack }}</span>
            <span>防御 {{ e.defense }}</span>
            <span>速度 {{ e.moveSpeed }}</span>
            <span>经验 {{ e.expReward }}</span>
            <span>金币 {{ e.goldReward }}</span>
          </div>
          <div class="px-tiny px-dim">能力：{{ abilityText(e.abilities) }}</div>
        </div>
      </div>

      <!-- Boss -->
      <div v-if="tab === 'boss'" class="grid">
        <div v-for="b in bosses" :key="b.id" class="entry px-panel boss-entry">
          <div class="row">
            <PixelIcon glyph="boss" :size="34" :tint="b.colors[0]" />
            <div class="col" style="gap: 1px">
              <span class="name">{{ b.name }}</span>
              <span class="px-tiny" :style="{ color: b.colors[2] }">{{ b.title }}</span>
            </div>
          </div>
          <div class="stats">
            <span>生命 {{ b.maxHp }}</span>
            <span>攻击 {{ b.attack }}</span>
            <span>防御 {{ b.defense }}</span>
            <span>速度 {{ b.moveSpeed }}</span>
          </div>
          <div class="px-tiny px-dim">{{ b.desc }}</div>
          <div class="px-tiny px-dim">技能：{{ b.skills.join(' / ') }}</div>
          <div class="px-tiny px-dim">召唤：{{ b.summonIds.join(' / ') }}</div>
        </div>
      </div>

      <!-- 遗物 -->
      <div v-if="tab === 'relic'" class="grid">
        <div v-for="r in relics" :key="r.id" class="entry px-panel" :style="{ borderColor: RELIC_RARITY_COLOR[r.rarity] }">
          <div class="row">
            <PixelIcon :glyph="r.icon" :size="28" :tint="RELIC_RARITY_COLOR[r.rarity]" />
            <div class="col" style="gap: 1px">
              <span class="name">{{ r.name }}</span>
              <span class="px-tiny px-dim">{{ r.desc }}</span>
            </div>
          </div>
          <div class="px-tiny" :style="{ color: RELIC_RARITY_COLOR[r.rarity] }">{{ r.rarity }} · 解锁 {{ r.unlockCost }} 金币</div>
        </div>
      </div>

      <!-- 技能 -->
      <div v-if="tab === 'skill'" class="grid">
        <div v-for="s in skills" :key="s.id" class="entry px-panel">
          <div class="row">
            <PixelIcon :glyph="s.glyph" :size="28" :tint="ELEMENT_COLORS[s.element]" />
            <div class="col" style="gap: 1px">
              <span class="name">
                {{ s.name }}
                <span v-if="s.isEvolution" class="px-tag" style="border-color: var(--legendary); color: var(--legendary)">进化</span>
              </span>
              <span class="px-tiny px-dim">{{ s.description }}</span>
            </div>
          </div>
          <div class="stats">
            <span>{{ s.type }}</span>
            <span>冷却 {{ s.cooldown }}s</span>
            <span>基础伤害 {{ Math.round(s.baseDamage * 100) }}%</span>
            <span v-if="s.projectileCount > 1">数量 {{ s.projectileCount }}</span>
          </div>
          <div class="px-tiny px-dim">Lv.1：{{ describeSkillLevel(s, 1) }}</div>
          <div class="px-tiny px-dim">Lv.{{ s.maxLevel }}：{{ describeSkillLevel(s, s.maxLevel) }}</div>
        </div>
      </div>

      <!-- 羁绊 -->
      <div v-if="tab === 'synergy'" class="grid">
        <div v-for="s in synergies" :key="s.id" class="entry px-panel" :style="{ borderColor: s.color }">
          <div class="row">
            <PixelIcon glyph="link" :size="26" :tint="s.color" />
            <span class="name" :style="{ color: s.color }">{{ s.name }}</span>
          </div>
          <div class="px-small">{{ s.desc }}</div>
          <div class="px-tiny px-dim">组合：{{ s.heroes.join(' + ') }}</div>
        </div>
      </div>

      <!-- 地图 -->
      <div v-if="tab === 'map'" class="grid">
        <div v-for="m in maps" :key="m.id" class="entry px-panel">
          <div class="row">
            <PixelIcon glyph="map" :size="26" :tint="m.layers.accent" />
            <span class="name">{{ m.name }}</span>
            <span v-if="!player.data.unlockedMaps.includes(m.id)" class="px-tag">未解锁</span>
          </div>
          <div class="px-tiny px-dim">{{ m.desc }}</div>
          <div class="stats">
            <span>生命 ×{{ m.hpMult }}</span>
            <span>速度 ×{{ m.speedMult }}</span>
            <span>数量 ×{{ m.countMult }}</span>
            <span>金币 ×{{ m.goldMult }}</span>
          </div>
          <div class="px-tiny px-dim">Boss：{{ m.bossIds.join(' → ') }} · 天气：{{ m.weather }}</div>
        </div>
      </div>

      <!-- 装备词条 -->
      <div v-if="tab === 'affix'" class="grid">
        <div v-for="a in affixes" :key="a.id" class="entry px-panel">
          <div class="row">
            <PixelIcon glyph="armor" :size="24" />
            <span class="name">{{ a.name }}</span>
          </div>
          <div class="px-tiny px-dim">{{ statLine(a) }}</div>
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
.content {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.entry {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.boss-entry {
  border-color: #7a3020;
}
.name {
  font-size: 11px;
}
.stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 9px;
  color: var(--text-dim);
}
</style>
