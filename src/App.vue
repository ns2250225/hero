<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import MainMenu from './views/MainMenu.vue';
import HeroSelect from './views/HeroSelect.vue';
import GameView from './views/GameView.vue';
import HeroCollection from './views/HeroCollection.vue';
import EquipmentView from './views/EquipmentView.vue';
import TalentTree from './views/TalentTree.vue';
import CodexView from './views/CodexView.vue';
import AchievementsView from './views/AchievementsView.vue';
import SettingsView from './views/SettingsView.vue';
import SaveView from './views/SaveView.vue';
import PixelIcon from './components/PixelIcon.vue';
import { useUiStore } from './stores/uiStore';
import { usePlayerStore } from './stores/playerStore';
import { useSettingsStore } from './stores/settingsStore';
import { audio } from './game/managers/AudioManager';
import { runController } from './services/RunController';

const ui = useUiStore();
const player = usePlayerStore();
const settings = useSettingsStore();

const current = computed(() => {
  switch (ui.screen) {
    case 'select': return HeroSelect;
    case 'battle':
    case 'result':
      return GameView;
    case 'heroes': return HeroCollection;
    case 'equipment': return EquipmentView;
    case 'talents': return TalentTree;
    case 'codex': return CodexView;
    case 'achievements': return AchievementsView;
    case 'settings': return SettingsView;
    case 'save': return SaveView;
    default: return MainMenu;
  }
});

const portrait = ref(false);
const isMobile = ref(false);

function checkOrientation() {
  portrait.value = window.innerHeight > window.innerWidth * 1.05 && window.innerWidth < 900;
}

function unlockAudio() {
  audio.unlock();
  if (ui.screen !== 'battle' && !settings.muted) audio.playBgm('menu');
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    void runController.persist();
    if (ui.screen === 'battle') void runController.saveCheckpoint();
  }
}

onMounted(() => {
  isMobile.value = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  checkOrientation();
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  if (!settings.muted) audio.playBgm('menu');
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkOrientation);
  window.removeEventListener('orientationchange', checkOrientation);
  document.removeEventListener('visibilitychange', onVisibility);
});

watch(
  () => ui.screen,
  (s) => {
    if (s === 'battle') ui.showPauseMenu = false;
    // 结算页沿用战斗场景播放的胜利/失败音乐
    else if (s !== 'result' && !settings.muted) audio.playBgm('menu');
  },
);
</script>

<template>
  <div class="app-root">
    <component :is="current" v-if="player.loaded" />

    <div v-else class="boot">
      <div class="boot-text">加载中…</div>
    </div>

    <!-- 竖屏提示（PRD 24.1） -->
    <div v-if="portrait" class="rotate-hint">
      <div class="rotate-box px-panel">
        <PixelIcon glyph="refresh" :size="48" />
        <div class="px-title">请旋转设备</div>
        <div class="px-small px-dim">
          本游戏为横屏体验，请将设备横向放置以获得完整的战斗视野。
        </div>
        <div v-if="isMobile" class="px-tiny px-dim">
          如果浏览器不允许自动旋转，请手动开启横屏模式。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-root {
  position: absolute;
  inset: 0;
}
.boot {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.boot-text {
  color: var(--exp);
  font-size: 14px;
  animation: pulse 1.2s infinite;
}
.rotate-hint {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 11, 0.94);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.rotate-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 420px;
  text-align: center;
}
</style>
