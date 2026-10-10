<script setup lang="ts">
import { computed } from 'vue';
import PixelIcon from './PixelIcon.vue';
import { HERO_MAP, RARITY_COLOR, RARITY_NAME } from '@/data/heroes';

const props = withDefaults(defineProps<{
  heroId: string;
  star?: number;
  size?: number;
  showName?: boolean;
  dim?: boolean;
  badge?: string;
}>(), { star: 1, size: 44, showName: false, dim: false });

const cfg = computed(() => HERO_MAP[props.heroId]);
const accent = computed(() => cfg.value?.palette.accent ?? '#ffffff');
const border = computed(() => RARITY_COLOR[cfg.value?.rarity ?? 'common']);
const rarityText = computed(() => RARITY_NAME[cfg.value?.rarity ?? 'common']);
</script>

<template>
  <div class="hero-portrait" :style="{ width: size + 'px' }">
    <div class="frame" :style="{ width: size + 'px', height: size + 'px', borderColor: border, opacity: dim ? 0.45 : 1 }">
      <PixelIcon :glyph="cfg?.spriteKey ?? 'user'" :size="Math.round(size * 0.82)" :awakened="(star ?? 1) >= 5" />
      <span v-if="badge" class="badge">{{ badge }}</span>
    </div>
    <div v-if="showName" class="name" :style="{ color: border }">{{ cfg?.name }}</div>
    <div class="stars">
      <span v-for="i in 5" :key="i" :class="['star', i <= (star ?? 1) ? 'on' : '']">★</span>
    </div>
    <div v-if="showName" class="rarity px-tiny" :style="{ color: border }">{{ rarityText }}</div>
  </div>
</template>

<style scoped>
.hero-portrait {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.frame {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--line);
  background: radial-gradient(circle at 50% 35%, #2a3448 0%, #141a26 100%);
  position: relative;
  box-shadow: inset 0 0 0 1px #0d1119;
}
.badge {
  position: absolute;
  right: -3px;
  top: -3px;
  font-size: 8px;
  background: var(--gold);
  color: #1a1206;
  padding: 1px 3px;
  border: 1px solid #0a0a0a;
}
.name {
  font-size: 10px;
  text-shadow: 1px 1px 0 #000;
}
.stars {
  display: flex;
  gap: 1px;
  line-height: 1;
}
.star {
  font-size: 8px;
  color: #3d465c;
}
.star.on {
  color: var(--gold);
  text-shadow: 1px 1px 0 #000;
}
.rarity {
  opacity: 0.9;
}
</style>
