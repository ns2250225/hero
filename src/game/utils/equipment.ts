import type { AffixRoll, EquipmentItem, Quality, Slot } from '@/data/equipment';
import { AFFIXES, ITEM_BASES, QUALITY_AFFIX_COUNT, QUALITY_TIER, QUALITY_WEIGHTS } from '@/data/equipment';
import { Rng } from '../utils/Random';

export type EquippedMap = Record<string, Partial<Record<Slot, EquipmentItem>>>;
export type { EquipmentItem, AffixRoll, Quality, Slot };

export const EQUIP_AFFIX_MAP = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

export const SLOTS: Slot[] = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'accessory'];

export function rollQuality(rand: Rng, luck: number, floor?: Quality): Quality {
  const qualities = Object.keys(QUALITY_WEIGHTS) as Quality[];
  const items = qualities.filter((q) => (floor ? QUALITY_TIER[q] >= QUALITY_TIER[floor] : true));
  const q = rand.weighted(items, (x) => QUALITY_WEIGHTS[x] * (1 + luck * QUALITY_TIER[x] * 0.35));
  return q ?? 'common';
}

export function makeEquipment(rand: Rng, opts: { luck?: number; level?: number; quality?: Quality; slot?: Slot } = {}): EquipmentItem {
  const luck = opts.luck ?? 0;
  const quality = opts.quality ?? rollQuality(rand, luck);
  const bases = opts.slot ? ITEM_BASES.filter((b) => b.slot === opts.slot) : ITEM_BASES;
  const base = (rand.pick(bases) ?? ITEM_BASES[0])!;
  const tier = QUALITY_TIER[quality];
  const affixCount = QUALITY_AFFIX_COUNT[quality];

  // 从与部位相关的词条池中挑选，武器更容易出现攻击类
  const pool = AFFIXES.filter((a) => {
    if (base.slot === 'weapon') return a.id !== 'hpFlat' || rand.chance(0.2);
    if (base.slot === 'armor' || base.slot === 'helmet') return a.id !== 'summonCount' && a.id !== 'critLightning';
    return true;
  });
  const picked: AffixRoll[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (picked.length < affixCount && guard < 80) {
    guard++;
    const a = rand.pick(pool);
    if (!a || used.has(a.id)) continue;
    used.add(a.id);
    const rollBase = a.value + a.perTier * tier;
    const variance = 0.82 + rand.next() * 0.42;
    let value = rollBase * variance;
    if (a.perTier === 0 || a.value < 1) value = Math.max(0.01, value);
    picked.push({ id: a.id, value });
  }

  return {
    uid: `eq_${Math.floor(rand.next() * 1e12).toString(36)}${Date.now().toString(36).slice(-4)}`,
    baseId: base.id,
    quality,
    level: opts.level ?? 1,
    affixes: picked,
  };
}

export function itemPower(item: EquipmentItem): number {
  return item.affixes.reduce((sum, a) => sum + a.value * 100, 0) * (1 + QUALITY_TIER[item.quality] * 0.15);
}

export function affixText(roll: AffixRoll): string {
  const cfg = EQUIP_AFFIX_MAP[roll.id];
  if (!cfg) return '';
  if (cfg.id === 'critLightning' || cfg.id === 'shieldPeriodic' || cfg.id === 'projSplit') {
    return `${cfg.name}`;
  }
  const v = cfg.isPct || (cfg.perTier === 0 && cfg.value < 1) || cfg.value < 1 ? `${Math.round(roll.value * 100)}%` : `${Math.round(roll.value * 10) / 10}`;
  return `${cfg.name} +${v}`;
}

export function autoEquipBest(bag: EquipmentItem[], equipped: EquippedMap): { equipped: EquippedMap; replaced: EquipmentItem[] } {
  const out: EquippedMap = {};
  for (const [k, v] of Object.entries(equipped)) out[k] = { ...v };
  const replaced: EquipmentItem[] = [];
  for (const item of bag) {
    const base = ITEM_BASES.find((b) => b.id === item.baseId);
    if (!base) continue;
    const owners = Object.entries(out);
    let bestOwner: string | null = null;
    let bestDelta = 0;
    for (const [heroId, slots] of owners) {
      const current = slots[base.slot];
      const delta = itemPower(item) - (current ? itemPower(current) : 0);
      if (delta > bestDelta) {
        bestDelta = delta;
        bestOwner = heroId;
      }
    }
    if (bestOwner) {
      const slots = out[bestOwner]!;
      const cur = slots[base.slot];
      if (cur) replaced.push(cur);
      slots[base.slot] = item;
    }
  }
  return { equipped: out, replaced };
}

export function sellValue(item: EquipmentItem): number {
  return Math.round((8 + QUALITY_TIER[item.quality] * 14) * (1 + item.affixes.length * 0.25));
}
