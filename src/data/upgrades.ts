import type { BonusKey, HeroInstance, StatKey } from '@/types/hero';
import type { CardCategory, CardRarity, DefenseId, GameMode, SpecialEffectId, UpgradeCard } from '@/types/game';
import { HEROES, HERO_MAP, MAGE_HEROES, STAR_REQUIRE } from './heroes';
import { SKILLS, SKILL_MAP, PASSIVES, PASSIVE_MAP } from './skills';

export const RARITY_WEIGHT: Record<CardRarity, number> = { common: 55, rare: 28, epic: 13, legendary: 4 };
export const RARITY_LABEL: Record<CardRarity, string> = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
export const RARITY_COLOR: Record<CardRarity, string> = {
  common: '#e6e6e6', rare: '#4aa8ff', epic: '#b76cff', legendary: '#ffc83a',
};

export const RARITY_MULT: Record<CardRarity, number> = { common: 1, rare: 1.6, epic: 2.4, legendary: 3.6 };

export interface CardContext {
  heroes: HeroInstance[];
  deployCap: number;
  passives: Record<string, number>;
  relics: string[];
  defenses: Partial<Record<DefenseId, number>>;
  specials: Partial<Record<SpecialEffectId, number>>;
  availableHeroes: string[];
  wave: number;
  luck: number;
  mode: GameMode;
  magesOnly: boolean;
  rand: () => number;
}

const TEAM_STATS: { stat: StatKey; name: string; pct: boolean; base: number; tag: string }[] = [
  { stat: 'attack', name: '攻击力', pct: true, base: 0.12, tag: 'dps' },
  { stat: 'maxHp', name: '最大生命', pct: true, base: 0.15, tag: 'survival' },
  { stat: 'defense', name: '防御力', pct: true, base: 0.18, tag: 'survival' },
  { stat: 'attackSpeed', name: '攻击速度', pct: true, base: 0.12, tag: 'dps' },
  { stat: 'critRate', name: '暴击率', pct: false, base: 0.06, tag: 'dps' },
  { stat: 'critDamage', name: '暴击伤害', pct: false, base: 0.18, tag: 'dps' },
  { stat: 'cooldownReduction', name: '冷却缩减', pct: false, base: 0.05, tag: 'dps' },
  { stat: 'attackRange', name: '攻击范围', pct: true, base: 0.1, tag: 'dps' },
  { stat: 'dodgeRate', name: '闪避率', pct: false, base: 0.04, tag: 'survival' },
  { stat: 'lifeSteal', name: '吸血', pct: false, base: 0.04, tag: 'survival' },
  { stat: 'skillPower', name: '技能伤害', pct: true, base: 0.12, tag: 'dps' },
  { stat: 'blockCapacity', name: '阻挡上限', pct: false, base: 1, tag: 'survival' },
];

