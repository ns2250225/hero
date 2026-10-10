import type { BonusBlock, BonusKey, HeroConfig, HeroInstance, HeroStats, StatKey } from '@/types/hero';
import { HERO_MAP, STAR_STAT_MULT, STAR_REQUIRE } from '@/data/heroes';
import { RELIC_MAP } from '@/data/relics';
import { activeSynergies } from '@/data/synergies';
import { TALENT_MAP } from '@/data/talents';
import type { PermanentData } from '@/stores/playerStore';
import { EQUIP_AFFIX_MAP, type EquippedMap } from './equipment';

export interface Mods {
  flat: Partial<Record<StatKey, number>>;
  pct: Partial<Record<StatKey, number>>;
  bonus: BonusBlock;
}

const FLAT_KEYS: StatKey[] = ['critRate', 'critDamage', 'dodgeRate', 'cooldownReduction', 'lifeSteal', 'blockCapacity'];
const PCT_KEYS: StatKey[] = ['maxHp', 'attack', 'defense', 'attackSpeed', 'attackRange', 'skillPower'];

export function emptyMods(): Mods {
  return { flat: {}, pct: {}, bonus: {} };
}

export function addFlat(m: Mods, stat: StatKey, v: number): void {
  m.flat[stat] = (m.flat[stat] ?? 0) + v;
}

export function addPct(m: Mods, stat: StatKey, v: number): void {
  m.pct[stat] = (m.pct[stat] ?? 0) + v;
}

export function addBonus(m: Mods, key: BonusKey, v: number): void {
  m.bonus[key] = (m.bonus[key] ?? 0) + v;
}

export function isFlatStat(stat: StatKey): boolean {
  return FLAT_KEYS.includes(stat);
}

/** 按属性本身的语义自动选择固定值或百分比 */
export function addAuto(m: Mods, stat: StatKey, v: number): void {
  if (isFlatStat(stat) || !PCT_KEYS.includes(stat)) addFlat(m, stat, v);
  else addPct(m, stat, v);
}

export function mergeMods(a: Mods, b: Mods): Mods {
  const out = emptyMods();
  for (const k of Object.keys(a.flat) as StatKey[]) addFlat(out, k, a.flat[k] ?? 0);
  for (const k of Object.keys(b.flat) as StatKey[]) addFlat(out, k, b.flat[k] ?? 0);
  for (const k of Object.keys(a.pct) as StatKey[]) addPct(out, k, a.pct[k] ?? 0);
  for (const k of Object.keys(b.pct) as StatKey[]) addPct(out, k, b.pct[k] ?? 0);
  for (const k of Object.keys(a.bonus) as BonusKey[]) addBonus(out, k, a.bonus[k] ?? 0);
  for (const k of Object.keys(b.bonus) as BonusKey[]) addBonus(out, k, b.bonus[k] ?? 0);
  return out;
}

const STAT_KEYS: StatKey[] = [
  'maxHp', 'attack', 'defense', 'attackSpeed', 'attackRange', 'critRate', 'critDamage',
  'dodgeRate', 'cooldownReduction', 'skillPower', 'lifeSteal', 'blockCapacity',
];

