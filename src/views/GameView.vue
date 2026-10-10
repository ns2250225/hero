<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import GameHUD from '@/components/GameHUD.vue';
import BossHealthBar from '@/components/BossHealthBar.vue';
import LevelUpModal from '@/components/LevelUpModal.vue';
import EventModal from '@/components/EventModal.vue';
import BattleOverlays from '@/components/BattleOverlays.vue';
import RunSanctumPanel from '@/components/RunSanctumPanel.vue';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { gameManager } from '@/game/managers/GameManager';
import { runController } from '@/services/RunController';
import { audio } from '@/game/managers/AudioManager';

const ui = useUiStore();
const settings = useSettingsStore();
const container = ref<HTMLElement | null>(null);
const showSanctum = ref(false);

/**
 * HUD 舞台：与 Phaser 的 FIT 画布对齐。画布按 1280×720 等比缩放并居中，
 * HUD 使用同样的矩形，但缩放系数不低于 0.72，保证小屏手机上文字仍可读。
 */
const stageStyle = ref<Record<string, string>>({});
function layoutStage() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const s = Math.min(W / 1280, H / 720);
  const u = Math.max(s, Math.min(0.72, W / 900));
  const cw = 1280 * s;
  const ch = 720 * s;
  stageStyle.value = {
    width: `${cw / u}px`,
    height: `${ch / u}px`,
    transform: `translate(${(W - cw) / 2}px, ${(H - ch) / 2}px) scale(${u})`,
  };
}
onMounted(() => {
  layoutStage();
  window.addEventListener('resize', layoutStage);
  window.addEventListener('orientationchange', layoutStage);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', layoutStage);
  window.removeEventListener('orientationchange', layoutStage);
});

onMounted(() => {
  if (container.value) gameManager.mount(container.value);
  gameManager.applySettings();
});

onBeforeUnmount(() => {
  gameManager.destroy();
});

// 检查点请求 → 保存
watch(
  () => ui.checkpointRequest,
  () => {
    void runController.saveCheckpoint();
  },
);

// 暂停菜单快捷键
function onKey(e: KeyboardEvent) {
  if (ui.screen !== 'battle') return;
  if (e.code === 'Space') {
    e.preventDefault();
    const paused = !(ui.hud?.paused ?? false);
    runController.setPaused(paused);
    ui.showPauseMenu = paused;
  } else if (e.code === 'KeyF') {
    const cur = ui.hud?.speed ?? 1;
    const next = cur === 1 ? 2 : cur === 2 ? 4 : 1;
    runController.setSpeed(next);
    settings.defaultSpeed = next;
    ui.pushToast(`倍速 ×${next}`, '#8fd8ff');
  } else if (e.code === 'KeyH') {
    showSanctum.value = !showSanctum.value;
  } else if (e.code === 'KeyP') {
    ui.showPauseMenu = true;
    runController.setPaused(true);
  } else if (e.code.startsWith('Digit') && ui.levelUp.open) {
    const n = Number(e.code.replace('Digit', ''));
    const card = ui.levelUp.cards[n - 1];
    if (card) runController.chooseCard(card);
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

const speedLabel = computed(() => `×${ui.hud?.speed ?? 1}`);

function toggleSanctum() {
  showSanctum.value = !showSanctum.value;
  audio.playSe('click');
}
</script>

<template>
  <div class="battle-view">
    <div ref="container" class="game-canvas" />

    <div class="stage" :style="stageStyle">
    <GameHUD />
    <BossHealthBar />
    <RunSanctumPanel v-if="showSanctum" />

    <div class="side-buttons">
      <button class="px-btn small" :title="'冒险圣所 (H)'" @click="toggleSanctum">
        <span>圣所</span>
      </button>
      <button class="px-btn small" :title="'暂停 (空格)'" @click="ui.showPauseMenu = true; runController.setPaused(true)">
        <span>菜单</span>
      </button>
      <button class="px-btn small gold" :title="'倍速 (F)'" @click="() => { const c = ui.hud?.speed ?? 1; const n = c === 1 ? 2 : c === 2 ? 4 : 1; runController.setSpeed(n); settings.defaultSpeed = n; }">
        {{ speedLabel }}
      </button>
    </div>

    <!-- 波次警告 -->
    <transition name="fade">
      <div v-if="ui.waveWarning" class="warn">
        <div class="warn-text">⚠ BOSS 来袭 ⚠</div>
        <div class="warn-sub">第 {{ ui.waveWarning.wave }} 波</div>
      </div>
    </transition>

    <!-- Toast -->
    <div class="toasts">
      <transition-group name="toast">
        <div v-for="t in ui.toasts" :key="t.id" class="toast" :style="{ borderColor: t.color, color: t.color }">
          {{ t.text }}
        </div>
      </transition-group>
    </div>
    </div>

    <LevelUpModal />
    <EventModal />
    <BattleOverlays />

    <div class="loading" v-if="ui.loading">{{ ui.loading }}</div>
  </div>
</template>

<style scoped>
.battle-view {
  position: absolute;
  inset: 0;
  background: #05070b;
  overflow: hidden;
}
.game-canvas {
  position: absolute;
  inset: 0;
}
.stage {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  pointer-events: none;
  z-index: 20;
}
.side-buttons {
  pointer-events: auto;
}
.side-buttons {
  position: absolute;
  right: 8px;
  top: 42%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 25;
}
.warn {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 40;
  background: radial-gradient(circle, rgba(200, 20, 10, 0.25), transparent 65%);
  animation: pulse 0.6s infinite;
}
.warn-text {
  font-size: 28px;
  color: #ff5a5a;
  text-shadow: 3px 3px 0 #000, 0 0 22px rgba(255, 40, 20, 0.8);
}
.warn-sub {
  font-size: 12px;
  color: #ffd24a;
  margin-top: 8px;
}
.toasts {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 45;
  pointer-events: none;
  align-items: center;
}
.toast {
  background: rgba(10, 14, 20, 0.92);
  border: 2px solid var(--line);
  padding: 4px 10px;
  font-size: 10px;
  text-shadow: 1px 1px 0 #000;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 7, 11, 0.85);
  z-index: 60;
  font-size: 14px;
  color: var(--exp);
}
</style>
