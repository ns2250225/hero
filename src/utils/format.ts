export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatNumber(n: number): string {
  const v = Math.round(n);
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(2)}B`;
  if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return `${v}`;
}

export function formatPercent(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatStatName(key: string): string {
  return STAT_NAMES[key] ?? key;
}

export const STAT_NAMES: Record<string, string> = {
  maxHp: '生命上限',
  hp: '生命',
  attack: '攻击力',
  defense: '防御力',
  attackSpeed: '攻击速度',
  attackRange: '攻击范围',
  critRate: '暴击率',
  critDamage: '暴击伤害',
  dodgeRate: '闪避率',
  cooldownReduction: '冷却缩减',
  skillPower: '技能伤害',
  lifeSteal: '吸血',
  blockCapacity: '阻挡上限',
};

export function isPctStat(key: string): boolean {
  return key !== 'critRate' && key !== 'critDamage' && key !== 'dodgeRate' && key !== 'cooldownReduction' && key !== 'lifeSteal' && key !== 'blockCapacity' && key !== 'maxHp' && key !== 'attack' && key !== 'defense' && key !== 'attackSpeed' && key !== 'attackRange' && key !== 'skillPower';
}

export function statDeltaText(key: string, value: number): string {
  if (key === 'critRate' || key === 'dodgeRate' || key === 'cooldownReduction' || key === 'lifeSteal') {
    return `+${(value * 100).toFixed(1)}%`;
  }
  if (key === 'maxHp' || key === 'attack' || key === 'defense' || key === 'attackSpeed' || key === 'attackRange' || key === 'skillPower') {
    return `+${Math.round(value * 100)}%`;
  }
  if (key === 'blockCapacity') return `+${Math.round(value)}`;
  return `+${value.toFixed(2)}`;
}
