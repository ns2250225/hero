import { Grid, type Palette } from './raster';
import type { HeroConfig } from '@/data/heroes';
import type { EnemyConfig } from '@/data/enemies';
import type { BossConfig } from '@/data/bosses';
import { shade, lighten } from './icons';

/** 纹理键名 */
export function heroSpriteKey(id: string, frame: string): string {
  return `hero_${id}_${frame}`;
}

export const CHAR_W = 24;
export const CHAR_H = 32;
export const BOSS_W = 34;
export const BOSS_H = 42;
export const WEAPON_W = 20;
export const WEAPON_H = 20;

export interface SpriteDef {
  pixels: string[];
  palette: Palette;
}

/* ================================================================== */
/*  英雄                                                              */
/* ================================================================== */

export const HERO_FRAME_NAMES = ['idleA', 'idleB', 'atkA', 'atkB', 'cast', 'hurt', 'death', 'awakenIdle'] as const;
export type HeroFrameName = (typeof HERO_FRAME_NAMES)[number];

interface PoseOffsets {
  /** 整体垂直偏移（呼吸/受击） */
  dy: number;
  /** 整体水平偏移（前倾/后仰） */
  dx: number;
  /** 前臂抬起高度 */
  armUp: number;
  /** 前臂前伸距离 */
  armOut: number;
  /** 后臂 */
  backArmUp: number;
  /** 头部偏移 */
  headDy: number;
  /** 是否倒地 */
  lying: boolean;
}

function heroPose(frame: HeroFrameName): PoseOffsets {
  const p: PoseOffsets = { dy: 0, dx: 0, armUp: 0, armOut: 0, backArmUp: 0, headDy: 0, lying: false };
  switch (frame) {
    case 'idleA':
      break;
    case 'idleB':
      p.dy = -1;
      p.headDy = -1;
      break;
    case 'atkA':
      p.armOut = 2;
      p.armUp = -1;
      p.dx = 1;
      break;
    case 'atkB':
      p.armOut = 5;
      p.armUp = -2;
      p.dx = 2;
      p.dy = -1;
      break;
    case 'cast':
      p.armUp = -6;
      p.armOut = 3;
      p.dy = -1;
      p.headDy = -1;
      break;
    case 'hurt':
      p.dx = -2;
      p.dy = 1;
      p.headDy = 1;
      break;
    case 'death':
      p.lying = true;
      break;
    case 'awakenIdle':
      p.dy = -1;
      p.headDy = -1;
      break;
  }
  return p;
}

function heroPalette(cfg: HeroConfig): Palette {
  const { body, body2, accent, skin, hair, weapon, weapon2 } = cfg.palette;
  return {
    '1': body,
    '2': body2,
    '3': accent,
    '4': skin,
    '5': hair,
    '6': weapon,
    '7': weapon2,
    '8': shade(body2, -0.55),
    '9': '#20141c',
    a: lighten(body, 0.3),
    b: shade(body, -0.25),
    c: lighten(body2, 0.2),
    d: shade(skin, -0.25),
    e: lighten(accent, 0.35),
    f: '#ffffff',
  };
}

/**
 * 人类角色 24×32：身体与武器分离绘制，武器单独作为精灵旋转瞄准。
 */
export function buildHeroGrid(cfg: HeroConfig, frame: HeroFrameName, scale = 1): SpriteDef {
  const P = heroPalette(cfg);
  const p = heroPose(frame);
  const g = new Grid(CHAR_W, CHAR_H);
  const S = scale;
  const s = (v: number) => Math.round(v * S);

  if (p.lying) {
    // 倒地：横躺姿势
    g.rect(s(2), s(26), s(16), s(4), '1');
    g.rect(s(2), s(28), s(16), s(2), '2');
    g.ellipse(s(20), s(27), s(3), s(3), '4');
    g.rect(s(6), s(25), s(4), s(2), '3');
    g.set(s(16), s(27), '9');
    g.outline('1', '8');
    g.outline('4', '8');
    return { pixels: g.rows(), palette: P };
  }

  const dx = p.dx;
  const dy = p.dy + p.headDy * 0;
  const cx = 11;

  // ---- 腿 ----
  const legTop = 24 + dy;
  g.rect(s(cx - 3), s(legTop), s(3), s(7 - dy), '2');
  g.rect(s(cx + 1), s(legTop), s(3), s(7 - dy), '2');
  // 靴子
  g.rect(s(cx - 4), s(29 + dy), s(4), s(2), '3');
  g.rect(s(cx + 1), s(29 + dy), s(4), s(2), '3');

  // ---- 躯干 ----
  const torsoTop = 16 + dy;
  const torsoH = 9;
  g.rect(s(cx - 4 + dx), s(torsoTop), s(9), s(torsoH), '1');
  g.rect(s(cx - 4 + dx), s(torsoTop), s(3), s(torsoH), 'b');
  g.rect(s(cx + 3 + dx), s(torsoTop), s(2), s(torsoH), 'a');
  // 腰带 / 胸甲装饰
  g.rect(s(cx - 4 + dx), s(torsoTop + torsoH - 2), s(9), s(2), '3');
  g.rect(s(cx - 1 + dx), s(torsoTop + 1), s(3), s(3), '3');

  // ---- 披风 ----
  if (cfg.cape) {
    g.rect(s(cx - 6 + dx), s(torsoTop), s(2), s(torsoH + 5), 'c');
    g.rect(s(cx + 4 + dx), s(torsoTop + 1), s(2), s(torsoH + 3), '2');
  }

  // ---- 肩甲 ----
  g.rect(s(cx - 6 + dx), s(torsoTop - 1), s(4), s(3), 'a');
  g.rect(s(cx + 3 + dx), s(torsoTop - 1), s(4), s(3), 'a');
  g.set(s(cx - 6 + dx), s(torsoTop - 2), '3');
  g.set(s(cx + 6 + dx), s(torsoTop - 2), '3');

  // ---- 后臂 ----
  const backArmTop = torsoTop + 1 + p.backArmUp;
  g.rect(s(cx - 6 + dx), s(backArmTop), s(2), s(6), '2');
  g.rect(s(cx - 6 + dx), s(backArmTop + 6), s(2), s(1), '4');

  // ---- 前臂（持武器）----
  const armTop = torsoTop + 1 + p.armUp;
  const armX = cx + 5 + dx + p.armOut;
  g.rect(s(armX), s(armTop), s(2), s(6), '1');
  g.rect(s(armX), s(armTop + 5), s(3), s(2), '4');
  // 手套/护腕
  g.rect(s(armX), s(armTop + 4), s(2), s(2), '3');
  // 手动位置（供武器精灵定位，单位为格）
  const handX = armX + 2;
  const handY = armTop + 6;

  // ---- 头 ----
  const headCy = 10 + dy + p.headDy;
  g.ellipse(s(cx + dx), s(headCy), s(4), s(4.5), '4');
  // 下巴阴影
  g.rect(s(cx - 2 + dx), s(headCy + 3), s(5), s(1), 'd');
  // 脖子
  g.rect(s(cx - 1 + dx), s(headCy + 4), s(3), s(2), 'd');
  // 眼睛
  g.set(s(cx + 3 + dx), s(headCy - 1), '9');
  g.set(s(cx + dx), s(headCy - 1), '9');
  // 嘴
  g.set(s(cx + 2 + dx), s(headCy + 2), '9');

  // ---- 头饰 / 头发 ----
  drawHeadgear(g, cfg, s, cx + dx, headCy, dy);

  // ---- 觉醒光晕 ----
  if (frame === 'awakenIdle') {
    g.ellipse(s(cx + dx), s(headCy - 8), s(1.5), s(1), 'f');
  }

  g.outline('1', '8');
  g.outline('2', '8');
  g.outline('3', '8');
  g.outline('4', '8');
  g.outline('5', '8');
  g.outline('a', '8');
  g.outline('c', '8');

  void handX;
  void handY;

  return { pixels: g.rows(), palette: P };
}

