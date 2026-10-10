<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import HeroPortrait from '@/components/HeroPortrait.vue';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { HEROES } from '@/data/heroes';
import {
  ITEM_BASES, QUALITY_COLOR, QUALITY_NAME, QUALITY_TIER, SLOT_NAME,
  type EquipmentItem, type Quality, type Slot,
} from '@/data/equipment';
import { affixText, itemPower, sellValue, SLOTS, autoEquipBest, makeEquipment } from '@/game/utils/equipment';
import { Rng } from '@/game/utils/Random';
import { formatNumber } from '@/utils/format';
import { audio } from '@/game/managers/AudioManager';

const player = usePlayerStore();
const ui = useUiStore();
const selected = ref<string | null>(null);
const heroFilter = ref<string>(HEROES[0].id);
const qualityFilter = ref<Quality | 'all'>('all');
const slotFilter = ref<Slot | 'all'>('all');
const sortBy = ref<'power' | 'quality' | 'new'>('power');

const bag = computed(() => {
  let list = player.data.equipmentBag.slice();
  if (qualityFilter.value !== 'all') list = list.filter((i) => i.quality === qualityFilter.value);
  if (slotFilter.value !== 'all') {
    const ids = ITEM_BASES.filter((b) => b.slot === slotFilter.value).map((b) => b.id);
    list = list.filter((i) => ids.includes(i.baseId));
  }
  if (sortBy.value === 'power') list.sort((a, b) => itemPower(b) - itemPower(a));
  else if (sortBy.value === 'quality') list.sort((a, b) => QUALITY_TIER[b.quality] - QUALITY_TIER[a.quality]);
  return list;
});

const equipped = computed(() => player.data.equipped[heroFilter.value] ?? {});
const heroCfg = computed(() => HEROES.find((h) => h.id === heroFilter.value));

function baseName(item: EquipmentItem): string {
  return ITEM_BASES.find((b) => b.id === item.baseId)?.name ?? item.baseId;
}

function slotOf(item: EquipmentItem): Slot | null {
  return ITEM_BASES.find((b) => b.id === item.baseId)?.slot ?? null;
}

function iconOf(item: EquipmentItem): string {
  return ITEM_BASES.find((b) => b.id === item.baseId)?.icon ?? 'armor';
}

function equip(item: EquipmentItem) {
  const slot = slotOf(item);
  if (!slot) return;
  const cur = equipped.value[slot];
  player.equip(heroFilter.value, item);
  if (cur) player.data.equipmentBag.push({ ...cur, temp: false });
  player.data.equipmentBag = player.data.equipmentBag.filter((e) => e.uid !== item.uid);
  audio.playSe('drop');
  void persist();
}

function unequip(slot: Slot) {
  player.unequip(heroFilter.value, slot);
  audio.playSe('click');
  void persist();
}

function sell(item: EquipmentItem) {
  const v = sellValue(item);
  player.removeEquipment(item.uid);
  player.addGold(v);
  ui.pushToast(`分解获得 ${v} 永久金币`, '#ffd24a');
  audio.playSe('drop');
  void persist();
}

function sellAllWeak() {
  const weak = player.data.equipmentBag.filter((i) => QUALITY_TIER[i.quality] <= 1 && !i.temp);
  if (weak.length === 0) {
    ui.pushToast('没有可分解的低品质装备', '#ff5a5a');
    return;
  }
  let total = 0;
  for (const i of weak) {
    total += sellValue(i);
    player.removeEquipment(i.uid);
  }
  player.addGold(total);
  ui.pushToast(`分解 ${weak.length} 件装备，获得 ${total} 金币`, '#ffd24a');
  void persist();
}

function autoEquip() {
  const bagList = player.data.equipmentBag.slice();
  const res = autoEquipBest(bagList, player.data.equipped);
  player.data.equipped = res.equipped;
  const used = new Set<string>();
  for (const slots of Object.values(res.equipped)) {
    for (const it of Object.values(slots ?? {})) if (it) used.add(it.uid);
  }
  player.data.equipmentBag = player.data.equipmentBag.filter((i) => !used.has(i.uid));
  // 被替换下来的装备回到背包
  for (const r of res.replaced) if (!player.data.equipmentBag.some((x) => x.uid === r.uid)) player.data.equipmentBag.push(r);
  ui.pushToast('已自动装备全队最优装备', '#8fd8ff');
  void persist();
}

async function persist() {
  const { runController } = await import('@/services/RunController');
  await runController.persist();
}

