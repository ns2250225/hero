import { defineStore } from 'pinia';
import { MAPS } from '@/data/maps';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '@/data/achievements';
import type { EquippedMap, EquipmentItem } from '@/game/utils/equipment';
import type { BattleResult, ChallengeRule, GameMode } from '@/types/game';
import { STARTER_HEROES, HEROES } from '@/data/heroes';
import { TALENT_MAP } from '@/data/talents';
import { RELICS } from '@/data/relics';

export interface PermanentData {
  version: number;
  permGold: number;
  totalGoldEarned: number;
  unlockedHeroes: string[];
  unlockedMaps: string[];
  unlockedRelics: string[];
  heroStars: Record<string, number>;
  talents: Record<string, number>;
  achievements: Record<string, number>;
  bestWave: Record<string, number>;
  bestWaveEndless: number;
  bestKills: number;
  bestDamage: number;
  bestTime: number;
  runs: number;
  wins: number;
  challengesWon: string[];
  equipmentBag: EquipmentItem[];
  equipped: EquippedMap;
  seenHeroes: string[];
  seenEnemies: string[];
  seenBosses: string[];
  seenRelics: string[];
  seenEquipment: string[];
  lastSeenAt: number;
  offlineClaimedAt: number;
  totalKills: number;
  settings?: Record<string, unknown>;
}

