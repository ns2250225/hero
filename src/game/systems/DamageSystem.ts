import Phaser from 'phaser';
import type { HeroStats, BonusBlock, Element } from '@/types/hero';

export interface DamageInput {
  amount: number;
  element: Element;
  crit?: boolean;
  sourceUid: number;
  attackPower: number;
}

export interface DamageResult {
  dealt: number;
  crit: boolean;
}

export function rollCrit(stats: HeroStats, bonus: BonusBlock): boolean {
  void bonus;
  return Math.random() < stats.critRate;
}

export function critMultiplier(stats: HeroStats): number {
  return stats.critDamage;
}

/** 元素伤害加成 */
export function elementBonus(element: Element, bonus: BonusBlock): number {
  switch (element) {
    case 'fire': return 1 + (bonus.fireDmg ?? 0);
    case 'ice': return 1 + (bonus.iceDmg ?? 0);
    case 'lightning': return 1 + (bonus.lightningDmg ?? 0);
    case 'poison': return 1 + (bonus.poisonDmg ?? 0);
    case 'holy': return 1 + (bonus.holyDmg ?? 0);
    case 'shadow': return 1 + (bonus.shadowDmg ?? 0);
    case 'physical': return 1 + (bonus.physicalDmg ?? 0);
    case 'summon': return 1 + (bonus.summonPower ?? 0);
    case 'mech': return 1 + (bonus.mechPower ?? 0);
    default: return 1;
  }
}

export function isDotElement(element: Element): boolean {
  return element === 'fire' || element === 'poison';
}

export function dotPower(bonus: BonusBlock): number {
  return 1 + (bonus.dotPower ?? 0);
}

/** 屏幕震动（可在设置中关闭） */
export class CameraShake {
  private scene: Phaser.Scene;
  enabled = true;
  intensity = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  shake(duration: number, amount: number): void {
    if (!this.enabled) return;
    this.scene.cameras.main.shake(duration, amount * this.intensity);
  }

  flash(duration: number, color: [number, number, number], alpha = 0.3): void {
    if (!this.enabled) return;
    this.scene.cameras.main.flash(duration, color[0], color[1], color[2], false);
    void alpha;
  }
}

/** 伤害数字颜色映射 */
export function elementDamageColor(element: Element, crit: boolean): 'normal' | 'crit' | 'ice' | 'poison' | 'fire' | 'lightning' | 'holy' | 'shadow' {
  if (crit) return 'crit';
  switch (element) {
    case 'fire': return 'fire';
    case 'ice': return 'ice';
    case 'poison': return 'poison';
    case 'lightning': return 'lightning';
    case 'holy': return 'holy';
    case 'shadow': return 'shadow';
    default: return 'normal';
  }
}

export function randomBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function chance(p: number): boolean {
  return Math.random() < p;
}
