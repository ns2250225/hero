/** 战斗场景逻辑坐标（PRD 3.2） */
export const GAME_W = 1280;
export const GAME_H = 720;

export const LAYOUT = {
  /** 左侧防线 x（怪物抵达此处即突破） */
  baseLine: 58,
  /** 英雄布置区水平范围 */
  heroMinX: 110,
  heroMaxX: 430,
  /** 怪物生成 x */
  spawnX: 1230,
  spawnVariance: 70,
  /** 地面表面 y（地平线） */
  groundSurface: 470,
  /** 地面单位脚底 y 范围 */
  laneTop: 486,
  laneBottom: 604,
  /** 空中单位（飞行怪）y 范围 */
  airTop: 292,
  airBottom: 430,
  /** 顶部 / 底部 UI 占用高度（PRD 3.2） */
  uiTop: 86,
  uiBottom: 620,
  /** 前中后排推荐 x（仅为相对站位，不是独立通道） */
  frontRowX: 355,
  midRowX: 275,
  backRowX: 195,
} as const;

/** 英雄最终渲染缩放 */
export const SPRITE_SCALE = 1.55;

/** 复活基础时间（秒） */
export const REVIVE_TIME = 20;
export const REVIVE_HP_PCT = 0.5;

/** 突破伤害 */
export const BREACH_DAMAGE: Record<string, number> = {
  normal: 1,
  fast: 2,
  elite: 5,
  boss: 20,
};

/** 经验曲线：队伍等级 → 升级所需经验 */
export function expForLevel(level: number): number {
  return Math.round(18 + level * 11 + Math.pow(level, 1.75) * 1.35);
}

/** 英雄属性对伤害的换算 */
export function damageAfterDefense(raw: number, defense: number): number {
  const reduce = defense / (defense + 90);
  return Math.max(1, raw * (1 - reduce));
}

/** 每波持续时间的上限（防止漏怪卡关）；超过后强制执行下一波 */
export const WAVE_HARD_LIMIT = 75;
export const INTERMISSION = 4;

/** 无尽模式波次上限保护 */
export const MAX_WAVE_SAFE = 999;

/** 刷新次数基础值 */
export const BASE_REFRESH = 3;

/** 部署上限 */
export const BASE_DEPLOY_CAP = 6;
export const HARD_DEPLOY_CAP = 8;

/** 动画帧时长（毫秒） */
export const ANIM = {
  heroIdle: 420,
  heroAttack: 130,
  heroCast: 200,
  heroHurt: 180,
  heroDeath: 500,
  enemyMove: 260,
  enemyAttack: 180,
  summonIdle: 380,
};

/** 伤害数字合并窗口（毫秒） */
export const DAMAGE_MERGE_MS = 220;
export const MAX_DAMAGE_TEXTS = 60;
