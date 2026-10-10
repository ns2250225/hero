import type { Element, BonusBlock } from '@/types/hero';
import { SKILL_MAP, skillParams, type SkillConfig } from '@/data/skills';
import { ELEMENT_COLORS } from '@/data/skills';
import type { Hero } from '../entities/Hero';
import type { Targetable } from './TargetingSystem';
import { densestCluster, lowestHp, pickBest } from './TargetingSystem';
import type { ProjectileOptions, ZoneOptions } from '../entities/Projectile';
import type { SummonKind, SummonOptions } from '../entities/Summon';
import { hexToNumber } from '../art/icons';

export interface StatusSpec {
  kind?: 'burn' | 'poison' | 'slow' | 'freeze' | 'corrode' | 'stun';
  duration?: number;
  dps?: number;
  freezeDuration?: number;
}

export interface CastContext {
  bonus: BonusBlock;
  cdr: number;
  areaMult: number;
  pierceBonus: number;
  summonCountBonus: number;
  durationMult: number;
  splitChance: number;
}

/** 战斗场景需要向技能系统暴露的能力 */
export interface SkillHost {
  heroes: Hero[];
  laneCenterY: number;
  elapsed: number;
  allTargets(): Targetable[];
  enemiesInRadius(x: number, y: number, r: number): Targetable[];
  spawnProjectile(o: ProjectileOptions): unknown;
  spawnZone(o: ZoneOptions): unknown;
  spawnSummon(kind: SummonKind, x: number, y: number, owner: Hero, opts?: Partial<SummonOptions>): unknown;
  damage(target: Targetable, raw: number, element: Element, opts: { source: Hero; crit?: boolean }): number;
  areaDamage(
    x: number, y: number, r: number, raw: number, element: Element, source: Hero,
    opts?: { falloff?: number; status?: StatusSpec; exclude?: Set<number> },
  ): number;
  heal(hero: Hero, amount: number): number;
  status(target: Targetable, spec: StatusSpec, duration?: number, dps?: number): void;
  emitRing(x: number, y: number, r: number, color: number, duration: number): void;
  emitBolt(x1: number, y1: number, x2: number, y2: number, color: number): void;
  emitBurst(x: number, y: number, color: number, scale?: number): void;
  emitSlash(hero: Hero, angle: number, radius: number, color: number): void;
  shake(duration: number, amount: number): void;
  schedule(delay: number, fn: () => void): void;
}

function colorOf(element: Element): number {
  return hexToNumber(ELEMENT_COLORS[element] ?? '#ffffff');
}

export class SkillSystem {
  private host: SkillHost;

  constructor(host: SkillHost) {
    this.host = host;
  }

  static cooldown(cfg: SkillConfig, level: number, cdr: number): number {
    const p = skillParams(cfg, level);
    return Math.max(0.32, p.cooldown * (1 - Math.min(0.78, cdr)));
  }

