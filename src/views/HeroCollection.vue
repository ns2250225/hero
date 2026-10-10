<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import HeroPortrait from '@/components/HeroPortrait.vue';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { HEROES, RARITY_COLOR, RARITY_NAME, STAR_STAT_MULT } from '@/data/heroes';
import { SKILL_MAP, describeSkillLevel, PASSIVES, ELEMENT_NAME } from '@/data/skills';
import { SYNERGIES } from '@/data/synergies';
import { formatNumber } from '@/utils/format';
import { audio } from '@/game/managers/AudioManager';

const player = usePlayerStore();
const ui = useUiStore();
const detail = ref<string | null>(HEROES[0].id);
const filter = ref<'all' | 'owned' | 'locked'>('all');

const list = computed(() =>
  HEROES.filter((h) => {
    if (filter.value === 'owned') return player.data.unlockedHeroes.includes(h.id);
    if (filter.value === 'locked') return !player.data.unlockedHeroes.includes(h.id);
    return true;
  }),
);

const cfg = computed(() => HEROES.find((h) => h.id === detail.value) ?? HEROES[0]);
const owned = computed(() => player.data.unlockedHeroes.includes(cfg.value.id));
const star = computed(() => player.data.heroStars[cfg.value.id] ?? 1);

const relatedSynergies = computed(() => SYNERGIES.filter((s) => s.heroes.includes(cfg.value.id)));

function buy() {
  const ok = player.unlockHero(cfg.value.id);
  if (ok) {
    audio.playSe('recruit');
    ui.pushToast(`解锁了 ${cfg.value.name}`, '#8fd8ff');
    void import('@/services/RunController').then((m) => m.runController.persist());
  } else {
    ui.pushToast('永久金币不足', '#ff5a5a');
  }
}

function back() {
  ui.setScreen('menu');
}
</script>