/** 返回hand相对角色的像素偏移（未缩放坐标） */
export function heroHandOffset(frame: HeroFrameName, scale = 1): { x: number; y: number } {
  const p = heroPose(frame);
  const cx = 11;
  const torsoTop = 16 + p.dy;
  const armTop = torsoTop + 1 + p.armUp;
  const armX = cx + 5 + p.dx + p.armOut;
  return { x: (armX + 2) * scale, y: (armTop + 5) * scale };
}

function drawHeadgear(g: Grid, cfg: HeroConfig, s: (v: number) => number, cx: number, headCy: number, dy: number): void {
  switch (cfg.headGear) {
    case 'helmet': {
      g.dome(s(cx), s(headCy - 1), s(4.5), s(4.5), '1');
      g.rect(s(cx - 5), s(headCy - 1), s(11), s(1), '3');
      g.rect(s(cx - 1), s(headCy - 4), s(3), s(1), '3');
      break;
    }
    case 'hood': {
      g.dome(s(cx), s(headCy + 1), s(5), s(6), '2');
      g.rect(s(cx - 5), s(headCy + 1), s(11), s(2), '2');
      g.rect(s(cx - 3), s(headCy - 5), s(7), s(2), '1');
      g.rect(s(cx - 4), s(headCy + 4), s(9), s(2), '2');
      break;
    }
    case 'wizard': {
      g.dome(s(cx), s(headCy - 2), s(3), s(4), '1');
      g.rect(s(cx - 1), s(headCy - 8), s(3), s(4), '1');
      g.rect(s(cx - 7), s(headCy - 2), s(15), s(2), 'a');
      g.rect(s(cx - 7), s(headCy - 1), s(15), s(1), '2');
      g.set(s(cx + 1), s(headCy - 8), '3');
      break;
    }
    case 'hair': {
      g.dome(s(cx), s(headCy - 1), s(4.5), s(4), '5');
      g.rect(s(cx - 5), s(headCy - 1), s(2), s(4), '5');
      g.rect(s(cx + 4), s(headCy - 1), s(2), s(3), '5');
      break;
    }
    case 'halo': {
      g.dome(s(cx), s(headCy - 2), s(4.5), s(4), '5');
      g.rect(s(cx - 4), s(headCy - 7), s(9), s(1), '3');
      g.rect(s(cx - 3), s(headCy - 8), s(7), s(1), 'e');
      break;
    }
    case 'goggles': {
      g.dome(s(cx), s(headCy - 1), s(4.5), s(4), '5');
      g.rect(s(cx - 5), s(headCy - 2), s(11), s(1), '2');
      g.rect(s(cx - 4), s(headCy - 2), s(4), s(2), '3');
      g.rect(s(cx + 1), s(headCy - 2), s(4), s(2), '3');
      g.rect(s(cx - 4), s(headCy - 1), s(2), s(1), 'f');
      g.rect(s(cx + 3), s(headCy - 1), s(2), s(1), 'f');
      break;
    }
    case 'horned': {
      g.dome(s(cx), s(headCy - 1), s(4.5), s(4), '5');
      g.line(s(cx - 4), s(headCy - 4), s(cx - 7), s(headCy - 8), '2');
      g.line(s(cx + 4), s(headCy - 4), s(cx + 7), s(headCy - 8), '2');
      g.set(s(cx - 7), s(headCy - 9), '3');
      g.set(s(cx + 7), s(headCy - 9), '3');
      break;
    }
    case 'bandana': {
      g.dome(s(cx), s(headCy - 1), s(4.5), s(4), '5');
      g.rect(s(cx - 5), s(headCy - 3), s(11), s(2), '1');
      g.rect(s(cx - 5), s(headCy - 3), s(11), s(1), '3');
      g.line(s(cx - 6), s(headCy - 3), s(cx - 9), s(headCy - 1), '1');
      g.line(s(cx - 9), s(headCy - 1), s(cx - 11), s(headCy + 2), '2');
      break;
    }
  }
  void dy;
}

/* ---------------- 武器精灵（指向右方） ---------------- */

export type WeaponArt = HeroConfig['weaponArt'];

export function buildWeaponGrid(cfg: HeroConfig, scale = 1): SpriteDef {
  const g = new Grid(WEAPON_W, WEAPON_H);
  const s = (v: number) => Math.round(v * scale);
  const P: Palette = {
    '6': cfg.palette.weapon,
    '7': cfg.palette.weapon2,
    '8': shade(cfg.palette.weapon2, -0.5),
    '3': cfg.palette.accent,
    f: '#ffffff',
    w: '#c89a5a',
  };

  switch (cfg.weaponArt) {
    case 'sword': {
      g.rect(s(2), s(9), s(3), s(3), 'w');
      g.rect(s(5), s(9), s(2), s(3), '3');
      g.rect(s(6), s(10), s(10), s(2), '6');
      g.rect(s(15), s(10), s(3), s(2), '7');
      g.rect(s(6), s(10), s(9), s(1), 'f');
      break;
    }
    case 'holySword': {
      g.rect(s(2), s(9), s(3), s(3), 'w');
      g.rect(s(4), s(8), s(2), s(5), '3');
      g.rect(s(6), s(9), s(11), s(3), '6');
      g.rect(s(16), s(10), s(3), s(1), '7');
      g.rect(s(8), s(8), s(3), s(5), '3');
      break;
    }
    case 'dagger': {
      g.rect(s(3), s(10), s(3), s(2), 'w');
      g.rect(s(6), s(10), s(7), s(2), '6');
      g.rect(s(12), s(10), s(2), s(2), '7');
      break;
    }
    case 'bow': {
      g.line(s(4), s(4), s(7), s(10), 'w');
      g.line(s(7), s(10), s(4), s(16), 'w');
      g.line(s(4), s(4), s(4), s(16), '7');
      g.line(s(7), s(10), s(14), s(10), '6');
      g.set(s(15), s(10), 'f');
      break;
    }
    case 'staff': {
      g.rect(s(9), s(9), s(10), s(3), '6');
      g.rect(s(17), s(8), s(3), s(5), '7');
      g.ellipse(s(18), s(10), s(2), s(2), '3');
      break;
    }
    case 'scythe': {
      g.rect(s(3), s(11), s(14), s(2), '6');
      g.line(s(3), s(10), s(3), s(4), '7');
      g.line(s(3), s(4), s(9), s(2), '7');
      g.line(s(9), s(2), s(11), s(6), '6');
      break;
    }
    case 'mace': {
      g.rect(s(3), s(10), s(11), s(3), '6');
      g.ellipse(s(15), s(11), s(3), s(3), '7');
      break;
    }
    case 'gun': {
      g.rect(s(3), s(9), s(12), s(4), '6');
      g.rect(s(13), s(10), s(4), s(2), '7');
      g.rect(s(5), s(12), s(3), s(3), '8');
      break;
    }
    case 'book': {
      g.rect(s(6), s(6), s(9), s(9), '6');
      g.rect(s(7), s(7), s(7), s(7), 'f');
      g.rect(s(10), s(9), s(2), s(4), '3');
      g.rect(s(8), s(10), s(6), s(2), '3');
      break;
    }
    case 'flask': {
      g.rect(s(6), s(8), s(4), s(3), '6');
      g.rect(s(5), s(11), s(6), s(5), '7');
      g.rect(s(6), s(12), s(4), s(3), '3');
      break;
    }
  }

  g.outline('6', '8');
  g.outline('7', '8');
  g.outline('3', '8');
  return { pixels: g.rows(), palette: P };
}

