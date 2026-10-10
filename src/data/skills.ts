import type { SkillConfig, SkillLevelScale } from '@/types/skill';

export type { SkillConfig, SkillLevelScale };

const S = (p: Partial<SkillLevelScale>): SkillLevelScale => ({ damage: 0.15, count: 0, area: 0.08, cooldown: 0.05, pierce: 0, duration: 0, ...p });

type Def = Omit<SkillConfig, 'maxLevel' | 'type'> & { maxLevel?: number };

const ELEMENT_TYPE: Record<string, string> = {
  physical: '物理',
  fire: '火焰',
  ice: '冰霜',
  lightning: '雷电',
  poison: '毒素',
  holy: '神圣',
  shadow: '暗影',
  summon: '召唤',
  mech: '机械',
};

const defs: Def[] = [
  // 物理
  { id: 'whirlwind', name: '旋风斩', description: '对周围敌人造成范围伤害', element: 'physical', kind: 'whirlwind', cooldown: 5, baseDamage: 1.6, range: 140, projectileCount: 1, radius: 120, duration: 0.6, pierce: 0, scale: S({ damage: 0.25, area: 0.1 }), evolutionId: 'evo_whirlwind', evolveRequires: 'p_vamp', glyph: 'whirl' },
  { id: 'swordWave', name: '剑气波', description: '向前方释放横向贯穿剑气', element: 'physical', kind: 'swordWave', cooldown: 6, baseDamage: 2.0, range: 900, projectileCount: 1, radius: 40, duration: 0, pierce: 99, scale: S({ damage: 0.3, count: 0.25 }), glyph: 'sword' },
  { id: 'bladeStorm', name: '千刃风暴', description: '向怪物潮掷出大量飞刀', element: 'physical', kind: 'bladeStorm', cooldown: 7, baseDamage: 0.8, range: 600, projectileCount: 8, radius: 0, duration: 0, pierce: 1, scale: S({ damage: 0.12, count: 2 }), glyph: 'knives' },
  { id: 'multiShot', name: '多重箭', description: '同时向多个敌人发射箭矢', element: 'physical', kind: 'multiShot', cooldown: 4, baseDamage: 1.1, range: 700, projectileCount: 4, radius: 0, duration: 0, pierce: 0, scale: S({ damage: 0.12, count: 1 }), evolutionId: 'evo_multiShot', evolveRequires: 'p_pierce', glyph: 'arrows' },
  { id: 'pierceShot', name: '穿透箭', description: '射出穿透一条直线上所有敌人的强力箭矢', element: 'physical', kind: 'pierceShot', cooldown: 5, baseDamage: 3.0, range: 1000, projectileCount: 1, radius: 0, duration: 0, pierce: 99, scale: S({ damage: 0.4, count: 0.34 }), glyph: 'arrow' },
  { id: 'rain', name: '箭雨', description: '对怪物群持续倾泻箭矢', element: 'physical', kind: 'rain', cooldown: 9, baseDamage: 0.45, range: 800, projectileCount: 1, radius: 110, duration: 3, pierce: 0, scale: S({ damage: 0.08, area: 0.1, duration: 0.4 }), glyph: 'rain' },
  // 火焰
  { id: 'fireball', name: '火球术', description: '发射命中后爆炸的火球', element: 'fire', kind: 'fireball', cooldown: 3.5, baseDamage: 1.8, range: 650, projectileCount: 1, radius: 70, duration: 0, pierce: 0, scale: S({ damage: 0.2, count: 0.5, area: 0.08 }), evolutionId: 'evo_fireball', evolveRequires: 'p_area', status: 'burn', glyph: 'fireball' },
  { id: 'flameStorm', name: '烈焰风暴', description: '在敌群中形成持续燃烧的火焰风暴', element: 'fire', kind: 'flameStorm', cooldown: 9, baseDamage: 0.5, range: 700, projectileCount: 1, radius: 100, duration: 3.5, pierce: 0, scale: S({ damage: 0.1, area: 0.1, duration: 0.3 }), status: 'burn', glyph: 'flame' },
  { id: 'meteor', name: '陨石术', description: '召唤陨石砸向怪物群', element: 'fire', kind: 'meteor', cooldown: 8, baseDamage: 3.2, range: 900, projectileCount: 2, radius: 90, duration: 0, pierce: 0, scale: S({ damage: 0.25, count: 0.6 }), status: 'burn', glyph: 'meteor' },
  { id: 'fireWall', name: '火墙', description: '在战场中生成阻挡怪物的燃烧火墙', element: 'fire', kind: 'fireWall', cooldown: 12, baseDamage: 0.6, range: 0, projectileCount: 1, radius: 260, duration: 5, pierce: 0, scale: S({ damage: 0.1, area: 0.12, duration: 0.6 }), status: 'burn', glyph: 'wall' },
  // 冰霜
  { id: 'icicle', name: '冰锥术', description: '发射穿透敌人的冰锥并减速', element: 'ice', kind: 'icicle', cooldown: 3.5, baseDamage: 1.5, range: 800, projectileCount: 3, radius: 0, duration: 1.5, pierce: 3, scale: S({ damage: 0.15, count: 0.6, pierce: 1 }), evolutionId: 'evo_icicle', evolveRequires: 'p_cooldown', status: 'slow', glyph: 'icicle' },
  { id: 'frostNova', name: '冰霜新星', description: '在敌群中爆发寒气，冻结范围内的敌人', element: 'ice', kind: 'frostNova', cooldown: 10, baseDamage: 1.4, range: 650, projectileCount: 1, radius: 130, duration: 1.6, pierce: 0, scale: S({ damage: 0.15, area: 0.1, duration: 0.2 }), status: 'freeze', glyph: 'snow' },
  { id: 'blizzard', name: '暴风雪', description: '召唤持续造成冰霜伤害并减速的暴风雪', element: 'ice', kind: 'blizzard', cooldown: 10, baseDamage: 0.45, range: 750, projectileCount: 1, radius: 150, duration: 4, pierce: 0, scale: S({ damage: 0.08, area: 0.12, duration: 0.4 }), status: 'slow', glyph: 'snow' },
  // 雷电
  { id: 'chain', name: '闪电链', description: '在多个敌人之间弹射的闪电', element: 'lightning', kind: 'chain', cooldown: 3.5, baseDamage: 1.4, range: 650, projectileCount: 5, radius: 180, duration: 0, pierce: 0, scale: S({ damage: 0.15, count: 1.5 }), evolutionId: 'evo_chain', evolveRequires: 'p_haste', status: 'stun', glyph: 'chain' },
  { id: 'thunderField', name: '雷暴领域', description: '在战场上随机降下落雷', element: 'lightning', kind: 'thunderField', cooldown: 10, baseDamage: 1.5, range: 900, projectileCount: 8, radius: 50, duration: 3, pierce: 0, scale: S({ damage: 0.15, count: 2, duration: 0.3 }), status: 'stun', glyph: 'bolt' },
  { id: 'spear', name: '雷电之矛', description: '释放横向贯穿的雷电长矛', element: 'lightning', kind: 'spear', cooldown: 5, baseDamage: 2.6, range: 1100, projectileCount: 1, radius: 26, duration: 0, pierce: 99, scale: S({ damage: 0.3, count: 0.3 }), glyph: 'spear' },
  // 毒素
  { id: 'poisonBomb', name: '毒液弹', description: '投掷爆裂毒液使敌人中毒', element: 'poison', kind: 'poisonBomb', cooldown: 4, baseDamage: 1.0, range: 600, projectileCount: 2, radius: 80, duration: 4, pierce: 0, scale: S({ damage: 0.12, count: 0.5, area: 0.08 }), status: 'poison', glyph: 'flask' },
  { id: 'poisonFog', name: '毒雾', description: '生成持续伤害的毒雾区域', element: 'poison', kind: 'poisonFog', cooldown: 8, baseDamage: 0.4, range: 700, projectileCount: 1, radius: 130, duration: 5, pierce: 0, scale: S({ damage: 0.08, area: 0.1, duration: 0.5, count: 0.25 }), evolutionId: 'evo_poisonFog', evolveRequires: 'p_dot', status: 'poison', glyph: 'fog' },
  { id: 'corrode', name: '腐蚀光环', description: '腐蚀区域内敌人的防御并造成伤害', element: 'poison', kind: 'corrode', cooldown: 10, baseDamage: 0.3, range: 600, projectileCount: 1, radius: 170, duration: 5, pierce: 0, scale: S({ damage: 0.06, area: 0.12, duration: 0.5 }), status: 'corrode', glyph: 'drop' },
  // 神圣
  { id: 'holySmite', name: '圣光冲击', description: '降下圣光造成神圣范围伤害', element: 'holy', kind: 'holySmite', cooldown: 6, baseDamage: 2.4, range: 700, projectileCount: 1, radius: 100, duration: 0, pierce: 0, scale: S({ damage: 0.3, count: 0.4, area: 0.08 }), status: 'stun', glyph: 'cross' },
  { id: 'healRing', name: '治愈之环', description: '恢复全体英雄的生命值', element: 'holy', kind: 'healRing', cooldown: 8, baseDamage: 3.0, range: 0, projectileCount: 1, radius: 0, duration: 0, pierce: 0, scale: S({ damage: 0.6, cooldown: 0.06 }), glyph: 'heart' },
  { id: 'holyShield', name: '神圣护盾', description: '为英雄提供吸收伤害的护盾', element: 'holy', kind: 'holyShield', cooldown: 10, baseDamage: 0.12, range: 0, projectileCount: 3, radius: 0, duration: 0, pierce: 0, scale: S({ damage: 0.04, count: 1 }), glyph: 'shield' },
  // 暗影
  { id: 'homing', name: '暗影飞弹', description: '发射追踪敌人的暗影飞弹', element: 'shadow', kind: 'homing', cooldown: 4, baseDamage: 1.2, range: 750, projectileCount: 4, radius: 0, duration: 0, pierce: 0, scale: S({ damage: 0.12, count: 1.2 }), glyph: 'orb' },
  { id: 'voidPull', name: '虚空吞噬', description: '在敌群中生成黑洞，吸引并持续伤害怪物', element: 'shadow', kind: 'voidPull', cooldown: 11, baseDamage: 0.55, range: 750, projectileCount: 1, radius: 160, duration: 3, pierce: 0, scale: S({ damage: 0.1, area: 0.1, duration: 0.3 }), glyph: 'void' },
  { id: 'soulReap', name: '灵魂收割', description: '收割生命值最低的敌人，对残血敌人造成巨额伤害', element: 'shadow', kind: 'soulReap', cooldown: 6, baseDamage: 2.2, range: 800, projectileCount: 3, radius: 0, duration: 0, pierce: 0, scale: S({ damage: 0.25, count: 1 }), glyph: 'scythe' },
  // 召唤
  { id: 'summonSkeleton', name: '骷髅召唤', description: '召唤骷髅战士冲向敌人', element: 'summon', kind: 'summonSkeleton', cooldown: 9, baseDamage: 0.7, range: 0, projectileCount: 2, radius: 0, duration: 15, pierce: 0, scale: S({ damage: 0.12, count: 0.75, duration: 1 }), evolutionId: 'evo_summonSkeleton', evolveRequires: 'p_summon', glyph: 'skull' },
  { id: 'summonGhost', name: '幽灵召唤', description: '召唤穿梭于敌群的飞行幽灵', element: 'summon', kind: 'summonGhost', cooldown: 10, baseDamage: 0.6, range: 0, projectileCount: 2, radius: 0, duration: 12, pierce: 0, scale: S({ damage: 0.12, count: 0.6, duration: 1 }), glyph: 'ghost' },
  { id: 'summonGolem', name: '魔像召唤', description: '召唤阻挡敌人的防御魔像', element: 'summon', kind: 'summonGolem', cooldown: 16, baseDamage: 0.8, range: 0, projectileCount: 1, radius: 0, duration: 20, pierce: 0, scale: S({ damage: 0.15, count: 0.25, duration: 2 }), glyph: 'golem' },
  // 机械
  { id: 'turret', name: '自动炮台', description: '部署自动射击的炮台', element: 'mech', kind: 'turret', cooldown: 14, baseDamage: 0.6, range: 650, projectileCount: 1, radius: 0, duration: 16, pierce: 0, scale: S({ damage: 0.12, count: 0.4, duration: 2 }), evolutionId: 'evo_turret', evolveRequires: 'p_mech', glyph: 'turret' },
  { id: 'drones', name: '无人机群', description: '释放自动追踪攻击的无人机', element: 'mech', kind: 'drones', cooldown: 12, baseDamage: 0.45, range: 700, projectileCount: 2, radius: 0, duration: 12, pierce: 0, scale: S({ damage: 0.1, count: 0.75, duration: 1 }), glyph: 'drone' },

  // ===== 进化技能 =====
  { id: 'evo_fireball', name: '灭世陨火', description: '巨型火球连续轰炸，爆炸范围极大并引燃大地', element: 'fire', kind: 'fireball', cooldown: 2.5, baseDamage: 3.6, range: 800, projectileCount: 4, radius: 140, duration: 0, pierce: 0, scale: S({}), isEvolution: true, status: 'burn', glyph: 'meteor', maxLevel: 1 },
  { id: 'evo_chain', name: '无限雷网', description: '闪电在全场无限弹射，形成雷网', element: 'lightning', kind: 'chain', cooldown: 2, baseDamage: 2.2, range: 900, projectileCount: 16, radius: 260, duration: 0, pierce: 0, scale: S({}), isEvolution: true, status: 'stun', glyph: 'chain', maxLevel: 1 },
  { id: 'evo_icicle', name: '永恒冰封', description: '冰锥风暴冻结一切命中的敌人', element: 'ice', kind: 'icicle', cooldown: 2, baseDamage: 2.4, range: 1000, projectileCount: 9, radius: 0, duration: 2.2, pierce: 99, scale: S({}), isEvolution: true, status: 'freeze', glyph: 'icicle', maxLevel: 1 },
  { id: 'evo_multiShot', name: '无限箭雨', description: '铺天盖地的穿透箭雨覆盖整个战场', element: 'physical', kind: 'multiShot', cooldown: 1.8, baseDamage: 1.6, range: 1000, projectileCount: 14, radius: 0, duration: 0, pierce: 4, scale: S({}), isEvolution: true, glyph: 'rain', maxLevel: 1 },
  { id: 'evo_summonSkeleton', name: '不死军团', description: '召唤大量精锐骷髅骑士，死亡后会重新站起', element: 'summon', kind: 'summonSkeleton', cooldown: 6, baseDamage: 1.5, range: 0, projectileCount: 6, radius: 0, duration: 25, pierce: 0, scale: S({}), isEvolution: true, glyph: 'skull', maxLevel: 1 },
  { id: 'evo_turret', name: '机械要塞', description: '部署重型要塞炮台，发射穿透炮弹与导弹', element: 'mech', kind: 'turret', cooldown: 8, baseDamage: 1.4, range: 900, projectileCount: 3, radius: 0, duration: 30, pierce: 3, scale: S({}), isEvolution: true, glyph: 'turret', maxLevel: 1 },
  { id: 'evo_poisonFog', name: '剧毒领域', description: '大范围剧毒领域，毒素层层叠加', element: 'poison', kind: 'poisonFog', cooldown: 5, baseDamage: 1.0, range: 900, projectileCount: 2, radius: 220, duration: 8, pierce: 0, scale: S({}), isEvolution: true, status: 'poison', glyph: 'fog', maxLevel: 1 },
  { id: 'evo_whirlwind', name: '血色剑刃', description: '血色旋风持续切割周围敌人并大量吸血', element: 'physical', kind: 'whirlwind', cooldown: 3, baseDamage: 3.2, range: 220, projectileCount: 1, radius: 200, duration: 1.2, pierce: 0, scale: S({}), isEvolution: true, glyph: 'whirl', maxLevel: 1 },
];

