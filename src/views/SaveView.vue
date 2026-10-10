<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PixelIcon from '@/components/PixelIcon.vue';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { SaveService, OFFLINE_MAX_SECONDS } from '@/services/SaveService';
import { runController } from '@/services/RunController';
import { formatNumber, formatTime } from '@/utils/format';

const player = usePlayerStore();
const ui = useUiStore();
const importText = ref('');
const message = ref('');
const hasBattleSave = ref(false);
const busy = ref(false);

onMounted(async () => {
  hasBattleSave.value = await runController.hasSave();
});

async function exportSave() {
  busy.value = true;
  const text = await runController.exportSave();
  SaveService.download(`pixel-hordes-save-${new Date().toISOString().slice(0, 10)}.json`, text);
  message.value = '存档已导出为 JSON 文件';
  busy.value = false;
}

async function copySave() {
  const text = await runController.exportSave();
  try {
    await navigator.clipboard.writeText(text);
    message.value = '存档已复制到剪贴板';
  } catch {
    importText.value = text;
    message.value = '无法访问剪贴板，已填入下方文本框';
  }
}

async function doImport() {
  if (!importText.value.trim()) {
    message.value = '请先粘贴存档 JSON';
    return;
  }
  busy.value = true;
  const res = await runController.importSave(importText.value.trim());
  message.value = res.message;
  busy.value = false;
  if (res.ok) {
    ui.pushToast('存档导入成功', '#7aff9a');
    hasBattleSave.value = await runController.hasSave();
  } else {
    ui.pushToast(res.message, '#ff5a5a');
  }
}

async function resetEverything() {
  const ok = window.confirm('确定要重置全部存档吗？永久金币、英雄、天赋与成就都会被清除，此操作不可恢复。');
  if (!ok) return;
  busy.value = true;
  await runController.resetAll();
  message.value = '存档已重置';
  hasBattleSave.value = false;
  busy.value = false;
}

async function clearBattle() {
  await SaveService.clearBattle();
  hasBattleSave.value = false;
  message.value = '战斗检查点已清除';
}

function back() {
  ui.setScreen('menu');
}

const offlineHours = OFFLINE_MAX_SECONDS / 3600;
</script>

<template>
  <div class="view">
    <div class="head row">
      <button class="px-btn small" @click="back">返回</button>
      <span class="px-title">存档管理</span>
      <div class="spacer" />
      <span class="px-tag">存档版本 v{{ player.data.version }}</span>
    </div>

    <div class="grid">
      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="scroll" :size="14" />当前进度</div>
        <div class="line"><span>永久金币</span><b class="gold">{{ formatNumber(player.data.permGold) }}</b></div>
        <div class="line"><span>累计获得金币</span><b>{{ formatNumber(player.data.totalGoldEarned) }}</b></div>
        <div class="line"><span>冒险次数 / 通关</span><b>{{ player.data.runs }} / {{ player.data.wins }}</b></div>
        <div class="line"><span>累计击杀</span><b>{{ formatNumber(player.data.totalKills) }}</b></div>
        <div class="line"><span>无尽最高波次</span><b>{{ player.data.bestWaveEndless }}</b></div>
        <div class="line"><span>最长存活</span><b>{{ formatTime(player.data.bestTime) }}</b></div>
        <div class="line"><span>背包装备</span><b>{{ player.data.equipmentBag.length }}</b></div>
        <div class="line"><span>最近一次存档</span><b>{{ new Date(player.data.lastSeenAt).toLocaleString() }}</b></div>
      </div>

      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="refresh" :size="14" />导入 / 导出</div>
        <div class="row wrap" style="gap: 6px">
          <button class="px-btn small primary" :disabled="busy" @click="exportSave">导出 JSON 文件</button>
          <button class="px-btn small" :disabled="busy" @click="copySave">复制到剪贴板</button>
          <button class="px-btn small" :disabled="busy || !importText.trim()" @click="doImport">导入存档</button>
        </div>
        <textarea
          v-model="importText"
          class="ta"
          placeholder="在此粘贴存档 JSON，然后点击「导入存档」"
          spellcheck="false"
        />
        <div v-if="message" class="msg">{{ message }}</div>
        <div class="px-tiny px-dim">
          存档使用校验和验证，损坏的存档会被拒绝导入，不会影响现有进度。
        </div>
      </div>

      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="flag" :size="14" />战斗检查点</div>
        <div class="line"><span>状态</span><b>{{ hasBattleSave ? '存在未完成的冒险' : '无' }}</b></div>
        <div class="row wrap" style="gap: 6px">
          <button class="px-btn small primary" :disabled="!hasBattleSave" @click="runController.continueRun()">继续冒险</button>
          <button class="px-btn small danger" :disabled="!hasBattleSave" @click="clearBattle">清除检查点</button>
        </div>
        <div class="px-tiny px-dim">
          战斗中每 45 秒自动保存一次检查点，包含波次、英雄、技能、遗物、金币与场上怪物。
        </div>
      </div>

      <div class="px-panel group">
        <div class="gt"><PixelIcon glyph="clock" :size="14" />离线收益</div>
        <div class="line"><span>上限</span><b>{{ offlineHours }} 小时</b></div>
        <div class="line"><span>当前加成</span><b>+{{ Math.round((player.data.talents['t_offline'] ?? 0) * 25) }}%</b></div>
        <div class="px-tiny px-dim">
          离线收益只发放永久金币，不会在后台模拟战斗、不会自动推进关卡，也不会发放未完成 Boss 的奖励。
        </div>
      </div>

      <div class="px-panel group danger-zone">
        <div class="gt"><PixelIcon glyph="curse" :size="14" />危险操作</div>
        <button class="px-btn danger" :disabled="busy" @click="resetEverything">重置全部存档</button>
        <div class="px-tiny px-dim">重置后无法恢复，请先导出备份。</div>
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
}
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 10px;
  align-content: start;
  overflow-y: auto;
  padding-right: 4px;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gt {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
  font-size: 11px;
  margin-bottom: 2px;
}
.line {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  border-bottom: 1px dashed #262f42;
  padding: 3px 0;
}
.line span {
  color: var(--text-dim);
}
.ta {
  width: 100%;
  height: 110px;
  background: #0e131c;
  color: var(--text);
  border: 2px solid var(--line);
  font-family: monospace;
  font-size: 10px;
  padding: 6px;
  resize: vertical;
}
.msg {
  font-size: 10px;
  color: #8fd8ff;
}
.danger-zone {
  border-color: #7a3020;
}
.gold {
  color: var(--gold);
}
</style>
