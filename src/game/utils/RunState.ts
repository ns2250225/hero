import type { BonusBlock, HeroInstance, StatKey } from '@/types/hero';
import type { BattleSave, GameMode, RunState, UpgradeCard, WaveProgress, ChallengeRule, DefenseId, SpecialEffectId, AutoPickStrategy } from '@/types/game';
import { HERO_MAP, STAR_REQUIRE, STAR_STAT_MULT } from '@/data/heroes';
import { SKILL_MAP } from '@/data/skills';
import { MAP_MAP, type MapConfig } from '@/data/maps';
import { buildWave } from '@/data/waves';
import { RELIC_MAP } from '@/data/relics';
import { Rng } from './Random';
import { BASE_DEPLOY_CAP, BASE_REFRESH, HARD_DEPLOY_CAP, LAYOUT, expForLevel } from './Balance';
import { addBonus, addFlat, addPct, emptyMods, type Mods } from './stats';
import type { PermanentData } from '@/stores/playerStore';
import { TALENT_MAP } from '@/data/talents';
import { PURPOSE_FOR_CARD } from './autoPick';

export const RUN_VERSION = 3;

export interface RunInitOptions {
  mode: GameMode;
  mapId: string;
  challengeRules: ChallengeRule[];
  starters: { heroId: string; x: number; y: number }[];
  perma: PermanentData;
  seed?: number;
}

export function createRun(o: RunInitOptions): RunState {
  const rng = new Rng(o.seed ?? `${Date.now()}-${Math.random()}`);
  const map = MAP_MAP[o.mapId] ?? MAP_MAP.greenField;

  // 永久天赋
  let deployCap = BASE_DEPLOY_CAP;
  let baseHp = 100;
  let startGold = 0;
  let refreshes = BASE_REFRESH;
  for (const [id, lv] of Object.entries(o.perma.talents)) {
    if (!lv) continue;
    const t = TALENT_MAP[id];
    if (!t) continue;
    if (t.special === 'deployCap') deployCap += t.value * lv;
    else if (t.special === 'baseHp') baseHp += t.value * lv;
    else if (t.special === 'startGold') startGold += t.value * lv;
    else if (t.special === 'refresh') refreshes += t.value * lv;
  }
  deployCap = Math.min(HARD_DEPLOY_CAP, deployCap);

  const rules = o.challengeRules;
  if (rules.includes('threeHeroes')) deployCap = Math.min(deployCap, 3);
  if (rules.includes('oneHp')) baseHp = 1;
  if (rules.includes('fastCooldown')) refreshes = refreshes;

  const maxWave = o.mode === 'endless' ? 0 : 20;

  const heroes: HeroInstance[] = [];
  let uid = 1;
  for (const s of o.starters.slice(0, deployCap)) {
    heroes.push(makeHeroInstance(s.heroId, s.x, s.y, uid++, 1));
  }

  const run: RunState = {
    version: RUN_VERSION,
    seed: rng.state,
    rngState: rng.state,
    mode: o.mode,
    mapId: map.id,
    challengeRules: rules,
    maxWave,
    wave: emptyWaveProgress(),
    elapsedTime: 0,
    baseHp: baseHp,
    baseMaxHp: baseHp,
    baseShield: 0,
    teamLevel: 1,
    teamExp: 0,
    gold: startGold,
    refreshes,
    deployCap,
    heroes,
    nextUid: uid,
    teamMods: emptyMods(),
    passives: {},
    relics: [],
    defenses: {},
    specials: {},
    pendingLevelUps: 0,
    autoPick: 'manual',
    customPriority: ['dps', 'survival', 'summon', 'economy'],
    stats: {
      kills: 0, totalDamage: 0, maxHit: 0, goldEarned: 0, elitesKilled: 0, bossesKilled: 0,
      heroesRecruited: heroes.length, evolutions: 0, breaches: 0, maxStar: 1, synergies: [], synergyFlags: [], equipmentFound: [],
    },
    enemies: [],
    killCounter: 0,
    eventsSeen: [],
    curses: [],
  };

  // 挑战模式调整
  if (rules.includes('fastCooldown')) {
    run.teamMods.pct.cooldownReduction = 0; // 冷却在战斗侧统一处理
  }
  return run;
}

