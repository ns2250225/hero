import type { BonusBlock, StatKey } from '@/types/hero';

export interface SynergyConfig {
  id: string;
  name: string;
  heroes: string[];
  desc: string;
  color: string;
  mods?: Partial<Record<StatKey, number>>;
  bonus?: BonusBlock;
  /** 特殊效果标记 */
  flag?: 'fireLightning' | 'holyRegen' | 'steelWall' | 'summonRush' | 'poisonIgnite' | 'shadowSummon' | 'elementalBoost';
}

export const SYNERGIES: SynergyConfig[] = [
  {
    id: 'elemental', name: '元素共鸣', heroes: ['fireMage', 'frostMage'], color: '#9ad8ff',
    desc: '元素技能伤害 +25%，技能范围 +15%',
    mods: { skillPower: 0.25 }, bonus: { area: 0.15 }, flag: 'elementalBoost',
  },
  {
    id: 'thunderFire', name: '雷火爆发', heroes: ['fireMage', 'stormMage'], color: '#ffb02e',
    desc: '火焰伤害 +20%，爆炸时附加闪电弹射',
    bonus: { fireDmg: 0.2, lightningDmg: 0.2 }, flag: 'fireLightning',
  },
  {
    id: 'holyGuard', name: '神圣守护', heroes: ['knight', 'priest'], color: '#ffe86a',
    desc: '前排英雄每秒恢复最大生命 1.5%',
    flag: 'holyRegen',
  },
  {
    id: 'steelWall', name: '钢铁壁垒', heroes: ['knight', 'paladin'], color: '#9ad8ff',
    desc: '全队阻挡上限 +2，护盾效果 +50%',
    mods: { blockCapacity: 2 }, bonus: { shieldPeriodic: 0.5 }, flag: 'steelWall',
  },
  {
    id: 'mechLegion', name: '机械军团', heroes: ['mechanic', 'summoner'], color: '#80c0ff',
    desc: '召唤物攻速 +40%，召唤物数量 +1',
    bonus: { summonSpeed: 0.4, summonCount: 1 }, flag: 'summonRush',
  },
  {
    id: 'deadlyHunt', name: '致命猎杀', heroes: ['archer', 'assassin'], color: '#ff6a6a',
    desc: '全队暴击率 +15%，暴击伤害 +30%',
    mods: { critRate: 0.15, critDamage: 0.3 },
  },
  {
    id: 'venomHell', name: '剧毒炼狱', heroes: ['alchemist', 'fireMage'], color: '#9cff4a',
    desc: '火焰伤害会引爆毒素，持续伤害 +40%',
    bonus: { dotPower: 0.4, poisonDmg: 0.2 }, flag: 'poisonIgnite',
  },
  {
    id: 'shadowPact', name: '暗影契约', heroes: ['warlock', 'summoner'], color: '#c070ff',
    desc: '召唤物附加暗影伤害，召唤物伤害 +35%',
    bonus: { summonPower: 0.35, shadowDmg: 0.2 }, flag: 'shadowSummon',
  },
  {
    id: 'frostStorm', name: '霜雷共鸣', heroes: ['frostMage', 'stormMage'], color: '#a0e8ff',
    desc: '冰冻的敌人受到的雷电伤害 +30%',
    bonus: { iceDmg: 0.2, lightningDmg: 0.2 },
  },
  {
    id: 'alchemyMech', name: '炼金机械', heroes: ['alchemist', 'mechanic'], color: '#a0ff80',
    desc: '毒雾范围 +30%，炮台射程 +20%',
    bonus: { area: 0.3, mechPower: 0.2 },
  },
  {
    id: 'holyBlade', name: '圣剑同盟', heroes: ['paladin', 'assassin'], color: '#fff0a0',
    desc: '全队攻击力 +15%，对精英怪伤害 +25%',
    mods: { attack: 0.15 }, bonus: { eliteDmg: 0.25 },
  },
  {
    id: 'beastMaster', name: '荒野猎手', heroes: ['archer', 'mechanic'], color: '#c0e080',
    desc: '攻击速度 +18%，攻速加成对炮台同样生效',
    mods: { attackSpeed: 0.18 },
  },
];

export const SYNERGY_MAP: Record<string, SynergyConfig> = Object.fromEntries(SYNERGIES.map((s) => [s.id, s]));

export function activeSynergies(heroIds: string[]): SynergyConfig[] {
  const set = new Set(heroIds);
  return SYNERGIES.filter((s) => s.heroes.every((h) => set.has(h)));
}