export const SKILLS: SkillConfig[] = defs.map((d) => ({
  maxLevel: 5,
  type: ELEMENT_TYPE[d.element],
  ...d,
}));

export const SKILL_MAP: Record<string, SkillConfig> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const BASE_SKILLS = SKILLS.filter((s) => !s.isEvolution);

/** 技能进化用的被动强化 */
export interface PassiveConfig {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  glyph: string;
  /** 每级提供的加成 */
  perLevel: { stat?: 'attackSpeed' | 'cooldownReduction' | 'lifeSteal'; bonus?: 'area' | 'pierce' | 'summonCount' | 'summonPower' | 'mechPower' | 'dotPower' | 'duration'; value: number; flat?: boolean }[];
  tags: string[];
}

export const PASSIVES: PassiveConfig[] = [
  { id: 'p_area', name: '范围强化', desc: '技能范围 +10%', maxLevel: 5, glyph: 'star', perLevel: [{ bonus: 'area', value: 0.1 }], tags: ['dps'] },
  { id: 'p_haste', name: '攻速强化', desc: '全队攻击速度 +8%', maxLevel: 5, glyph: 'boot', perLevel: [{ stat: 'attackSpeed', value: 0.08 }], tags: ['dps'] },
  { id: 'p_cooldown', name: '冷却强化', desc: '全队技能冷却 -6%', maxLevel: 5, glyph: 'hourglass', perLevel: [{ stat: 'cooldownReduction', value: 0.06, flat: true }], tags: ['dps'] },
  { id: 'p_pierce', name: '穿透强化', desc: '投射物穿透 +1', maxLevel: 5, glyph: 'arrow', perLevel: [{ bonus: 'pierce', value: 1, flat: true }], tags: ['dps'] },
  { id: 'p_summon', name: '召唤强化', desc: '召唤物伤害与生命 +15%', maxLevel: 5, glyph: 'skull', perLevel: [{ bonus: 'summonPower', value: 0.15 }], tags: ['summon'] },
  { id: 'p_mech', name: '机械强化', desc: '炮台与无人机伤害 +15%', maxLevel: 5, glyph: 'gear', perLevel: [{ bonus: 'mechPower', value: 0.15 }], tags: ['summon', 'dps'] },
  { id: 'p_dot', name: '持续伤害强化', desc: '燃烧、中毒等持续伤害 +15%，持续时间 +8%', maxLevel: 5, glyph: 'drop', perLevel: [{ bonus: 'dotPower', value: 0.15 }, { bonus: 'duration', value: 0.08 }], tags: ['dps'] },
  { id: 'p_vamp', name: '吸血强化', desc: '全队吸血 +3%', maxLevel: 5, glyph: 'fang', perLevel: [{ stat: 'lifeSteal', value: 0.03, flat: true }], tags: ['survival'] },
];

