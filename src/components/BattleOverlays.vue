<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from './PixelIcon.vue';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { runController } from '@/services/RunController';
import { HERO_MAP, RARITY_COLOR } from '@/data/heroes';
import { SKILL_MAP, describeSkillLevel } from '@/data/skills';
import { formatNumber, formatTime } from '@/utils/format';
import type { AutoPickStrategy } from '@/types/game';
import { ACHIEVEMENT_MAP } from '@/data/achievements';

const ui = useUiStore();
const settings = useSettingsStore();

const STRATEGIES: { key: AutoPickStrategy; name: string; desc: string }[] = [
  { key: 'manual', name: '手动选择', desc: '每次升级由玩家决定' },
  { key: 'dps', name: '输出优先', desc: '偏向攻击、暴击与技能强化' },
  { key: 'survival', name: '生存优先', desc: '偏向生命、防御与防线设施' },
  { key: 'summon', name: '召唤优先', desc: '偏向召唤物与炮台强化' },
  { key: 'balanced', name: '均衡模式', desc: '均衡提升各方面能力' },
  { key: 'custom', name: '自定义优先级', desc: '按自定义顺序评分' },
];

const PRIORITY_NAMES: Record<string, string> = { dps: '输出', survival: '生存', summon: '召唤', economy: '经济' };
const PRIORITY_KEYS = ['dps', 'survival', 'summon', 'economy'];

const hero = computed(() => {
  const list = ui.hud?.heroes ?? [];
  return list.find((h) => h.uid === ui.heroDetailUid) ?? null;
});
const cfg = computed(() => (hero.value ? HERO_MAP[hero.value.heroId] : null));
const result = computed(() => ui.lastResult);

function closeDetail() {
  ui.setHeroDetail(null);
}

function cycleSpeed() {
  const cur = ui.hud?.speed ?? 1;
  const next = cur === 1 ? 2 : cur === 2 ? 4 : 1;
  runController.setSpeed(next);
  settings.defaultSpeed = next;
}

function handleAutoArrange() {
  const scene = (window as unknown as { __battleScene?: { autoArrange: () => void } }).__battleScene;
  scene?.autoArrange();
}

function skillLine(id: string): string {
  const s = SKILL_MAP[id];
  return s ? describeSkillLevel(s, hero.value?.skills.find((x) => x.id === id)?.level ?? 1) : '';
}

function skillName(id: string): string {
  return SKILL_MAP[id]?.name ?? id;
}

function skillGlyph(id: string): string {
  return SKILL_MAP[id]?.glyph ?? 'star';
}

function setStrategy(key: string) {
  settings.autoPick = key as AutoPickStrategy;
  const scene = (window as unknown as { __battleScene?: { setAutoPick: (s: string, p: string[]) => void } }).__battleScene;
  scene?.setAutoPick(key, settings.customPriority);
  const label = STRATEGIES.find((s) => s.key === key)?.name ?? key;
  ui.pushToast(`自动升级：${label}`, '#8fd8ff');
  if (key !== 'manual') {
    ui.closeLevelUp();
    ui.showAutoPanel = false;
  }
}

function promote(index: number) {
  const arr = settings.customPriority.slice();
  if (index <= 0) return;
  const [item] = arr.splice(index, 1);
  arr.unshift(item);
  settings.customPriority = arr;
}

function resetPriority() {
  settings.customPriority = PRIORITY_KEYS.slice();
}

function backToMenu() {
  ui.setScreen('menu');
  ui.lastResult = null;
}

function goTalents() {
  ui.setScreen('talents');
  ui.lastResult = null;
}

function goHeroes() {
  ui.setScreen('heroes');
  ui.lastResult = null;
}

const savedHint = ref(false);
function saveNow() {
  void runController.saveCheckpoint();
  savedHint.value = true;
  ui.pushToast('已保存战斗检查点', '#ffd24a');
}
</script>

