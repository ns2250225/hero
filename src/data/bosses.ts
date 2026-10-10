import type { BossConfig } from '@/types/enemy';

export type { BossConfig };

export const BOSSES: BossConfig[] = [
  {
    id: 'treeLord', name: '森林巨树', title: '远古守望者', maxHp: 4200, attack: 26, defense: 8, moveSpeed: 16,
    attackRange: 120, attackSpeed: 0.7, expReward: 260, goldReward: 220, skills: ['roots', 'summon'], summonIds: ['mushroom', 'goblin'],
    shape: 'tree', colors: ['#5a8a3a', '#3a5a24', '#7a4a24', '#2a3a18'],
    desc: '以根系束缚英雄，并召唤树精冲击防线。',
  },
  {
    id: 'skullLord', name: '骷髅领主', title: '亡者之王', maxHp: 5200, attack: 30, defense: 10, moveSpeed: 20,
    attackRange: 110, attackSpeed: 0.9, expReward: 300, goldReward: 260, skills: ['summon', 'charge', 'shadowPulse'], summonIds: ['skeleton', 'archer'],
    shape: 'skullLord', colors: ['#e8e0c0', '#8a8060', '#5a3ad0', '#241640'],
    desc: '召唤骷髅军团，并以冲锋撕开防线。',
  },
  {
    id: 'lavaDragon', name: '熔岩巨龙', title: '烈焰暴君', maxHp: 6400, attack: 38, defense: 12, moveSpeed: 22,
    attackRange: 220, attackSpeed: 0.8, expReward: 340, goldReward: 300, skills: ['fireBreath', 'meteor', 'summon'], summonIds: ['imp', 'bomber'],
    shape: 'dragon', colors: ['#c04020', '#7a1a0a', '#ffb020', '#3a0a06'],
    desc: '喷射烈焰，召唤陨石轰击战场。',
  },
  {
    id: 'frostGiant', name: '冰霜巨人', title: '北境之怒', maxHp: 7600, attack: 42, defense: 18, moveSpeed: 18,
    attackRange: 130, attackSpeed: 0.7, expReward: 380, goldReward: 330, skills: ['freeze', 'charge', 'shield'], summonIds: ['wolf', 'boar'],
    shape: 'giant', colors: ['#7fd8ff', '#2a6a9a', '#d8f4ff', '#16324a'],
    desc: '冻结英雄行动，并用冰甲强化自身。',
  },
  {
    id: 'poisonQueen', name: '毒沼女王', title: '腐化之母', maxHp: 7000, attack: 36, defense: 12, moveSpeed: 20,
    attackRange: 200, attackSpeed: 0.9, expReward: 360, goldReward: 320, skills: ['poisonFog', 'summon', 'barrage'], summonIds: ['shaman', 'bigslime'],
    shape: 'queen', colors: ['#9cff4a', '#4a7a10', '#c070ff', '#22300c'],
    desc: '散布剧毒领域，并治疗她的虫群。',
  },
  {
    id: 'mechColossus', name: '机械巨像', title: '钢铁判官', maxHp: 8800, attack: 44, defense: 24, moveSpeed: 19,
    attackRange: 260, attackSpeed: 1.0, expReward: 420, goldReward: 380, skills: ['laser', 'missiles', 'shield'], summonIds: ['spider', 'bomber'],
    shape: 'mech', colors: ['#8a94a4', '#4a5260', '#ff5a3a', '#1e242c'],
    desc: '以激光扫射战场，并发射追踪导弹。',
  },
  {
    id: 'abyssDemon', name: '深渊魔王', title: '虚空之主', maxHp: 10000, attack: 50, defense: 20, moveSpeed: 22,
    attackRange: 210, attackSpeed: 1.0, expReward: 480, goldReward: 430, skills: ['shadowPulse', 'summon', 'charge', 'barrage'], summonIds: ['ghost', 'imp', 'necro'],
    shape: 'demon', colors: ['#8a3ad0', '#3a1060', '#ff3a6a', '#1a0628'],
    desc: '释放暗影脉冲撕裂英雄阵线。',
  },
  {
    id: 'starGuardian', name: '星空守卫', title: '终焉之眼', maxHp: 13000, attack: 56, defense: 26, moveSpeed: 20,
    attackRange: 300, attackSpeed: 1.1, expReward: 600, goldReward: 520, skills: ['barrage', 'laser', 'shield', 'meteor', 'freeze'], summonIds: ['eye', 'ghost', 'ogre'],
    shape: 'star', colors: ['#d8c0ff', '#6a4aa0', '#ffe86a', '#20123a'],
    desc: '以能量弹幕与护盾守护最后的星门。',
  },
];

export const BOSS_MAP: Record<string, BossConfig> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