/* ================================================================== */
/*  怪物                                                              */
/* ================================================================== */

export const ENEMY_FRAMES = ['moveA', 'moveB', 'attack', 'hurt', 'death'] as const;
export type EnemyFrameName = (typeof ENEMY_FRAMES)[number];

export function buildEnemyGrid(cfg: EnemyConfig, frame: EnemyFrameName, scale = 1): SpriteDef {
  const [main, dark, outline] = cfg.colors;
  const g = new Grid(CHAR_W, CHAR_H);
  const s = (v: number) => Math.round(v * scale);
  const cx = 11;
  const dead = frame === 'death';
  const bounce = frame === 'moveB' ? -s(2) : 0;
  const lean = frame === 'attack' ? s(2) : frame === 'hurt' ? -s(2) : 0;

  const P: Palette = {
    '#': main,
    '+': dark,
    o: lighten(main, 0.35),
    x: outline,
    e: '#ffffff',
    p: '#171720',
    w: lighten(main, 0.6),
    f: '#ffffff',
  };

  switch (cfg.shape) {
    case 'slime': {
      const rw = s(9);
      const rh = s(dead ? 3 : 8);
      const baseY = s(29) + bounce;
      g.dome(cx + lean, baseY, rw, rh, '#');
      g.rect(cx - rw + lean, baseY - s(1), rw * 2 + 1, s(2), '+');
      g.ellipse(cx - s(3) + lean, baseY - rh + s(3), s(2), s(1.5), 'o');
      if (!dead) {
        g.rect(cx - s(5) + lean, baseY - s(5), s(2), s(2), 'p');
        g.rect(cx + s(2) + lean, baseY - s(5), s(2), s(2), 'p');
      }
      break;
    }
    case 'bigslime': {
      const rw = s(11);
      const rh = s(dead ? 4 : 10);
      const baseY = s(30) + bounce;
      g.dome(cx + lean, baseY, rw, rh, '#');
      g.rect(cx - rw + lean, baseY - s(1), rw * 2 + 1, s(2), '+');
      g.ellipse(cx - s(4) + lean, baseY - rh + s(3), s(2.5), s(2), 'o');
      g.ellipse(cx + s(5) + lean, baseY - s(6), s(2), s(1.5), 'o');
      if (!dead) {
        g.rect(cx - s(6) + lean, baseY - s(6), s(2), s(3), 'p');
        g.rect(cx + s(3) + lean, baseY - s(6), s(2), s(3), 'p');
      }
      break;
    }
    case 'skeleton': {
      const y = bounce;
      g.ellipse(cx + lean, s(9) + y, s(4), s(4), '#');
      g.rect(cx - s(3) + lean, s(12) + y, s(7), s(2), '+');
      g.rect(cx - s(4) + lean, s(14) + y, s(9), s(7), '#');
      for (let i = 0; i < 3; i++) g.rect(cx - s(3) + i * s(3) + lean, s(15) + y, s(1), s(6), '+');
      g.rect(cx - s(4) + lean, s(21) + y, s(3), s(9), '#');
      g.rect(cx + s(2) + lean, s(21) + y, s(3), s(9), '#');
      g.rect(cx - s(6) + lean, s(19) + y, s(2), s(6), '#');
      g.rect(cx + s(5) + lean, s(19) + y, s(2), s(6), '#');
      if (!dead) {
        g.rect(cx - s(3) + lean, s(8) + y, s(2), s(2), 'p');
        g.rect(cx + s(1) + lean, s(8) + y, s(2), s(2), 'p');
        g.rect(cx - s(2) + lean, s(11) + y, s(4), s(1), 'p');
      }
      break;
    }
    case 'goblin': {
      const y = bounce;
      g.ellipse(cx + lean, s(10) + y, s(5), s(4.5), '#');
      g.ellipse(cx - s(5) + lean, s(8) + y, s(3), s(2.5), '#');
      g.ellipse(cx + s(5) + lean, s(8) + y, s(3), s(2.5), '#');
      g.ellipse(cx + lean, s(10) + y, s(2.5), s(2), '+');
      g.rect(cx - s(4) + lean, s(14) + y, s(9), s(8), '#');
      g.rect(cx - s(4) + lean, s(17) + y, s(9), s(1), '+');
      g.rect(cx - s(5) + lean, s(22) + y, s(3), s(8), '+');
      g.rect(cx + s(3) + lean, s(22) + y, s(3), s(8), '+');
      if (!dead) {
        g.rect(cx - s(3) + lean, s(9) + y, s(2), s(2), 'p');
        g.rect(cx + s(1) + lean, s(9) + y, s(2), s(2), 'p');
      }
      break;
    }
    case 'wolf': {
      const y = bounce;
      g.ellipse(cx + s(1) + lean, s(19) + y, s(10), s(5), '#');
      g.ellipse(cx + s(8) + lean, s(15) + y, s(5), s(4), '#');
      g.line(cx + s(11) + lean, s(11) + y, cx + s(13) + lean, s(8) + y, '+');
      g.line(cx + s(9) + lean, s(11) + y, cx + s(9) + lean, s(8) + y, '+');
      g.rect(cx - s(7) + lean, s(22) + y, s(3), s(7), '+');
      g.rect(cx + s(1) + lean, s(22) + y, s(3), s(7), '+');
      g.rect(cx + s(5) + lean, s(22) + y, s(3), s(7), '+');
      g.line(cx - s(9) + lean, s(17) + y, cx - s(13) + lean, s(13) + y, '+');
      if (!dead) {
        g.rect(cx + s(8) + lean, s(14) + y, s(2), s(2), 'e');
        g.rect(cx + s(11) + lean, s(18) + y, s(2), s(1), 'w');
        g.rect(cx + s(6) + lean, s(18) + y, s(2), s(1), 'w');
      }
      break;
    }
    case 'bat': {
      const y = -s(7) + bounce;
      g.ellipse(cx + lean, s(17) + y, s(4), s(4), '#');
      g.ellipse(cx - s(8) + lean, s(16) + y, s(6), s(4), '+');
      g.ellipse(cx + s(8) + lean, s(16) + y, s(6), s(4), '+');
      g.line(cx - s(13) + lean, s(15) + y, cx - s(11) + lean, s(9) + y, '+');
      g.line(cx + s(13) + lean, s(15) + y, cx + s(11) + lean, s(9) + y, '+');
      g.rect(cx - s(3) + lean, s(12) + y, s(2), s(2), 'e');
      g.rect(cx + s(1) + lean, s(12) + y, s(2), s(2), 'e');
      if (!dead) {
        g.rect(cx - s(2) + lean, s(20) + y, s(4), s(1), 'w');
        g.line(cx - s(2) + lean, s(8) + y, cx - s(4) + lean, s(4) + y, '+');
        g.line(cx + s(2) + lean, s(8) + y, cx + s(4) + lean, s(4) + y, '+');
      }
      break;
    }
    case 'mushroom': {
      const y = bounce;
      g.dome(cx + lean, s(16) + y, s(10), s(7), '#');
      g.rect(cx - s(10) + lean, s(15) + y, s(21), s(2), '+');
      g.ellipse(cx - s(5) + lean, s(12) + y, s(2), s(1.6), 'o');
      g.ellipse(cx + s(4) + lean, s(13) + y, s(2), s(1.6), 'o');
      g.rect(cx - s(4) + lean, s(17) + y, s(9), s(11), 'o');
      g.rect(cx - s(4) + lean, s(17) + y, s(2), s(11), '+');
      if (!dead) {
        g.rect(cx - s(3) + lean, s(20) + y, s(2), s(3), 'p');
        g.rect(cx + s(2) + lean, s(20) + y, s(2), s(3), 'p');
      }
      break;
    }
    case 'imp': {
      const y = bounce;
      g.ellipse(cx + lean, s(10) + y, s(4.5), s(4.5), '#');
      g.line(cx - s(4) + lean, s(6) + y, cx - s(6) + lean, s(2) + y, '+');
      g.line(cx + s(4) + lean, s(6) + y, cx + s(6) + lean, s(2) + y, '+');
      g.ellipse(cx + lean, s(14) + y, s(4), s(4), '#');
      g.ellipse(cx + lean, s(15) + y, s(2.5), s(2.5), '+');
      g.line(cx - s(8) + lean, s(13) + y, cx - s(12) + lean, s(10) + y, '+');
      g.line(cx - s(12) + lean, s(10) + y, cx - s(13) + lean, s(6) + y, '+');
      g.line(cx + s(8) + lean, s(13) + y, cx + s(12) + lean, s(10) + y, '+');
      g.line(cx + s(12) + lean, s(10) + y, cx + s(13) + lean, s(6) + y, '+');
      g.rect(cx - s(3) + lean, s(18) + y, s(3), s(6), '#');
      g.rect(cx + s(1) + lean, s(18) + y, s(3), s(6), '#');
      if (!dead) {
        g.rect(cx - s(3) + lean, s(9) + y, s(2), s(2), 'e');
        g.rect(cx + s(1) + lean, s(9) + y, s(2), s(2), 'e');
        g.rect(cx - s(2) + lean, s(13) + y, s(4), s(1), 'p');
      }
      break;
    }
    case 'spider': {
      const y = bounce;
      g.ellipse(cx + lean, s(20) + y, s(8), s(6), '#');
      g.ellipse(cx + s(6) + lean, s(16) + y, s(4), s(4), '+');
      for (let i = 0; i < 4; i++) {
        const lx = cx - s(6) + i * s(4) + lean;
        g.line(lx, s(22) + y, lx - s(6), s(29) + y, '+');
        g.line(lx + s(2), s(22) + y, lx + s(6), s(29) + y, '+');
      }
      if (!dead) {
        g.rect(cx + s(5) + lean, s(15) + y, s(2), s(2), 'e');
        g.rect(cx + s(8) + lean, s(15) + y, s(2), s(2), 'e');
      }
      break;
    }
    case 'shieldman': {
      const y = bounce;
      g.ellipse(cx - s(2) + lean, s(10) + y, s(4), s(4.5), '#');
      g.rect(cx - s(6) + lean, s(14) + y, s(10), s(9), '#');
      g.rect(cx - s(6) + lean, s(14) + y, s(3), s(9), '+');
      g.rect(cx - s(6) + lean, s(23) + y, s(4), s(8), '+');
      g.rect(cx + s(1) + lean, s(23) + y, s(4), s(8), '+');
      g.rect(cx + s(4) + lean, s(13) + y, s(7), s(14), 'o');
      g.rect(cx + s(5) + lean, s(14) + y, s(5), s(12), '#');
      g.rect(cx + s(4) + lean, s(13) + y, s(7), s(1), '+');
      g.rect(cx + s(4) + lean, s(26) + y, s(7), s(1), '+');
      if (!dead) g.rect(cx - s(4) + lean, s(9) + y, s(2), s(2), 'p');
      break;
    }
    case 'boar': {
      const y = bounce;
      g.ellipse(cx + lean, s(19) + y, s(10), s(7), '#');
      g.ellipse(cx + s(9) + lean, s(17) + y, s(5), s(4.5), '+');
      g.line(cx + s(12) + lean, s(14) + y, cx + s(14) + lean, s(10) + y, 'w');
      g.line(cx + s(10) + lean, s(14) + y, cx + s(11) + lean, s(10) + y, 'w');
      g.rect(cx - s(7) + lean, s(24) + y, s(3), s(6), '+');
      g.rect(cx + s(2) + lean, s(24) + y, s(3), s(6), '+');
      g.line(cx - s(9) + lean, s(15) + y, cx - s(12) + lean, s(11) + y, '+');
      if (!dead) {
        g.rect(cx + s(9) + lean, s(16) + y, s(2), s(2), 'e');
        g.rect(cx + s(12) + lean, s(20) + y, s(2), s(1), 'w');
      }
      break;
    }
    case 'bomber': {
      const y = bounce;
      g.ellipse(cx + lean, s(18) + y, s(8), s(8), '#');
      g.ellipse(cx + lean, s(18) + y, s(5), s(5), '+');
      g.rect(cx - s(3) + lean, s(6) + y, s(6), s(3), '+');
      g.line(cx + s(3) + lean, s(5) + y, cx + s(5) + lean, s(2) + y, '+');
      g.ellipse(cx + s(6) + lean, s(1) + y, s(2), s(2), 'o');
      g.rect(cx - s(4) + lean, s(13) + y, s(2), s(2), 'e');
      g.rect(cx + s(2) + lean, s(13) + y, s(2), s(2), 'e');
      g.rect(cx - s(3) + lean, s(22) + y, s(7), s(1), 'p');
      break;
    }
    case 'shaman': {
      const y = bounce;
      g.dome(cx + lean, s(12) + y, s(7), s(6), '#');
      g.rect(cx - s(8) + lean, s(11) + y, s(17), s(2), '+');
      g.ellipse(cx + lean, s(15) + y, s(3.5), s(3.5), 'o');
      g.rect(cx - s(3) + lean, s(19) + y, s(7), s(9), '#');
      g.rect(cx - s(3) + lean, s(19) + y, s(7), s(2), '+');
      g.rect(cx - s(2) + lean, s(28) + y, s(5), s(3), '+');
      g.line(cx + s(4) + lean, s(20) + y, cx + s(8) + lean, s(29) + y, 'w');
      if (!dead) g.rect(cx - s(2) + lean, s(14) + y, s(2), s(2), 'p');
      break;
    }
    case 'necro': {
      const y = bounce;
      g.dome(cx + lean, s(13) + y, s(6), s(6), '+');
      g.ellipse(cx + lean, s(14) + y, s(4), s(4), '#');
      g.rect(cx - s(5) + lean, s(18) + y, s(11), s(11), '+');
      g.rect(cx - s(3) + lean, s(19) + y, s(7), s(9), '#');
      g.line(cx + s(6) + lean, s(16) + y, cx + s(10) + lean, s(11) + y, 'w');
      g.rect(cx + s(9) + lean, s(8) + y, s(3), s(3), 'o');
      if (!dead) {
        g.rect(cx - s(2) + lean, s(13) + y, s(2), s(2), 'e');
        g.rect(cx + s(1) + lean, s(13) + y, s(2), s(2), 'e');
      }
      break;
    }
    case 'eye': {
      const y = -s(8) + bounce;
      g.ellipse(cx + lean, s(17) + y, s(8), s(7), '#');
      g.ellipse(cx + lean, s(17) + y, s(4), s(3.5), 'e');
      g.ellipse(cx + lean, s(17) + y, s(2), s(2), 'p');
      g.line(cx - s(8) + lean, s(11) + y, cx - s(11) + lean, s(6) + y, '+');
      g.line(cx + s(8) + lean, s(11) + y, cx + s(11) + lean, s(6) + y, '+');
      g.line(cx + lean, s(24) + y, cx + lean, s(29) + y, '+');
      break;
    }
    case 'ghost': {
      const y = -s(4) + bounce;
      g.dome(cx + lean, s(23) + y, s(8), s(9), '#');
      g.rect(cx - s(8) + lean, s(22) + y, s(17), s(3), '#');
      for (let i = 0; i < 4; i++) g.rect(cx - s(8) + i * s(4) + lean, s(25) + y, s(3), s(3) + (i % 2) * s(2), '#');
      if (!dead) {
        g.rect(cx - s(4) + lean, s(16) + y, s(2), s(3), 'p');
        g.rect(cx + s(2) + lean, s(16) + y, s(2), s(3), 'p');
        g.rect(cx - s(1) + lean, s(21) + y, s(3), s(2), 'p');
      }
      break;
    }
    case 'ogre': {
      const y = bounce;
      g.ellipse(cx + lean, s(9) + y, s(5), s(4.5), '#');
      g.rect(cx - s(7) + lean, s(13) + y, s(15), s(11), '#');
      g.rect(cx - s(7) + lean, s(16) + y, s(15), s(1), '+');
      g.rect(cx - s(4) + lean, s(13) + y, s(9), s(4), '+');
      g.rect(cx - s(8) + lean, s(24) + y, s(6), s(7), '+');
      g.rect(cx + s(3) + lean, s(24) + y, s(6), s(7), '+');
      g.rect(cx - s(12) + lean, s(14) + y, s(5), s(9), '#');
      g.rect(cx + s(8) + lean, s(14) + y, s(5), s(9), '#');
      if (!dead) {
        g.rect(cx - s(3) + lean, s(8) + y, s(2), s(2), 'e');
        g.rect(cx + s(1) + lean, s(8) + y, s(2), s(2), 'e');
        g.rect(cx - s(2) + lean, s(12) + y, s(5), s(1), 'p');
      }
      break;
    }
    case 'archer': {
      const y = bounce;
      g.ellipse(cx + lean, s(10) + y, s(4), s(4.5), '+');
      g.rect(cx - s(4) + lean, s(14) + y, s(9), s(9), '#');
      g.rect(cx - s(4) + lean, s(14) + y, s(9), s(3), '+');
      g.rect(cx - s(4) + lean, s(23) + y, s(3), s(8), '+');
      g.rect(cx + s(2) + lean, s(23) + y, s(3), s(8), '+');
      g.line(cx + s(5) + lean, s(14) + y, cx + s(8) + lean, s(17) + y, 'w');
      g.line(cx + s(8) + lean, s(17) + y, cx + s(5) + lean, s(20) + y, 'w');
      g.rect(cx + s(4) + lean, s(16) + y, s(2), s(2), 'e');
      if (!dead) g.rect(cx - s(2) + lean, s(9) + y, s(2), s(2), 'p');
      break;
    }
  }

  if (!dead) {
    g.outline('#', 'x');
    g.outline('o', 'x');
    g.outline('w', 'x');
    g.outline('e', 'x');
  }
  return { pixels: g.rows(), palette: P };
}

