<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/uiStore';

const ui = useUiStore();
const bar = computed(() => ui.bossBar);
const pct = computed(() => Math.max(0, Math.min(100, (bar.value.hp / Math.max(1, bar.value.maxHp)) * 100)));
</script>

<template>
  <transition name="fade">
    <div v-if="bar.visible" class="boss-bar">
      <div class="names">
        <span class="name">{{ bar.name }}</span>
        <span class="title">{{ bar.title }}</span>
        <span v-if="bar.shield" class="tag shield">护盾</span>
        <span v-if="bar.enraged" class="tag rage">狂暴</span>
      </div>
      <div class="px-bar big">
        <i
          :style="{
            width: pct + '%',
            background: bar.enraged
              ? 'linear-gradient(180deg,#ffb08a,#c02000)'
              : 'linear-gradient(180deg,#ff9a6a,#a02010)',
          }"
        />
      </div>
      <div class="hp-text">{{ Math.ceil(bar.hp) }} / {{ Math.ceil(bar.maxHp) }}</div>
    </div>
  </transition>
</template>

<style scoped>
.boss-bar {
  position: absolute;
  top: 46px;
  left: 50%;
  transform: translateX(-50%);
  width: min(640px, 78vw);
  z-index: 30;
  pointer-events: none;
  animation: floatUp 0.25s;
}
.names {
  display: flex;
  align-items: baseline;
  gap: 8px;
  justify-content: center;
  margin-bottom: 3px;
}
.name {
  font-size: 14px;
  color: #ff9a8a;
  text-shadow: 2px 2px 0 #000;
}
.title {
  font-size: 9px;
  color: var(--text-dim);
}
.tag {
  font-size: 8px;
  padding: 1px 4px;
  border: 1px solid currentColor;
}
.tag.shield {
  color: #8fd8ff;
}
.tag.rage {
  color: #ff5a3a;
  animation: pulse 0.8s infinite;
}
.big {
  height: 16px;
  border-color: #6a2a20;
  box-shadow: 0 0 10px rgba(255, 60, 40, 0.4);
}
.hp-text {
  text-align: center;
  font-size: 9px;
  color: var(--text-dim);
  margin-top: 2px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
