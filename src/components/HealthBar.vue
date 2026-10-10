<script setup lang="ts">
import { computed } from 'vue';
import { STAR_STAT_MULT } from '@/data/heroes';

const props = defineProps<{
  hp: number;
  maxHp: number;
  shield?: number;
  width?: number;
  height?: number;
  showText?: boolean;
  color?: string;
}>();

const pct = computed(() => Math.max(0, Math.min(100, (props.hp / Math.max(1, props.maxHp)) * 100)));
const shieldPct = computed(() => Math.max(0, Math.min(100, ((props.shield ?? 0) / Math.max(1, props.maxHp)) * 100)));
const w = computed(() => props.width ?? 60);
const h = computed(() => props.height ?? 8);

const low = computed(() => pct.value < 30);
void STAR_STAT_MULT;
</script>

<template>
  <div class="hp-bar-wrap" :style="{ width: w + 'px' }">
    <div class="px-bar" :style="{ width: w + 'px', height: h + 'px' }">
      <i
        :style="{
          width: pct + '%',
          background: color ? color : low ? 'linear-gradient(180deg,#ff8a8a,#d02020)' : 'linear-gradient(180deg,#7aff9a,#28a04a)',
        }"
      />
    </div>
    <div v-if="shieldPct > 0" class="shield" :style="{ width: shieldPct + '%' }" />
    <span v-if="showText" class="hp-text">{{ Math.ceil(hp) }}/{{ maxHp }}</span>
  </div>
</template>

<style scoped>
.hp-bar-wrap {
  position: relative;
  display: inline-block;
}
.shield {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(180deg, rgba(143, 216, 255, 0.95), rgba(60, 140, 220, 0.9));
  mix-blend-mode: screen;
  pointer-events: none;
}
.hp-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  text-shadow: 1px 1px 0 #000;
}
</style>
