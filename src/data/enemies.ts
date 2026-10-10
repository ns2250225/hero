import type { EnemyConfig } from '@/types/enemy';

export type { EnemyConfig };

const E = (c: EnemyConfig): EnemyConfig => c;

export const ENEMIES: EnemyConfig[] = [
  // ===== 普通怪物 =====
  E({
    id: 'slime', name: '史莱姆', maxHp: 46, attack: 7, defense: 0, moveSpeed: 42, attackRange: 36, attackSpeed: 0.7,
    expReward: 4, goldReward: 3, baseDamage: 1, abilities: [], spriteKey: 'enemy_slime', shape: 'slime',
    colors: ['#4ad86a', '#2a9a44', '#0d3a18'], scale: 1, special: false, desc: '最基础的怪物，行动缓慢。',
  }),
  E({
    id: 'skeleton', name: '骷髅兵', maxHp: 62, attack: 10, defense: 2, moveSpeed: 50, attackRange: 38, attackSpeed: 0.9,
    expReward: 5, goldReward: 4, baseDamage: 1, abilities: [], spriteKey: 'enemy_skeleton', shape: 'skeleton',
    colors: ['#e8e4d0', '#a8a490', '#403c30'], scale: 1, special: false, desc: '挥舞骨刀的亡灵士兵。',
  }),
  E({
    id: 'goblin', name: '哥布林', maxHp: 56, attack: 9, defense: 1, moveSpeed: 58, attackRange: 36, attackSpeed: 1.1,
    expReward: 5, goldReward: 4, baseDamage: 1, abilities: [], spriteKey: 'enemy_goblin', shape: 'goblin',
    colors: ['#7ac04a', '#4a8a2a', '#1e3a10'], scale: 1, special: false, desc: '手持匕首的小型侵略者。',
  }),
  E({
    id: 'wolf', name: '野狼', maxHp: 52, attack: 11, defense: 0, moveSpeed: 88, attackRange: 38, attackSpeed: 1.3,
    expReward: 6, goldReward: 4, baseDamage: 2, abilities: ['fast'], spriteKey: 'enemy_wolf', shape: 'wolf',
    colors: ['#8a8a96', '#5a5a66', '#20202a'], scale: 1, special: false, desc: '移动极快的野兽。',
  }),
  E({
    id: 'bat', name: '蝙蝠', maxHp: 34, attack: 8, defense: 0, moveSpeed: 96, attackRange: 40, attackSpeed: 1.4,
    expReward: 5, goldReward: 4, baseDamage: 2, abilities: ['fast'], spriteKey: 'enemy_bat', shape: 'bat',
    colors: ['#6a4a8a', '#402a5a', '#160820'], scale: 1, special: false, desc: '成群扑向防线的空中生物。',
  }),
  E({
    id: 'mushroom', name: '蘑菇怪', maxHp: 84, attack: 7, defense: 5, moveSpeed: 34, attackRange: 36, attackSpeed: 0.6,
    expReward: 6, goldReward: 5, baseDamage: 1, abilities: [], spriteKey: 'enemy_mushroom', shape: 'mushroom',
    colors: ['#e05a7a', '#f0d8c0', '#7a2030'], scale: 1, special: false, desc: '皮厚的植物型怪物。',
  }),
  E({
    id: 'imp', name: '小恶魔', maxHp: 72, attack: 12, defense: 2, moveSpeed: 64, attackRange: 230, attackSpeed: 1,
    expReward: 8, goldReward: 6, baseDamage: 1, abilities: ['ranged'], spriteKey: 'enemy_imp', shape: 'imp',
    colors: ['#d04a3a', '#8a2a20', '#3a0a06'], scale: 1, special: false, desc: '投掷火球的恶魔。',
  }),
  E({
    id: 'spider', name: '机械蜘蛛', maxHp: 94, attack: 13, defense: 6, moveSpeed: 56, attackRange: 240, attackSpeed: 1.2,
    expReward: 9, goldReward: 7, baseDamage: 1, abilities: ['ranged'], spriteKey: 'enemy_spider', shape: 'spider',
    colors: ['#8a94a4', '#5a6372', '#22262e'], scale: 1, special: false, desc: '发射弹丸的机械造物。',
  }),

  // ===== 特殊怪物 =====
  E({
    id: 'shieldman', name: '盾牌怪', maxHp: 170, attack: 12, defense: 16, moveSpeed: 38, attackRange: 40, attackSpeed: 0.8,
    expReward: 12, goldReward: 10, baseDamage: 1, abilities: ['shield'], spriteKey: 'enemy_shieldman', shape: 'shieldman',
    colors: ['#b8b0a0', '#7a7060', '#3a3228'], scale: 1.15, special: true, desc: '正面减伤 65%，需要范围或侧击破防。',
  }),
  E({
    id: 'boar', name: '冲锋怪', maxHp: 130, attack: 15, defense: 3, moveSpeed: 72, attackRange: 40, attackSpeed: 1,
    expReward: 11, goldReward: 9, baseDamage: 2, abilities: ['charge'], spriteKey: 'enemy_boar', shape: 'boar',
    colors: ['#9a7a5a', '#6a4a2a', '#2e1e10'], scale: 1.2, special: true, desc: '周期性加速冲锋。',
  }),
  E({
    id: 'bomber', name: '自爆怪', maxHp: 70, attack: 9, defense: 0, moveSpeed: 98, attackRange: 44, attackSpeed: 1,
    expReward: 10, goldReward: 8, baseDamage: 2, abilities: ['explode', 'fast'], spriteKey: 'enemy_bomber', shape: 'bomber',
    colors: ['#e0a020', '#8a5a10', '#3a2408'], scale: 1, special: true, desc: '靠近英雄后自爆，造成范围伤害。',
  }),
  E({
    id: 'shaman', name: '治疗怪', maxHp: 140, attack: 9, defense: 4, moveSpeed: 36, attackRange: 44, attackSpeed: 0.8,
    expReward: 13, goldReward: 11, baseDamage: 1, abilities: ['healer'], spriteKey: 'enemy_shaman', shape: 'shaman',
    colors: ['#4ac0b0', '#2a7a70', '#10302c'], scale: 1.15, special: true, desc: '持续恢复周围怪物的生命。',
  }),
  E({
    id: 'necro', name: '召唤怪', maxHp: 155, attack: 11, defense: 5, moveSpeed: 42, attackRange: 260, attackSpeed: 0.8,
    expReward: 14, goldReward: 12, baseDamage: 1, abilities: ['summoner', 'ranged'], spriteKey: 'enemy_necro', shape: 'necro',
    colors: ['#7a5ad0', '#4a2a8a', '#1a0a34'], scale: 1.2, special: true, desc: '不断召唤小型骷髅。',
  }),
  E({
    id: 'eye', name: '飞行怪', maxHp: 95, attack: 12, defense: 2, moveSpeed: 92, attackRange: 52, attackSpeed: 1.1,
    expReward: 12, goldReward: 10, baseDamage: 2, abilities: ['flying', 'fast'], spriteKey: 'enemy_eye', shape: 'eye',
    colors: ['#c05ad0', '#7a2a8a', '#2a0a34'], scale: 1.1, special: true, desc: '飞行单位，可越过近战阻挡。',
  }),
  E({
    id: 'bigslime', name: '分裂怪', maxHp: 190, attack: 13, defense: 4, moveSpeed: 36, attackRange: 46, attackSpeed: 0.7,
    expReward: 13, goldReward: 11, baseDamage: 1, abilities: ['split'], spriteKey: 'enemy_bigslime', shape: 'bigslime',
    colors: ['#3ad0c0', '#1a8a80', '#083430'], scale: 1.35, special: true, desc: '死亡后分裂成两只小史莱姆。',
  }),
  E({
    id: 'ghost', name: '隐身怪', maxHp: 120, attack: 16, defense: 1, moveSpeed: 62, attackRange: 44, attackSpeed: 1.2,
    expReward: 13, goldReward: 11, baseDamage: 2, abilities: ['stealth', 'flying'], spriteKey: 'enemy_ghost', shape: 'ghost',
    colors: ['#c8d8f0', '#8a9ac0', '#3a4460'], scale: 1.1, special: true, desc: '周期性隐藏身形，难以被锁定。',
  }),
  E({
    id: 'ogre', name: '巨型怪', maxHp: 420, attack: 22, defense: 10, moveSpeed: 30, attackRange: 56, attackSpeed: 0.6,
    expReward: 26, goldReward: 22, baseDamage: 5, abilities: ['giant'], spriteKey: 'enemy_ogre', shape: 'ogre',
    colors: ['#a88460', '#6a4a30', '#2a1a10'], scale: 1.7, special: true, desc: '高生命值的巨兽，突破防线造成 5 点伤害。',
  }),
  E({
    id: 'archer', name: '远程怪', maxHp: 105, attack: 14, defense: 3, moveSpeed: 46, attackRange: 330, attackSpeed: 0.9,
    expReward: 12, goldReward: 10, baseDamage: 1, abilities: ['ranged'], spriteKey: 'enemy_archer', shape: 'archer',
    colors: ['#6a8a4a', '#3a5a2a', '#16220e'], scale: 1.1, special: true, desc: '在远处向英雄射击。',
  }),
];

export const ENEMY_MAP: Record<string, EnemyConfig> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

export const NORMAL_ENEMIES = ENEMIES.filter((e) => !e.special).map((e) => e.id);
export const SPECIAL_ENEMIES = ENEMIES.filter((e) => e.special).map((e) => e.id);

/** 每种怪物在波次池中的权重（波次越高特殊怪越多） */
export const ENEMY_MIN_WAVE: Record<string, number> = {
  slime: 1, skeleton: 1, goblin: 2, wolf: 4, mushroom: 5, bat: 4, imp: 6, spider: 7,
  shieldman: 8, archer: 8, boar: 9, bomber: 10, shaman: 11, bigslime: 12, eye: 12, ghost: 13, necro: 14, ogre: 14,
};
