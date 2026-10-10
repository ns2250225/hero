import type { RandomEventId } from '@/types/game';

export interface EventDef {
  id: RandomEventId;
  title: string;
  desc: string;
  icon: string;
  /** 触发波次区间 */
  minWave: number;
  weight: number;
  /** 同一局最多出现次数 */
  maxPerRun: number;
}

export const EVENTS: EventDef[] = [
  { id: 'merchant', title: '神秘商人', desc: '一位披着斗篷的商人出现在战场边缘，愿意用本局金币换取力量。', icon: 'merchant', minWave: 3, weight: 18, maxPerRun: 4 },
  { id: 'blessing', title: '祝福祭坛', desc: '古老的祭坛散发着微光，选择一项祝福。', icon: 'altar', minWave: 2, weight: 22, maxPerRun: 6 },
  { id: 'curse', title: '诅咒祭坛', desc: '献祭一部分力量，换取更强大的能力。', icon: 'curse', minWave: 5, weight: 14, maxPerRun: 4 },
  { id: 'raid', title: '怪物突袭', desc: '远处的号角声响起，大量怪物正在赶来！', icon: 'raid', minWave: 4, weight: 16, maxPerRun: 5 },
  { id: 'chest', title: '幸运宝箱', desc: '战场上出现了一只无人看守的宝箱。', icon: 'chest', minWave: 3, weight: 18, maxPerRun: 6 },
  { id: 'rescue', title: '英雄救援', desc: '一名落难的英雄被怪物围困，救下他就能加入队伍。', icon: 'rescue', minWave: 4, weight: 15, maxPerRun: 5 },
];

export const EVENT_MAP: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export interface MerchantOffer {
  id: string;
  kind: 'equipment' | 'relic' | 'upgrade';
  title: string;
  desc: string;
  cost: number;
  icon: string;
  payload: { itemUid?: string; relicId?: string; effectId?: string; value?: number };
}

export interface ChestReward {
  kind: 'gold' | 'equipment' | 'relic' | 'skill' | 'heal';
  title: string;
  desc: string;
  icon: string;
  amount?: number;
  itemUid?: string;
  relicId?: string;
  skillId?: string;
}

export const BLESSINGS = [
  { id: 'b_atk', title: '战意祝福', desc: '全队攻击力 +20%', icon: 'sword' },
  { id: 'b_hp', title: '生命祝福', desc: '全队最大生命 +25% 并立刻回满', icon: 'heart' },
  { id: 'b_haste', title: '疾风祝福', desc: '全队攻击速度 +18%', icon: 'boot' },
  { id: 'b_crit', title: '猎杀祝福', desc: '全队暴击率 +12%，暴击伤害 +25%', icon: 'target' },
  { id: 'b_cd', title: '睿智祝福', desc: '全队冷却缩减 +12%', icon: 'hourglass' },
  { id: 'b_gold', title: '丰收祝福', desc: '金币收益 +50%，立刻获得 150 金币', icon: 'coin' },
  { id: 'b_base', title: '守护祝福', desc: '基地生命上限 +30 并恢复 30 点生命', icon: 'shield' },
  { id: 'b_lifesteal', title: '嗜血祝福', desc: '全队吸血 +8%', icon: 'fang' },
  { id: 'b_summon', title: '召唤祝福', desc: '召唤物数量 +1，召唤物伤害 +25%', icon: 'skull' },
  { id: 'b_shield', title: '护盾祝福', desc: '全队防御 +30%，技能范围 +15%', icon: 'armor' },
];

export const CURSES = [
  { id: 'c_doubleEdge', title: '血之契约', desc: '全队最大生命 -20%，全队攻击力 +45%', icon: 'blade' },
  { id: 'c_frenzy', title: '狂乱之誓', desc: '全队防御归零，攻击速度 +60%', icon: 'bolt' },
  { id: 'c_baseSoul', title: '献祭防线', desc: '基地生命上限 -15，全队获得 8% 吸血与 +25% 攻击', icon: 'shield' },
  { id: 'c_speed', title: '急速诅咒', desc: '怪物移动速度 +20%，全队技能冷却缩减 +25%', icon: 'hourglass' },
  { id: 'c_greed', title: '贪婪之罪', desc: '全队最大生命 -15%，金币收益 +150%', icon: 'coin' },
];

export const RESCUE_HEROES_FALLBACK = ['knight', 'archer', 'fireMage'];