export function applyMods(base: HeroStats, mods: Mods): HeroStats {
  const out: HeroStats = { ...base };
  for (const k of STAT_KEYS) {
    const flat = mods.flat[k] ?? 0;
    const pct = mods.pct[k] ?? 0;
    (out[k] as number) = base[k] * (1 + pct) + flat;
  }
  out.maxHp = Math.max(10, Math.round(out.maxHp));
  out.attack = Math.max(1, out.attack);
  out.defense = Math.max(0, out.defense);
  out.attackSpeed = Math.max(0.15, Math.min(8, out.attackSpeed));
  out.attackRange = Math.max(80, out.attackRange);
  out.critRate = clamp01(out.critRate);
  out.critDamage = Math.max(1.1, out.critDamage);
  out.dodgeRate = Math.min(0.65, clamp01(out.dodgeRate));
  out.cooldownReduction = Math.min(0.8, clamp01(out.cooldownReduction));
  out.skillPower = Math.max(0.1, out.skillPower);
  out.lifeSteal = Math.min(0.6, clamp01(out.lifeSteal));
  out.blockCapacity = Math.max(0, Math.round(out.blockCapacity));
  return out;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function gatherTalentMods(p: PermanentData): Mods {
  const m = emptyMods();
  for (const [id, lv] of Object.entries(p.talents ?? {})) {
    if (!lv) continue;
    const t = TALENT_MAP[id];
    if (!t) continue;
    const amount = t.value * lv;
    if (t.stat) {
      if (t.isPct) addPct(m, t.stat, amount);
      else addFlat(m, t.stat, amount);
    } else if (t.bonus) {
      addBonus(m, t.bonus, amount);
    }
  }
  return m;
}

export function gatherRelicMods(relics: string[]): { mods: Mods; flags: Set<string>; baseHp: number; baseShield: number } {
  const mods = emptyMods();
  const flags = new Set<string>();
  let baseHp = 0;
  let baseShield = 0;
  for (const id of relics) {
    const r = RELIC_MAP[id];
    if (!r) continue;
    if (r.mods) {
      for (const k of Object.keys(r.mods) as StatKey[]) {
        const v = r.mods[k];
        if (v === undefined) continue;
        addAuto(mods, k, v);
      }
    }
    if (r.bonus) for (const k of Object.keys(r.bonus) as BonusKey[]) addBonus(mods, k, r.bonus[k] ?? 0);
    if (r.flag) flags.add(r.flag);
    baseHp += r.baseHp ?? 0;
    baseShield += r.baseShield ?? 0;
  }
  return { mods, flags, baseHp, baseShield };
}

export function gatherSynergyMods(heroIds: string[]): { mods: Mods; active: string[]; flags: Set<string> } {
  const mods = emptyMods();
  const flags = new Set<string>();
  const list = activeSynergies(heroIds);
  for (const s of list) {
    if (s.mods) {
      for (const k of Object.keys(s.mods) as StatKey[]) {
        const v = s.mods[k];
        if (v === undefined) continue;
        addAuto(mods, k, v);
      }
    }
    if (s.bonus) for (const k of Object.keys(s.bonus) as BonusKey[]) addBonus(mods, k, s.bonus[k] ?? 0);
    if (s.flag) flags.add(s.flag);
  }
  return { mods, active: list.map((s) => s.id), flags };
}

export function gatherEquipMods(equipped: EquippedMap): { mods: Mods; byHero: Record<string, Mods> } {
  const mods = emptyMods();
  const byHero: Record<string, Mods> = {};
  for (const [heroId, slots] of Object.entries(equipped ?? {})) {
    const hm = emptyMods();
    for (const item of Object.values(slots ?? {})) {
      if (!item) continue;
      for (const affix of item.affixes) {
        const cfg = EQUIP_AFFIX_MAP[affix.id];
        if (!cfg) continue;
        for (const target of [mods, hm]) {
          if (cfg.stat) {
            if (cfg.isPct) addPct(target, cfg.stat, affix.value);
            else addFlat(target, cfg.stat, affix.value);
          } else if (cfg.bonus) {
            addBonus(target, cfg.bonus, affix.value);
          }
        }
      }
    }
    byHero[heroId] = hm;
  }
  return { mods, byHero };
}

export interface ComputedHero {
  stats: HeroStats;
  bonus: BonusBlock;
}

/** 单个英雄的最终属性 = 基础 × 星级 × (全局加成 + 个人加成) */
export function computeHeroStats(inst: HeroInstance, globalMods: Mods): ComputedHero {
  const cfg = HERO_MAP[inst.heroId] ?? Object.values(HERO_MAP)[0];
  const base: HeroStats = { ...cfg.baseStats };
  const local: Mods = {
    flat: { ...(inst.mods?.flat ?? {}) },
    pct: { ...(inst.mods?.pct ?? {}) },
    bonus: { ...(inst.mods?.bonus ?? {}) },
  };
  const starMult = STAR_STAT_MULT[Math.min(5, Math.max(1, inst.star))];
  addPct(local, 'maxHp', starMult - 1);
  addPct(local, 'attack', (starMult - 1) * 0.85);
  addPct(local, 'defense', (starMult - 1) * 0.7);
  // 3 星起技能伤害提升
  if (inst.star >= 3) addPct(local, 'skillPower', 0.15 * (inst.star - 2));

  const merged = mergeMods(globalMods, local);
  const stats = applyMods(base, merged);
  // 觉醒额外阻挡
  if (inst.star >= 5) stats.blockCapacity += inst.heroId === 'paladin' ? 2 : 1;
  return { stats, bonus: merged.bonus };
}

/** 升星所需重复数量 */
export function starNeed(star: number): number {
  return STAR_REQUIRE[Math.min(5, Math.max(1, star))] || 0;
}

export function heroDisplayName(heroId: string): string {
  return HERO_MAP[heroId]?.name ?? heroId;
}

export function heroConfigOf(heroId: string): HeroConfig | undefined {
  return HERO_MAP[heroId];
}