/* ================================================================== */
/*  Boss                                                              */
/* ================================================================== */

export const BOSS_FRAMES = ['idleA', 'idleB', 'attack', 'hurt', 'death', 'cast'] as const;
export type BossFrameName = (typeof BOSS_FRAMES)[number];

export function buildBossGrid(cfg: BossConfig, frame: BossFrameName): SpriteDef {
  const [main, dark, accent, outline] = cfg.colors;
  const g = new Grid(BOSS_W, BOSS_H);
  const cx = 17;
  const dead = frame === 'death';
  const bounce = frame === 'idleB' ? -1 : 0;
  const lean = frame === 'attack' ? 2 : frame === 'hurt' ? -2 : 0;
  const cast = frame === 'cast';

  const P: Palette = {
    '#': main,
    '+': dark,
    '=': shade(main, -0.18),
    o: accent,
    x: outline,
    e: '#ffffff',
    p: '#12121a',
    w: lighten(main, 0.5),
    f: '#ffffff',
  };

  switch (cfg.shape) {
    case 'tree': {
      g.rect(cx - 4, 18, 9, 22, '+');
      for (let i = 0; i < 3; i++) {
        g.line(cx - 4, 33 + i * 2, cx - 13, 29 + i * 3, '+');
        g.line(cx + 4, 33 + i * 2, cx + 13, 29 + i * 3, '+');
      }
      g.ellipse(cx, 12 + bounce, 14, 11, '#');
      g.ellipse(cx - 8, 7 + bounce, 8, 7, '=');
      g.ellipse(cx + 8, 8 + bounce, 7, 6, '=');
      g.ellipse(cx - 4, 14 + bounce, 2, 2, 'o');
      if (!dead) {
        g.rect(cx - 8, 11 + bounce, 4, 4, 'o');
        g.rect(cx + 4, 11 + bounce, 4, 4, 'o');
        g.rect(cx - 4, 20 + bounce, 10, 3, 'p');
      }
      break;
    }
    case 'skullLord': {
      g.ellipse(cx, 12 + bounce, 10, 10, '#');
      g.rect(cx - 8, 18 + bounce, 17, 6, '=');
      if (!dead) {
        g.rect(cx - 6, 11 + bounce, 4, 4, 'o');
        g.rect(cx + 3, 11 + bounce, 4, 4, 'o');
        g.rect(cx - 1, 17 + bounce, 3, 4, 'p');
        g.rect(cx - 5, 24 + bounce, 11, 2, 'p');
      }
      g.rect(cx - 7, 25 + bounce, 15, 12, '=');
      g.rect(cx - 7, 27 + bounce, 15, 2, '+');
      g.rect(cx - 6, 37 + bounce, 5, 4, '+');
      g.rect(cx + 2, 37 + bounce, 5, 4, '+');
      g.rect(cx - 13, 25 + bounce, 5, 11, '#');
      g.rect(cx + 9, 25 + bounce, 5, 11, '#');
      g.line(cx + 14, 25, cx + 14, 8, 'o');
      g.rect(cx + 11, 4, 7, 4, 'o');
      break;
    }
    case 'dragon': {
      g.ellipse(cx + 2 + lean, 25 + bounce, 12, 9, '#');
      g.ellipse(cx + 12 + lean, 15 + bounce, 8, 7, '#');
      g.rect(cx + 16 + lean, 15 + bounce, 8, 3, '+');
      g.ellipse(cx + 17 + lean, 16 + bounce, 2, 2, 'o');
      g.line(cx + 8, 9 + bounce, cx + 4, 2 + bounce, '+');
      g.line(cx + 14, 9 + bounce, cx + 18, 2 + bounce, '+');
      g.ellipse(cx - 10, 19 + bounce, 10, 7, '=');
      g.ellipse(cx - 18, 15 + bounce, 6, 5, '=');
      g.line(cx - 16, 25 + bounce, cx - 22, 31 + bounce, '+');
      g.rect(cx - 6, 32 + bounce, 5, 7, '+');
      g.rect(cx + 4, 32 + bounce, 5, 7, '+');
      if (!dead) {
        g.rect(cx + 14 + lean, 14 + bounce, 3, 3, 'e');
        g.rect(cx + 19 + lean, 14 + bounce, 3, 3, 'e');
        g.rect(cx + 16 + lean, 20 + bounce, 6, 2, 'p');
      }
      if (cast) g.ellipse(cx + 26, 17, 4, 3, 'o');
      break;
    }
    case 'giant': {
      g.ellipse(cx, 10 + bounce, 8, 8, '#');
      g.rect(cx - 7, 4 + bounce, 15, 4, 'o');
      g.rect(cx - 10, 19 + bounce, 21, 14, '#');
      g.rect(cx - 10, 22 + bounce, 21, 3, '=');
      g.rect(cx - 15, 19 + bounce, 5, 13, '=');
      g.rect(cx + 11, 19 + bounce, 5, 13, '=');
      g.rect(cx - 8, 33 + bounce, 7, 8, '+');
      g.rect(cx + 2, 33 + bounce, 7, 8, '+');
      if (!dead) {
        g.rect(cx - 5, 9 + bounce, 3, 3, 'o');
        g.rect(cx + 3, 9 + bounce, 3, 3, 'o');
      }
      break;
    }
    case 'queen': {
      g.ellipse(cx, 13 + bounce, 7, 8, '#');
      g.rect(cx - 9, 4 + bounce, 19, 4, 'o');
      g.line(cx - 6, 4 + bounce, cx - 8, 0, 'o');
      g.line(cx + 6, 4 + bounce, cx + 8, 0, 'o');
      g.rect(cx - 6, 21 + bounce, 13, 13, '=');
      g.rect(cx - 4, 23 + bounce, 9, 9, '#');
      g.rect(cx - 13, 21 + bounce, 6, 10, '=');
      g.rect(cx + 8, 21 + bounce, 6, 10, '=');
      for (let i = 0; i < 3; i++) g.rect(cx - 7 + i * 5, 34 + bounce, 4, 7, '+');
      if (!dead) {
        g.rect(cx - 4, 12 + bounce, 3, 3, 'e');
        g.rect(cx + 2, 12 + bounce, 3, 3, 'e');
      }
      break;
    }
    case 'mech': {
      g.rect(cx - 9, 8 + bounce, 19, 12, '#');
      g.rect(cx - 6, 11 + bounce, 13, 6, 'o');
      g.rect(cx - 12, 21 + bounce, 25, 14, '=');
      g.rect(cx - 12, 24 + bounce, 25, 3, '+');
      g.rect(cx - 17, 21 + bounce, 5, 12, '#');
      g.rect(cx + 13, 21 + bounce, 5, 12, '#');
      g.rect(cx - 9, 35 + bounce, 7, 6, '+');
      g.rect(cx + 3, 35 + bounce, 7, 6, '+');
      g.rect(cx + 13, 25 + bounce, 9, 4, '#');
      g.rect(cx - 22, 25 + bounce, 9, 4, '#');
      g.rect(cx - 5, 12 + bounce, 3, 3, 'e');
      g.rect(cx + 3, 12 + bounce, 3, 3, 'e');
      break;
    }
    case 'demon': {
      g.ellipse(cx, 13 + bounce, 8, 8, '#');
      g.line(cx - 7, 7 + bounce, cx - 12, 0, 'o');
      g.line(cx + 7, 7 + bounce, cx + 12, 0, 'o');
      g.rect(cx - 9, 21 + bounce, 19, 12, '=');
      g.rect(cx - 6, 23 + bounce, 13, 8, '#');
      g.line(cx - 9, 22 + bounce, cx - 19, 15 + bounce, 'o');
      g.line(cx + 9, 22 + bounce, cx + 19, 15 + bounce, 'o');
      g.ellipse(cx - 19, 14 + bounce, 5, 4, '+');
      g.ellipse(cx + 19, 14 + bounce, 5, 4, '+');
      g.rect(cx - 7, 33 + bounce, 6, 7, '+');
      g.rect(cx + 2, 33 + bounce, 6, 7, '+');
      if (!dead) {
        g.rect(cx - 5, 12 + bounce, 3, 3, 'o');
        g.rect(cx + 3, 12 + bounce, 3, 3, 'o');
      }
      break;
    }
    case 'star': {
      g.ellipse(cx, 17 + bounce, 12, 12, 'o');
      g.ellipse(cx, 17 + bounce, 8, 8, '#');
      g.ellipse(cx, 17 + bounce, 4, 4, 'p');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.line(cx + Math.cos(a) * 12, 17 + bounce + Math.sin(a) * 12, cx + Math.cos(a) * 16, 17 + bounce + Math.sin(a) * 16, '=');
        g.set(cx + Math.cos(a) * 17, 17 + bounce + Math.sin(a) * 17, 'o');
      }
      g.rect(cx - 1, 29 + bounce, 3, 10, '=');
      if (!dead) g.rect(cx - 2, 16 + bounce, 4, 3, 'e');
      break;
    }
  }

  if (!dead) {
    g.outline('#', 'x');
    g.outline('=', 'x');
    g.outline('o', 'x');
    g.outline('e', 'x');
  }
  return { pixels: g.rows(), palette: P };
}