export function emptyWaveProgress(): WaveProgress {
  return { wave: 1, phase: 'intermission', queue: [], queueIndex: 0, waveTime: 0, intermission: 3, bossSpawned: false, bossAlive: false };
}

export function makeHeroInstance(heroId: string, x: number, y: number, uid: number, star = 1): HeroInstance {
  const cfg = HERO_MAP[heroId];
  return {
    uid,
    heroId,
    star,
    dupes: 0,
    x,
    y,
    hp: cfg.baseStats.maxHp,
    shield: 0,
    downTimer: 0,
    reviveUsed: false,
    skills: cfg.skills[0] ? [{ id: cfg.skills[0], level: 1, cd: 0, evolved: false }] : [],
    mods: emptyMods(),
    damageDealt: 0,
  };
}

export function genWaveProgress(run: RunState, map: MapConfig, rng: Rng, extraCount = 1): WaveProgress {
  const w = buildWave({ wave: run.wave.wave, mode: run.mode, map, rand: () => rng.next(), extraCount });
  return w;
}

export function levelCost(level: number): number {
  return expForLevel(level);
}

/** bonus 为全部加成合并后的结果（天赋、遗物、羁绊、本局强化）；缺省时只用本局强化 */
export function addExp(run: RunState, amount: number, bonus: BonusBlock = run.teamMods.bonus): number {
  const gain = amount * (1 + (bonus.expGain ?? 0));
  run.teamExp += gain;
  let ups = 0;
  let guard = 0;
  while (run.teamExp >= levelCost(run.teamLevel) && guard < 50) {
    guard++;
    run.teamExp -= levelCost(run.teamLevel);
    run.teamLevel += 1;
    ups += 1;
  }
  run.pendingLevelUps += ups;
  return ups;
}

export function addGold(run: RunState, amount: number, bonus: BonusBlock = run.teamMods.bonus): number {
  const gain = Math.round(amount * (1 + (bonus.goldGain ?? 0)));
  run.gold += gain;
  run.stats.goldEarned += gain;
  return gain;
}