const BONUS_CARDS: { bonus: BonusKey; name: string; base: number; tag: string }[] = [
  { bonus: 'area', name: '技能范围', base: 0.15, tag: 'dps' },
  { bonus: 'pierce', name: '投射物穿透', base: 1, tag: 'dps' },
  { bonus: 'duration', name: '效果持续时间', base: 0.15, tag: 'dps' },
  { bonus: 'fireDmg', name: '火焰伤害', base: 0.2, tag: 'dps' },
  { bonus: 'iceDmg', name: '冰霜伤害', base: 0.2, tag: 'dps' },
  { bonus: 'lightningDmg', name: '雷电伤害', base: 0.2, tag: 'dps' },
  { bonus: 'poisonDmg', name: '毒素伤害', base: 0.2, tag: 'dps' },
  { bonus: 'holyDmg', name: '神圣伤害', base: 0.2, tag: 'dps' },
  { bonus: 'shadowDmg', name: '暗影伤害', base: 0.2, tag: 'dps' },
];
const DEFENSE_DEFS: { id: DefenseId; name: string; desc: string; icon: string; rarity: CardRarity; maxLevel: number }[] = [
  { id: 'arrowTower', name: '自动箭塔', desc: '在防线旁建造箭塔，自动射击最靠近防线的敌人', icon: 'turret', rarity: 'rare', maxLevel: 8 },
  { id: 'lineShield', name: '防线护盾', desc: '基地获得可再生的护盾，抵挡突破伤害', icon: 'shield', rarity: 'rare', maxLevel: 6 },
  { id: 'autoRepair', name: '自动修复', desc: '每 12 秒恢复 1 点基地生命', icon: 'cross', rarity: 'epic', maxLevel: 6 },
  { id: 'lightning', name: '周期性雷击', desc: '每 8 秒降下雷电，对随机敌人造成伤害', icon: 'bolt', rarity: 'rare', maxLevel: 8 },
  { id: 'fireTrap', name: '火焰陷阱', desc: '在防线前生成燃烧区域，持续伤害路过的怪物', icon: 'fire', rarity: 'rare', maxLevel: 8 },
  { id: 'slowField', name: '减速领域', desc: '在防线前形成减速场，降低怪物移动速度', icon: 'snow', rarity: 'epic', maxLevel: 6 },
];

const SPECIAL_DEFS: { id: SpecialEffectId; name: string; desc: string; icon: string; rarity: CardRarity; maxLevel: number }[] = [
  { id: 'killExplode', name: '死亡爆炸', desc: '敌人被击杀时爆炸，对周围敌人造成伤害', icon: 'boom', rarity: 'epic', maxLevel: 5 },
  { id: 'critLightning', name: '暴击闪电', desc: '暴击时释放闪电伤害附近敌人', icon: 'bolt', rarity: 'epic', maxLevel: 5 },
  { id: 'splitShot', name: '分裂投射', desc: '投射物有概率分裂为两支', icon: 'mirror', rarity: 'epic', maxLevel: 5 },
  { id: 'executioner', name: '残忍处决', desc: '对生命值低于 35% 的敌人伤害提升', icon: 'blade', rarity: 'epic', maxLevel: 5 },
  { id: 'frostTouch', name: '霜之触碰', desc: '攻击有概率冰冻敌人', icon: 'snow', rarity: 'rare', maxLevel: 5 },
  { id: 'chainKill', name: '连锁击杀', desc: '连续击杀提升全队攻击力（最多 20 层）', icon: 'chain', rarity: 'legendary', maxLevel: 3 },
];

export const DEFENSE_DEF_MAP = Object.fromEntries(DEFENSE_DEFS.map((d) => [d.id, d]));
export const SPECIAL_DEF_MAP = Object.fromEntries(SPECIAL_DEFS.map((d) => [d.id, d]));

function pick<T>(arr: T[], rand: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rand() * arr.length) % arr.length];
}