<template>
  <!-- 暂停菜单 -->
  <div v-if="ui.showPauseMenu" class="modal-mask">
    <div class="dialog px-panel">
      <div class="px-title">暂停</div>
      <div class="row wrap" style="gap: 8px">
        <button class="px-btn" @click="runController.setPaused(false); ui.showPauseMenu = false">继续战斗</button>
        <button class="px-btn" @click="cycleSpeed">倍速 ×{{ ui.hud?.speed ?? 1 }}</button>
        <button class="px-btn" @click="handleAutoArrange">自动布阵</button>
        <button class="px-btn" @click="ui.showAutoPanel = true">自动升级策略</button>
        <button class="px-btn gold" @click="saveNow">保存进度</button>
        <button class="px-btn danger" @click="runController.abandon()">保存并退出</button>
      </div>
      <div class="px-tiny px-dim">暂停时战斗完全停止，可以重新安排站位与策略。</div>
      <div class="px-tiny px-dim">快捷键：空格暂停 · 数字键选择升级卡片 · F 切换倍速</div>
    </div>
  </div>

  <!-- 英雄详情 -->
  <div v-if="hero && cfg" class="modal-mask" @click.self="closeDetail">
    <div class="dialog px-panel">
      <div class="row">
        <PixelIcon :glyph="cfg.spriteKey" :size="44" :tint="cfg.palette.accent" />
        <div class="col" style="gap: 2px">
          <div class="px-title" :style="{ color: RARITY_COLOR[cfg.rarity] }">{{ cfg.name }}</div>
          <div class="px-tiny px-dim">
            {{ cfg.profession }} · {{ '★'.repeat(hero.star) }}{{ '☆'.repeat(5 - hero.star) }}
          </div>
        </div>
        <div class="spacer" />
        <button class="px-btn small" @click="closeDetail">关闭</button>
      </div>
      <div v-if="hero.star >= 5" class="awaken">{{ cfg.awakenDesc }}</div>
      <div class="stats">
        <div class="stat-row"><span>生命</span><b>{{ formatNumber(hero.hp) }} / {{ formatNumber(hero.maxHp) }}</b></div>
        <div class="stat-row"><span>护盾</span><b>{{ formatNumber(hero.shield) }}</b></div>
        <div class="stat-row"><span>累计伤害</span><b>{{ formatNumber(hero.damage) }}</b></div>
        <div class="stat-row"><span>状态</span><b>{{ hero.down ? `倒下（${Math.ceil(hero.downTimer)}s 后复活）` : '战斗中' }}</b></div>
        <div class="stat-row"><span>特性</span><b>{{ cfg.desc }}</b></div>
      </div>
      <div class="col" style="gap: 4px">
        <div class="px-small">技能</div>
        <div v-for="s in hero.skills" :key="s.id" class="skill-row">
          <PixelIcon :glyph="skillGlyph(s.id)" :size="22" />
          <div class="col" style="gap: 0">
            <div class="px-small">{{ skillName(s.id) }} <span class="px-tiny px-dim">Lv.{{ s.level }}</span></div>
            <div class="px-tiny px-dim">{{ skillLine(s.id) }}</div>
          </div>
          <div class="spacer" />
          <div class="cd px-tiny" :class="{ ready: s.cd <= 0.05 }">{{ s.cd <= 0.05 ? '就绪' : s.cd.toFixed(1) + 's' }}</div>
        </div>
      </div>
      <div class="px-tiny px-dim">提示：暂停时可以拖动英雄重新布阵。</div>
    </div>
  </div>

  <!-- 自动升级策略 -->
  <div v-if="ui.showAutoPanel" class="modal-mask" @click.self="ui.showAutoPanel = false">
    <div class="dialog px-panel">
      <div class="px-title">自动升级策略</div>
      <div class="col" style="gap: 4px">
        <label v-for="s in STRATEGIES" :key="s.key" class="strategy row">
          <input
            type="radio"
            :value="s.key"
            :checked="settings.autoPick === s.key"
            @change="setStrategy(s.key)"
          />
          <span>{{ s.name }}</span>
          <span class="px-tiny px-dim">{{ s.desc }}</span>
        </label>
      </div>
      <div v-if="settings.autoPick === 'custom'" class="col" style="gap: 5px">
        <div class="px-small">优先级顺序（点击前置）</div>
        <div class="row wrap">
          <button v-for="(p, i) in settings.customPriority" :key="p" class="px-btn small" @click="promote(i)">
            {{ i + 1 }}. {{ PRIORITY_NAMES[p] ?? p }}
          </button>
        </div>
        <button class="px-btn small" @click="resetPriority">重置顺序</button>
      </div>
      <button class="px-btn primary" @click="ui.showAutoPanel = false">完成</button>
    </div>
  </div>

  <!-- 战斗结果 -->
  <div v-if="ui.screen === 'result' && result" class="modal-mask">
    <div class="dialog result px-panel">
      <div class="px-title" :style="{ color: result.victory ? '#ffd24a' : '#ff6a6a' }">
        {{ result.victory ? '冒险成功！' : '防线被突破…' }}
      </div>
      <div v-if="result.newRecord" class="record">新纪录！</div>
      <div class="stats-grid">
        <div><span>抵达波次</span><b>{{ result.wave }}</b></div>
        <div><span>击杀数</span><b>{{ formatNumber(result.kills) }}</b></div>
        <div><span>总伤害</span><b>{{ formatNumber(result.totalDamage) }}</b></div>
        <div><span>最高单次伤害</span><b>{{ formatNumber(result.maxHit) }}</b></div>
        <div><span>队伍等级</span><b>{{ result.teamLevel }}</b></div>
        <div><span>冒险时长</span><b>{{ formatTime(result.time) }}</b></div>
        <div><span>本局金币</span><b>{{ formatNumber(result.goldEarned) }}</b></div>
        <div><span>永久金币</span><b class="gold">+{{ formatNumber(result.permGold) }}</b></div>
      </div>
      <div v-if="result.achievements.length" class="row wrap" style="gap: 4px">
        <span class="px-small">解锁成就：</span>
        <span v-for="a in result.achievements" :key="a" class="px-tag" style="color: var(--gold)">
          {{ ACHIEVEMENT_MAP[a]?.name ?? a }} +{{ ACHIEVEMENT_MAP[a]?.reward ?? 0 }}
        </span>
      </div>
      <div class="col" style="gap: 3px">
        <div class="px-small">英雄表现</div>
        <div v-for="h in result.heroes" :key="h.heroId" class="hr row">
          <PixelIcon :glyph="HERO_MAP[h.heroId]?.spriteKey ?? 'user'" :size="20" :tint="HERO_MAP[h.heroId]?.palette.accent" />
          <span class="px-small">{{ HERO_MAP[h.heroId]?.name }}</span>
          <span class="px-tiny px-dim">{{ '★'.repeat(h.star) }}</span>
          <div class="spacer" />
          <span class="px-tiny">{{ formatNumber(h.damage) }}</span>
        </div>
      </div>
      <div class="row wrap" style="gap: 8px">
        <button class="px-btn primary" @click="backToMenu">返回主菜单</button>
        <button class="px-btn gold" @click="goTalents">永久天赋</button>
        <button class="px-btn" @click="goHeroes">英雄图鉴</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog {
  min-width: min(560px, 94vw);
  max-width: min(760px, 94vw);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.result {
  animation: floatUp 0.24s;
}
.record {
  color: var(--legendary);
  animation: pulse 1s infinite;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 6px;
}
.stats-grid > div {
  display: flex;
  justify-content: space-between;
  border: 1px solid var(--line);
  padding: 5px 7px;
  background: #121722;
}
.stats-grid span {
  color: var(--text-dim);
  font-size: 10px;
}
.gold {
  color: var(--gold);
}
.hr {
  border: 1px solid #2a3348;
  padding: 3px 6px;
  background: #121722;
}
.awaken {
  border: 1px solid var(--legendary);
  padding: 6px 8px;
  color: var(--legendary);
  font-size: 10px;
  background: rgba(255, 200, 58, 0.08);
}
.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  border-bottom: 1px dashed #2a3348;
  padding: 4px 0;
}
.stat-row span {
  color: var(--text-dim);
}
.skill-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #2a3348;
  padding: 4px 6px;
  background: #121722;
}
.cd {
  color: #ff9a9a;
}
.cd.ready {
  color: #7aff9a;
}
.strategy {
  gap: 8px;
  padding: 5px;
  border: 1px solid #2a3348;
  cursor: pointer;
  background: #121722;
}
.strategy:hover {
  border-color: var(--line);
}
</style>