/* ---------------- 永久装备锻造（PRD 13.4 / 18.1） ---------------- */
const FORGE_TIERS: { quality: Quality; cost: number; minWins: number }[] = [
  { quality: 'fine', cost: 150, minWins: 0 },
  { quality: 'rare', cost: 450, minWins: 0 },
  { quality: 'epic', cost: 1200, minWins: 1 },
  { quality: 'legendary', cost: 3200, minWins: 3 },
  { quality: 'mythic', cost: 8000, minWins: 6 },
];
const forgeSlot = ref<Slot>('weapon');
const forgeRng = new Rng(Date.now());

function forge(tier: (typeof FORGE_TIERS)[number]) {
  if (player.data.wins < tier.minWins) {
    ui.pushToast(`需要通关 ${tier.minWins} 次后解锁该品质锻造`, '#ff5a5a');
    return;
  }
  if (!player.spendGold(tier.cost)) {
    ui.pushToast('永久金币不足', '#ff5a5a');
    return;
  }
  const item = makeEquipment(forgeRng, { quality: tier.quality, slot: forgeSlot.value, level: 1 + player.data.wins });
  player.addEquipment(item);
  if (!player.data.seenEquipment.includes(item.baseId)) player.data.seenEquipment.push(item.baseId);
  selected.value = item.uid;
  audio.playSe('chest');
  ui.pushToast(`锻造成功：${QUALITY_NAME[item.quality]} ${baseName(item)}`, QUALITY_COLOR[item.quality]);
  void persist();
}

/* ---------------- 装备比较 ---------------- */
function compareText(item: EquipmentItem): { text: string; better: boolean } | null {
  const slot = slotOf(item);
  if (!slot) return null;
  const cur = equipped.value[slot];
  const delta = Math.round(itemPower(item) - (cur ? itemPower(cur) : 0));
  return { text: `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}`, better: delta >= 0 };
}

function back() {
  ui.setScreen('menu');
}
</script>

