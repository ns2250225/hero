<script setup lang="ts">
import { computed } from 'vue';
import PixelIcon from './PixelIcon.vue';
import { useUiStore } from '@/stores/uiStore';
import { runController } from '@/services/RunController';

const ui = useUiStore();
const ev = computed(() => ui.eventModal);

function pick(optId: string) {
  runController.resolveEvent(optId);
}

function close() {
  runController.closeEvent();
}
</script>

<template>
  <div v-if="ev" class="modal-mask">
    <div class="dialog px-panel">
      <div class="head row">
        <PixelIcon :glyph="ev.eventId === 'merchant' ? 'merchant' : ev.eventId === 'blessing' ? 'altar' : ev.eventId === 'curse' ? 'curse' : ev.eventId === 'raid' ? 'raid' : ev.eventId === 'chest' ? 'chest' : 'rescue'" :size="34" />
        <div class="col" style="gap: 2px">
          <div class="px-title">{{ ev.title }}</div>
          <div class="px-tiny px-dim">{{ ev.desc }}</div>
        </div>
      </div>
      <div class="options">
        <button
          v-for="o in ev.options"
          :key="o.id"
          class="opt px-card"
          :class="{ disabled: o.disabled }"
          :disabled="o.disabled"
          @click="pick(o.id)"
        >
          <PixelIcon :glyph="o.icon" :size="26" />
          <div class="col" style="gap: 2px; align-items: flex-start">
            <span class="opt-title">{{ o.title }}</span>
            <span class="px-tiny px-dim">{{ o.desc }}</span>
          </div>
          <div class="spacer" />
          <span v-if="o.cost" class="cost" :class="{ poor: o.disabled }">
            <PixelIcon glyph="coin" :size="12" />{{ o.cost }}
          </span>
        </button>
      </div>
      <div class="row">
        <div class="px-tiny px-dim">
          {{ ev.multi ? '可以多次购买，离开时关闭窗口。' : '选择后事件立即生效。' }}
        </div>
        <div class="spacer" />
        <button class="px-btn small" @click="close">{{ ev.multi ? '离开' : '不选择' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog {
  min-width: min(520px, 94vw);
  max-width: min(680px, 94vw);
  max-height: 86vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: floatUp 0.2s;
}
.head {
  align-items: flex-start;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  width: 100%;
}
.opt.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.opt-title {
  font-size: 11px;
  color: var(--text);
}
.cost {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--gold);
  font-size: 10px;
}
.cost.poor {
  color: #ff6a6a;
}
</style>