/* ================================================================== */
/*  召唤物                                                            */
/* ================================================================== */

export const SUMMON_FRAMES = ['idleA', 'idleB', 'attack', 'death'] as const;
export type SummonFrameName = (typeof SUMMON_FRAMES)[number];
export type SummonKind = 'skeleton' | 'ghost' | 'golem' | 'turret' | 'drone';

export function buildSummonGrid(kind: SummonKind, frame: SummonFrameName): SpriteDef {
  const g = new Grid(CHAR_W, CHAR_H);
  const cx = 11;
  const bounce = frame === 'idleB' ? -1 : 0;
  const lean = frame === 'attack' ? 2 : 0;
  const dead = frame === 'death';
  let P: Palette;

  switch (kind) {
    case 'skeleton':
      P = { '#': '#e8e4d0', '+': '#9a9480', o: '#ffffff', x: '#2a2620', e: '#ff5a3a', p: '#1a1a1a' };
      g.ellipse(cx + lean, 9 + bounce, 4, 4, '#');
      g.rect(cx - 3 + lean, 13 + bounce, 7, 7, '#');
      g.rect(cx - 3 + lean, 15 + bounce, 7, 1, '+');
      g.rect(cx - 4 + lean, 20 + bounce, 3, 9, '#');
      g.rect(cx + 2 + lean, 20 + bounce, 3, 9, '#');
      g.rect(cx - 5 + lean, 14 + bounce, 2, 6, '#');
      g.rect(cx + 4 + lean, 14 + bounce, 2, 6, '#');
      g.line(cx + 6 + lean, 15 + bounce, cx + 10 + lean, 9 + bounce, '+');
      if (!dead) {
        g.rect(cx - 3 + lean, 8 + bounce, 2, 2, 'e');
        g.rect(cx + 1 + lean, 8 + bounce, 2, 2, 'e');
      }
      break;
    case 'ghost':
      P = { '#': '#c8d8f0', '+': '#8a9ac0', o: '#e8f0ff', x: '#3a4460', e: '#ffffff', p: '#1a1a2a' };
      g.dome(cx + lean, 23 + bounce, 8, 10, '#');
      g.rect(cx - 8 + lean, 22 + bounce, 17, 3, '#');
      for (let i = 0; i < 4; i++) g.rect(cx - 8 + i * 4 + lean, 25 + bounce, 3, 4 + (i % 2) * 2, '#');
      if (!dead) {
        g.rect(cx - 4 + lean, 15 + bounce, 3, 3, 'p');
        g.rect(cx + 2 + lean, 15 + bounce, 3, 3, 'p');
      }
      break;
    case 'golem':
      P = { '#': '#b08050', '+': '#7a5432', o: '#d8a878', x: '#2a1a10', e: '#ff9a3a', p: '#1a1008' };
      g.rect(cx - 10 + lean, 20 + bounce, 21, 12, '#');
      g.rect(cx - 10 + lean, 23 + bounce, 21, 2, '+');
      g.rect(cx - 6 + lean, 10 + bounce, 13, 10, '#');
      g.rect(cx - 4 + lean, 13 + bounce, 9, 3, 'o');
      g.rect(cx - 14 + lean, 20 + bounce, 5, 11, '+');
      g.rect(cx + 10 + lean, 20 + bounce, 5, 11, '+');
      g.rect(cx - 8 + lean, 32 + bounce, 7, 8, '+');
      g.rect(cx + 2 + lean, 32 + bounce, 7, 8, '+');
      if (!dead) {
        g.rect(cx - 4 + lean, 14 + bounce, 3, 2, 'e');
        g.rect(cx + 2 + lean, 14 + bounce, 3, 2, 'e');
      }
      break;
    case 'turret':
      P = { '#': '#8a94a4', '+': '#4a5260', o: '#ff6a3a', x: '#1e242c', e: '#ffe84a', p: '#101418' };
      g.rect(cx - 9, 26 + bounce, 19, 6, '#');
      g.rect(cx - 7, 20 + bounce, 15, 7, '#');
      g.rect(cx - 5, 22 + bounce, 11, 3, '+');
      g.rect(cx + 4, 16 + bounce, 14, 5, '#');
      g.rect(cx + 17, 17 + bounce, 3, 3, 'o');
      g.rect(cx - 3, 13 + bounce, 8, 8, '#');
      g.rect(cx - 1, 16 + bounce, 4, 2, 'e');
      g.rect(cx - 10, 32 + bounce, 8, 6, '+');
      g.rect(cx + 2, 32 + bounce, 8, 6, '+');
      break;
    case 'drone':
      P = { '#': '#80c0ff', '+': '#3a6a9a', o: '#ffffff', x: '#16222e', e: '#ffffff', p: '#101418' };
      g.ellipse(cx, 18 + bounce, 8, 5, '#');
      g.rect(cx - 8, 16 + bounce, 17, 2, '+');
      g.rect(cx - 4, 20 + bounce, 9, 3, '+');
      g.line(cx - 8, 14 + bounce, cx - 12, 10 + bounce, '+');
      g.line(cx + 8, 14 + bounce, cx + 12, 10 + bounce, '+');
      g.line(cx - 12, 10 + bounce, cx - 8, 9 + bounce, 'o');
      g.line(cx + 8, 9 + bounce, cx + 12, 10 + bounce, 'o');
      g.rect(cx - 2, 17 + bounce, 5, 3, 'o');
      break;
  }

  if (!dead) {
    g.outline('#', 'x');
    g.outline('o', 'x');
    g.outline('e', 'x');
  }
  return { pixels: g.rows(), palette: P! };
}