  cast(hero: Hero, skillId: string, ctx: CastContext): boolean {
    const cfg = SKILL_MAP[skillId];
    if (!cfg) return false;
    const inst = hero.skills.find((s) => s.id === skillId);
    const level = inst?.level ?? 1;
    const p = skillParams(cfg, level);
    const radius = p.radius * ctx.areaMult;
    const duration = p.duration * ctx.durationMult;
    const pierce = p.pierce + ctx.pierceBonus;
    const element = cfg.element;
    const color = colorOf(element);
    const dmgMult = p.damage * hero.stats.skillPower;
    const base = hero.stats.attack * dmgMult;
    const targets = this.host.allTargets().filter((t) => t.alive);
    const cx = hero.homeX;
    const cy = hero.homeY - 24;
    const cluster = densestCluster(targets, Math.max(80, radius), 140);

    const statusFromCfg = (): StatusSpec => {
      switch (cfg.status) {
        case 'burn': return { kind: 'burn', duration: Math.max(2, duration || 3), dps: base * 0.3 };
        case 'poison': return { kind: 'poison', duration: Math.max(2.5, duration || 4), dps: base * 0.25 };
        case 'freeze': return { kind: 'freeze', duration: (duration || 1.5) * (1 + (ctx.bonus.freezeDuration ?? 0)) };
        case 'slow': return { kind: 'slow', duration: (duration || 1.5) * (1 + (ctx.bonus.freezeDuration ?? 0)) };
        case 'corrode': return { kind: 'corrode', duration: Math.max(2, duration || 4) };
        case 'stun': return { kind: 'stun', duration: Math.min(0.7, duration || 0.3) };
        default: return {};
      }
    };

    const shoot = (ang: number, extra: Partial<ProjectileOptions> = {}) => {
      this.host.spawnProjectile({
        kind: 'magicBolt',
        element,
        x: cx,
        y: cy,
        dx: Math.cos(ang),
        dy: Math.sin(ang),
        speed: 640,
        damage: base,
        pierce,
        radius,
        ownerUid: hero.inst.uid,
        skillId,
        splitChance: ctx.splitChance,
        ...extra,
      });
    };

    switch (cfg.kind) {
      case 'whirlwind': {
        hero.playAttack();
        this.host.emitRing(cx, hero.homeY - 22, radius, color, 300);
        this.host.emitSlash(hero, -Math.PI / 2, radius * 0.7, color);
        this.host.areaDamage(cx, hero.homeY - 22, radius, base, element, hero, { status: statusFromCfg() });
        if (hero.cfg.id === 'knight' && hero.inst.star >= 5) {
          shoot(0, { kind: 'swordWave', speed: 900, pierce: 99, lifespan: 1.4, damage: base * 0.8 });
        }
        if (skillId === 'evo_whirlwind') {
          // 血色剑刃：同时向前释放剑气
          for (let i = 0; i < 3; i++) {
            shoot((i - 1) * 0.16, { kind: 'swordWave', speed: 900, pierce: 99, lifespan: 1.4 });
          }
          for (const h of this.host.heroes) if (!h.down) h.heal(base * 0.35);
        }
        break;
      }
      case 'swordWave': {
        hero.playAttack();
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 20;
          shoot(0, { kind: 'swordWave', y: cy + off, speed: 900, pierce: 99, lifespan: 1.6 });
        }
        this.host.shake(50, 0.0015);
        break;
      }
      case 'bladeStorm': {
        hero.playAttack();
        const n = Math.max(1, p.count);
        const sorted = targets.slice().sort((a, b) => a.x - b.x);
        for (let i = 0; i < n; i++) {
          const t = sorted.length > 0 ? sorted[i % sorted.length] : null;
          const ang = t ? Math.atan2(t.y - 18 - cy, t.x - cx) + (Math.random() - 0.5) * 0.25 : (Math.random() - 0.5) * 0.4;
          shoot(ang, { kind: 'knife', speed: 820, pierce: 1, homing: t?.id, lifespan: 1.8 });
        }
        break;
      }
      case 'multiShot': {
        hero.playAttack();
        const n = Math.max(1, p.count);
        const sorted = targets.slice().sort((a, b) => a.x - b.x);
        for (let i = 0; i < n; i++) {
          const t = sorted.length > 0 ? sorted[i % sorted.length] : null;
          const ang = t ? Math.atan2(t.y - 18 - cy, t.x - cx) + (Math.random() - 0.5) * 0.1 : (i - (n - 1) / 2) * 0.1;
          shoot(ang, { kind: 'arrow', speed: 950, pierce: pierce + (cfg.isEvolution ? 4 : 0), lifespan: 1.8 });
        }
        break;
      }
      case 'pierceShot': {
        hero.playAttack();
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          shoot(0, { kind: 'arrow', y: cy + (i - (n - 1) / 2) * 22, speed: 1250, pierce: 99, lifespan: 1.4 });
        }
        this.host.shake(45, 0.0012);
        break;
      }
      case 'rain': {
        const tx = cluster?.x ?? cx + 460;
        const ty = (cluster?.y ?? cy) - 6;
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          const ox = tx + (i - (n - 1) / 2) * radius * 0.7;
          this.host.spawnZone({
            x: ox, y: ty, radius, duration: Math.max(1.6, duration), ownerUid: hero.inst.uid,
            tickInterval: 0.24, damagePerTick: base, color, element, kind: 'rain',
          });
        }
        this.host.emitRing(tx, ty, radius, color, 400);
        break;
      }

      case 'fireball': {
        hero.playCast();
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          shoot((i - (n - 1) / 2) * 0.13, {
            kind: 'fireball', speed: 580, explodeRadius: radius,
            statusKind: 'burn', statusDuration: Math.max(2, duration || 3), statusDps: base * 0.3,
          });
        }
        break;
      }
      case 'flameStorm': {
        hero.playCast();
        for (const sp of spots(cluster, targets, p.count, radius)) {
          this.host.spawnZone({
            x: sp.x, y: sp.y, radius, duration: Math.max(1.8, duration), ownerUid: hero.inst.uid,
            tickInterval: 0.3, damagePerTick: base, color, element, kind: 'flame',
            statusKind: 'burn', statusDuration: 2.5,
          });
        }
        break;
      }
      case 'meteor': {
        hero.playCast();
        const list = spots(cluster, targets, p.count, radius);
        list.forEach((sp, i) => {
          this.host.schedule(i * 0.15, () => {
            this.host.emitBurst(sp.x, sp.y, color, 1.4);
            this.host.emitRing(sp.x, sp.y, radius, color, 380);
            this.host.areaDamage(sp.x, sp.y, radius, base, element, hero, { status: statusFromCfg() });
            this.host.shake(90, 0.004);
          });
        });
        break;
      }
      case 'fireWall': {
        hero.playCast();
        const wx = Math.max(LAYOUT_FALLBACK, (cluster?.x ?? cx + 520) - 70);
        this.host.spawnZone({
          x: wx, y: this.host.laneCenterY, radius: 34, duration: Math.max(2.5, duration), ownerUid: hero.inst.uid,
          tickInterval: 0.25, damagePerTick: base, color, element, kind: 'fireWall',
          statusKind: 'burn', statusDuration: 2.5, bandHeight: Math.max(60, radius),
        });
        break;
      }

      case 'icicle': {
        hero.playCast();
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          shoot((i - (n - 1) / 2) * 0.1, {
            kind: 'iceShard', speed: 820, pierce: pierce || 3,
            statusKind: cfg.status === 'freeze' ? 'freeze' : 'slow',
            statusDuration: Math.max(1.2, duration || 1.6),
          });
        }
        break;
      }
      case 'frostNova': {
        hero.playCast();
        const tx = cluster?.x ?? cx + 440;
        const ty = cluster?.y ?? cy;
        this.host.emitRing(tx, ty, radius, color, 420);
        this.host.areaDamage(tx, ty, radius, base, element, hero, { status: statusFromCfg() });
        break;
      }
      case 'blizzard': {
        hero.playCast();
        for (const sp of spots(cluster, targets, p.count, radius)) {
          this.host.spawnZone({
            x: sp.x, y: sp.y, radius, duration: Math.max(2, duration), ownerUid: hero.inst.uid,
            tickInterval: 0.3, damagePerTick: base, color, element, kind: 'blizzard',
            statusKind: 'slow', statusDuration: 1.6,
          });
        }
        break;
      }

      case 'chain': {
        hero.playCast();
        let cur: Targetable | null = pickBest(targets, { x: cx, y: cy }, {});
        const hit = new Set<number>();
        let from = { x: cx, y: cy };
        const jumps = Math.max(1, p.count);
        for (let i = 0; i < jumps && cur; i++) {
          hit.add(cur.id);
          const to = { x: cur.x, y: cur.y - 18 };
          this.host.emitBolt(from.x, from.y, to.x, to.y, color);
          this.host.damage(cur, base * Math.max(0.4, 1 - i * 0.05), element, { source: hero });
          this.host.status(cur, statusFromCfg());
          from = to;
          const next = targets
            .filter((t) => t.alive && !hit.has(t.id))
            .sort((a, b) => (a.x - to.x) ** 2 + (a.y - to.y) ** 2 - ((b.x - to.x) ** 2 + (b.y - to.y) ** 2))[0];
          if (!next || Math.hypot(next.x - to.x, next.y - to.y) > radius * 3) break;
          cur = next;
        }
        break;
      }
      case 'thunderField': {
        hero.playCast();
        const strikes = Math.max(1, p.count);
        const dur = Math.max(1.2, duration);
        for (let i = 0; i < strikes; i++) {
          this.host.schedule((i / strikes) * dur, () => {
            const list = this.host.allTargets().filter((t) => t.alive && t.x > 150);
            if (list.length === 0) return;
            const t = list[Math.floor(Math.random() * list.length)];
            this.host.emitBolt(t.x + (Math.random() - 0.5) * 40, 100, t.x, t.y - 16, color);
            this.host.emitBurst(t.x, t.y - 16, color, 1);
            this.host.areaDamage(t.x, t.y - 12, radius, base, element, hero, { status: statusFromCfg() });
          });
        }
        break;
      }
      case 'spear': {
        hero.playAttack();
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          shoot(0, { kind: 'lightning', y: cy + (i - (n - 1) / 2) * 20, speed: 1450, pierce: 99, lifespan: 1.2 });
        }
        this.host.shake(70, 0.0028);
        break;
      }

      case 'poisonBomb': {
        hero.playCast();
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          const t = targets[i % Math.max(1, targets.length)];
          const tx = t ? t.x : cx + 420;
          const ty = t ? t.y - 26 : cy - 60;
          const ang = Math.atan2(ty - cy, tx - cx) - 0.32;
          shoot(ang, {
            kind: 'flask', speed: 540, explodeRadius: radius, lifespan: 1.8, gravity: 420,
            statusKind: 'poison', statusDuration: Math.max(2.5, duration || 4), statusDps: base * 0.3,
          });
        }
        break;
      }
      case 'poisonFog': {
        hero.playCast();
        for (const sp of spots(cluster, targets, p.count, radius)) {
          this.host.spawnZone({
            x: sp.x, y: sp.y, radius, duration: Math.max(2.5, duration), ownerUid: hero.inst.uid,
            tickInterval: 0.4, damagePerTick: base, color, element, kind: 'poisonFog',
            statusKind: 'poison', statusDuration: 2.5,
          });
        }
        break;
      }
      case 'corrode': {
        hero.playCast();
        const tx = cluster?.x ?? cx + 420;
        const ty = cluster?.y ?? cy;
        this.host.spawnZone({
          x: tx, y: ty, radius, duration: Math.max(2.5, duration), ownerUid: hero.inst.uid,
          tickInterval: 0.5, damagePerTick: base, color, element, kind: 'corrode',
          statusKind: 'corrode', statusDuration: 3,
        });
        break;
      }

      case 'holySmite': {
        hero.playCast();
        spots(cluster, targets, p.count, radius).forEach((sp, i) => {
          this.host.schedule(i * 0.12, () => {
            this.host.emitRing(sp.x, sp.y, radius, color, 400);
            this.host.emitBurst(sp.x, sp.y, color, 1.2);
            this.host.areaDamage(sp.x, sp.y, radius, base, element, hero, { status: statusFromCfg() });
          });
        });
        break;
      }
      case 'healRing': {
        hero.playCast();
        this.host.emitRing(cx, hero.homeY - 20, 200, color, 520);
        for (const h of this.host.heroes) {
          if (h.down) continue;
          this.host.heal(h, base);
        }
        break;
      }
      case 'holyShield': {
        hero.playCast();
        const amount = base * (1 + (ctx.bonus.shieldPeriodic ?? 0));
        const sorted = this.host.heroes.filter((h) => !h.down).sort((a, b) => a.hpPct - b.hpPct);
        const n = Math.min(sorted.length, Math.max(1, p.count));
        for (let i = 0; i < n; i++) {
          const h = sorted[i];
          h.addShield(amount);
          this.host.emitRing(h.homeX, h.homeY - 20, 28, color, 340);
          if (h.cfg.id === 'paladin' && h.inst.star >= 5) {
            this.host.emitRing(h.homeX, h.homeY - 20, 60, color, 420);
            this.host.areaDamage(h.homeX, h.homeY - 20, 70, base * 0.8, 'holy', hero);
          }
        }
        break;
      }

      case 'homing': {
        hero.playCast();
        const n = Math.max(1, p.count);
        const sorted = targets.slice().sort((a, b) => a.hp - b.hp);
        for (let i = 0; i < n; i++) {
          const t = sorted.length > 0 ? sorted[i % sorted.length] : null;
          const ang = t ? Math.atan2(t.y - 20 - cy, t.x - cx) + (Math.random() - 0.5) * 0.7 : (Math.random() - 0.5) * 0.6;
          shoot(ang, {
            kind: 'shadowOrb', speed: 480, homing: t?.id, lifespan: 3,
            explodeRadius: radius, statusKind: undefined,
          });
        }
        break;
      }
      case 'voidPull': {
        hero.playCast();
        const tx = cluster?.x ?? cx + 480;
        const ty = cluster?.y ?? cy;
        this.host.spawnZone({
          x: tx, y: ty, radius, duration: Math.max(1.8, duration), ownerUid: hero.inst.uid,
          tickInterval: 0.25, damagePerTick: base, color, element, kind: 'void', pull: 140,
        });
        break;
      }
      case 'soulReap': {
        hero.playCast();
        const n = Math.max(1, p.count);
        for (let i = 0; i < n; i++) {
          const t = lowestHp(this.host.allTargets());
          if (!t) break;
          const bonusMult = t.hp / t.maxHp < 0.35 ? 2.4 : 1;
          this.host.emitBolt(t.x, 80, t.x, t.y - 18, color);
          this.host.emitBurst(t.x, t.y - 18, color, 1.1);
          this.host.damage(t, base * bonusMult, element, { source: hero });
        }
        break;
      }

      case 'summonSkeleton': {
        hero.playCast();
        const n = Math.max(1, p.count) + ctx.summonCountBonus;
        for (let i = 0; i < n; i++) {
          this.host.spawnSummon('skeleton', hero.homeX + 16 + Math.random() * 28, hero.homeY + (Math.random() - 0.5) * 44, hero, {
            duration: Math.max(6, duration),
            explodeOnDeath: cfg.isEvolution,
            shadow: ctx.bonus.shadowDmg !== undefined,
          });
        }
        break;
      }
      case 'summonGhost': {
        hero.playCast();
        const n = Math.max(1, p.count) + ctx.summonCountBonus;
        for (let i = 0; i < n; i++) {
          this.host.spawnSummon('ghost', hero.homeX + 24, hero.homeY - 30 + (Math.random() - 0.5) * 60, hero, {
            duration: Math.max(6, duration),
          });
        }
        break;
      }
      case 'summonGolem': {
        hero.playCast();
        const n = Math.max(1, p.count) + Math.floor(ctx.summonCountBonus / 2);
        for (let i = 0; i < n; i++) {
          this.host.spawnSummon('golem', hero.homeX + 44 + i * 26, hero.homeY + (Math.random() - 0.5) * 26, hero, {
            duration: Math.max(8, duration),
          });
        }
        break;
      }
      case 'turret': {
        hero.playCast();
        const n = Math.max(1, p.count) + Math.floor(ctx.summonCountBonus / 2);
        for (let i = 0; i < n; i++) {
          this.host.spawnSummon('turret', hero.homeX + 26 + i * 36, hero.homeY + 30, hero, {
            duration: Math.max(10, duration),
            explodeOnDeath: false,
          });
        }
        break;
      }
      case 'drones': {
        hero.playCast();
        const n = Math.max(1, p.count) + ctx.summonCountBonus;
        for (let i = 0; i < n; i++) {
          this.host.spawnSummon('drone', hero.homeX + 18, hero.homeY - 40 - i * 14, hero, {
            duration: Math.max(6, duration),
          });
        }
        break;
      }
    }
    return true;
  }
}

const LAYOUT_FALLBACK = 200;

function spots(
  cluster: { x: number; y: number; count: number } | null,
  targets: Targetable[],
  n: number,
  radius: number,
): { x: number; y: number }[] {
  const want = Math.max(1, n);
  const out: { x: number; y: number }[] = [];
  if (cluster) out.push({ x: cluster.x, y: cluster.y - 10 });
  const pool = targets.slice().sort((a, b) => a.x - b.x);
  if (pool.length > 0) {
    const step = Math.max(1, Math.floor(pool.length / want));
    for (let i = 0; i < pool.length && out.length < want; i += step) {
      const t = pool[i];
      if (out.some((o) => Math.abs(o.x - t.x) < radius * 0.55 && Math.abs(o.y - (t.y - 10)) < radius * 0.55)) continue;
      out.push({ x: t.x, y: t.y - 10 });
    }
    // 不足则用最靠左的补足
    let idx = 0;
    while (out.length < want && idx < pool.length) {
      const t = pool[idx++];
      out.push({ x: t.x, y: t.y - 10 });
    }
  }
  while (out.length < want) out.push({ x: 720 + out.length * 40, y: 430 });
  return out.slice(0, want);
}