<template>
  <div class="view">
    <div class="head row">
      <button class="px-btn small" @click="back">返回</button>
      <span class="px-title">装备管理</span>
      <span class="px-tag">背包 {{ player.data.equipmentBag.length }}</span>
      <div class="spacer" />
      <button class="px-btn small" @click="autoEquip"><PixelIcon glyph="gear" :size="12" />自动装备</button>
      <button class="px-btn small danger" @click="sellAllWeak">分解低品质</button>
      <span class="row px-small"><PixelIcon glyph="coin" :size="14" /><b class="gold">{{ formatNumber(player.data.permGold) }}</b></span>
    </div>

    <div class="body">
      <!-- 英雄与已装备 -->
      <div class="px-panel hero-panel scroll-y">
        <div class="panel-title"><PixelIcon glyph="user" :size="14" />英雄</div>
        <div class="hero-list">
          <button
            v-for="h in HEROES"
            :key="h.id"
            class="hero-btn"
            :class="{ active: heroFilter === h.id, locked: !player.data.unlockedHeroes.includes(h.id) }"
            @click="heroFilter = h.id"
          >
            <HeroPortrait :hero-id="h.id" :star="player.data.heroStars[h.id] ?? 1" :size="34" />
            <span class="px-tiny">{{ h.name }}</span>
          </button>
        </div>
        <div class="panel-title" style="margin-top: 10px">
          <PixelIcon glyph="armor" :size="14" />{{ heroCfg?.name }} 的装备
        </div>
        <div class="slot-list">
          <div v-for="s in SLOTS" :key="s" class="slot">
            <span class="slot-name">{{ SLOT_NAME[s] }}</span>
            <div v-if="equipped[s]" class="equipped-item" :style="{ borderColor: QUALITY_COLOR[equipped[s]!.quality] }">
              <PixelIcon :glyph="iconOf(equipped[s]!)" :size="20" />
              <div class="col" style="gap: 0; flex: 1; min-width: 0">
                <span class="px-tiny" :style="{ color: QUALITY_COLOR[equipped[s]!.quality] }">
                  {{ baseName(equipped[s]!) }}
                </span>
                <span class="px-tiny px-dim">{{ equipped[s]!.affixes.map(affixText).join(' / ') }}</span>
              </div>
              <button class="px-btn small" @click="unequip(s)">卸下</button>
            </div>
            <span v-else class="px-tiny px-dim empty-slot">空</span>
          </div>
        </div>

        <div class="panel-title" style="margin-top: 10px">
          <PixelIcon glyph="gear" :size="14" />装备锻造
        </div>
        <div class="forge">
          <div class="row wrap" style="gap: 3px">
            <button
              v-for="s in SLOTS"
              :key="s"
              class="px-btn small"
              :class="{ primary: forgeSlot === s }"
              @click="forgeSlot = s"
            >
              {{ SLOT_NAME[s] }}
            </button>
          </div>
          <div class="forge-tiers">
            <button
              v-for="t in FORGE_TIERS"
              :key="t.quality"
              class="forge-btn"
              :style="{ borderColor: QUALITY_COLOR[t.quality] }"
              :disabled="player.data.wins < t.minWins || player.data.permGold < t.cost"
              @click="forge(t)"
            >
              <span :style="{ color: QUALITY_COLOR[t.quality] }">{{ QUALITY_NAME[t.quality] }}</span>
              <span class="px-tiny">{{ t.cost }} 金币</span>
              <span v-if="player.data.wins < t.minWins" class="px-tiny px-dim">通关 {{ t.minWins }} 次解锁</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 背包 -->
      <div class="px-panel bag-panel">
        <div class="panel-title row">
          <PixelIcon glyph="bag" :size="14" />背包
          <div class="spacer" />
          <select v-model="qualityFilter" class="px-select">
            <option value="all">全部品质</option>
            <option v-for="(n, q) in QUALITY_NAME" :key="q" :value="q">{{ n }}</option>
          </select>
          <select v-model="slotFilter" class="px-select">
            <option value="all">全部部位</option>
            <option v-for="(n, s) in SLOT_NAME" :key="s" :value="s">{{ n }}</option>
          </select>
          <select v-model="sortBy" class="px-select">
            <option value="power">按强度</option>
            <option value="quality">按品质</option>
            <option value="new">按顺序</option>
          </select>
        </div>
        <div class="bag-list scroll-y">
          <div v-if="bag.length === 0" class="px-small px-dim" style="padding: 12px">背包空空如也，去战斗里捡装备吧。</div>
          <button
            v-for="item in bag"
            :key="item.uid"
            class="bag-item"
            :class="{ active: selected === item.uid }"
            :style="{ borderColor: QUALITY_COLOR[item.quality] }"
            @click="selected = selected === item.uid ? null : item.uid"
          >
            <PixelIcon :glyph="iconOf(item)" :size="24" />
            <div class="col" style="gap: 1px; flex: 1; min-width: 0; align-items: flex-start">
              <span class="px-small" :style="{ color: QUALITY_COLOR[item.quality] }">
                {{ baseName(item) }}
                <span class="px-tiny px-dim">{{ QUALITY_NAME[item.quality] }}</span>
              </span>
              <span class="px-tiny px-dim affix-line">{{ item.affixes.map(affixText).join(' / ') }}</span>
              <span
                v-if="compareText(item)"
                class="px-tiny"
                :style="{ color: compareText(item)!.better ? '#7aff9a' : '#ff8a8a' }"
              >
                对比 {{ heroCfg?.name }} 当前{{ SLOT_NAME[slotOf(item)!] }}：{{ compareText(item)!.text }}
              </span>
            </div>
            <div class="col" style="gap: 3px">
              <button class="px-btn small primary" @click.stop="equip(item)">装备</button>
              <button class="px-btn small danger" @click.stop="sell(item)">{{ sellValue(item) }}💰</button>
            </div>
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
  grid-template-columns: 1fr 1.5fr;
  gap: 12px;
  min-height: 0;
}
@media (max-width: 860px) {
  .body {
    grid-template-columns: 1fr;
  }
}
.hero-panel,
.bag-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
  font-size: 10px;
  margin-bottom: 6px;
}
.hero-list {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.hero-btn {
  border: 2px solid #2f3a52;
  background: #131a26;
  padding: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.hero-btn.active {
  border-color: var(--gold);
  background: #1e2738;
}
.hero-btn.locked {
  opacity: 0.45;
}
.slot-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.slot {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #242d40;
  background: #121722;
  padding: 4px 6px;
  min-height: 34px;
}
.slot-name {
  font-size: 9px;
  color: var(--text-dim);
  width: 34px;
}
.empty-slot {
  opacity: 0.6;
}
.equipped-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  padding: 3px 5px;
  flex: 1;
  background: #161d2b;
}
.bag-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
}
.bag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid var(--line);
  background: #131a26;
  padding: 5px 7px;
  text-align: left;
}
.bag-item:hover {
  background: #1a2233;
}
.affix-line {
  line-height: 1.4;
  text-align: left;
  white-space: normal;
}
.px-select {
  background: #121722;
  color: var(--text);
  border: 2px solid var(--line);
  padding: 2px 4px;
  font-family: inherit;
  font-size: 9px;
}
.forge {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.forge-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 5px;
}
.forge-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: 2px solid var(--line);
  background: #131a26;
  padding: 5px;
  font-size: 10px;
  color: var(--text);
}
.forge-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.forge-btn:not(:disabled):hover {
  background: #1c2637;
}
.gold {
  color: var(--gold);
}
</style>