/* ================================================================== */
/*  投射物 / 特效                                                     */
/* ================================================================== */

export const PROJ_W = 14;
export const PROJ_H = 14;

export type ProjKind =
  | 'arrow' | 'knife' | 'swordWave' | 'fireball' | 'iceShard' | 'holyBolt' | 'shadowOrb'
  | 'bullet' | 'flask' | 'magicBolt' | 'lightning' | 'bone' | 'rock' | 'shell' | 'laser' | 'orb' | 'shellBig'
  | 'holySword' | 'orbs';

export function elementPalette(element: string): Palette {
  switch (element) {
    case 'fire': return { '#': '#ff8a3a', '+': '#c04010', o: '#ffe08a', x: '#5a1a06' };
    case 'ice': return { '#': '#7fd8ff', '+': '#2a7ab0', o: '#e8f8ff', x: '#12405f' };
    case 'lightning': return { '#': '#ffe84a', '+': '#c0a000', o: '#ffffd0', x: '#6a5400' };
    case 'poison': return { '#': '#9cff4a', '+': '#4a8a10', o: '#e0ffb0', x: '#20400a' };
    case 'holy': return { '#': '#fff2a0', '+': '#c8a020', o: '#ffffff', x: '#6a5410' };
    case 'shadow': return { '#': '#c070ff', '+': '#5a1a8a', o: '#f0d0ff', x: '#2a0a44' };
    case 'summon': return { '#': '#c8d8f0', '+': '#7a8aa8', o: '#ffffff', x: '#2a3448' };
    case 'mech': return { '#': '#ffd86a', '+': '#8a6a20', o: '#ffffff', x: '#3a2c08' };
    case 'physical': return { '#': '#e8eef8', '+': '#98a0b0', o: '#ffffff', x: '#3a3f4a' };
    default: return { '#': '#e0e0e0', '+': '#8a8a8a', o: '#ffffff', x: '#333333' };
  }
}

