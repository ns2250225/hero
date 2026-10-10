export interface MapLayer {
  sky: [string, string];
  far: string;
  far2: string;
  mid: string;
  mid2: string;
  ground: string;
  groundTop: string;
  groundDark: string;
  particle: string;
  accent: string;
}

export interface MapConfig {
  id: string;
  name: string
  desc: string;
  order: number;
  /** 解锁条件：在上一张地图达到指定波次 */
  unlockWave: number;
  hpMult: number;
  speedMult: number;
  countMult: number;
  goldMult: number;
  bossIds: string[];
  layers: MapLayer;
  weather: 'none' | 'leaf' | 'snow' | 'ember' | 'rain' | 'spore' | 'star' | 'sand';
}

export const MAPS: MapConfig[] = [
  {
    id: 'greenField', name: '翠绿平原', desc: '王国的第一道防线，怪物温和但数量众多。', order: 1, unlockWave: 0,
    hpMult: 1, speedMult: 1, countMult: 1, goldMult: 1,
    bossIds: ['treeLord', 'skullLord'],
    layers: {
      sky: ['#7ec8f0', '#c8ecff'], far: '#8fb8d8', far2: '#6d9cc0', mid: '#5aa05a', mid2: '#3f7f43',
      ground: '#6b9c3f', groundTop: '#8ec250', groundDark: '#3f5f24', particle: '#e8ffe0', accent: '#ffe27a',
    },
    weather: 'leaf',
  },
  {
    id: 'darkForest', name: '幽暗森林', desc: '树影遮蔽的天空下，怪物更快更凶。', order: 2, unlockWave: 20,
    hpMult: 1.35, speedMult: 1.08, countMult: 1.1, goldMult: 1.2,
    bossIds: ['treeLord', 'skullLord'],
    layers: {
      sky: ['#2a3a4a', '#4a6a6a'], far: '#2f4a4a', far2: '#22383a', mid: '#2a5a3a', mid2: '#1b3f28',
      ground: '#3a5f34', groundTop: '#4f7c40', groundDark: '#1e3420', particle: '#bff0c0', accent: '#7fffb0',
    },
    weather: 'spore',
  },
  {
    id: 'skeletonCrypt', name: '枯骨墓园', desc: '亡者的国度，骷髅与幽灵无穷无尽。', order: 3, unlockWave: 20,
    hpMult: 1.7, speedMult: 1.12, countMult: 1.2, goldMult: 1.4,
    bossIds: ['skullLord', 'abyssDemon'],
    layers: {
      sky: ['#1a1a2e', '#3a2a4a'], far: '#2a2436', far2: '#1c1826', mid: '#332c40', mid2: '#211c2c',
      ground: '#453c4c', groundTop: '#5c5060', groundDark: '#241f28', particle: '#c0b8e0', accent: '#a080ff',
    },
    weather: 'rain',
  },
  {
    id: 'lavaRift', name: '熔岩裂谷', desc: '滚烫的岩浆之上，火焰与爆炸主宰战场。', order: 4, unlockWave: 20,
    hpMult: 2.2, speedMult: 1.16, countMult: 1.25, goldMult: 1.6,
    bossIds: ['lavaDragon', 'abyssDemon'],
    layers: {
      sky: ['#3a1008', '#8a3010'], far: '#4a1a10', far2: '#301008', mid: '#5a2412', mid2: '#37140a',
      ground: '#3d2018', groundTop: '#5c3020', groundDark: '#1e0e08', particle: '#ffb060', accent: '#ff6a2a',
    },
    weather: 'ember',
  },
  {
    id: 'frostPeak', name: '霜寒雪峰', desc: '冰封之巅，寒冷会拖慢一切会动的生物。', order: 5, unlockWave: 20,
    hpMult: 2.8, speedMult: 1.2, countMult: 1.3, goldMult: 1.8,
    bossIds: ['frostGiant', 'starGuardian'],
    layers: {
      sky: ['#4a6a9a', '#c8e4ff'], far: '#6a8ab0', far2: '#4a6a90', mid: '#8ab0d0', mid2: '#5f88ab',
      ground: '#cfe4f0', groundTop: '#eef8ff', groundDark: '#8fa8bc', particle: '#ffffff', accent: '#8fe8ff',
    },
    weather: 'snow',
  },
  {
    id: 'poisonSwamp', name: '腐毒沼泽', desc: '毒雾笼罩的沼泽，治疗与腐蚀并存。', order: 6, unlockWave: 20,
    hpMult: 3.5, speedMult: 1.24, countMult: 1.35, goldMult: 2,
    bossIds: ['poisonQueen', 'abyssDemon'],
    layers: {
      sky: ['#2a3a20', '#5a6a30'], far: '#3a4a28', far2: '#26331a', mid: '#415a2c', mid2: '#28381c',
      ground: '#4a4a28', groundTop: '#61652f', groundDark: '#232313', particle: '#c0ff70', accent: '#9cff4a',
    },
    weather: 'spore',
  },
  {
    id: 'mechFactory', name: '废弃机械城', desc: '钢铁与电火花交织的工厂废墟。', order: 7, unlockWave: 20,
    hpMult: 4.4, speedMult: 1.28, countMult: 1.4, goldMult: 2.3,
    bossIds: ['mechColossus', 'starGuardian'],
    layers: {
      sky: ['#22262e', '#4a5260'], far: '#333944', far2: '#22262e', mid: '#3d444f', mid2: '#282d36',
      ground: '#4a4f58', groundTop: '#61666f', groundDark: '#23262c', particle: '#ffd08a', accent: '#ff9a3a',
    },
    weather: 'rain',
  },
  {
    id: 'voidRealm', name: '虚空星域', desc: '星门之后的终局战场，只有最强的阵容能立足。', order: 8, unlockWave: 20,
    hpMult: 5.6, speedMult: 1.32, countMult: 1.5, goldMult: 2.8,
    bossIds: ['abyssDemon', 'starGuardian'],
    layers: {
      sky: ['#0e0a20', '#2a1a4a'], far: '#1c1436', far2: '#120c24', mid: '#2a1c50', mid2: '#180f30',
      ground: '#241a3c', groundTop: '#332650', groundDark: '#100a1c', particle: '#e0c0ff', accent: '#c070ff',
    },
    weather: 'star',
  },
];

export const MAP_MAP: Record<string, MapConfig> = Object.fromEntries(MAPS.map((m) => [m.id, m]));

export const CHALLENGES = [
  { id: 'threeHeroes', name: '三人成行', desc: '最多只能部署 3 名英雄' },
  { id: 'doubleSpeed', name: '疾风突袭', desc: '所有怪物移动速度翻倍' },
  { id: 'magesOnly', name: '法师独行', desc: '只能部署法师类英雄' },
  { id: 'oneHp', name: '背水一战', desc: '基地只有 1 点生命' },
  { id: 'fastCooldown', name: '急速施法', desc: '所有技能冷却缩短 60%' },
  { id: 'bossRush', name: 'Boss 连战', desc: '每个 Boss 波次连续刷新 2 只 Boss' },
] as const;
