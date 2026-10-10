import type { AutoPickStrategy, UpgradeCard } from '@/types/game';
import { RARITY_MULT } from '@/data/upgrades';

/** 每种卡片对应的养成目的 */
export const PURPOSE_FOR_CARD: Record<string, string[]> = {
  recruit: ['dps', 'survival'],
  replace: ['dps'],
  star: ['dps'],
  heroStat: ['dps', 'survival'],
  skillLearn: ['dps'],
  skillUp: ['dps'],
  evolve: ['dps'],
  team: ['dps'],
  passive: ['dps'],
  special: ['dps'],
  summon: ['summon'],
  economy: ['economy'],
  defense: ['survival'],
  capacity: ['survival'],
};

/** 不同策略下各标签的权重 */
const STRATEGY_WEIGHTS: Record<AutoPickStrategy, Record<string, number>> = {
  manual: {},
  dps: { dps: 1.6, survival: 0.5, summon: 1.0, economy: 0.35 },
  survival: { dps: 0.5, survival: 1.7, summon: 0.9, economy: 0.55 },
  summon: { dps: 0.55, survival: 0.7, summon: 2.0, economy: 0.5 },
  balanced: { dps: 1.1, survival: 1.1, summon: 1.1, economy: 0.85 },
  custom: {},
};

export function cardScore(card: UpgradeCard, strategy: AutoPickStrategy, priority: string[]): number {
  if (strategy === 'manual') return 0;
  const weights = strategy === 'custom' ? customWeights(priority) : STRATEGY_WEIGHTS[strategy];
  const tags = card.tags.length > 0 ? card.tags : PURPOSE_FOR_CARD[card.category] ?? ['dps'];
  let base = 0;
  for (const t of tags) base += weights[t] ?? 0.8;
  base /= tags.length;
  const rarityBonus = 1 + (RARITY_MULT[card.rarity] - 1) * 0.22;
  const categoryBonus = categoryWeight(card.category, weights);
  return base * rarityBonus * categoryBonus;
}

function customWeights(priority: string[]): Record<string, number> {
  const out: Record<string, number> = { dps: 1, survival: 1, summon: 1, economy: 1 };
  priority.forEach((p, i) => {
    out[p] = 2 - i * 0.42;
  });
  return out;
}

function categoryWeight(cat: UpgradeCard['category'], weights: Record<string, number>): number {
  switch (cat) {
    case 'recruit':
      return 1.15 * (weights.dps ?? 1);
    case 'evolve':
      return 1.5;
    case 'star':
      return 1.2;
    case 'capacity':
      return 1.05;
    case 'defense':
      return weights.survival > 1 ? 1.3 : 0.9;
    case 'economy':
      return weights.economy > 1 ? 1.35 : 0.7;
    case 'summon':
      return weights.summon > 1 ? 1.4 : 0.8;
    default:
      return 1;
  }
}

export function autoPickCard(cards: UpgradeCard[], strategy: AutoPickStrategy, priority: string[]): UpgradeCard | null {
  if (cards.length === 0) return null;
  if (strategy === 'manual') return null;
  let best = cards[0];
  let bestScore = -1;
  for (const c of cards) {
    const s = cardScore(c, strategy, priority) + Math.random() * 0.001;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

export const STRATEGY_NAME: Record<AutoPickStrategy, string> = {
  manual: '手动选择',
  dps: '输出优先',
  survival: '生存优先',
  summon: '召唤优先',
  balanced: '均衡模式',
  custom: '自定义优先级',
};