/** 应用升级卡片 */
export function applyCard(run: RunState, card: UpgradeCard, rng: Rng): { message: string; levelUpAgain: boolean } {
  const msg = (t: string) => ({ message: t, levelUpAgain: run.pendingLevelUps > 0 });
  switch (card.category) {
    case 'recruit': {
      const cfg = HERO_MAP[card.heroId!];
      if (!cfg) return msg('');
      if (run.heroes.length >= run.deployCap) return msg('部署已满');
      const pos = autoPlace(run, cfg.id);
      run.heroes.push(makeHeroInstance(cfg.id, pos.x, pos.y, run.nextUid++, 1));
      run.stats.heroesRecruited++;
      return msg(`招募了 ${cfg.name}`);
    }
    case 'replace': {
      const cfg = HERO_MAP[card.heroId!];
      if (!cfg) return msg('');
      const target = card.replaceUid != null ? run.heroes.find((h) => h.uid === card.replaceUid) : run.heroes[0];
      if (!target) {
        if (run.heroes.length >= run.deployCap) return msg('部署已满');
        const pos = autoPlace(run, cfg.id);
        run.heroes.push(makeHeroInstance(cfg.id, pos.x, pos.y, run.nextUid++, 2));
        return msg(`招募了 ${cfg.name}`);
      }
      const x = target.x;
      const y = target.y;
      // 换新 uid：战斗场景据此销毁旧英雄对象并创建新英雄
      target.uid = run.nextUid++;
      target.damageDealt = 0;
      target.heroId = cfg.id;
      target.star = 2;
      target.dupes = 0;
      target.hp = cfg.baseStats.maxHp * STAR_STAT_MULT[2];
      target.skills = [{ id: cfg.skills[0], level: 1, cd: 0, evolved: false }];
      target.mods = emptyMods();
      target.downTimer = 0;
      target.reviveUsed = false;
      target.x = x;
      target.y = y;
      run.stats.heroesRecruited++;
      return msg(`${cfg.name} 加入队伍（2 星）`);
    }
    case 'star': {
      const hero = run.heroes.find((h) => h.uid === card.heroUid);
      if (!hero) return msg('');
      if (hero.star >= 5) return msg('已满星');
      const need = STAR_REQUIRE[hero.star];
      hero.dupes += 1;
      if (hero.dupes >= need) {
        hero.dupes -= need;
        hero.star += 1;
        hero.hp = heroHpMax(run, hero);
        if (hero.star >= 5) {
          // 觉醒：解锁额外技能
          const cfg = HERO_MAP[hero.heroId];
          const extra = cfg.skills[1];
          if (extra && !hero.skills.some((s) => s.id === extra)) {
            hero.skills.push({ id: extra, level: 1, cd: 0, evolved: false });
          }
        }
        run.stats.maxStar = Math.max(run.stats.maxStar, hero.star);
        return msg(`${HERO_MAP[hero.heroId].name} 升至 ${hero.star} 星`);
      }
      return msg(`${HERO_MAP[hero.heroId].name} 升星进度 ${hero.dupes}/${need}`);
    }
    case 'heroStat': {
      const hero = run.heroes.find((h) => h.uid === card.heroUid);
      if (!hero || !card.stat) return msg('');
      if (card.stat === 'blockCapacity') addFlat(hero.mods, 'blockCapacity', Math.round(card.value ?? 1));
      else if (isFlatStat(card.stat)) addFlat(hero.mods, card.stat, card.value ?? 0);
      else addPct(hero.mods, card.stat, card.value ?? 0);
      if (card.stat === 'maxHp') hero.hp = heroHpMax(run, hero);
      return msg(`${HERO_MAP[hero.heroId].name} 获得强化`);
    }
    case 'skillLearn': {
      const hero = run.heroes.find((h) => h.uid === card.heroUid);
      if (!hero || !card.skillId) return msg('');
      if (hero.skills.some((s) => s.id === card.skillId)) return msg('已学会');
      if (hero.skills.length >= 4) return msg('技能栏已满');
      hero.skills.push({ id: card.skillId, level: 1, cd: 0, evolved: false });
      return msg(`${HERO_MAP[hero.heroId].name} 学会「${SKILL_MAP[card.skillId].name}」`);
    }
    case 'skillUp': {
      const hero = run.heroes.find((h) => h.uid === card.heroUid);
      if (!hero || !card.skillId) return msg('');
      const inst = hero.skills.find((s) => s.id === card.skillId);
      const cfg = SKILL_MAP[card.skillId];
      if (!inst || !cfg) return msg('');
      if (inst.level >= cfg.maxLevel) return msg('已满级');
      inst.level += 1;
      return msg(`「${cfg.name}」升至 Lv.${inst.level}`);
    }
    case 'evolve': {
      const hero = run.heroes.find((h) => h.uid === card.heroUid);
      if (!hero || !card.skillId) return msg('');
      const inst = hero.skills.find((s) => s.id === card.skillId);
      const cfg = SKILL_MAP[card.skillId];
      if (!inst || !cfg?.evolutionId) return msg('');
      const evo = SKILL_MAP[cfg.evolutionId];
      inst.id = evo.id;
      inst.level = 1;
      inst.evolved = true;
      inst.cd = 0;
      run.stats.evolutions += 1;
      return msg(`「${cfg.name}」进化为「${evo.name}」！`);
    }
    case 'passive': {
      if (!card.passiveId) return msg('');
      run.passives[card.passiveId] = (run.passives[card.passiveId] ?? 0) + 1;
      applyPassiveToTeam(run, card.passiveId);
      return msg('获得被动强化');
    }
    case 'team': {
      if (card.stat) {
        if (isFlatStat(card.stat)) addFlat(run.teamMods, card.stat, card.value ?? 0);
        else addPct(run.teamMods, card.stat, card.value ?? 0);
      } else if (card.effectId) {
        addBonus(run.teamMods, card.effectId as never, card.value ?? 0);
      }
      return msg('全队获得强化');
    }
    case 'summon':
    case 'special':
    case 'defense':
    case 'capacity':
    case 'economy':
      return applyEffectCard(run, card, rng);
    default:
      return msg('');
  }
}