export function buildProjectileGrid(kind: ProjKind, element: string): SpriteDef {
  const P = elementPalette(element);
  const g = new Grid(PROJ_W, PROJ_H);
  const cy = 7;

  switch (kind) {
    case 'arrow':
      g.line(1, cy, 9, cy, '+');
      g.line(1, cy - 1, 8, cy - 1, '#');
      g.set(10, cy - 1, '#'); g.set(11, cy, 'o'); g.set(10, cy + 1, '#');
      g.set(1, cy - 2, 'o'); g.set(1, cy + 2, 'o');
      break;
    case 'bone':
      g.rect(2, cy - 1, 9, 2, '#');
      g.rect(1, cy - 3, 3, 6, '+');
      g.rect(9, cy - 3, 3, 6, '+');
      break;
    case 'knife':
      g.rect(2, cy - 1, 7, 2, '#');
      g.rect(9, cy - 1, 3, 2, 'o');
      g.rect(0, cy - 2, 3, 4, '+');
      break;
    case 'swordWave':
      g.rect(3, 0, 1, PROJ_H, 'o');
      g.rect(2, 1, 1, PROJ_H - 2, '#');
      g.rect(4, 2, 1, PROJ_H - 4, '+');
      break;
    case 'fireball':
      g.ellipse(6, cy, 4, 3.5, '#');
      g.ellipse(5, cy - 1, 2, 1.6, 'o');
      g.rect(0, cy - 2, 3, 4, '+');
      break;
    case 'iceShard':
      g.line(1, cy, 8, cy, '#');
      g.set(9, cy, 'o');
      g.set(4, cy - 2, '+'); g.set(4, cy + 2, '+');
      g.set(6, cy - 1, '+'); g.set(6, cy + 1, '+');
      break;
    case 'magicBolt':
      g.ellipse(6, cy, 3, 3, '#');
      g.ellipse(6, cy, 1.6, 1.6, 'o');
      break;
    case 'holyBolt':
      g.ellipse(6, cy, 3, 3, '#');
      g.rect(5, 2, 2, 10, 'o');
      g.rect(2, cy - 1, 10, 2, 'o');
      break;
    case 'shadowOrb':
      g.ellipse(6, cy, 4, 3.5, '+');
      g.ellipse(6, cy, 2.6, 2.4, '#');
      g.ellipse(5, cy - 1, 1.2, 1, 'o');
      break;
    case 'bullet':
      g.rect(3, cy - 1, 6, 2, '#');
      g.set(9, cy, 'o');
      g.rect(1, cy - 1, 2, 2, '+');
      break;
    case 'flask':
      g.rect(3, cy - 2, 4, 4, '#');
      g.rect(4, cy - 4, 2, 2, '+');
      g.set(8, cy, 'o');
      break;
    case 'lightning':
      g.line(1, cy + 2, 5, cy - 1, '#');
      g.line(5, cy - 1, 6, cy + 2, '#');
      g.line(6, cy + 2, 11, cy - 2, 'o');
      break;
    case 'rock':
      g.ellipse(6, cy, 4, 4, '#');
      g.ellipse(5, cy - 1, 2, 2, 'o');
      break;
    case 'shell':
      g.ellipse(5, cy, 3.5, 3, '#');
      g.rect(6, cy - 1, 6, 2, '+');
      break;
    case 'shellBig':
      g.ellipse(6, cy, 5, 4.5, '#');
      g.ellipse(5, cy - 1, 2.5, 2, 'o');
      g.rect(0, cy - 1, 3, 2, '+');
      break;
    case 'laser':
      g.rect(0, cy - 2, PROJ_W, 5, '#');
      g.rect(0, cy - 1, PROJ_W, 3, 'o');
      break;
    case 'orb':
    case 'orbs':
      g.ellipse(7, cy, 5.5, 5, '#');
      g.ellipse(7, cy, 3, 2.5, 'o');
      break;
    case 'holySword':
      g.rect(2, cy - 1, 3, 2, '+');
      g.rect(5, cy - 2, 2, 4, 'o');
      g.rect(7, cy - 1, 6, 2, '#');
      g.set(13, cy, 'o');
      break;
  }
  return { pixels: g.rows(), palette: P };
}