/** 按稀有度权重挑选一张卡 */
export function pickCard(candidates: UpgradeCard[], luck: number, rand: () => number): UpgradeCard | undefined {
  if (candidates.length === 0) return undefined;
  const weights = candidates.map((c) => {
    const w = RARITY_WEIGHT[c.rarity];
    // 幸运提升高稀有度出现率
    const boost = c.rarity === 'legendary' ? 1 + luck : c.rarity === 'epic' ? 1 + luck * 0.6 : 1;
    return w * boost;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** 去除重复 key 的卡片选择 */
export function drawCards(ctx: CardContext, count: number, excludeKeys: Set<string> = new Set()): UpgradeCard[] {
  const pool = buildAllCards(ctx).filter((c) => !excludeKeys.has(c.key));
  const out: UpgradeCard[] = [];
  const usedKeys = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < 400) {
    guard++;
    const avail = pool.filter((c) => !usedKeys.has(c.key));
    const c = pickCard(avail, ctx.luck, ctx.rand);
    if (!c) break;
    usedKeys.add(c.key);
    out.push(c);
  }
  return out;
}

export function buildAllCards(ctx: CardContext): UpgradeCard[] {
  const cards: UpgradeCard[] = [];

  // ---------- 招募 ----------
  const teamIds = new Set(ctx.heroes.map((h) => h.heroId));
  const canDeploy = ctx.heroes.length < ctx.deployCap;
  const pool = ctx.availableHeroes.filter((id) => !teamIds.has(id) && (!ctx.magesOnly || MAGE_HEROES.includes(id)));
  if (canDeploy) {
    for (const id of pool) {
      const cfg = HERO_MAP[id];
      if (!cfg) continue;
      cards.push({
        key: `recruit:${id}`,
        category: 'recruit',
        rarity: cfg.rarity,
        title: `招募 ${cfg.name}`,
        desc: `${cfg.profession} · ${cfg.desc}`,
        icon: cfg.spriteKey,
        heroId: id,
        tags: cfg.tags.includes('tank') ? ['survival'] : cfg.tags.includes('summon') ? ['summon'] : ['dps'],
      });
    }
  }

  // ---------- 升星 ----------
  for (const h of ctx.heroes) {
    const cfg = HERO_MAP[h.heroId];
    if (!cfg || h.star >= 5) continue;
    const need = STAR_REQUIRE[h.star];
    const rarity: CardRarity = h.star >= 4 ? 'legendary' : h.star >= 2 ? 'epic' : 'rare';
    cards.push({
      key: `star:${h.heroId}`,
      category: 'star',
      rarity,
      title: `${cfg.name} 升星`,
      desc: need - h.dupes <= 1 ? `升至 ${h.star + 1} 星：${starEffect(h.star + 1)}` : `升星进度 +1（${h.dupes + 1}/${need}）`,
      icon: cfg.spriteKey,
      heroUid: h.uid,
      heroId: h.heroId,
      levelText: `${h.star}★ → ${h.star + 1}★`,
      tags: ['dps', 'survival'],
    });
  }
  // 满员时（PRD 9.5）：招募转为替换。替换目标为星级最低的英雄，新英雄直接 2 星
  if (!canDeploy && ctx.heroes.length > 0) {
    const weakest = ctx.heroes.slice().sort((a, b) => a.star - b.star || a.damageDealt - b.damageDealt)[0];
    const weakCfg = HERO_MAP[weakest.heroId];
    for (const cfg of HEROES) {
      if (teamIds.has(cfg.id)) continue;
      if (!ctx.availableHeroes.includes(cfg.id)) continue;
      if (ctx.magesOnly && !MAGE_HEROES.includes(cfg.id)) continue;
      cards.push({
        key: `replace:${cfg.id}`,
        category: 'replace',
        rarity: cfg.rarity,
        title: `替换：${cfg.name}`,
        desc: `用 ${cfg.name} 替换 ${weakCfg?.name ?? '一名英雄'}（${weakest.star}★），新英雄直接 2 星`,
        icon: cfg.spriteKey,
        heroId: cfg.id,
        replaceUid: weakest.uid,
        tags: cfg.tags.includes('tank') ? ['survival'] : cfg.tags.includes('summon') ? ['summon'] : ['dps'],
      });
    }
  }

  // ---------- 英雄属性 ----------
  for (const h of ctx.heroes) {
    const cfg = HERO_MAP[h.heroId];
    if (!cfg) continue;
    const s = pick(TEAM_STATS, ctx.rand);
    if (!s) continue;
    const rarity: CardRarity = s.pct ? 'common' : 'rare';
    const val = s.base * (1 + h.star * 0.12);
    cards.push({
      key: `heroStat:${h.heroId}:${s.stat}`,
      category: 'heroStat',
      rarity,
      title: `${cfg.name} 的${s.name}`,
      desc: `${s.name} +${fmt(s.pct ? val : val, s.pct)}`,
      icon: statIcon(s.stat),
      heroUid: h.uid,
      heroId: h.heroId,
      stat: s.stat,
      value: val,
      tags: [s.tag],
    });
  }

  // ---------- 技能学习 ----------
  for (const h of ctx.heroes) {
    const cfg = HERO_MAP[h.heroId];
    if (!cfg) continue;
    const owned = new Set(h.skills.map((s) => s.id));
    // 专属技能 + 通用技能池
    const learnable: string[] = cfg.skills.filter((sid: string) => !owned.has(sid) && !!SKILL_MAP[sid] && !SKILL_MAP[sid].isEvolution);
    const extra: string[] = SKILLS.filter((s) => !s.isEvolution && !owned.has(s.id) && !cfg.skills.includes(s.id)).map((s) => s.id);
    if (learnable.length > 0) {
      const sid = pick(learnable, ctx.rand)!;
      const sc = SKILL_MAP[sid];
      cards.push({
        key: `skillLearn:${h.heroId}:${sid}`,
        category: 'skillLearn',
        rarity: 'rare',
        title: `${cfg.name} 学习「${sc.name}」`,
        desc: sc.description,
        icon: sc.glyph,
        heroUid: h.uid,
        heroId: h.heroId,
        skillId: sid,
        tags: skillTag(sc.element),
      });
    } else if (extra.length > 0 && h.skills.length < 4) {
      const sid = pick(extra, ctx.rand)!;
      const sc = SKILL_MAP[sid];
      cards.push({
        key: `skillLearn:${h.heroId}:${sid}`,
        category: 'skillLearn',
        rarity: 'epic',
        title: `${cfg.name} 学习「${sc.name}」`,
        desc: sc.description,
        icon: sc.glyph,
        heroUid: h.uid,
        heroId: h.heroId,
        skillId: sid,
        tags: skillTag(sc.element),
      });
    }
  }

  // ---------- 技能升级 / 进化 ----------
  for (const h of ctx.heroes) {
    const cfg = HERO_MAP[h.heroId];
    if (!cfg) continue;
    for (const inst of h.skills) {
      const sc = SKILL_MAP[inst.id];
      if (!sc) continue;
      if (inst.level >= sc.maxLevel) {
        // 进化卡
        if (sc.evolutionId && !inst.evolved) {
          const reqPassive = sc.evolveRequires;
          const hasPassive = !reqPassive || (ctx.passives[reqPassive] ?? 0) > 0;
          if (hasPassive) {
            const evo = SKILL_MAP[sc.evolutionId];
            cards.push({
              key: `evolve:${h.heroId}:${sc.id}`,
              category: 'evolve',
              rarity: 'legendary',
              title: `进化「${sc.name}」→「${evo.name}」`,
              desc: evo.description,
              icon: evo.glyph,
              heroUid: h.uid,
              heroId: h.heroId,
              skillId: sc.id,
              levelText: 'Lv.5 → 进化',
              tags: ['dps'],
            });
          } else if (reqPassive) {
            // 提示缺少强化，提供对应被动卡
            const p = PASSIVE_MAP[reqPassive];
            if (p) {
              cards.push({
                key: `passive:${p.id}`,
                category: 'passive',
                rarity: 'rare',
                title: p.name,
                desc: `${p.desc} · 拥有后可进化「${sc.name}」`,
                icon: p.glyph,
                passiveId: p.id,
                levelText: `Lv.${ctx.passives[p.id] ?? 0} → ${(ctx.passives[p.id] ?? 0) + 1}`,
                tags: p.tags,
              });
            }
          }
        }
      } else {
        cards.push({
          key: `skillUp:${h.heroId}:${sc.id}`,
          category: 'skillUp',
          rarity: sc.isEvolution ? 'epic' : inst.level >= 3 ? 'epic' : 'common',
          title: `${cfg.name} · ${sc.name} 升级`,
          desc: `提高伤害、数量与效果`,
          icon: sc.glyph,
          heroUid: h.uid,
          heroId: h.heroId,
          skillId: sc.id,
          levelText: `Lv.${inst.level} → Lv.${inst.level + 1}`,
          tags: skillTag(sc.element),
        });
      }
    }
  }

  // ---------- 全队强化 ----------
  for (const s of TEAM_STATS) {
    const val = s.base * 1.9;
    cards.push({
      key: `team:${s.stat}`,
      category: 'team',
      rarity: s.pct ? 'rare' : 'epic',
      title: `全队${s.name}`,
      desc: `全队所有英雄 ${s.name} +${fmt(val, s.pct)}`,
      icon: statIcon(s.stat),
      stat: s.stat,
      value: val,
      tags: [s.tag],
    });
  }
  for (const b of BONUS_CARDS) {
    const val = b.base * 1.8;
    cards.push({
      key: `teambonus:${b.bonus}`,
      category: 'team',
      rarity: 'epic',
      title: `全域强化：${b.name}`,
      desc: `全队 ${b.name} +${fmt(val, b.base < 1)}`,
      icon: bonusIcon(b.bonus),
      effectId: b.bonus,
      value: val,
      tags: [b.tag],
    });
  }

  // ---------- 被动强化 ----------
  for (const p of PASSIVES) {
    const lv = ctx.passives[p.id] ?? 0;
    if (lv >= p.maxLevel) continue;
    cards.push({
      key: `passive:${p.id}`,
      category: 'passive',
      rarity: 'common',
      title: p.name,
      desc: p.desc,
      icon: p.glyph,
      passiveId: p.id,
      levelText: `Lv.${lv} → ${lv + 1}`,
      tags: p.tags,
    });
  }

  // ---------- 召唤强化 ----------
  cards.push(
    {
      key: 'summon:count', category: 'summon', rarity: 'rare', title: '召唤增幅',
      desc: '召唤物数量 +1', icon: 'skull', effectId: 'summonCount', value: 1, tags: ['summon'],
    },
    {
      key: 'summon:power', category: 'summon', rarity: 'rare', title: '召唤精通',
      desc: '召唤物伤害 +25%', icon: 'ghost', effectId: 'summonPower', value: 0.25, tags: ['summon'],
    },
    {
      key: 'summon:speed', category: 'summon', rarity: 'rare', title: '召唤急速',
      desc: '召唤物攻击速度 +25%', icon: 'boot', effectId: 'summonSpeed', value: 0.25, tags: ['summon'],
    },
  );

  // ---------- 经济强化 ----------
  cards.push(
    { key: 'eco:gold', category: 'economy', rarity: 'common', title: '金币收益', desc: '金币收益 +25%', icon: 'coin', effectId: 'goldGain', value: 0.25, tags: ['economy'] },
    { key: 'eco:exp', category: 'economy', rarity: 'common', title: '经验收益', desc: '经验获取 +25%', icon: 'book', effectId: 'expGain', value: 0.25, tags: ['economy'] },
    { key: 'eco:goldInstant', category: 'economy', rarity: 'common', title: '战利品', desc: '立刻获得金币', icon: 'bag', effectId: 'instantGold', value: 1, tags: ['economy'] },
    { key: 'eco:luck', category: 'economy', rarity: 'rare', title: '幸运眷顾', desc: '稀有奖励概率 +15%', icon: 'dice', effectId: 'luck', value: 0.15, tags: ['economy'] },
  );

  // ---------- 防御强化 ----------
  for (const d of DEFENSE_DEFS) {
    const lv = ctx.defenses[d.id] ?? 0;
    if (lv >= d.maxLevel) continue;
    cards.push({
      key: `defense:${d.id}`,
      category: 'defense',
      rarity: d.rarity,
      title: lv === 0 ? `解锁：${d.name}` : `${d.name} 强化`,
      desc: d.desc,
      icon: d.icon,
      effectId: d.id,
      levelText: `Lv.${lv} → ${lv + 1}`,
      tags: ['survival'],
    });
  }
  cards.push({
    key: 'defense:baseHp', category: 'defense', rarity: 'rare', title: '基地加固',
    desc: '基地生命上限 +15 并恢复 15 点生命', icon: 'shield', effectId: 'baseHp', value: 15, tags: ['survival'],
  });

  // ---------- 特殊效果 ----------
  for (const s of SPECIAL_DEFS) {
    const lv = ctx.specials[s.id] ?? 0;
    if (lv >= s.maxLevel) continue;
    cards.push({
      key: `special:${s.id}`,
      category: 'special',
      rarity: s.rarity,
      title: lv === 0 ? `解锁：${s.name}` : `${s.name} 强化`,
      desc: s.desc,
      icon: s.icon,
      effectId: s.id,
      levelText: `Lv.${lv} → ${lv + 1}`,
      tags: ['dps'],
    });
  }

  // ---------- 部署上限 ----------
  if (ctx.heroes.length >= ctx.deployCap && ctx.deployCap < 8) {
    cards.push({
      key: 'capacity:deploy', category: 'capacity', rarity: 'legendary',
      title: '扩编军阵', desc: `部署上限 +1（当前 ${ctx.deployCap}）`, icon: 'flag', effectId: 'deployCap', value: 1,
      tags: ['dps', 'survival'],
    });
  }
  cards.push({
    key: 'capacity:revive', category: 'capacity', rarity: 'epic',
    title: '战地救护', desc: '全体倒下英雄立即复活并恢复 50% 生命，复活速度 +20%', icon: 'feather', effectId: 'reviveNow', tags: ['survival'],
  });
  cards.push({
    key: 'capacity:fullheal', category: 'capacity', rarity: 'epic',
    title: '神圣洗礼', desc: '全队恢复 100% 生命并获得 30% 最大生命的护盾', icon: 'heart', effectId: 'fullHeal', tags: ['survival'],
  });
  cards.push({
    key: 'capacity:refresh', category: 'capacity', rarity: 'rare',
    title: '洞察之眼', desc: '获得 2 次刷新机会', icon: 'refresh', effectId: 'refresh', value: 2, tags: ['economy'],
  });

  return cards;
}

function fmt(v: number, pct: boolean): string {
  return pct ? `${Math.round(v * 100)}%` : v >= 10 ? `${Math.round(v)}` : `${v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function statIcon(stat: StatKey): string {
  const m: Partial<Record<StatKey, string>> = {
    attack: 'sword', maxHp: 'heart', defense: 'armor', attackSpeed: 'boot', critRate: 'target',
    critDamage: 'blade', dodgeRate: 'cloak', cooldownReduction: 'hourglass', attackRange: 'bow',
    lifeSteal: 'fang', skillPower: 'star', blockCapacity: 'wall', hp: 'heart',
  };
  return m[stat] ?? 'star';
}

function bonusIcon(b: BonusKey): string {
  const m: Partial<Record<BonusKey, string>> = {
    area: 'ring', pierce: 'arrow', duration: 'hourglass', fireDmg: 'fire', iceDmg: 'snow',
    lightningDmg: 'bolt', poisonDmg: 'flask', holyDmg: 'cross', shadowDmg: 'orb',
    summonCount: 'skull', goldGain: 'coin', expGain: 'book', luck: 'dice',
  };
  return m[b] ?? 'star';
}

function skillTag(el: string): string[] {
  if (el === 'summon' || el === 'mech') return ['summon'];
  if (el === 'holy') return ['survival'];
  return ['dps'];
}

export function starEffect(star: number): string {
  switch (star) {
    case 2: return '基础属性大幅增强';
    case 3: return '解锁技能附加效果';
    case 4: return '强化专属攻击机制';
    case 5: return '觉醒形态，外观与特效全面升级';
    default: return '基础形态';
  }
}