function isFlatStat(stat: StatKey): boolean {
  return (
    stat === 'critRate' || stat === 'critDamage' || stat === 'dodgeRate' ||
    stat === 'cooldownReduction' || stat === 'lifeSteal' || stat === 'blockCapacity'
  );
}

function applyEffectCard(run: RunState, card: UpgradeCard, rng: Rng): { message: string; levelUpAgain: boolean } {
  const id = card.effectId;
  const out = (m: string) => ({ message: m, levelUpAgain: run.pendingLevelUps > 0 });
  if (!id) return out('');
  switch (card.category) {
    case 'summon': {
      addBonus(run.teamMods, id as never, card.value ?? 0);
      return out('召唤能力增强');
    }
    case 'defense': {
      if (id === 'baseHp') {
        const v = card.value ?? 15;
        run.baseMaxHp += v;
        run.baseHp = Math.min(run.baseMaxHp, run.baseHp + v);
        return out('基地得到加固');
      }
      if (id === 'lineShield') {
        const lv = (run.defenses.lineShield ?? 0) + 1;
        run.defenses.lineShield = lv;
        run.baseShield = 8 * lv;
        return out('防线获得护盾');
      }
      const did = id as DefenseId;
      run.defenses[did] = (run.defenses[did] ?? 0) + 1;
      return out('防线设施强化');
    }
    case 'special': {
      run.specials[id as SpecialEffectId] = (run.specials[id as SpecialEffectId] ?? 0) + 1;
      return out('获得特殊效果');
    }
    case 'capacity': {
      switch (id) {
        case 'deployCap': {
          run.deployCap = Math.min(HARD_DEPLOY_CAP, run.deployCap + (card.value ?? 1));
          return out(`部署上限提升至 ${run.deployCap}`);
        }
        case 'reviveNow': {
          for (const h of run.heroes) {
            if (h.downTimer > 0) {
              h.downTimer = 0;
              h.hp = heroHpMax(run, h) * 0.5;
            }
          }
          addBonus(run.teamMods, 'reviveSpeed', 0.2);
          return out('全体英雄复活');
        }
        case 'fullHeal': {
          for (const h of run.heroes) {
            h.hp = heroHpMax(run, h);
            h.shield = heroHpMax(run, h) * 0.3;
          }
          return out('全队恢复');
        }
        case 'refresh': {
          run.refreshes += card.value ?? 2;
          return out('获得额外刷新次数');
        }
      }
      return out('');
    }
    case 'economy': {
      switch (id) {
        case 'instantGold': {
          const g = Math.round(80 + run.wave.wave * 26 + run.teamLevel * 8);
          addGold(run, g);
          return out(`获得 ${g} 金币`);
        }
        case 'luck':
        case 'goldGain':
        case 'expGain': {
          addBonus(run.teamMods, id as never, card.value ?? 0);
          return out('经济强化');
        }
      }
      return out('');
    }
    default:
      return out('');
  }
}

/** 将被动强化应用到全队 */
export function applyPassiveToTeam(run: RunState, passiveId: string): void {
  const inst = run.passives[passiveId];
  if (!inst) return;
  const deltas = PASSIVE_DELTAS[passiveId];
  if (!deltas) return;
  for (const d of deltas) {
    if (d.stat) {
      if (d.flat) addFlat(run.teamMods, d.stat, d.value);
      else addPct(run.teamMods, d.stat, d.value);
    } else if (d.bonus) {
      addBonus(run.teamMods, d.bonus, d.value);
    }
  }
}

const PASSIVE_DELTAS: Record<string, { stat?: StatKey; bonus?: keyof BonusBlock; value: number; flat?: boolean }[]> = {
  p_area: [{ bonus: 'area', value: 0.1 }],
  p_haste: [{ stat: 'attackSpeed', value: 0.08 }],
  p_cooldown: [{ stat: 'cooldownReduction', value: 0.06, flat: true }],
  p_pierce: [{ bonus: 'pierce', value: 1, flat: true }],
  p_summon: [{ bonus: 'summonPower', value: 0.15 }],
  p_mech: [{ bonus: 'mechPower', value: 0.15 }],
  p_dot: [{ bonus: 'dotPower', value: 0.15 }, { bonus: 'duration', value: 0.08 }],
  p_vamp: [{ stat: 'lifeSteal', value: 0.03, flat: true }],
};

