<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import { useSettingsStore, type SettingsState } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { audio } from '@/game/managers/AudioManager';
import { gameManager } from '@/game/managers/GameManager';
import { runController } from '@/services/RunController';
import { STRATEGY_NAME } from '@/game/utils/autoPick';
import type { AutoPickStrategy } from '@/types/game';

const settings = useSettingsStore();
const ui = useUiStore();
const saved = ref(false);

onMounted(() => {
  audio.applyVolumes();
  gameManager.applySettings();
});

function markDirty() {
  saved.value = false;
}

async function save() {
  audio.applyVolumes();
  gameManager.applySettings();
  await runController.persist();
  saved.value = true;
  ui.pushToast('设置已保存', '#8fd8ff');
}

function reset() {
  const def: Partial<SettingsState> = {
    masterVolume: 0.8,
    musicVolume: 0.45,
    sfxVolume: 0.7,
    muted: false,
    screenShake: true,
    damageNumbers: true,
    lowEffects: false,
    showFps: false,
    autoPick: 'manual',
    defaultSpeed: 1,
    showGrid: false,
    confirmExit: true,
  };
  settings.hydrate(def);
  markDirty();
  audio.applyVolumes();
}

function testSfx() {
  audio.unlock();
  audio.playSe('levelup');
}

function testBgm() {
  audio.unlock();
  audio.playBgm('battle');
  setTimeout(() => audio.stopBgm(), 4000);
}

function toggleMode() {
  settings.autoPick = settings.autoPick === 'manual' ? 'dps' : 'manual';
}

function back() {
  ui.setScreen('menu');
}
</script>

<template>
  <div class="view">
    <div class="head row">
      <button class="px-btn small" @click="back">返回</button>
      <span class="px-title">设置</span>
      <span v-if="saved" class="px-tag" style="color: #7aff9a">已保存</span>
      <div class="spacer" />
      <button class="px-btn small" @click="testSfx">试听音效</button>
      <button class="px-btn small" @click="testBgm">试听 BGM</button>
      <button class="px-btn small" @click="reset">恢复默认</button>
      <button class="px-btn small primary" @click="save">保存</button>
    </div>

    <div class="grid scroll-y">
      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="raid" :size="14" />音量</div>
        <label class="ctl">
          <span>总音量</span>
          <input type="range" min="0" max="1" step="0.05" v-model.number="settings.masterVolume" @input="markDirty" />
          <b>{{ Math.round(settings.masterVolume * 100) }}%</b>
        </label>
        <label class="ctl">
          <span>BGM</span>
          <input type="range" min="0" max="1" step="0.05" v-model.number="settings.musicVolume" @input="markDirty" />
          <b>{{ Math.round(settings.musicVolume * 100) }}%</b>
        </label>
        <label class="ctl">
          <span>音效</span>
          <input type="range" min="0" max="1" step="0.05" v-model.number="settings.sfxVolume" @input="markDirty" />
          <b>{{ Math.round(settings.sfxVolume * 100) }}%</b>
        </label>
        <label class="ctl">
          <span>静音</span>
          <input type="checkbox" v-model="settings.muted" @change="markDirty" />
        </label>
      </div>

      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="star" :size="14" />画面</div>
        <label class="ctl">
          <span>屏幕震动</span>
          <input type="checkbox" v-model="settings.screenShake" @change="markDirty" />
        </label>
        <label class="ctl">
          <span>伤害数字</span>
          <input type="checkbox" v-model="settings.damageNumbers" @change="markDirty" />
        </label>
        <label class="ctl">
          <span>性能模式（减少特效）</span>
          <input type="checkbox" v-model="settings.lowEffects" @change="markDirty" />
        </label>
        <label class="ctl">
          <span>显示 FPS</span>
          <input type="checkbox" v-model="settings.showFps" @change="markDirty" />
        </label>
        <label class="ctl">
          <span>显示布阵参考线</span>
          <input type="checkbox" v-model="settings.showGrid" @change="markDirty" />
        </label>
        <div class="hint px-tiny px-dim">性能模式只降低粒子与伤害数字数量，不会减少实际怪物数量或改变战斗计算。</div>
      </div>

      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="sword" :size="14" />战斗</div>
        <label class="ctl">
          <span>默认倍速</span>
          <div class="row" style="gap: 4px">
            <button
              v-for="s in [1, 2, 4]"
              :key="s"
              class="px-btn small"
              :class="{ primary: settings.defaultSpeed === s }"
              @click="settings.defaultSpeed = s; markDirty()"
            >
              ×{{ s }}
            </button>
          </div>
        </label>
        <label class="ctl">
          <span>自动升级策略</span>
          <select v-model="settings.autoPick" @change="markDirty">
            <option v-for="(n, k) in STRATEGY_NAME" :key="k" :value="k">{{ n }}</option>
          </select>
        </label>
        <label class="ctl">
          <span>退出前确认</span>
          <input type="checkbox" v-model="settings.confirmExit" @change="markDirty" />
        </label>
      </div>

      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="clock" :size="14" />操作提示</div>
        <div class="key">空格 —— 暂停 / 继续</div>
        <div class="key">F —— 切换倍速（×1 / ×2 / ×4）</div>
        <div class="key">1 / 2 / 3 —— 选择升级卡片</div>
        <div class="key">H —— 打开冒险圣所面板</div>
        <div class="key">P —— 打开暂停菜单</div>
        <div class="key">鼠标拖动英雄 —— 重新布阵（暂停时更精确）</div>
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
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
  align-content: start;
  overflow-y: auto;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gt {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
  font-size: 11px;
}
.ctl {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
}
.ctl > span:first-child {
  width: 130px;
  color: var(--text-dim);
}
.ctl input[type='range'] {
  flex: 1;
  accent-color: #4aa8ff;
}
.ctl input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #4aa8ff;
}
.ctl select {
  background: #121722;
  color: var(--text);
  border: 2px solid var(--line);
  padding: 2px 5px;
  font-family: inherit;
  font-size: 10px;
}
.ctl b {
  width: 42px;
  text-align: right;
  color: var(--gold);
}
.hint,
.key {
  font-size: 9px;
  color: var(--text-dim);
  line-height: 1.6;
}
</style>