export function defaultPermanent(): PermanentData {
  return {
    version: 3,
    permGold: 0,
    totalGoldEarned: 0,
    unlockedHeroes: [...STARTER_HEROES],
    unlockedMaps: [MAPS[0].id],
    unlockedRelics: RELICS.filter((r) => r.unlockCost === 0).map((r) => r.id),
    heroStars: {},
    talents: {},
    achievements: {},
    bestWave: {},
    bestWaveEndless: 0,
    bestKills: 0,
    bestDamage: 0,
    bestTime: 0,
    runs: 0,
    wins: 0,
    challengesWon: [],
    equipmentBag: [],
    equipped: {},
    seenHeroes: [],
    seenEnemies: [],
    seenBosses: [],
    seenRelics: [],
    seenEquipment: [],
    lastSeenAt: Date.now(),
    offlineClaimedAt: 0,
    totalKills: 0,
  };
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    data: defaultPermanent() as PermanentData,
    loaded: false,
    lastResult: null as BattleResult | null,
  }),

  getters: {
    heroUnlocked: (s) => (id: string) => s.data.unlockedHeroes.includes(id),
    mapUnlocked: (s) => (id: string) => s.data.unlockedMaps.includes(id),
    selectedMap: (s) => s.data.unlockedMaps[s.data.unlockedMaps.length - 1] ?? MAPS[0].id,
    talentLevel: (s) => (id: string) => s.data.talents[id] ?? 0,
    achievementUnlocked: (s) => (id: string) => (s.data.achievements[id] ?? 0) > 0,
    heroPool: (s) => {
      const bonus = s.data.talents['t_heroPool'] ?? 0;
      const pool = [...STARTER_HEROES];
      for (const id of s.data.unlockedHeroes) if (!pool.includes(id)) pool.push(id);
      return pool.slice(0, Math.min(pool.length, 4 + bonus));
    },
    totalTalentPoints: (s) => Object.values(s.data.talents).reduce((a, b) => a + b, 0),
  },

  actions: {
    hydrate(data: PermanentData | null) {
      if (data) {
        this.data = { ...defaultPermanent(), ...data };
        // 数组字段兜底
        this.data.unlockedHeroes = data.unlockedHeroes?.length ? data.unlockedHeroes : [...STARTER_HEROES];
        this.data.unlockedMaps = data.unlockedMaps?.length ? data.unlockedMaps : [MAPS[0].id];
        this.data.equipmentBag = data.equipmentBag ?? [];
        this.data.equipped = data.equipped ?? {};
        this.data.talents = data.talents ?? {};
        this.data.achievements = data.achievements ?? {};
        this.data.bestWave = data.bestWave ?? {};
        this.data.challengesWon = data.challengesWon ?? [];
      }
      this.loaded = true;
    },

    addGold(amount: number) {
      this.data.permGold += amount;
      this.data.totalGoldEarned += Math.max(0, amount);
    },

    spendGold(amount: number): boolean {
      if (this.data.permGold < amount) return false;
      this.data.permGold -= amount;
      return true;
    },

    unlockHero(id: string): boolean {
      if (this.data.unlockedHeroes.includes(id)) return true;
      const cfg = HEROES.find((h) => h.id === id);
      if (!cfg) return false;
      if (!this.spendGold(cfg.unlockCost)) return false;
      this.data.unlockedHeroes.push(id);
      return true;
    },

    buyTalent(id: string): boolean {
      const t = TALENT_MAP[id];
      if (!t) return false;
      const lv = this.data.talents[id] ?? 0;
      if (lv >= t.maxLevel) return false;
      const cost = t.cost(lv);
      if (!this.spendGold(cost)) return false;
      this.data.talents[id] = lv + 1;
      return true;
    },

    resetTalents() {
      let refund = 0;
      for (const [id, lv] of Object.entries(this.data.talents)) {
        const t = TALENT_MAP[id];
        if (!t) continue;
        for (let i = 0; i < lv; i++) refund += t.cost(i);
      }
      this.data.talents = {};
      this.addGold(Math.round(refund * 0.8));
    },

    unlockMap(id: string, cost: number): boolean {
      if (this.data.unlockedMaps.includes(id)) return true;
      if (!this.spendGold(cost)) return false;
      this.data.unlockedMaps.push(id);
      return true;
    },

    unlockRelic(id: string): boolean {
      if (this.data.unlockedRelics.includes(id)) return true;
      const r = RELICS.find((x) => x.id === id);
      if (!r) return false;
      if (!this.spendGold(r.unlockCost)) return false;
      this.data.unlockedRelics.push(id);
      return true;
    },

    unlockAchievement(id: string): boolean {
      if (this.data.achievements[id]) return false;
      const a = ACHIEVEMENT_MAP[id];
      if (!a) return false;
      this.data.achievements[id] = Date.now();
      this.addGold(a.reward);
      return true;
    },

    checkAchievements(payload: {
      wave: number; mode: GameMode; kills: number; totalDamage: number; maxHit: number;
      time: number; victory: boolean; maxStar: number; heroCount: number; evolutions: number;
      synergies: number; bossesKilled: number; relics: number; equipment: number;
      breaches: number; teamLevel: number; challenge?: ChallengeRule[];
    }): string[] {
      const got: string[] = [];
      const d = this.data;
      const tryUnlock = (id: string, cond: boolean) => {
        if (cond && this.unlockAchievement(id)) got.push(id);
      };
      tryUnlock('firstBlood', payload.kills >= 1);
      // 本函数在 recordRun 之前调用，因此“完成一次冒险”恒为真
      tryUnlock('firstWin', true);
      tryUnlock('wave5', payload.wave >= 5);
      tryUnlock('wave10', payload.wave >= 10);
      tryUnlock('wave20', payload.victory && payload.mode === 'normal');
      tryUnlock('wave30', payload.wave >= 30);
      tryUnlock('wave50', payload.wave >= 50);
      tryUnlock('kills500', payload.kills >= 500);
      tryUnlock('kills2000', payload.kills >= 2000);
      tryUnlock('dmg100k', payload.totalDamage >= 100000);
      tryUnlock('dmg1m', payload.totalDamage >= 1000000);
      tryUnlock('star5', payload.maxStar >= 5);
      tryUnlock('fullTeam', payload.heroCount >= 6);
      tryUnlock('evolution', payload.evolutions >= 1);
      tryUnlock('allSynergy', payload.synergies >= 4);
      tryUnlock('noLoss', payload.victory && payload.breaches === 0);
      tryUnlock('speedrun', payload.victory && payload.time <= 480);
      tryUnlock('challengeWin', payload.victory && payload.mode === 'challenge');
      tryUnlock('bossHunter', payload.bossesKilled >= 3);
      tryUnlock('collector', d.unlockedHeroes.length >= 8);
      tryUnlock('richMan', d.totalGoldEarned >= 20000);
      tryUnlock('maxLevel', payload.teamLevel >= 40);
      tryUnlock('relicHunter', payload.relics >= 6);
      tryUnlock('equipMaster', payload.equipment >= 20);
      return got;
    },

    recordRun(result: BattleResult, unlockedAchievements: string[]) {
      const d = this.data;
      d.runs += 1;
      if (result.victory) d.wins += 1;
      d.totalKills += result.kills;
      d.bestKills = Math.max(d.bestKills, result.kills);
      d.bestDamage = Math.max(d.bestDamage, result.totalDamage);
      d.bestTime = Math.max(d.bestTime, result.time);
      if (result.mode === 'endless') d.bestWaveEndless = Math.max(d.bestWaveEndless, result.wave);
      else d.bestWave[result.mapId] = Math.max(d.bestWave[result.mapId] ?? 0, result.wave);
      if (result.newRecord) {
        // 记录已在上方更新
      }
      this.addGold(result.permGold);
      this.lastResult = { ...result, achievements: unlockedAchievements };

      // 记录英雄最高星级
      for (const h of result.heroes) {
        d.heroStars[h.heroId] = Math.max(d.heroStars[h.heroId] ?? 1, h.star);
        if (!d.seenHeroes.includes(h.heroId)) d.seenHeroes.push(h.heroId);
      }

      // 地图解锁
      for (const m of MAPS) {
        if (d.unlockedMaps.includes(m.id)) continue;
        if (m.order === 1) continue;
        const prev = MAPS.find((x) => x.order === m.order - 1);
        if (!prev) continue;
        if ((d.bestWave[prev.id] ?? 0) >= 20 || d.bestWaveEndless >= 20) d.unlockedMaps.push(m.id);
      }
      // 英雄解锁候选（累计金币足够时可在图鉴中购买，无需自动解锁）
    },

    addEquipment(item: EquipmentItem) {
      if (this.data.equipmentBag.length > 240) {
        this.data.equipmentBag.sort((a, b) => a.level - b.level);
        this.data.equipmentBag.shift();
      }
      this.data.equipmentBag.push({ ...item, temp: false });
    },

    removeEquipment(uid: string) {
      this.data.equipmentBag = this.data.equipmentBag.filter((e) => e.uid !== uid);
      for (const heroId of Object.keys(this.data.equipped)) {
        const slots = this.data.equipped[heroId];
        for (const slot of Object.keys(slots) as (keyof typeof slots)[]) {
          if (slots[slot]?.uid === uid) delete slots[slot];
        }
      }
    },

    equip(heroId: string, item: EquipmentItem) {
      const base = item.baseId;
      const slot = guessSlot(base);
      if (!slot) return;
      this.data.equipped[heroId] = this.data.equipped[heroId] ?? {};
      this.data.equipped[heroId][slot] = item;
      this.data.equipmentBag = this.data.equipmentBag.filter((e) => e.uid !== item.uid);
    },

    unequip(heroId: string, slot: keyof NonNullable<EquippedMap[string]>) {
      const hero = this.data.equipped[heroId];
      if (!hero || !hero[slot]) return;
      const item = hero[slot]!;
      delete hero[slot];
      this.data.equipmentBag.push({ ...item, temp: false });
    },

    touchSeen(kind: 'enemies' | 'bosses' | 'relics' | 'equipment' | 'heroes', ids: string[]) {
      const key = kind === 'equipment' ? 'seenEquipment' : kind === 'heroes' ? 'seenHeroes' : kind === 'enemies' ? 'seenEnemies' : kind === 'bosses' ? 'seenBosses' : 'seenRelics';
      const arr = this.data[key];
      for (const id of ids) if (!arr.includes(id)) arr.push(id);
    },

    resetAll() {
      this.data = defaultPermanent();
    },
  },
});

function guessSlot(baseId: string): 'weapon' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'accessory' | null {
  const map: Record<string, 'weapon' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'accessory'> = {};
  for (const b of ITEM_BASE_IMPORT) map[b.id] = b.slot;
  return map[baseId] ?? null;
}

import { ITEM_BASES as ITEM_BASE_IMPORT } from '@/data/equipment';

export { ACHIEVEMENTS };