export function heroHpMax(run: RunState, hero: HeroInstance): number {
  const cfg = HERO_MAP[hero.heroId];
  const starMult = STAR_STAT_MULT[Math.min(5, Math.max(1, hero.star))];
  const pct = (run.teamMods.pct.maxHp ?? 0) + (hero.mods.pct.maxHp ?? 0) + (starMult - 1);
  const flat = (run.teamMods.flat.maxHp ?? 0) + (hero.mods.flat.maxHp ?? 0);
  return Math.round(cfg.baseStats.maxHp * (1 + pct) + flat);
}

/** 自动布阵：防御靠右、远程靠左（PRD 5.4） */
export function autoPlace(run: RunState, heroId: string): { x: number; y: number } {
  const cfg = HERO_MAP[heroId];
  const rowX = cfg.role === 'front' ? LAYOUT.frontRowX : cfg.role === 'mid' ? LAYOUT.midRowX : LAYOUT.backRowX;
  const occupied = run.heroes.map((h) => ({ x: h.x, y: h.y }));
  const candidates: { x: number; y: number }[] = [];
  // 4 行 × 5 列候选点，全部位于地面通道内（不会被底部 UI 遮挡）
  const rows = 4;
  const rowGap = (LAYOUT.laneBottom - LAYOUT.laneTop - 12) / (rows - 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 5; c++) {
      const x = rowX + (c - 2) * 18 + (r % 2) * 9;
      const y = LAYOUT.laneTop + 6 + r * rowGap;
      candidates.push({ x, y });
    }
  }
  let best = candidates[0];
  let bestD = -1;
  for (const c of candidates) {
    let minD = 1e9;
    for (const o of occupied) minD = Math.min(minD, Math.hypot(o.x - c.x, o.y - c.y));
    if (minD > bestD) {
      bestD = minD;
      best = c;
    }
  }
  return best;
}

export function serializeRun(run: RunState): BattleSave {
  return { version: RUN_VERSION, savedAt: Date.now(), run: JSON.parse(JSON.stringify(run)) };
}

export function deserializeRun(save: BattleSave): RunState | null {
  try {
    if (!save || typeof save !== 'object') return null;
    const run = save.run;
    if (!run || !Array.isArray(run.heroes)) return null;
    if (typeof run.wave?.wave !== 'number') return null;
    // 迁移：补齐缺失字段
    run.version = RUN_VERSION;
    run.specials ??= {};
    run.defenses ??= {};
    run.passives ??= {};
    run.relics ??= [];
    run.stats ??= { kills: 0, totalDamage: 0, maxHit: 0, goldEarned: 0, elitesKilled: 0, bossesKilled: 0, heroesRecruited: 0, evolutions: 0, breaches: 0, maxStar: 1, synergies: [], synergyFlags: [], equipmentFound: [] };
    run.stats.synergyFlags ??= [];
    run.teamMods ??= emptyMods();
    run.customPriority ??= ['dps', 'survival', 'summon', 'economy'];
    run.curses ??= [];
    run.eventsSeen ??= [];
    run.maxWave ??= run.mode === 'endless' ? 0 : 20;
    run.enemies ??= [];
    for (const h of run.heroes) {
      h.mods ??= emptyMods();
      h.skills ??= [];
      h.shield ??= 0;
      h.reviveUsed ??= false;
      h.damageDealt ??= 0;
      const cfg = HERO_MAP[h.heroId];
      if (!cfg) return null;
    }
    if (run.wave.phase === 'spawning' && (!run.wave.queue || run.wave.queue.length === 0)) {
      run.wave = emptyWaveProgress();
      run.wave.wave = Math.max(1, save.run.wave.wave);
      run.wave.intermission = 2;
    }
    return run as RunState;
  } catch {
    return null;
  }
}

export function relicIds(): string[] {
  return Object.keys(RELIC_MAP);
}

export function isMageHero(heroId: string): boolean {
  const cfg = HERO_MAP[heroId];
  return cfg?.element === 'fire' || cfg?.element === 'ice' || cfg?.element === 'lightning' || cfg?.element === 'shadow';
}

export { PURPOSE_FOR_CARD };

export type { AutoPickStrategy };