<template>
  <div class="view">
    <div class="head row">
      <button class="px-btn small" @click="back">返回</button>
      <span class="px-title">英雄图鉴</span>
      <span class="px-tag">{{ player.data.unlockedHeroes.length }} / {{ HEROES.length }} 已解锁</span>
      <div class="spacer" />
      <div class="row" style="gap: 4px">
        <button class="px-btn small" :class="{ primary: filter === 'all' }" @click="filter = 'all'">全部</button>
        <button class="px-btn small" :class="{ primary: filter === 'owned' }" @click="filter = 'owned'">已解锁</button>
        <button class="px-btn small" :class="{ primary: filter === 'locked' }" @click="filter = 'locked'">未解锁</button>
      </div>
      <span class="row px-small"><PixelIcon glyph="coin" :size="14" /><b class="gold">{{ formatNumber(player.data.permGold) }}</b></span>
    </div>

    <div class="body">
      <div class="grid scroll-y">
        <button
          v-for="h in list"
          :key="h.id"
          class="cell"
          :class="{ active: detail === h.id, locked: !player.data.unlockedHeroes.includes(h.id) }"
          :style="{ borderColor: detail === h.id ? RARITY_COLOR[h.rarity] : undefined }"
          @click="detail = h.id"
        >
          <HeroPortrait
            :hero-id="h.id"
            :star="player.data.heroStars[h.id] ?? 1"
            :size="46"
            show-name
            :dim="!player.data.unlockedHeroes.includes(h.id)"
          />
          <div v-if="!player.data.unlockedHeroes.includes(h.id)" class="px-tiny px-dim">🔒 {{ h.unlockCost }}</div>
        </button>
      </div>

      <div class="px-panel detail scroll-y">
        <div class="row">
          <HeroPortrait :hero-id="cfg.id" :star="star" :size="64" />
          <div class="col" style="gap: 3px">
            <div class="px-title" :style="{ color: RARITY_COLOR[cfg.rarity] }">{{ cfg.name }}</div>
            <div class="px-small px-dim">{{ cfg.profession }} · {{ RARITY_NAME[cfg.rarity] }}</div>
            <div class="row px-tiny">
              <span class="px-tag">{{ cfg.attackType === 'melee' ? '近战' : cfg.attackType === 'ranged' ? '远程' : '魔法' }}</span>
              <span class="px-tag">{{ ELEMENT_NAME[cfg.element] ?? cfg.element }}</span>
              <span class="px-tag">射程 {{ cfg.attackRange }}</span>
            </div>
          </div>
        </div>

        <div class="desc">{{ cfg.desc }}</div>
        <div class="awaken">{{ cfg.awakenDesc }}</div>

        <div class="section-title">基础属性</div>
        <div class="stat-grid">
          <div><span>生命</span><b>{{ Math.round(cfg.baseStats.maxHp * STAR_STAT_MULT[star]) }}</b></div>
          <div><span>攻击</span><b>{{ Math.round(cfg.baseStats.attack * (1 + (STAR_STAT_MULT[star] - 1) * 0.85) * 10) / 10 }}</b></div>
          <div><span>防御</span><b>{{ Math.round(cfg.baseStats.defense * (1 + (STAR_STAT_MULT[star] - 1) * 0.7) * 10) / 10 }}</b></div>
          <div><span>攻速</span><b>{{ cfg.baseStats.attackSpeed.toFixed(2) }}/s</b></div>
          <div><span>暴击率</span><b>{{ Math.round(cfg.baseStats.critRate * 100) }}%</b></div>
          <div><span>阻挡</span><b>{{ cfg.baseStats.blockCapacity + (star >= 5 ? 1 : 0) }}</b></div>
        </div>

        <div class="section-title">技能</div>
        <div class="skill" v-for="sid in cfg.skills" :key="sid">
          <PixelIcon :glyph="SKILL_MAP[sid]?.glyph ?? 'star'" :size="22" />
          <div class="col" style="gap: 0">
            <div class="px-small">{{ SKILL_MAP[sid]?.name }}</div>
            <div class="px-tiny px-dim">{{ SKILL_MAP[sid]?.description }} · {{ SKILL_MAP[sid] ? describeSkillLevel(SKILL_MAP[sid], 1) : '' }}</div>
          </div>
        </div>

        <div class="section-title">相关羁绊</div>
        <div class="col" style="gap: 4px">
          <div v-for="s in relatedSynergies" :key="s.id" class="syn" :style="{ borderColor: s.color }">
            <span :style="{ color: s.color }">{{ s.name }}</span>
            <span class="px-tiny px-dim">{{ s.heroes.map((x) => HEROES.find((h) => h.id === x)?.name).join(' + ') }}</span>
            <span class="px-tiny">{{ s.desc }}</span>
          </div>
        </div>

        <div class="section-title">可学习被动</div>
        <div class="row wrap" style="gap: 4px">
          <span v-for="p in PASSIVES" :key="p.id" class="px-tag" :title="p.desc">{{ p.name }}</span>
        </div>

        <div class="foot row">
          <span v-if="owned" class="px-small" style="color: #7aff9a">已解锁 · 最高 {{ star }} 星</span>
          <span v-else class="px-small px-dim">解锁需要 {{ cfg.unlockCost }} 永久金币</span>
          <div class="spacer" />
          <button v-if="!owned" class="px-btn gold" :disabled="player.data.permGold < cfg.unlockCost" @click="buy">
            <PixelIcon glyph="coin" :size="14" />解锁
          </button>
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
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
  min-height: 0;
}
@media (max-width: 820px) {
  .body {
    grid-template-columns: 1fr;
  }
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 7px;
  align-content: start;
  overflow-y: auto;
  padding-right: 4px;
}
.cell {
  border: 2px solid #2f3a52;
  background: #131a26;
  padding: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cell:hover {
  border-color: var(--line);
}
.cell.active {
  background: #1c2637;
}
.cell.locked {
  opacity: 0.6;
}
.detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
.desc {
  font-size: 10px;
  color: var(--text);
  line-height: 1.6;
}
.awaken {
  border: 1px solid var(--legendary);
  color: var(--legendary);
  font-size: 10px;
  padding: 5px 7px;
  background: rgba(255, 200, 58, 0.08);
  line-height: 1.5;
}
.section-title {
  color: var(--gold);
  font-size: 10px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 3px;
  margin-top: 4px;
}
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.stat-grid > div {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  background: #121722;
  padding: 3px 6px;
  border: 1px solid #242d40;
}
.stat-grid span {
  color: var(--text-dim);
}
.skill {
  display: flex;
  gap: 7px;
  align-items: center;
  border: 1px solid #242d40;
  background: #121722;
  padding: 4px 6px;
}
.syn {
  border: 1px solid var(--line);
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #121722;
  font-size: 10px;
}
.gold {
  color: var(--gold);
}
</style>