export const PASSIVE_MAP: Record<string, PassiveConfig> = Object.fromEntries(PASSIVES.map((p) => [p.id, p]));

export const ELEMENT_NAME = ELEMENT_TYPE;
export const ELEMENT_COLOR: Record<string, string> = {
  physical: '#e0e0e0',
  fire: '#ff7a2a',
  ice: '#7fd8ff',
  lightning: '#ffe84a',
  poison: '#9cff4a',
  holy: '#fff2a0',
  shadow: '#c070ff',
  summon: '#90f0a0',
  mech: '#80c0ff',
};
export const ELEMENT_COLORS = ELEMENT_COLOR;

/** 计算技能在给定等级时的实际参数 */
export function skillParams(cfg: SkillConfig, level: number) {
  const l = Math.max(0, level - 1);
  return {
    damage: cfg.baseDamage * (1 + cfg.scale.damage * l),
    count: Math.floor(cfg.projectileCount + cfg.scale.count * l),
    radius: cfg.radius * (1 + cfg.scale.area * l),
    cooldown: cfg.cooldown * (1 - Math.min(0.5, cfg.scale.cooldown * l)),
    pierce: cfg.pierce + Math.floor(cfg.scale.pierce * l),
    duration: cfg.duration + cfg.scale.duration * l,
  };
}

export function describeSkillLevel(cfg: SkillConfig, level: number): string {
  const a = skillParams(cfg, level);
  const parts = [`伤害 ${Math.round(a.damage * 100)}%`];
  if (cfg.projectileCount > 1 || cfg.scale.count > 0) parts.push(`数量 ${a.count}`);
  if (cfg.radius > 0) parts.push(`范围 ${Math.round(a.radius)}`);
  if (cfg.duration > 0) parts.push(`持续 ${a.duration.toFixed(1)}s`);
  parts.push(`冷却 ${a.cooldown.toFixed(1)}s`);
  return parts.join(' · ');
}
