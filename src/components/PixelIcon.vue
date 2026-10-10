<script setup lang="ts">
import { computed } from 'vue';
import { iconDataUrl } from '@/game/art/icons';
import { heroIdFromGlyph, heroPortraitUrl, isHeroGlyph } from '@/game/art/portrait';

const props = withDefaults(defineProps<{
  glyph: string;
  size?: number;
  tint?: string;
  awakened?: boolean;
}>(), { size: 28, awakened: false });

/** 以 hero_ 开头的 glyph 渲染英雄头像，其余渲染 12x12 像素图标 */
const src = computed(() =>
  isHeroGlyph(props.glyph)
    ? heroPortraitUrl(heroIdFromGlyph(props.glyph), props.size * 2, props.awakened)
    : iconDataUrl(props.glyph, props.size * 2, props.tint),
);
</script>

<template>
  <img
    class="pixel-icon"
    :src="src"
    :width="size"
    :height="size"
    :alt="glyph"
    draggable="false"
  />
</template>