/** 圆形光环特效（每帧一个半径） */
export function buildRingGrid(color: string, radius: number, thickness = 1.5, size = 24): SpriteDef {
  const g = new Grid(size, size);
  const c = size / 2 - 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= radius && d >= radius - thickness) g.set(x, y, '#');
      else if (d < radius - thickness && d > radius - thickness - 2) g.set(x, y, '+');
    }
  }
  return { pixels: g.rows(), palette: { '#': color, '+': lighten(color, 0.5) } };
}

/** 星形/爆裂特效 */
export function buildBurstGrid(color: string, frame: number): SpriteDef {
  const size = 24;
  const g = new Grid(size, size);
  const c = size / 2 - 0.5;
  const spokes = 8;
  const len = 3 + frame * 2.5;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + frame * 0.2;
    g.line(c + Math.cos(a) * 2, c + Math.sin(a) * 2, c + Math.cos(a) * len, c + Math.sin(a) * len, '#');
  }
  g.ellipse(c, c, Math.max(1, 3 - frame * 0.4), Math.max(1, 3 - frame * 0.4), 'o');
  return { pixels: g.rows(), palette: { '#': color, o: lighten(color, 0.6) } };
}

/* ================================================================== */
/*  地面 / 场景装饰                                                   */
/* ================================================================== */

export const TILE = 16;

/** 生成地形贴图（横向 128×32，用于地面条带） */
export function buildGroundStrip(top: string, dark: string, grass: string, seed: number, w = 64, h = 32): SpriteDef {
  const g = new Grid(w, h);
  const rnd = (i: number) => Math.abs(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
  // 顶部草皮
  for (let x = 0; x < w; x++) {
    const hh = 3 + Math.round(rnd(x) * 2);
    for (let y = 0; y < hh; y++) g.set(x, y, y === 0 ? 'o' : '#');
    if (rnd(x * 3) > 0.72) {
      g.set(x, -1 + hh, '#');
      g.set(x, hh - 2, '#');
    }
  }
  // 土壤（使用 'd'，'.' 在像素工厂中代表透明）
  for (let x = 0; x < w; x++) {
    const top = 3 + Math.round(rnd(x) * 2);
    for (let y = top; y < h; y++) {
      const n = rnd(x * 7 + y * 13);
      g.set(x, y, n > 0.9 ? '+' : n > 0.8 ? 'm' : 'd');
    }
  }
  return { pixels: g.rows(), palette: { '#': grass, o: lighten(grass, 0.4), '+': dark, d: top, m: shade(top, -0.12) } };
}

/** 云朵 */
export function buildCloudGrid(seed: number): SpriteDef {
  const w = 48;
  const h = 18;
  const g = new Grid(w, h);
  const rnd = (i: number) => Math.abs(Math.sin(seed * 3.17 + i * 21.7) * 9871.13) % 1;
  const blobs = 4 + Math.floor(rnd(1) * 3);
  for (let i = 0; i < blobs; i++) {
    const bx = 6 + (i / blobs) * (w - 12) + rnd(i) * 4;
    const by = 9 + rnd(i * 2) * 4;
    const rx = 5 + rnd(i * 3) * 5;
    const ry = 3 + rnd(i * 5) * 3;
    g.ellipse(bx, by, rx, ry, '#');
  }
  g.outline('#', '+');
  return { pixels: g.rows(), palette: { '#': '#ffffff', '+': '#c8dcef' } };
}

/** 树 / 建筑剪影 */
export function buildPropGrid(kind: 'tree' | 'pine' | 'rock' | 'house' | 'pillar' | 'crystal' | 'cactus', color: string, color2: string, seed = 1): SpriteDef {
  const w = 32;
  const h = 48;
  const g = new Grid(w, h);
  const P: Palette = { '#': color, '+': color2, o: lighten(color, 0.35) };
  switch (kind) {
    case 'tree':
      for (let i = 0; i < 16; i++) g.rect(15, 20 + i, 3, 1, '+');
      g.ellipse(16, 16, 12, 11, '#');
      g.ellipse(11, 12, 7, 6, 'o');
      g.ellipse(21, 15, 6, 5, '+');
      break;
    case 'pine':
      for (let i = 0; i < 8; i++) {
        const wid = 4 + i * 1.6;
        for (let x = -wid; x <= wid; x++) g.set(16 + x, 44 - i * 4, '#');
        for (let x = -wid; x <= wid; x++) g.set(16 + x, 45 - i * 4, '+');
      }
      g.rect(15, 44, 3, 4, '+');
      break;
    case 'rock':
      g.ellipse(16, 40, 12, 8, '#');
      g.ellipse(12, 36, 7, 6, 'o');
      g.ellipse(22, 40, 6, 5, '+');
      break;
    case 'house':
      g.rect(6, 24, 20, 22, '#');
      g.rect(6, 24, 20, 2, '+');
      g.dome(16, 25, 13, 9, '+');
      g.rect(12, 32, 8, 8, '#');
      g.rect(14, 34, 4, 6, '+');
      g.rect(8, 28, 4, 4, 'o');
      g.rect(20, 28, 4, 4, 'o');
      break;
    case 'pillar':
      g.rect(11, 8, 10, 40, '#');
      g.rect(11, 8, 3, 40, '+');
      g.rect(9, 4, 14, 5, 'o');
      g.rect(9, 42, 14, 6, 'o');
      break;
    case 'crystal':
      for (let i = 0; i < 22; i++) {
        const wid = 6 - Math.abs(i - 22) * 0.36;
        g.rect(16 - wid, 46 - i, wid * 2, 1, '#');
      }
      g.rect(14, 26, 3, 18, 'o');
      break;
    case 'cactus':
      g.rect(14, 14, 5, 34, '#');
      g.rect(14, 14, 2, 34, '+');
      g.rect(8, 24, 6, 4, '#');
      g.rect(8, 14, 3, 12, '#');
      g.rect(19, 28, 6, 4, '#');
      g.rect(22, 18, 3, 12, '#');
      break;
  }
  void seed;
  return { pixels: g.rows(), palette: P };
}
