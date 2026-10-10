<script setup lang="ts">
import { computed, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { runController } from '@/services/RunController';
import { MAPS } from '@/data/maps';
import { HEROES } from '@/data/heroes';
import { ACHIEVEMENTS } from '@/data/achievements';
import { formatNumber } from '@/utils/format';
import { audio } from '@/game/managers/AudioManager';
import { gameManager } from '@/game/managers/GameManager';

const player = usePlayerStore();
const ui = useUiStore();
const settings = useSettingsStore();
const hasSave = ref(false);

void runController.hasSave().then((v) => (hasSave.value = v));

const unlockedHeroCount = computed(() => player.data.unlockedHeroes.length);
const unlockedMapCount = computed(() => player.data.unlockedMaps.length);
const achievementCount = computed(() => Object.keys(player.data.achievements).length);
const winRate = computed(() => (player.data.runs ? Math.round((player.data.wins / player.data.runs) * 100) : 0));

function go(screen: typeof ui.screen) {
  audio.playSe('click');
  ui.setScreen(screen);
}

function newRun() {
  audio.playSe('click');
  ui.setScreen('select');
}

async function continueRun() {
  audio.playSe('click');
  const ok = await runController.continueRun();
  if (!ok) {
    ui.pushToast('没有可继续的冒险', '#ff5a5a');
    hasSave.value = false;
  }
}

function fullscreen() {
  gameManager.fullscreen();
}
</script>

<template>
  <div class="menu-view">
    <div class="bg" />
    <div class="content">
      <div class="hero-title">
        <div class="title">像素勇者</div>
        <div class="subtitle">无尽怪物潮 · PIXEL HEROES</div>
      </div>

      <div class="panel-row">
        <div class="px-panel actions">
          <button class="px-btn primary big" @click="newRun">
            <PixelIcon glyph="sword" :size="18" />开始冒险
          </button>
          <button class="px-btn big" :disabled="!hasSave" @click="continueRun">
            <PixelIcon glyph="flag" :size="18" />继续冒险
          </button>
          <div class="grid2">
            <button class="px-btn" @click="go('heroes')"><PixelIcon glyph="user" :size="14" />英雄图鉴</button>
            <button class="px-btn" @click="go('equipment')"><PixelIcon glyph="armor" :size="14" />装备管理</button>
            <button class="px-btn" @click="go('talents')"><PixelIcon glyph="star" :size="14" />天赋树</button>
            <button class="px-btn" @click="go('codex')"><PixelIcon glyph="book" :size="14" />图鉴</button>
            <button class="px-btn" @click="go('achievements')"><PixelIcon glyph="trophy" :size="14" />成就</button>
            <button class="px-btn" @click="go('settings')"><PixelIcon glyph="gear" :size="14" />设置</button>
            <button class="px-btn" @click="go('save')"><PixelIcon glyph="scroll" :size="14" />存档管理</button>
            <button class="px-btn" @click="fullscreen"><PixelIcon glyph="mirror" :size="14" />全屏</button>
          </div>
        </div>

        <div class="px-panel stats">
          <div class="row">
            <PixelIcon glyph="coin" :size="20" />
            <span class="gold-big">{{ formatNumber(player.data.permGold) }}</span>
            <span class="px-tiny px-dim">永久金币</span>
          </div>
          <div class="divider" />
          <div class="stat-line"><span>冒险次数</span><b>{{ player.data.runs }}</b></div>
          <div class="stat-line"><span>通关次数</span><b>{{ player.data.wins }}（{{ winRate }}%）</b></div>
          <div class="stat-line"><span>英雄解锁</span><b>{{ unlockedHeroCount }} / {{ HEROES.length }}</b></div>
          <div class="stat-line"><span>地图解锁</span><b>{{ unlockedMapCount }} / {{ MAPS.length }}</b></div>
          <div class="stat-line"><span>无尽最高波次</span><b>{{ player.data.bestWaveEndless }}</b></div>
          <div class="stat-line"><span>最高击杀</span><b>{{ formatNumber(player.data.bestKills) }}</b></div>
          <div class="stat-line"><span>最高单局伤害</span><b>{{ formatNumber(player.data.bestDamage) }}</b></div>
          <div class="stat-line"><span>成就</span><b>{{ achievementCount }} / {{ ACHIEVEMENTS.length }}</b></div>
        </div>
      </div>

      <div class="tips px-tiny px-dim">
        <span>提示：左键拖动英雄布阵 · 空格暂停 · 数字键 1/2/3 选择升级卡片 · H 打开圣所</span>
        <span v-if="settings.muted" class="muted">（已静音）</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-view {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 兜底：任何屏幕高度下都能滚动看到全部内容 */
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 0%, #2c3f66 0%, #131a28 55%, #070a10 100%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 2px, transparent 2px 4px);
}
.content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  max-width: 1080px;
  width: 92vw;
  max-height: 94vh;
}
.hero-title {
  text-align: center;
}
.title {
  font-size: clamp(26px, 5vw, 46px);
  color: var(--gold);
  text-shadow: 4px 4px 0 #000, 0 0 24px rgba(255, 210, 74, 0.35);
  letter-spacing: 4px;
}
.subtitle {
  margin-top: 8px;
  font-size: clamp(9px, 1.4vw, 12px);
  color: var(--text-dim);
  letter-spacing: 3px;
}
.panel-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 14px;
  width: 100%;
}
@media (max-width: 760px) and (min-height: 521px) {
  .panel-row {
    grid-template-columns: 1fr;
  }
}

/* 手机横屏等矮屏幕：压缩标题与间距，一屏放下全部菜单 */
@media (max-height: 520px) {
  .menu-view {
    align-items: flex-start;
  }
  .menu-view .content {
    gap: 8px;
    max-height: none;
    padding: 8px 0;
    margin: auto 0;
    width: 96vw;
  }
  .menu-view .title {
    font-size: 22px;
    letter-spacing: 2px;
    text-shadow: 3px 3px 0 #000;
  }
  .menu-view .subtitle {
    margin-top: 3px;
    font-size: 8px;
  }
  .menu-view .panel-row {
    grid-template-columns: 1.3fr 1fr;
    gap: 8px;
  }
  .menu-view .actions,
  .menu-view .stats {
    padding: 8px;
    gap: 5px;
  }
  .menu-view .big {
    padding: 8px;
    font-size: 12px;
  }
  .menu-view .grid2 {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  .menu-view .grid2 .px-btn {
    padding: 6px 4px;
    font-size: 9px;
  }
  .menu-view .gold-big {
    font-size: 14px;
  }
  .menu-view .divider {
    margin: 1px 0;
  }
  .menu-view .stat-line {
    font-size: 9px;
    padding: 1px 0;
  }
  .menu-view .tips {
    display: none;
  }
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.big {
  padding: 14px;
  font-size: 14px;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}
.stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gold-big {
  font-size: 18px;
  color: var(--gold);
  text-shadow: 2px 2px 0 #000;
}
.divider {
  height: 2px;
  background: var(--line);
  margin: 4px 0;
}
.stat-line {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  border-bottom: 1px dashed #262f42;
  padding: 3px 0;
}
.stat-line span {
  color: var(--text-dim);
}
.tips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.muted {
  color: #ff6a6a;
}
</style>
