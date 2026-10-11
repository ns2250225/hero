import Phaser from 'phaser';
import type { BonusBlock, Element, StatKey } from '@/types/hero';
import type { BattleResult, GameEventPayload, HudState, RunState, UpgradeCard } from '@/types/game';
import { HERO_MAP } from '@/data/heroes';
import { SKILL_MAP, ELEMENT_COLORS } from '@/data/skills';
import { ENEMY_MAP } from '@/data/enemies';
import { BOSS_MAP } from '@/data/bosses';
import { MAP_MAP, type MapConfig } from '@/data/maps';
import { RELIC_MAP } from '@/data/relics';
import { SYNERGY_MAP } from '@/data/synergies';
import { getWaveMultiplier, getWaveAttackMultiplier, isBossWave, waveCategory, INTERMISSION_TIME } from '@/data/waves';
import { EVENTS, BLESSINGS, CURSES, type MerchantOffer } from '@/data/events';
import { drawCards, type CardContext } from '@/data/upgrades';
import { Hero } from '../entities/Hero';
import { Boss, Enemy } from '../entities/Enemy';
import { EffectsManager, Projectile, Zone, type ProjectileOptions, type ZoneOptions } from '../entities/Projectile';
import { Summon, type SummonKind, type SummonOptions } from '../entities/Summon';
import { FloatingTextManager } from '../entities/FloatingText';
import { SkillSystem, type CastContext, type SkillHost, type StatusSpec } from '../systems/SkillSystem';
import { pickBest, type Targetable } from '../systems/TargetingSystem';
import { CameraShake, elementBonus, elementDamageColor } from '../systems/DamageSystem';
import { autoPickCard } from '../utils/autoPick';
import { SpatialGrid } from '../utils/SpatialGrid';
import { Rng } from '../utils/Random';
import {
  BREACH_DAMAGE, GAME_H, GAME_W, LAYOUT, MAX_DAMAGE_TEXTS, WAVE_HARD_LIMIT, INTERMISSION,
  SPRITE_SCALE, damageAfterDefense, expForLevel,
} from '../utils/Balance';
import { addExp, addGold, applyCard, autoPlace, genWaveProgress, heroHpMax, makeHeroInstance } from '../utils/RunState';
import {
  addBonus, addFlat, addPct, emptyMods, gatherEquipMods, gatherRelicMods, gatherSynergyMods,
  gatherTalentMods, mergeMods, type Mods,
} from '../utils/stats';
import { makeEquipment, type EquippedMap, type EquipmentItem } from '../utils/equipment';
import { ensureEffectTextures } from '../art/effects';
import { buildCloudGrid, buildGroundStrip, buildPropGrid } from '../art/characters';
import { addSprite } from '../art/textures';
import { hexToNumber } from '../art/icons';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { audio } from '../managers/AudioManager';
import { createBattlePools, destroyBattlePools, pools } from '../managers/PoolManager';
import { formationSlot } from '@/utils/placement';

export interface SceneInitData {
  run: RunState;
  resume?: boolean;
  equipped?: EquippedMap;
}

const LANE_CENTER = (LAYOUT.laneTop + LAYOUT.laneBottom) / 2;

export class BattleScene extends Phaser.Scene implements SkillHost {
  run!: RunState;
  private map!: MapConfig;
  private rng!: Rng;
  heroes: Hero[] = [];
  enemies: Enemy[] = [];
  bosses: Boss[] = [];
  private projectiles: Projectile[] = [];
  private hostileProjs: Projectile[] = [];
  private zones: Zone[] = [];
  private summons: Summon[] = [];
  private enemyGrid = new SpatialGrid<Enemy>(GAME_W, GAME_H, 90);
  private gridBuf: Enemy[] = [];
  private skills!: SkillSystem;
  private shakes!: CameraShake;
  private fx!: EffectsManager;
  private floats!: FloatingTextManager;
  private speed = 1;
  private paused = false;
  pausedForChoice = false;
  /** 随机事件窗口打开时战斗自动暂停（PRD 17） */
  eventOpen = false;
  private hudPublishTick = 0;
  private checkpointTimer = 0;
  private globalMods: Mods = emptyMods();
  private totalBonus: BonusBlock = {};
  private runFlags = new Set<string>();
  private equippedMap: EquippedMap = {};
  private equipmentFound: EquipmentItem[] = [];
  private baseShield = 0;
  private baseShieldTimer = 0;
  private timers: Record<string, number> = {};
  private killChain = 0;
  private killChainTimer = 0;
  private finished = false;
  private resumeRequested = false;
  private lastBossHadBar = false;

  get laneCenterY(): number {
    return LANE_CENTER;
  }

  /** SkillHost 约定的逻辑时间（秒） */
  get elapsed(): number {
    return this.run.elapsedTime;
  }

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: SceneInitData): void {
    this.run = data.run;
    this.resumeRequested = !!data.resume;
    if (data.equipped) this.equippedMap = data.equipped;
  }

  create(): void {
    const settings = useSettingsStore();
    ensureEffectTextures(this);
    this.map = MAP_MAP[this.run.mapId] ?? MAP_MAP.greenField;
    this.rng = new Rng(this.run.rngState || this.run.seed || Date.now());
    this.skills = new SkillSystem(this);
    this.shakes = new CameraShake(this);
    this.shakes.enabled = settings.screenShake;
    this.fx = new EffectsManager(this);
    this.floats = new FloatingTextManager(this, settings.lowEffects ? 45 : MAX_DAMAGE_TEXTS);
    createBattlePools(this);

    this.buildBackground();
    this.buildHeroes();
    this.rebuildGlobalMods();

    if (this.resumeRequested && this.run.enemies.length > 0) {
      for (const e of this.run.enemies) {
        const cfg = ENEMY_MAP[e.id];
        if (!cfg) continue;
        const en = this.spawnEnemyAt(cfg, e.x, e.y, e.mult, e.elite, e.atkMult ?? e.mult);
        en.hp = Math.max(1, Math.min(en.maxHp, e.hp));
      }
      this.run.enemies = [];
    }

    this.speed = settings.defaultSpeed;
    this.paused = false;
    this.pausedForChoice = false;
    this.finished = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    audio.setScene(this);
    audio.playBgm('battle');
    this.setupPlacementInput();
    (window as unknown as { __battleScene?: BattleScene }).__battleScene = this;
    this.publishHud(true);
    if (this.run.wave.phase === 'intermission' && this.run.wave.intermission <= 0) {
      this.run.wave.intermission = 2;
    }
    useUiStore().pushToast(
      this.resumeRequested ? '继续冒险' : `第 ${this.run.wave.wave} 波即将来袭`,
      '#8fd8ff',
    );
  }

  /** 受倍速与暂停影响的延时调用：场景时钟的 timeScale/paused 与战斗逻辑同步 */
  private delay(delaySec: number, fn: () => void): void {
    this.time.delayedCall(delaySec * 1000, fn);
  }

  private onShutdown(): void {
    const w = window as unknown as { __battleScene?: BattleScene };
    if (w.__battleScene === this) w.__battleScene = undefined;
    this.placementGfx?.destroy();
    this.placementGfx = null;
    for (const h of this.heroes) h.destroy();
    for (const e of this.enemies) e.destroy();
    for (const b of this.bosses) b.destroy();
    for (const p of this.projectiles) p.destroy();
    for (const p of this.hostileProjs) p.destroy();
    for (const z of this.zones) z.destroy();
    for (const s of this.summons) s.destroy();
    this.floats.destroy();
    this.fx.cleanup();
    this.heroes = [];
    this.enemies = [];
    this.bosses = [];
    this.projectiles = [];
    this.hostileProjs = [];
    this.zones = [];
    this.summons = [];
    destroyBattlePools();
    audio.stopBgm();
  }

  /* ================================================================ */
  /*  英雄自由布置（PRD 5.1 / 5.2）                                   */
  /* ================================================================ */

  private placementGfx: Phaser.GameObjects.Graphics | null = null;
  private dragUid: number | null = null;
  /** 点击英雄后再点击目标位置的移动方式 */
  private selectedUid: number | null = null;
  private dragMoved = false;
  private dragStart = { x: 0, y: 0 };

  private setupPlacementInput(): void {
    this.placementGfx = this.add.graphics();
    this.placementGfx.setDepth(880);
    this.drawPlacementZone(false);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.finished) return;
      const hero = this.heroAt(p.worldX, p.worldY - 20);
      if (hero) {
        this.dragUid = hero.inst.uid;
        this.dragMoved = false;
        this.dragStart = { x: p.worldX, y: p.worldY };
        this.drawPlacementZone(true);
        return;
      }
      // 已选中英雄 → 点击目标位置移动
      if (this.selectedUid !== null) {
        const ok = this.moveHero(this.selectedUid, p.worldX, p.worldY);
        if (ok) audio.playSe('click');
        else useUiStore().pushToast('无法放置在该位置', '#ff5a5a');
        this.selectedUid = null;
        this.drawPlacementZone(false);
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragUid === null || !p.isDown) return;
      if (Math.hypot(p.worldX - this.dragStart.x, p.worldY - this.dragStart.y) > 8) this.dragMoved = true;
      if (!this.dragMoved) return;
      const valid = this.clampHeroPos(this.dragUid, p.worldX, p.worldY) !== null;
      this.drawPlacementZone(true, { x: p.worldX, y: p.worldY, valid });
    });

    const finishDrag = (p: Phaser.Input.Pointer) => {
      if (this.dragUid === null) return;
      const uid = this.dragUid;
      this.dragUid = null;
      if (this.dragMoved) {
        const ok = this.moveHero(uid, p.worldX, p.worldY);
        if (ok) audio.playSe('click');
        else useUiStore().pushToast('布置失败：超出布置区或与其他英雄重叠', '#ff5a5a');
        this.selectedUid = null;
        this.drawPlacementZone(false);
      } else {
        // 单击：选中英雄，再点击目标位置即可移动；详情可点底部英雄头像查看
        this.selectedUid = this.selectedUid === uid ? null : uid;
        if (this.selectedUid !== null) {
          const h = this.findHeroByUid(uid);
          useUiStore().pushToast(`已选中 ${h?.cfg.name ?? ''}，点击布置区内的目标位置移动`, '#ffd24a');
        }
        this.drawPlacementZone(this.selectedUid !== null);
      }
    };
    this.input.on('pointerup', finishDrag);
    this.input.on('pointerupoutside', finishDrag);
  }

  private drawPlacementZone(active: boolean, preview?: { x: number; y: number; valid: boolean }): void {
    const g = this.placementGfx;
    if (!g) return;
    g.clear();
    const showGrid = useSettingsStore().showGrid;
    if (!active && !showGrid) return;
    // 合法布置区（单一连续区域，不是通道）
    g.fillStyle(0x8fd8ff, active ? 0.08 : 0.04);
    g.fillRect(LAYOUT.heroMinX - 14, LAYOUT.laneTop - 10, LAYOUT.heroMaxX - LAYOUT.heroMinX + 28, LAYOUT.laneBottom - LAYOUT.laneTop + 20);
    g.lineStyle(2, 0x8fd8ff, active ? 0.55 : 0.25);
    g.strokeRect(LAYOUT.heroMinX - 14, LAYOUT.laneTop - 10, LAYOUT.heroMaxX - LAYOUT.heroMinX + 28, LAYOUT.laneBottom - LAYOUT.laneTop + 20);
    if (this.selectedUid !== null) {
      const h = this.findHeroByUid(this.selectedUid);
      if (h) {
        g.lineStyle(2, 0xffd24a, 0.9);
        g.strokeCircle(h.homeX, h.homeY - 20, 26);
      }
    }
    if (preview) {
      const color = preview.valid ? 0x5aff8a : 0xff5a5a;
      g.fillStyle(color, 0.25);
      g.fillCircle(preview.x, preview.y - 20, 22);
      g.lineStyle(2, color, 0.95);
      g.strokeCircle(preview.x, preview.y - 20, 22);
      g.fillStyle(color, 0.35);
      g.fillEllipse(preview.x, preview.y, 36, 10);
    }
  }

  /* ================================================================ */
  /*  背景                                                            */
  /* ================================================================ */

  private buildBackground(): void {
    const L = this.map.layers;
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.HexStringToColor(L.sky[0]),
        Phaser.Display.Color.HexStringToColor(L.sky[1]),
        steps - 1,
        i,
      );
      const g = this.add.graphics();
      g.setDepth(-100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (GAME_H * 0.72 * i) / steps, GAME_W, (GAME_H * 0.72) / steps + 2);
    }

    const mountains = (color: string, baseY: number, height: number, seed: number, step: number, depth: number) => {
      const g = this.add.graphics();
      g.setDepth(depth);
      g.fillStyle(hexToNumber(color), 1);
      g.beginPath();
      g.moveTo(0, baseY + 140);
      for (let x = 0; x <= GAME_W + step; x += step) {
        const n = Math.sin((x + seed) * 0.008) * 0.5 + Math.sin((x + seed * 3) * 0.021) * 0.5;
        g.lineTo(x, baseY - (0.4 + n * 0.6) * height);
      }
      g.lineTo(GAME_W, baseY + 140);
      g.closePath();
      g.fillPath();
    };
    mountains(L.far, 300, 180, 0, 64, -90);
    mountains(L.far2, 330, 120, 260, 40, -89);

    this.buildMidground();

    const groundTop = LAYOUT.groundSurface;
    const gkey = this.groundTextureKey();
    const strip = this.add.tileSprite(0, groundTop, GAME_W, GAME_H - groundTop, gkey);
    strip.setOrigin(0, 0);
    strip.setDepth(-60);
    strip.setTileScale(2, 2);
    const deep = this.add.graphics();
    deep.setDepth(-59);
    deep.fillStyle(hexToNumber(L.groundDark), 1);
    deep.fillRect(0, LAYOUT.uiBottom + 6, GAME_W, GAME_H - LAYOUT.uiBottom - 6);

    const floor = this.add.graphics();
    floor.setDepth(-70);
    floor.fillStyle(hexToNumber(L.ground), 0.28);
    floor.fillRect(LAYOUT.baseLine, LAYOUT.groundSurface + 2, LAYOUT.heroMaxX + 40 - LAYOUT.baseLine, LAYOUT.laneBottom - LAYOUT.groundSurface + 14);
    floor.lineStyle(2, hexToNumber(L.accent), 0.22);
    floor.strokeRect(LAYOUT.heroMinX - 14, LAYOUT.laneTop - 10, LAYOUT.heroMaxX - LAYOUT.heroMinX + 28, LAYOUT.laneBottom - LAYOUT.laneTop + 20);

    const line = this.add.graphics();
    line.setDepth(-50);
    line.fillStyle(0x8a94a4, 0.75);
    line.fillRect(LAYOUT.baseLine - 7, LAYOUT.airTop - 20, 14, LAYOUT.laneBottom - LAYOUT.airTop + 34);
    line.fillStyle(0xffd86a, 0.55);
    for (let y = LAYOUT.airTop - 16; y < LAYOUT.laneBottom + 10; y += 14) line.fillRect(LAYOUT.baseLine - 4, y, 8, 7);
    line.fillStyle(0x4a5260, 0.95);
    line.fillRect(LAYOUT.baseLine - 16, LAYOUT.airTop - 34, 32, 18);

    if (!useSettingsStore().lowEffects) {
      for (let i = 0; i < 4; i++) {
        const key = `cloud_${i}`;
        if (!this.textures.exists(key)) addSprite(this, key, buildCloudGrid(i + 1), 2);
        const c = this.add.image(200 + i * 320, 120 + (i % 3) * 46, key);
        c.setDepth(-95);
        c.setScale(SPRITE_SCALE * (0.85 + (i % 3) * 0.22));
        c.setAlpha(0.8);
        this.tweens.add({
          targets: c,
          x: c.x - 620,
          duration: 46000 + i * 9000,
          repeat: -1,
          onRepeat: () => {
            c.x = GAME_W + 140;
          },
        });
      }
    }
    this.buildWeather();
  }

  private groundTextureKey(): string {
    const key = `ground_${this.map.id}`;
    if (!this.textures.exists(key)) {
      const L = this.map.layers;
      addSprite(this, key, buildGroundStrip(L.ground, L.groundDark, L.groundTop, 7), 1);
    }
    return key;
  }

  private buildMidground(): void {
    const L = this.map.layers;
    const kinds: ('tree' | 'pine' | 'rock' | 'house' | 'pillar' | 'crystal' | 'cactus')[] =
      this.map.id === 'mechFactory' ? ['pillar', 'house', 'rock']
      : this.map.id === 'voidRealm' ? ['crystal', 'pillar']
      : this.map.id === 'frostPeak' ? ['pine', 'rock']
      : this.map.id === 'poisonSwamp' ? ['tree', 'rock']
      : this.map.id === 'lavaRift' ? ['rock', 'pillar']
      : this.map.id === 'skeletonCrypt' ? ['pillar', 'tree']
      : this.map.id === 'darkForest' ? ['pine', 'tree']
      : ['tree', 'rock', 'house'];

    for (let i = 0; i < 8; i++) {
      const kind = kinds[i % kinds.length];
      const key = `prop_${this.map.id}_${kind}`;
      if (!this.textures.exists(key)) addSprite(this, key, buildPropGrid(kind, L.mid, L.mid2, i + 1), 2);
      const s = this.add.image(110 + i * 160 + ((i * 37) % 50), LAYOUT.groundSurface + 4 + ((i * 13) % 10), key);
      s.setOrigin(0.5, 1);
      s.setScale(SPRITE_SCALE * (0.7 + (i % 3) * 0.16));
      s.setDepth(-80 - i);
      s.setAlpha(0.9);
    }
  }

  private buildWeather(): void {
    const w = this.map.weather;
    if (w === 'none' || useSettingsStore().lowEffects) return;
    const texKey = `particle_${w}`;
    if (!this.textures.exists(texKey)) {
      const g = this.add.graphics();
      if (w === 'rain') {
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 10);
      } else {
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 4, 4);
      }
      g.generateTexture(texKey, w === 'rain' ? 1 : 4, w === 'rain' ? 10 : 4);
      g.destroy();
    }
    const tints: Record<string, number> = {
      leaf: 0x9ce07a, snow: 0xffffff, ember: 0xffb060, rain: 0x8fd8ff,
      spore: 0xc0ff70, star: 0xe0c0ff, sand: 0xe8d090, none: 0xffffff,
    };
    const e = this.add.particles(0, 0, texKey, {
      x: { min: 0, max: GAME_W },
      y: w === 'ember' ? { min: LAYOUT.groundSurface, max: LAYOUT.uiBottom } : -20,
      lifespan: w === 'rain' ? 1500 : 6500,
      speedY: w === 'rain' ? { min: 900, max: 1200 } : w === 'ember' ? { min: -90, max: -30 } : { min: 40, max: 90 },
      speedX: w === 'leaf' ? { min: -80, max: -20 } : { min: -20, max: 20 },
      scale: { min: 0.5, max: 1.2 },
      alpha: { min: 0.4, max: 0.9 },
      quantity: 1,
      frequency: w === 'rain' ? 32 : 190,
      tint: tints[w] ?? 0xffffff,
    });
    e.setDepth(-40);
  }

  /* ================================================================ */
  /*  英雄                                                            */
  /* ================================================================ */

  private buildHeroes(): void {
    for (const inst of this.run.heroes) {
      // 旧存档或异常坐标：拉回合法布置区
      inst.x = Math.max(LAYOUT.heroMinX, Math.min(LAYOUT.heroMaxX, inst.x || LAYOUT.midRowX));
      inst.y = Math.max(LAYOUT.laneTop, Math.min(LAYOUT.laneBottom, inst.y || LAYOUT.laneTop + 40));
      Hero.createTexturesFor(this, inst.heroId);
      this.heroes.push(new Hero(this, inst));
    }
  }

  private findHeroByUid(uid: number): Hero | undefined {
    return this.heroes.find((h) => h.inst.uid === uid);
  }

  private rebuildGlobalMods(): void {
    const perma = usePlayerStore().data;
    const talent = gatherTalentMods(perma);
    const relic = gatherRelicMods(this.run.relics);
    const heroIds = this.run.heroes.map((h) => h.heroId);
    const synergy = gatherSynergyMods(heroIds);
    // 装备只作用于穿戴它的英雄
    this.equipByHero = gatherEquipMods(this.equippedMap).byHero;

    let m = mergeMods(talent, relic.mods);
    m = mergeMods(m, synergy.mods);
    m = mergeMods(m, this.run.teamMods as Mods);

    this.runFlags = new Set(relic.flags);
    for (const f of synergy.flags) this.runFlags.add(f);

    // 本局诅咒
    if (this.run.curses.includes('c_frenzy')) {
      addPct(m, 'attackSpeed', 0.6);
      addPct(m, 'defense', -1);
    }
    if (this.run.curses.includes('c_speed')) addFlat(m, 'cooldownReduction', 0.25);
    if (this.run.curses.includes('c_doubleEdge')) {
      addPct(m, 'maxHp', -0.2);
      addPct(m, 'attack', 0.45);
    }
    if (this.run.curses.includes('c_baseSoul')) {
      addPct(m, 'attack', 0.25);
      addFlat(m, 'lifeSteal', 0.08);
    }
    if (this.run.curses.includes('c_greed')) {
      addPct(m, 'maxHp', -0.15);
      addBonus(m, 'goldGain', 1.5);
    }
    if (this.run.challengeRules.includes('fastCooldown')) addFlat(m, 'cooldownReduction', 0.6);

    // 牧师在场：全队复活时间 -30%，觉醒再 -30%（PRD 8.5）
    const priest = this.run.heroes.find((h) => h.heroId === 'priest');
    if (priest) addBonus(m, 'reviveSpeed', priest.star >= 5 ? 0.6 : 0.3);
    // 圣骑士觉醒：阻挡上限 +2（全局 +1 已在星级中计算）
    // 召唤师觉醒：召唤物数量 +2
    if (this.run.heroes.some((h) => h.heroId === 'summoner' && h.star >= 5)) addBonus(m, 'summonCount', 2);

    // 基地加成（遗物只结算一次）
    if (relic.baseHp > 0 && !this.run.curseAppliedBaseHp) {
      this.run.baseMaxHp += relic.baseHp;
      this.run.baseHp += relic.baseHp;
      this.run.curseAppliedBaseHp = true;
    }
    if (relic.baseShield > 0 && this.baseShield === 0) this.baseShield = relic.baseShield;

    this.globalMods = m;
    this.totalBonus = m.bonus;
    this.announceSynergies(synergy.active);
    this.run.stats.synergies = synergy.active;
    this.run.stats.synergyFlags = Array.from(this.runFlags);
    for (const hero of this.heroes) {
      const own = this.equipByHero[hero.inst.heroId];
      hero.refreshStats(own ? mergeMods(m, own) : m);
    }
  }

  private equipByHero: Record<string, Mods> = {};
  private soulChain = 0;
  private knownSynergies: string[] | null = null;

  /** 羁绊激活表现（PRD 12.2）：名称、像素闪光、英雄间能量连线 */
  private announceSynergies(active: string[]): void {
    const prev = this.knownSynergies;
    this.knownSynergies = active.slice();
    if (prev === null) return; // 开局时不重复播报
    for (const id of active) {
      if (prev.includes(id)) continue;
      const cfg = SYNERGY_MAP[id];
      if (!cfg) continue;
      useUiStore().pushToast(`羁绊激活：${cfg.name} —— ${cfg.desc}`, cfg.color);
      audio.playSe('starUp');
      const members = this.heroes.filter((h) => cfg.heroes.includes(h.inst.heroId));
      for (let i = 0; i < members.length; i++) {
        const a = members[i];
        this.fx.ring(a.homeX, a.homeY - 20, 34, cfg.color, 600);
        const b = members[(i + 1) % members.length];
        if (b !== a) this.fx.bolt(a.homeX, a.homeY - 22, b.homeX, b.homeY - 22, cfg.color);
      }
      if (members[0]) {
        this.floats.text({ x: members[0].homeX + 30, y: members[0].homeY - 80, text: cfg.name, color: cfg.color, duration: 1500, rise: 40 });
      }
    }
  }

  /* ================================================================ */
  /*  主循环                                                          */
  /* ================================================================ */

  update(_time: number, delta: number): void {
    const dtMs = Math.min(delta, 55);
    if (this.finished) return;
    const active = !this.paused && !this.pausedForChoice && !this.eventOpen;
    const dt = (dtMs / 1000) * this.speed;
    // 延时技能（陨石、落雷等）与逻辑时间同步：暂停时完全停止，倍速时同步加快
    this.time.paused = !active;
    this.time.timeScale = this.speed;

    if (active) {
      this.run.elapsedTime += dt;
      this.updateHeroes(dt);
      this.updateSpawning(dt);
      this.updateEnemies(dt);
      this.updateBosses(dt);
      this.updateProjectiles(dt);
      this.updateZones(dt);
      this.updateSummons(dt);
      this.updateDefenses(dt);
      this.updateSpecials(dt);
      this.killChainTimer -= dt;
      if (this.killChainTimer <= 0) this.killChain = 0;
      this.checkpointTimer += dt;
      if (this.checkpointTimer > 45) {
        this.checkpointTimer = 0;
        useUiStore().requestCheckpoint();
      }
    }

    // 视觉更新永远执行（保证暂停时画面仍然正确）
    const vdt = dtMs / 1000;
    for (const e of this.enemies) e.updateVisual(vdt, e.status.freeze > 0);
    for (const b of this.bosses) b.updateVisual(vdt);
    for (const s of this.summons) s.updateVisual(vdt);
    for (const h of this.heroes) h.updateVisual(vdt);

    this.hudPublishTick += dtMs;
    if (this.hudPublishTick > 110) {
      this.hudPublishTick = 0;
      this.publishHud(false);
    }
  }

  /* ---------------- 英雄 ---------------- */

  private updateHeroes(dt: number): void {
    const ctx = this.castContext();
    for (const hero of this.heroes) {
      if (hero.inst.downTimer > 0) {
        hero.inst.downTimer -= dt;
        if (hero.inst.downTimer <= 0) {
          if (this.runFlags.has('phoenix') && !hero.inst.reviveUsed) {
            hero.inst.reviveUsed = true;
            hero.revive(0.6);
            this.floats.text({ x: hero.homeX, y: hero.homeY - 64, text: '不死羽毛!', color: '#ffd24a' });
          } else {
            hero.revive(0.5);
          }
          this.fx.ring(hero.homeX, hero.homeY - 20, 40, '#8fd8ff', 420);
        }
        continue;
      }
      if (hero.freezeTimer > 0) {
        hero.freezeTimer -= dt;
        continue;
      }

      // 自动施法（冷却完成且存在有效目标）
      for (const skill of hero.skills) {
        const cfg = SKILL_MAP[skill.id];
        if (!cfg) continue;
        skill.cd -= dt;
        if (skill.cd > 0) continue;
        if (!this.skillHasTarget(hero, cfg.kind)) {
          skill.cd = 0.3;
          break;
        }
        this.skills.cast(hero, skill.id, ctx);
        skill.cd = SkillSystem.cooldown(cfg, skill.level, ctx.cdr);
        break;
      }

      // 普通攻击
      hero.attackCooldown -= dt;
      if (hero.attackCooldown > 0) continue;
      const target = this.pickHeroTarget(hero);
      if (!target) {
        hero.attackCooldown = 0.12;
        continue;
      }
      const dist = Math.hypot(target.x - hero.homeX, target.y - hero.homeY);
      if (dist > hero.stats.attackRange + 30) {
        hero.attackCooldown = 0.1;
        continue;
      }
      this.heroNormalAttack(hero, target);
      hero.attackCooldown = 1 / Math.max(0.2, hero.stats.attackSpeed);
    }
  }

  private skillHasTarget(hero: Hero, kind: string): boolean {
    const selfOnly = kind === 'healRing' || kind === 'holyShield';
    const summoning = kind === 'summonSkeleton' || kind === 'summonGhost' || kind === 'summonGolem' || kind === 'turret' || kind === 'drones';
    if (selfOnly || summoning) {
      const hurt = this.heroes.some((h) => !h.down && h.hpPct < 0.95);
      if (selfOnly) return hurt;
      return true;
    }
    return this.allTargets().some((t) => t.alive && t.x > LAYOUT.baseLine + 20);
  }

  private pickHeroTarget(hero: Hero): Targetable | null {
    const list = this.allTargets();
    if (list.length === 0) return null;
    const maxX = hero.homeX + hero.stats.attackRange + 50;
    const candidates = list.filter(
      (t) => t.alive && t.x <= maxX && t.x > LAYOUT.baseLine - 60 && !(t instanceof Enemy && t.stealthOn),
    );
    if (candidates.length === 0) return null;
    if (hero.cfg.attackType === 'melee') {
      const near = candidates.filter((t) => t.x - hero.homeX < 150);
      if (near.length > 0) return pickBest(near, { x: hero.homeX, y: hero.homeY }, { preferElite: true });
    }
    return pickBest(candidates, { x: hero.homeX, y: hero.homeY }, { preferElite: true });
  }

  private castContext(): CastContext {
    const b = this.totalBonus;
    return {
      bonus: b,
      cdr: Math.min(0.78, this.globalMods.flat.cooldownReduction ?? 0),
      areaMult: 1 + (b.area ?? 0),
      pierceBonus: b.pierce ?? 0,
      summonCountBonus: b.summonCount ?? 0,
      durationMult: 1 + (b.duration ?? 0),
      splitChance: b.splitChance ?? 0,
    };
  }

  private heroNormalAttack(hero: Hero, target: Targetable): void {
    const cfg = hero.cfg;
    const crit = Math.random() < hero.stats.critRate;
    const atk = hero.stats.attack;
    const color = ELEMENT_COLORS[cfg.element] ?? '#ffffff';
    const tx = target.x;
    const ty = target.y - 18;
    const ang = Math.atan2(ty - (hero.homeY - 20), tx - hero.homeX);
    hero.aimAt(tx, ty);
    hero.playAttack();
    const awake = hero.inst.star >= 5;
    const proj = (extra: Partial<ProjectileOptions>): void => {
      this.spawnProjectile({
        kind: 'magicBolt',
        element: cfg.element,
        x: hero.homeX + 14,
        y: hero.homeY - 22,
        dx: Math.cos(ang),
        dy: Math.sin(ang),
        speed: 700,
        damage: atk,
        pierce: this.totalBonus.pierce ?? 0,
        radius: 0,
        ownerUid: hero.inst.uid,
        lifespan: 1.6,
        splitChance: this.totalBonus.splitChance ?? 0,
        ...extra,
      });
    };

    switch (cfg.normalAttack) {
      case 'slash': {
        const list = this.enemiesInRadius(tx, ty, 58 + (awake ? 22 : 0));
        const list2 = this.bosses.filter((b) => b.alive && Math.hypot(b.x - tx, b.y - ty) < 70);
        const hits = [...list, ...list2] as Targetable[];
        if (hits.length === 0) hits.push(target);
        for (const e of hits) this.damage(e, atk, 'physical', { source: hero, crit });
        this.fx.slash(hero.homeX, hero.homeY, ang, 42, color);
        audio.playSe('sword');
        break;
      }
      case 'holySword': {
        proj({ kind: 'holySword', element: 'holy', speed: 800, explodeRadius: 52, pierce: 1 });
        audio.playSe('sword');
        break;
      }
      case 'arrow': {
        const n = awake ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const a = ang + (i - (n - 1) / 2) * 0.1;
          proj({ kind: 'arrow', element: 'physical', dx: Math.cos(a), dy: Math.sin(a), speed: 950, homing: target.id, pierce: this.totalBonus.pierce ?? 0 });
        }
        break;
      }
      case 'knife': {
        const n = awake ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const a = ang + (Math.random() - 0.5) * 0.22 + (i - (n - 1) / 2) * 0.14;
          proj({ kind: 'knife', element: 'physical', dx: Math.cos(a), dy: Math.sin(a), speed: 880, homing: target.id, pierce: 1 + (this.totalBonus.pierce ?? 0) });
        }
        break;
      }
      case 'bullet': {
        const n = awake ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const a = ang + (Math.random() - 0.5) * 0.06;
          proj({
            kind: 'bullet', element: 'mech', dx: Math.cos(a), dy: Math.sin(a),
            y: hero.homeY - 22 + i * 5, speed: 1180, lifespan: 1.2,
            damage: atk * (1 + (this.totalBonus.mechPower ?? 0)),
          });
        }
        break;
      }
      case 'fireball': {
        const n = awake ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const a = ang + (i - (n - 1) / 2) * 0.14;
          proj({
            kind: 'fireball', element: 'fire', dx: Math.cos(a), dy: Math.sin(a), speed: 600,
            damage: atk * (awake ? 1.4 : 1), explodeRadius: awake ? 104 : 70,
            statusKind: 'burn', statusDuration: 3, statusDps: atk * 0.22,
          });
        }
        audio.playSe('fire');
        break;
      }
      case 'ice': {
        const freeze = awake && Math.random() < 0.3;
        proj({
          kind: 'iceShard', element: 'ice', speed: 840,
          pierce: (awake ? 2 : 0) + (this.totalBonus.pierce ?? 0),
          statusKind: freeze ? 'freeze' : 'slow',
          statusDuration: (freeze ? 0.9 : 1.4) * (1 + (this.totalBonus.freezeDuration ?? 0)),
          lifespan: 1.5,
        });
        break;
      }
      case 'lightning': {
        const jumps = awake ? 4 : 2;
        let cur: Targetable | null = target;
        const hit = new Set<number>();
        let from = { x: hero.homeX, y: hero.homeY - 22 };
        for (let i = 0; i < jumps && cur; i++) {
          hit.add(cur.id);
          const to: { x: number; y: number } = { x: cur.x, y: cur.y - 18 };
          this.fx.bolt(from.x, from.y, to.x, to.y, '#ffe84a');
          this.damage(cur, atk * Math.max(0.45, 1 - i * 0.08), 'lightning', { source: hero, crit });
          from = to;
          const candidates: Targetable[] = this.allTargets().filter((t) => t.alive && !hit.has(t.id));
          let next: Targetable | null = null;
          let nd = Infinity;
          for (const c of candidates) {
            const d = (c.x - to.x) ** 2 + (c.y - to.y) ** 2;
            if (d < nd) {
              nd = d;
              next = c;
            }
          }
          if (!next || Math.hypot(next.x - to.x, next.y - to.y) > 210) break;
          cur = next;
        }
        break;
      }
      case 'holy': {
        proj({ kind: 'holyBolt', element: 'holy', speed: 820 });
        break;
      }
      case 'flask': {
        proj({
          kind: 'flask', element: 'poison', speed: 640, gravity: 320, lifespan: 1.9,
          dx: Math.cos(ang - 0.3), dy: Math.sin(ang - 0.3),
          explodeRadius: 66, statusKind: 'poison', statusDuration: 4, statusDps: atk * 0.25,
        });
        break;
      }
      case 'shadow': {
        const n = awake ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const a = ang + (i - (n - 1) / 2) * 0.18;
          proj({ kind: 'shadowOrb', element: 'shadow', dx: Math.cos(a), dy: Math.sin(a), speed: 580, homing: target.id, lifespan: 2.4 });
        }
        break;
      }
      case 'magic': {
        const n = awake ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const a = ang + (Math.random() - 0.5) * 0.14;
          proj({ kind: 'magicBolt', dx: Math.cos(a), dy: Math.sin(a), speed: 720, homing: target.id, lifespan: 2 });
        }
        break;
      }
    }
    if (crit) {
      this.onCrit(hero, tx, ty);
      if (awake && cfg.id === 'assassin') {
        for (let i = 0; i < 2; i++) {
          const a = ang + (i ? 0.4 : -0.4);
          proj({ kind: 'knife', element: 'physical', dx: Math.cos(a), dy: Math.sin(a), speed: 820, homing: target.id, pierce: 1 });
        }
      }
    }
    // 霜之触碰
    const frostLv = this.run.specials.frostTouch ?? 0;
    if (frostLv > 0 && Math.random() < 0.05 * frostLv) {
      this.status(target, { kind: 'freeze', duration: 0.8 + frostLv * 0.2 });
    }
  }

  private onCrit(hero: Hero, x: number, y: number): void {
    const lv = Math.max(this.runFlags.has('critLightning') ? 1 : 0, this.run.specials.critLightning ?? 0);
    if (lv <= 0) return;
    this.fx.bolt(hero.homeX, hero.homeY - 20, x, y, '#ffe84a');
    this.areaDamage(x, y, 58 + lv * 10, hero.stats.attack * (1.1 + lv * 0.3), 'lightning', hero);
  }

  /* ---------------- 查询 ---------------- */

  allTargets(): Targetable[] {
    return [...this.enemies, ...this.bosses].filter((t) => t.alive) as Targetable[];
  }

  enemiesInRadius(x: number, y: number, r: number): Enemy[] {
    return this.enemyGrid.query(x, y, r, this.gridBuf).filter((e) => e.alive);
  }

  /** 半径内的所有可攻击目标（含 Boss） */
  targetsInRadius(x: number, y: number, r: number): Targetable[] {
    return [
      ...this.enemiesInRadius(x, y, r),
      ...this.bosses.filter((b) => b.alive && Math.hypot(b.x - x, b.y - y) < r + 20),
    ] as Targetable[];
  }

  /* ---------------- 敌人 ---------------- */

  private spawnEnemyAt(
    cfg: (typeof ENEMY_MAP)[string],
    x: number,
    y: number,
    mult: number,
    elite: boolean,
    atkMult = mult,
  ): Enemy {
    const e = new Enemy(this, cfg, x, y, mult, elite, atkMult);
    this.enemies.push(e);
    return e;
  }

  private spawnEnemy(cfgId: string, elite: boolean): void {
    const cfg = ENEMY_MAP[cfgId];
    if (!cfg) return;
    const wave = this.run.wave.wave;
    const mult = getWaveMultiplier(wave, this.run.mode) * this.map.hpMult * this.difficultyMult;
    const atkMult = getWaveAttackMultiplier(wave, this.run.mode) * this.map.hpMult * this.difficultyMult;
    const x = LAYOUT.spawnX + this.rng.range(-LAYOUT.spawnVariance, LAYOUT.spawnVariance * 0.4);
    this.spawnEnemyAt(cfg, x, this.laneYFor(cfg.abilities.includes('flying')), mult, elite, atkMult);
  }

  private laneYFor(flying: boolean): number {
    const t = this.rng.next();
    if (flying) return LAYOUT.airTop + t * (LAYOUT.airBottom - LAYOUT.airTop);
    return LAYOUT.laneTop + 6 + t * (LAYOUT.laneBottom - LAYOUT.laneTop - 12);
  }

  private get difficultyMult(): number {
    let m = 1;
    if (this.run.mode === 'challenge') m *= 1.12;
    return m;
  }

  private updateEnemies(dt: number): void {
    this.enemyGrid.clear();
    for (const e of this.enemies) if (e.alive) this.enemyGrid.insert(e.x, e.y, e);

    const remove: Enemy[] = [];
    for (const e of this.enemies) {
      if (!e.alive) {
        remove.push(e);
        continue;
      }
      const dot = e.tickStatus(dt);
      if (dot > 0) {
        const r = e.applyDamage(dot * (1 + (this.totalBonus.dotPower ?? 0)));
        if (r.died) {
          this.onEnemyDeath(e);
          continue;
        }
      }
      this.enemyAbilities(e, dt);
      if (!e.alive) continue;

      const blocker = this.findBlocker(e);
      if (blocker) {
        this.enemyAttackHero(e, blocker, dt);
        continue;
      }
      const speedMul =
        this.map.speedMult *
        (this.run.challengeRules.includes('doubleSpeed') ? 2 : 1) *
        (this.run.curses.includes('c_speed') ? 1.2 : 1);
      e.x -= e.speed * e.moveScale * speedMul * dt;
      e.y += Math.sin(this.run.elapsedTime * 1.4 + e.id) * 5 * dt;
      if (!e.flying) e.y = Math.max(LAYOUT.laneTop, Math.min(LAYOUT.laneBottom, e.y));
      if (e.x <= LAYOUT.baseLine) {
        this.breach(e);
        continue;
      }
    }
    this.pruneEnemies(remove);
  }

  private findBlocker(e: Enemy): Hero | null {
    if (e.flying) return null;
    const holder = (e as unknown as { blockedByHero?: number }).blockedByHero;
    if (holder !== undefined) {
      const h = this.findHeroByUid(holder);
      if (h && !h.down && Math.abs(e.y - h.homeY) < 52 && e.x - h.homeX < 56 && e.x - h.homeX > -12) return h;
      (e as unknown as { blockedByHero?: number }).blockedByHero = undefined;
    }
    for (const hero of this.heroes) {
      if (hero.down || hero.stats.blockCapacity <= 0) continue;
      const dx = e.x - (hero.homeX + 12);
      const dy = Math.abs(e.y - hero.homeY);
      if (dx > 0 && dx < 48 && dy < 48) {
        if (this.countBlockedBy(hero) < hero.stats.blockCapacity) {
          (e as unknown as { blockedByHero?: number }).blockedByHero = hero.inst.uid;
          return hero;
        }
      }
    }
    return null;
  }

  private countBlockedBy(hero: Hero): number {
    let n = 0;
    for (const e of this.enemies) {
      if (e.alive && (e as unknown as { blockedByHero?: number }).blockedByHero === hero.inst.uid) n++;
    }
    return n;
  }

  private enemyAttackHero(e: Enemy, hero: Hero, dt: number): void {
    e.attackCd -= dt;
    if (e.attackCd > 0) return;
    e.attackCd = 1 / Math.max(0.3, e.cfg.attackSpeed);
    e.setFrame('attack');
    if (e.isRanged) {
      this.spawnProjectile({
        kind: 'shell', element: 'physical', x: e.x - 12, y: e.y - 20,
        dx: Math.cos(Math.atan2(hero.homeY - 20 - (e.y - 20), hero.homeX - e.x)),
        dy: Math.sin(Math.atan2(hero.homeY - 20 - (e.y - 20), hero.homeX - e.x)),
        speed: 420, damage: e.attackPower, pierce: 0, radius: 0, ownerUid: -1,
        lifespan: 2.4, hostile: true,
      });
      return;
    }
    const dmg = damageAfterDefense(e.attackPower, hero.stats.defense);
    const taken = hero.takeDamage(dmg);
    if (taken < 0) {
      this.floats.text({ x: hero.homeX, y: hero.homeY - 52, text: 'MISS', color: '#c8d8f0' });
    } else if (taken > 0) {
      this.floats.damage(`hero${hero.inst.uid}`, hero.homeX, hero.homeY - 46, taken, 'hurt');
    }
    // 骑士觉醒反伤
    if (hero.awakened && hero.cfg.id === 'knight') {
      this.damage(e, hero.stats.attack * 0.35, 'physical', { source: hero });
    }
    // 圣骑士觉醒：受击时 20% 释放圣光冲击
    if (hero.awakened && hero.cfg.id === 'paladin' && Math.random() < 0.2) {
      this.fx.ring(hero.homeX + 30, hero.homeY - 20, 80, '#fff2a0', 360);
      this.areaDamage(hero.homeX + 30, hero.homeY - 20, 80, hero.stats.attack * 1.4, 'holy', hero, {
        status: { kind: 'stun', duration: 0.4 },
      });
    }
  }

  private enemyAbilities(e: Enemy, dt: number): void {
    if (e.has('charge')) {
      e.chargeTimer -= dt;
      if (e.chargeActive > 0) e.chargeActive -= dt;
      if (e.chargeTimer <= 0) {
        e.chargeTimer = 4 + Math.random() * 3;
        e.chargeActive = 1.4;
        this.fx.ring(e.x, e.y - 16, 26, '#ffb060', 300);
      }
    }
    if (e.has('healer')) {
      e.healCd -= dt;
      if (e.healCd <= 0) {
        e.healCd = 3.4;
        for (const o of this.enemiesInRadius(e.x, e.y, 120)) {
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.14);
        }
        this.fx.ring(e.x, e.y - 16, 60, '#4affb0', 360);
      }
    }
    if (e.has('summoner')) {
      e.summonCd -= dt;
      if (e.summonCd <= 0) {
        e.summonCd = 7;
        const mult = getWaveMultiplier(this.run.wave.wave, this.run.mode) * this.map.hpMult * 0.55;
        const atkMult = getWaveAttackMultiplier(this.run.wave.wave, this.run.mode) * this.map.hpMult * 0.55;
        const cfg = ENEMY_MAP['skeleton'];
        if (cfg) {
          for (let i = 0; i < 2; i++) {
            this.spawnEnemyAt(cfg, e.x - 20 - i * 24, e.y + (Math.random() - 0.5) * 30, mult, false, atkMult);
          }
        }
        this.fx.ring(e.x, e.y - 16, 40, '#c070ff', 300);
      }
    }
    if (e.has('stealth')) {
      e.stealthTimer -= dt;
      if (e.stealthTimer <= 0) {
        e.stealthOn = !e.stealthOn;
        e.stealthTimer = e.stealthOn ? 2.2 : 3.2;
      }
    }
    if (e.has('explode')) {
      const near = this.heroes.some((h) => !h.down && Math.abs(h.homeX - e.x) < 58 && Math.abs(h.homeY - e.y) < 54);
      if (near) {
        this.explodeEnemy(e);
        e.alive = false;
        this.onEnemyDeath(e, true);
      }
    }
    if (e.has('giant') && e.specialTimer <= 0) {
      e.specialTimer = 2.5;
      const near = this.heroes.filter((h) => !h.down && Math.abs(h.homeX - e.x) < 90);
      for (const h of near) {
        const taken = h.takeDamage(damageAfterDefense(e.attackPower * 0.7, h.stats.defense));
        if (taken > 0) this.floats.damage(`hero${h.inst.uid}`, h.homeX, h.homeY - 46, taken, 'hurt');
      }
    }
    e.specialTimer -= dt;
  }

  private explodeEnemy(e: Enemy): void {
    this.fx.burst(e.x, e.y - 16, '#ffb02e', 1.4);
    this.fx.ring(e.x, e.y - 16, 74, '#ff9a3a', 340);
    this.shakes.shake(90, 0.004);
    audio.playSe('explode');
    for (const hero of this.heroes) {
      if (hero.down) continue;
      if (Math.hypot(hero.homeX - e.x, hero.homeY - e.y) < 84) {
        const taken = hero.takeDamage(damageAfterDefense(e.attackPower * 1.6, hero.stats.defense));
        if (taken > 0) this.floats.damage(`hero${hero.inst.uid}`, hero.homeX, hero.homeY - 46, taken, 'hurt');
      }
    }
  }

  private breach(e: Enemy): void {
    const key = e.elite ? 'elite' : e.has('fast') ? 'fast' : 'normal';
    const dmg = BREACH_DAMAGE[key] ?? 1;
    this.applyBaseDamage(dmg);
    this.run.stats.breaches++;
    this.floats.text({ x: LAYOUT.baseLine + 40, y: e.y - 40, text: `-${dmg}`, color: '#ff5a5a', rise: 70, duration: 900 });
    this.shakes.shake(130, 0.006);
    this.fx.ring(LAYOUT.baseLine + 10, e.y, 50, '#ff5a5a', 340);
    e.destroy();
    this.enemies = this.enemies.filter((x) => x !== e);
  }

  private applyBaseDamage(dmg: number): void {
    let remain = dmg;
    if (this.baseShield > 0) {
      const absorbed = Math.min(this.baseShield, remain);
      this.baseShield -= absorbed;
      remain -= absorbed;
      this.run.baseShield = this.baseShield;
    }
    if (remain > 0) {
      this.run.baseHp -= remain;
      audio.playSe('breach');
    }
    if (this.run.baseHp <= 0 && !this.finished) this.finish(false);
  }

  private pruneEnemies(remove: Enemy[]): void {
    if (remove.length === 0) return;
    const set = new Set(remove);
    const kept: Enemy[] = [];
    for (const e of this.enemies) {
      if (set.has(e)) e.destroy();
      else kept.push(e);
    }
    this.enemies = kept;
  }

  private onEnemyDeath(e: Enemy, silent = false): void {
    const cfg = e.cfg;
    const expGain = cfg.expReward * (e.elite ? 4 : 1) * (1 + this.run.wave.wave * 0.06);
    const goldGain = cfg.goldReward * (e.elite ? 5 : 1) * (1 + this.run.wave.wave * 0.04);
    const ups = addExp(this.run, expGain, this.totalBonus);
    addGold(this.run, goldGain, this.totalBonus);
    this.run.stats.kills++;
    this.run.killCounter++;
    if (e.elite) this.run.stats.elitesKilled++;
    this.killChain++;
    this.killChainTimer = 3;

    if (!silent) {
      this.fx.burst(e.x, e.y - 16, '#ffffff', 0.55);
      audio.playSe('enemyDeath');
    }

    if (e.has('split') && e.cfg.id === 'bigslime') {
      const c = ENEMY_MAP['slime'];
      if (c) {
        for (let i = 0; i < 2; i++) {
          this.spawnEnemyAt(c, e.x + (i ? 18 : -18), e.y + (i ? 12 : -12), e.mult * 0.55, false, e.atkMult * 0.55);
        }
      }
    }

    const boomLv = this.run.specials.killExplode ?? 0;
    if (boomLv > 0) {
      const hero = this.heroes[0];
      if (hero) {
        this.areaDamage(e.x, e.y, 48 + boomLv * 10, 28 + boomLv * 24 + this.run.teamLevel * 3, 'fire', hero);
        this.fx.burst(e.x, e.y - 14, '#ff9a3a', 0.85);
      }
    }
    const kh = this.totalBonus.killHeal ?? 0;
    if (kh > 0) for (const hero of this.heroes) if (!hero.down) hero.heal(kh);

    if ((this.runFlags.has('undeadPact') || this.run.relics.includes('undeadPact')) && this.run.killCounter % 40 === 0) {
      const owner = this.heroes[0];
      if (owner) {
        for (let i = 0; i < 2; i++) {
          this.spawnSummon('skeleton', owner.homeX + 20, owner.homeY + (Math.random() - 0.5) * 40, owner, { duration: 18 });
        }
      }
    }

    const dropChance = (e.elite ? 0.42 : 0.011) * (1 + (this.totalBonus.luck ?? 0));
    if (Math.random() < dropChance) this.dropEquipment(e.x, e.y);
    if (ups > 0) this.onLevelUp(ups);
  }

  private dropEquipment(x: number, y: number): void {
    const item = makeEquipment(this.rng, { luck: this.totalBonus.luck ?? 0, level: this.run.wave.wave });
    if (item.quality === 'common' || item.quality === 'fine') {
      const gold = 18 + this.run.wave.wave * 6;
      addGold(this.run, gold, this.totalBonus);
      this.floats.text({ x, y: y - 30, text: `+${gold}`, color: '#ffd24a', rise: 30 });
      return;
    }
    this.equipmentFound.push(item);
    this.run.stats.equipmentFound.push(item.uid);
    this.floats.text({ x, y: y - 32, text: '获得装备!', color: '#b76cff', rise: 42 });
    audio.playSe('drop');
    useUiStore().pushToast(`获得装备（${item.quality}）`, '#b76cff');
  }

  /* ---------------- Boss ---------------- */

  private updateBosses(dt: number): void {
    const remove: Boss[] = [];
    for (const b of this.bosses) {
      if (!b.alive) {
        remove.push(b);
        continue;
      }
      const dot = b.tickStatus(dt);
      if (dot > 0) {
        const r = b.applyDamage(dot * (1 + (this.totalBonus.dotPower ?? 0)));
        if (r.died) {
          this.onBossDeath(b);
          continue;
        }
      }
      b.skillCd -= dt;
      if (b.skillCd <= 0) {
        b.skillCd = (b.enraged ? 3.4 : 5.4) + Math.random() * 1.6;
        this.bossCastSkill(b);
      }
      const hero = this.nearestHero(b.x, b.y, 160);
      if (hero) {
        b.attackCd -= dt;
        if (b.attackCd <= 0) {
          b.attackCd = 1 / Math.max(0.4, b.cfg.attackSpeed);
          b.setFrame('attack');
          const taken = hero.takeDamage(damageAfterDefense(b.attackPower, hero.stats.defense));
          if (taken > 0) this.floats.damage(`hero${hero.inst.uid}`, hero.homeX, hero.homeY - 46, taken, 'hurt');
        }
      } else {
        b.x -= b.speed * b.moveScale * this.map.speedMult * dt;
        if (b.x <= LAYOUT.baseLine + 40) this.bossBreach(b);
      }
    }
    if (remove.length > 0) {
      const set = new Set(remove);
      const kept: Boss[] = [];
      for (const b of this.bosses) {
        if (set.has(b)) b.destroy();
        else kept.push(b);
      }
      this.bosses = kept;
    }
  }

  private spawnBoss(bossId: string): void {
    const cfg = BOSS_MAP[bossId];
    if (!cfg) return;
    const wave = this.run.wave.wave;
    const mult = getWaveMultiplier(wave, this.run.mode) * this.map.hpMult * 0.5;
    const atkMult = getWaveAttackMultiplier(wave, this.run.mode) * this.map.hpMult * 0.5;
    const b = new Boss(this, cfg, LAYOUT.spawnX + 30, LANE_CENTER + 36, mult, atkMult);
    this.bosses.push(b);
    this.run.wave.bossSpawned = true;
    this.fx.ring(b.x, b.y - 60, 130, '#ff5a5a', 700);
    this.shakes.shake(420, 0.008);
    audio.playSe('boss');
    audio.playBgm('boss');
    useUiStore().setBossBar({
      visible: true, name: cfg.name, title: cfg.title, hp: b.maxHp, maxHp: b.maxHp, shield: false, enraged: false,
    });
    useUiStore().pushToast(`⚠ ${cfg.name} 出现了！`, '#ff5a5a');
    useUiStore().setWaveWarning({ wave: this.run.wave.wave, boss: true });
    window.setTimeout(() => useUiStore().setWaveWarning(null), 1600);
  }

  private bossCastSkill(b: Boss): void {
    const skill = b.cfg.skills[b.skillIndex % b.cfg.skills.length];
    b.skillIndex++;
    b.setFrame('cast');
    this.fx.ring(b.x - 20, b.y - 50, 60, '#ff8a3a', 360);
    const scale = 1 + this.run.wave.wave * 0.012;
    const anyHero = this.heroes[0];
    switch (skill) {
      case 'summon': {
        const mult = getWaveMultiplier(this.run.wave.wave, this.run.mode) * this.map.hpMult * 0.45;
        const atkMult = getWaveAttackMultiplier(this.run.wave.wave, this.run.mode) * this.map.hpMult * 0.45;
        const n = 3 + Math.floor(this.run.wave.wave / 8);
        for (let i = 0; i < n; i++) {
          const id = b.cfg.summonIds[Math.floor(Math.random() * b.cfg.summonIds.length)] ?? 'skeleton';
          const cfg = ENEMY_MAP[id];
          if (cfg) this.spawnEnemyAt(cfg, b.x - 40 - i * 26, LANE_CENTER + (Math.random() - 0.5) * 170, mult, false, atkMult);
        }
        break;
      }
      case 'roots': {
        for (const hero of this.heroes) {
          if (hero.down) continue;
          hero.freezeTimer = 1.6;
          this.fx.ring(hero.homeX, hero.homeY - 16, 38, '#7ac04a', 400);
        }
        break;
      }
      case 'fireBreath': {
        const y = b.y - 30;
        for (let i = 0; i < 3; i++) {
          this.schedule(i * 0.22, () => {
            const hx = b.x - 170 - i * 40;
            if (anyHero) {
              this.areaDamage(hx, y, 120, b.attackPower * 0.85 * scale, 'fire', anyHero, {
                status: { kind: 'burn', duration: 3, dps: b.attackPower * 0.12 },
              });
            }
            this.fx.burst(hx, y, '#ff7a2a', 1.6);
            this.fx.ring(hx, y, 120, '#ff9a3a', 400);
          });
        }
        audio.playSe('fire');
        break;
      }
      case 'meteor': {
        for (let i = 0; i < 5; i++) {
          const hx = LAYOUT.baseLine + 60 + Math.random() * (LAYOUT.heroMaxX - LAYOUT.baseLine);
          this.schedule(i * 0.24, () => {
            if (anyHero) {
              this.areaDamage(hx, LANE_CENTER, 84, b.attackPower * 1.05 * scale, 'fire', anyHero, {
                status: { kind: 'burn', duration: 3, dps: b.attackPower * 0.15 },
              });
            }
            this.fx.burst(hx, LANE_CENTER, '#ff7a2a', 1.5);
            this.shakes.shake(120, 0.005);
          });
        }
        break;
      }
      case 'freeze': {
        for (const hero of this.heroes) {
          if (hero.down) continue;
          hero.freezeTimer = 2.4;
          hero.takeDamage(damageAfterDefense(b.attackPower * 0.6, hero.stats.defense));
          this.fx.ring(hero.homeX, hero.homeY - 16, 42, '#8fd8ff', 420);
        }
        audio.playSe('freeze');
        break;
      }
      case 'poisonFog': {
        for (let i = 0; i < 3; i++) {
          const zx = LAYOUT.baseLine + 80 + Math.random() * (LAYOUT.heroMaxX - LAYOUT.baseLine);
          this.spawnZone({
            x: zx, y: LANE_CENTER, radius: 90, duration: 6, ownerUid: -1, tickInterval: 0.5,
            damagePerTick: b.attackPower * 0.5, color: hexToNumber('#9cff4a'), element: 'poison',
            kind: 'poisonFog', statusKind: 'poison', statusDuration: 3, hostile: true,
          } as ZoneOptions);
        }
        break;
      }
      case 'laser': {
        const y = b.y - 40;
        for (let i = 0; i < 26; i++) {
          this.schedule(i * 0.035, () => {
            this.spawnProjectile({
              kind: 'laser', element: 'mech', x: b.x - 30 - i * 20, y, dx: -1, dy: 0, speed: 1500,
              damage: b.attackPower * 0.7, pierce: 0, radius: 0, ownerUid: -1, lifespan: 1.4, hostile: true,
            });
          });
        }
        break;
      }
      case 'missiles': {
        for (let i = 0; i < 6; i++) {
          const target = this.heroes[Math.floor(Math.random() * Math.max(1, this.heroes.length))];
          this.spawnProjectile({
            kind: 'shellBig', element: 'mech', x: b.x - 20, y: b.y - 70 + i * 10,
            dx: -0.7, dy: -0.5, speed: 430, damage: b.attackPower * 0.75, pierce: 0, radius: 74,
            ownerUid: -1, lifespan: 3.6, homing: -1, hostile: true, explodeRadius: 74,
          } as ProjectileOptions);
          if (target) {
            this.schedule(i * 0.1, () => {
              this.fx.ring(target.homeX, target.homeY - 20, 40, '#ff9a3a', 300);
            });
          }
        }
        break;
      }
      case 'shadowPulse': {
        for (let i = 0; i < 3; i++) {
          this.schedule(i * 0.32, () => {
            const px = b.x - 50 - i * 70;
            this.fx.ring(px, b.y, 104 + i * 32, '#c070ff', 460);
            for (const hero of this.heroes) {
              if (hero.down) continue;
              if (Math.hypot(hero.homeX - px, hero.homeY - b.y) < 114 + i * 32) {
                const t = hero.takeDamage(damageAfterDefense(b.attackPower * 0.7, hero.stats.defense));
                if (t > 0) this.floats.damage(`hero${hero.inst.uid}`, hero.homeX, hero.homeY - 46, t, 'hurt');
              }
            }
          });
        }
        break;
      }
      case 'barrage': {
        for (let i = 0; i < 15; i++) {
          const ang = Math.PI - 0.62 + (i / 15) * 1.24;
          this.spawnProjectile({
            kind: 'orb', element: b.cfg.id === 'starGuardian' ? 'shadow' : 'fire',
            x: b.x - 20, y: b.y - 50, dx: Math.cos(ang), dy: Math.sin(ang),
            speed: 400, damage: b.attackPower * 0.5, pierce: 1, radius: 0, ownerUid: -1,
            lifespan: 3, hostile: true,
          });
        }
        break;
      }
      case 'shield': {
        b.shielded = true;
        this.fx.ring(b.x, b.y - 50, 92, '#8fd8ff', 600);
        this.delay(6, () => {
          b.shielded = false;
        });
        break;
      }
      case 'charge': {
        b.x -= 95;
        this.shakes.shake(240, 0.006);
        for (const hero of this.heroes) {
          if (hero.down) continue;
          if (Math.abs(hero.homeX - b.x) < 115) {
            const t = hero.takeDamage(damageAfterDefense(b.attackPower * 1.1, hero.stats.defense));
            if (t > 0) this.floats.damage(`hero${hero.inst.uid}`, hero.homeX, hero.homeY - 46, t, 'hurt');
          }
        }
        break;
      }
    }
  }

  private nearestHero(x: number, y: number, maxDist: number): Hero | null {
    let best: Hero | null = null;
    let bd = maxDist;
    for (const h of this.heroes) {
      if (h.down) continue;
      const d = Math.hypot(h.homeX - x, h.homeY - y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  private bossBreach(b: Boss): void {
    this.applyBaseDamage(BREACH_DAMAGE.boss);
    this.run.stats.breaches++;
    this.shakes.shake(400, 0.012);
    this.floats.text({ x: LAYOUT.baseLine + 50, y: LANE_CENTER, text: '-20', color: '#ff5a5a', rise: 80, duration: 1400 });
    b.destroy();
  }

  private onBossDeath(b: Boss): void {
    this.run.stats.bossesKilled++;
    const ups = addExp(this.run, b.cfg.expReward * (1 + this.run.wave.wave * 0.05), this.totalBonus);
    addGold(this.run, b.cfg.goldReward * (this.runFlags.has('bounty') ? 2 : 1), this.totalBonus);
    this.run.stats.kills += 20;
    this.fx.burst(b.x, b.y - 50, '#ffd24a', 2.4);
    this.fx.ring(b.x, b.y - 50, 170, '#ffd24a', 900);
    this.shakes.shake(500, 0.01);
    audio.playSe('bossDown');
    audio.playBgm('battle');
    this.floats.text({ x: b.x, y: b.y - 120, text: `${b.cfg.name} 被击败!`, color: '#ffd24a', duration: 1700, rise: 60 });
    useUiStore().setBossBar({ visible: false, name: '', title: '', hp: 0, maxHp: 0, shield: false, enraged: false });

    if (Math.random() < 0.6) this.grantRandomRelic();
    for (let i = 0; i < 2; i++) this.dropEquipment(b.x, b.y - 40);
    if (ups > 0) this.onLevelUp(ups);

    this.run.wave.bossAlive = false;
    if (this.run.mode === 'normal' && this.run.wave.wave >= 20) {
      this.finish(true);
    }
  }

  private grantRandomRelic(): void {
    const pool = this.relicPool();
    if (pool.length === 0) return;
    const id = pool[Math.floor(this.rng.next() * pool.length)];
    this.run.relics.push(id);
    const cfg = RELIC_MAP[id];
    this.fx.ring(GAME_W / 2, 240, 90, '#ffb02e', 700);
    useUiStore().pushToast(`获得遗物：${cfg.name}`, '#ffb02e');
    this.floats.text({ x: GAME_W / 2, y: 240, text: `遗物 · ${cfg.name}`, color: '#ffb02e', duration: 1700, rise: 40 });
    this.run.stats.equipmentFound.push(`relic:${id}`);
    this.rebuildGlobalMods();
  }

  /* ---------------- 投射物 ---------------- */

  private updateProjectiles(dt: number): void {
    const all = [...this.projectiles, ...this.hostileProjs];
    const dead: Projectile[] = [];
    for (const p of all) {
      const target = p.opts.homing ? this.findTargetableById(p.opts.homing) : null;
      p.update(dt, target ? { x: target.x, y: target.y - 18 } : null);
      if (p.opts.hostile) this.checkHostileHit(p);
      else this.checkFriendlyHit(p);
      if (!p.alive) dead.push(p);
    }
    if (dead.length > 0) {
      const set = new Set(dead);
      for (const p of dead) p.destroy();
      this.projectiles = this.projectiles.filter((p) => !set.has(p));
      this.hostileProjs = this.hostileProjs.filter((p) => !set.has(p));
    }
  }

  private findTargetableById(id: number): Targetable | null {
    if (id < 0) return null;
    return this.enemies.find((e) => e.alive && e.id === id) ?? this.bosses.find((b) => b.alive && b.id === id) ?? null;
  }

  private checkFriendlyHit(p: Projectile): void {
    if (!p.alive) return;
    const r = p.opts.radius > 0 ? Math.max(p.opts.radius, 26) : 30;
    const hits: Targetable[] = [];
    const list = this.allTargets();
    for (const t of list) {
      if (p.hitIds.has(t.id)) continue;
      const tw = t instanceof Boss ? 36 : 18;
      if (Math.abs(t.x - p.x) < r + tw && Math.abs(t.y - 18 - p.y) < r * 0.8 + 24) hits.push(t);
    }
    if (hits.length === 0) return;
    const hero = this.findHeroByUid(p.opts.ownerUid);
    for (const t of hits) {
      p.hitIds.add(t.id);
      if (!hero) continue;
      const crit = Math.random() < hero.stats.critRate;
      this.damage(t, p.opts.damage, p.opts.element as Element, { source: hero, crit });
      if (p.opts.statusKind) {
        this.status(t, { kind: p.opts.statusKind, duration: p.opts.statusDuration, dps: p.opts.statusDps });
      }
      if (p.opts.knockback) t.x += p.opts.knockback;
    }
    if (p.opts.explodeRadius && p.opts.explodeRadius > 0) {
      if (hero) {
        const col = ELEMENT_COLORS[p.opts.element] ?? '#ff9a3a';
        this.fx.burst(p.x, p.y, col, 1.1);
        this.fx.ring(p.x, p.y, p.opts.explodeRadius, col, 320);
        this.areaDamage(p.x, p.y, p.opts.explodeRadius, p.opts.damage * 0.85, p.opts.element as Element, hero, {
          status: p.opts.statusKind ? { kind: p.opts.statusKind, duration: p.opts.statusDuration, dps: p.opts.statusDps } : undefined,
          exclude: new Set(hits.map((h) => h.id)),
        });
        if (p.opts.element === 'fire' && this.runFlags.has('poisonIgnite')) {
          this.areaDamage(p.x, p.y, p.opts.explodeRadius * 1.2, p.opts.damage * 0.3, 'poison', hero);
        }
        if (p.opts.kind === 'flask' && hero.awakened && hero.cfg.id === 'alchemist') {
          this.spawnZone({
            x: p.x, y: Math.max(LAYOUT.laneTop, p.y), radius: 70, duration: 4, ownerUid: hero.inst.uid,
            tickInterval: 0.5, damagePerTick: hero.stats.attack * 0.35, color: hexToNumber('#9cff4a'),
            element: 'poison', kind: 'poisonFog', statusKind: 'poison', statusDuration: 2,
          });
        }
      }
      p.alive = false;
      return;
    }
    const splitChance = p.opts.splitChance ?? 0;
    if (splitChance > 0 && (p.opts.splitLeft ?? 0) < 2 && Math.random() < splitChance) {
      for (let i = 0; i < 2; i++) {
        const ang = Math.atan2(p.vy, p.vx) + (i ? 0.34 : -0.34);
        this.spawnProjectile({
          ...p.opts, x: p.x, y: p.y, dx: Math.cos(ang), dy: Math.sin(ang),
          splitLeft: (p.opts.splitLeft ?? 0) + 1, splitChance: splitChance * 0.5, damage: p.opts.damage * 0.7,
        });
      }
      p.alive = false;
      return;
    }
    if (p.opts.pierce > 0) {
      p.opts.pierce -= 1;
    } else {
      p.alive = false;
    }
  }

  private checkHostileHit(p: Projectile): void {
    if (!p.alive) return;
    for (const hero of this.heroes) {
      if (hero.down) continue;
      if (Math.abs(hero.homeX - p.x) < 28 && Math.abs(hero.homeY - 20 - p.y) < 36) {
        const taken = hero.takeDamage(damageAfterDefense(p.opts.damage, hero.stats.defense));
        if (taken > 0) this.floats.damage(`hero${hero.inst.uid}`, hero.homeX, hero.homeY - 46, taken, 'hurt');
        if (p.opts.explodeRadius) {
          this.fx.burst(p.x, p.y, '#ff9a3a', 1.2);
          for (const h of this.heroes) {
            if (h.down) continue;
            if (Math.hypot(h.homeX - p.x, h.homeY - p.y) < p.opts.explodeRadius) {
              const t = h.takeDamage(damageAfterDefense(p.opts.damage * 0.6, h.stats.defense));
              if (t > 0) this.floats.damage(`hero${h.inst.uid}`, h.homeX, h.homeY - 46, t, 'hurt');
            }
          }
        }
        p.alive = false;
        return;
      }
    }
  }

  /* ---------------- 区域 ---------------- */

  private updateZones(dt: number): void {
    const alive: Zone[] = [];
    for (const z of this.zones) {
      if (!z.update(dt)) continue;
      alive.push(z);
      if (!z.ready) continue;
      const hostile = z.opts.hostile;
      if (hostile) {
        for (const hero of this.heroes) {
          if (hero.down) continue;
          if (Math.hypot(hero.homeX - z.x, hero.homeY - z.y) < z.opts.radius) {
            const taken = hero.takeDamage(damageAfterDefense(z.opts.damagePerTick, hero.stats.defense));
            if (taken > 0) this.floats.damage(`hero${hero.inst.uid}`, hero.homeX, hero.homeY - 46, taken, 'poison');
          }
        }
        continue;
      }
      const owner = this.findHeroByUid(z.opts.ownerUid);
      if (!owner) continue;
      if (z.opts.damagePerTick > 0) {
        const targets = [...this.targetsInRadius(z.x, z.y, z.opts.radius), ...this.bosses.filter((b) => b.alive && Math.hypot(b.x - z.x, b.y - z.y) < z.opts.radius)] as Targetable[];
        for (const t of targets) {
          const crit = Math.random() < owner.stats.critRate * 0.5;
          this.damage(t, z.opts.damagePerTick, z.opts.element as Element, { source: owner, crit });
          if (z.opts.statusKind) {
            this.status(t, { kind: z.opts.statusKind, duration: z.opts.statusDuration }, z.opts.statusDuration ?? 2, z.opts.damagePerTick * 0.4);
          }
        }
      } else if (z.opts.statusKind) {
        for (const t of [...this.targetsInRadius(z.x, z.y, z.opts.radius)] as Targetable[]) {
          this.status(t, { kind: z.opts.statusKind, duration: z.opts.statusDuration });
        }
      }
      if (z.opts.pull) {
        for (const e of this.enemiesInRadius(z.x, z.y, z.opts.radius * 1.4)) {
          const dx = z.x - e.x;
          e.x += Math.sign(dx) * Math.min(Math.abs(dx), z.opts.pull * 0.12);
        }
      }
    }
    this.zones = alive;
  }

  /* ---------------- 召唤物 ---------------- */

  private updateSummons(dt: number): void {
    const alive: Summon[] = [];
    for (const s of this.summons) {
      s.life -= dt;
      const owner = this.findHeroByUid(s.opts.ownerUid);
      if (s.life <= 0 || !s.alive || !owner) {
        if (s.opts.explodeOnDeath && owner) {
          this.fx.burst(s.x, s.y - 16, '#c8d8f0', 1.2);
          this.areaDamage(s.x, s.y - 16, 74, s.opts.damage * 1.5, 'shadow', owner);
        }
        s.destroy();
        continue;
      }
      alive.push(s);
      const target = pickBest(this.allTargets(), s, { preferElite: true });
      const dist = target ? Math.hypot(target.x - s.x, target.y - s.y) : Infinity;

      if (s.opts.stationary) {
        if (!target || dist > s.opts.range) continue;
      } else if (!target || dist > s.opts.range) {
        const near = target ?? pickBest(this.allTargets(), s, {});
        if (near) {
          const dir = Math.sign(near.x - s.x) || 1;
          if (Math.abs(near.x - s.x) > 40) s.x += dir * s.opts.speed * dt;
          s.y += Math.sin(this.run.elapsedTime * 2 + s.id) * 10 * dt;
        }
        if (s.opts.kind === 'golem') {
          for (const e of this.enemiesInRadius(s.x, s.y, 44)) {
            if (e.alive && e.x > s.x - 12 && e.x < s.x + 60) e.x = Math.max(e.x, s.x + 10);
          }
        }
        continue;
      }

      s.attackCd -= dt;
      if (s.attackCd <= 0) {
        s.attackCd = 1 / Math.max(0.3, s.opts.attackSpeed);
        s.setFrame('attack');
        const crit = Math.random() < owner.stats.critRate;
        if (s.opts.kind === 'turret') {
          const ang = Math.atan2(target!.y - 18 - (s.y - 22), target!.x - s.x);
          const mechPower = 1 + (this.totalBonus.mechPower ?? 0);
          this.spawnProjectile({
            kind: 'shell', element: 'mech', x: s.x + 16, y: s.y - 22, dx: Math.cos(ang), dy: Math.sin(ang),
            speed: 950, damage: s.opts.damage * mechPower, pierce: (this.totalBonus.pierce ?? 0) + 0,
            radius: 0, ownerUid: owner.inst.uid, lifespan: 1.6, homing: target!.id,
          });
        } else if (s.opts.kind === 'drone') {
          const ang = Math.atan2(target!.y - 18 - (s.y - 20), target!.x - s.x);
          this.spawnProjectile({
            kind: 'bullet', element: 'mech', x: s.x, y: s.y - 20, dx: Math.cos(ang), dy: Math.sin(ang),
            speed: 780, damage: s.opts.damage, pierce: 0, radius: 0, ownerUid: owner.inst.uid,
            lifespan: 1.4, homing: target!.id,
          });
        } else if (s.opts.kind === 'ghost') {
          this.damage(target!, s.opts.damage, 'shadow', { source: owner, crit });
          this.fx.burst(target!.x, target!.y - 18, '#c070ff', 0.5);
        } else {
          this.damage(target!, s.opts.damage, s.opts.shadow ? 'shadow' : 'physical', { source: owner, crit });
          this.spawnProjectile({
            kind: 'bone', element: 'summon', x: s.x + 10, y: s.y - 20, dx: 1, dy: -0.05,
            speed: 700, damage: 0, pierce: 0, radius: 0, ownerUid: owner.inst.uid, lifespan: 0.5,
          });
        }
      }
    }
    this.summons = alive;
  }

  /* ---------------- 防线设施 ---------------- */

  private updateDefenses(dt: number): void {
    const d = this.run.defenses;
    if (d.arrowTower) {
      this.timers.arrow = (this.timers.arrow ?? 0) - dt;
      if (this.timers.arrow <= 0) {
        this.timers.arrow = 0.55;
        const hero = this.heroes[0];
        const t = pickBest(this.targetsInRadius(LAYOUT.baseLine + 60, LANE_CENTER, 720), { x: LAYOUT.baseLine, y: LANE_CENTER }, {});
        if (hero && t) {
          this.damage(t, 16 + d.arrowTower * 15 + this.run.teamLevel * 3, 'physical', {
            source: hero, crit: Math.random() < 0.2,
          });
          this.spawnProjectile({
            kind: 'arrow', element: 'physical', x: LAYOUT.baseLine + 20, y: LANE_CENTER - 40,
            dx: 1, dy: 0, speed: 1300, damage: 0, pierce: 0, radius: 0, ownerUid: -1, lifespan: 0.6,
          });
        }
      }
    }
    if (d.lightning) {
      this.timers.bolt = (this.timers.bolt ?? 0) - dt;
      if (this.timers.bolt <= 0) {
        this.timers.bolt = Math.max(2, 8 - d.lightning * 0.7);
        const hero = this.heroes[0];
        const list = this.allTargets().filter((t) => t.x > 220);
        const t = list[Math.floor(Math.random() * list.length)];
        if (hero && t) {
          this.fx.bolt(t.x, 90, t.x, t.y - 20, '#ffe84a');
          this.areaDamage(t.x, t.y - 16, 72, 30 + d.lightning * 26 + this.run.teamLevel * 5, 'lightning', hero);
          audio.playSe('lightning');
        }
      }
    }
    if (d.fireTrap && !this.zones.some((z) => z.opts.kind === 'fireTrap')) {
      const hero = this.heroes[0];
      if (hero) {
        this.spawnZone({
          x: LAYOUT.baseLine + 56, y: LANE_CENTER, radius: 88 + d.fireTrap * 9, duration: 1e6, ownerUid: hero.inst.uid,
          tickInterval: 0.55, damagePerTick: 20 + d.fireTrap * 20, color: hexToNumber('#ff8a3a'),
          element: 'fire', kind: 'fireTrap', statusKind: 'burn', statusDuration: 2,
        });
      }
    }
    if (d.slowField && !this.zones.some((z) => z.opts.kind === 'slowField')) {
      const hero = this.heroes[0];
      if (hero) {
        this.spawnZone({
          x: LAYOUT.baseLine + 96, y: LANE_CENTER, radius: 130 + d.slowField * 15, duration: 1e6, ownerUid: hero.inst.uid,
          tickInterval: 0.6, damagePerTick: 0, color: hexToNumber('#8fd8ff'), element: 'ice',
          kind: 'slowField', statusKind: 'slow', statusDuration: 1.5,
        });
      }
    }
    if (d.autoRepair) {
      this.timers.repair = (this.timers.repair ?? 0) + dt;
      if (this.timers.repair >= 12) {
        this.timers.repair = 0;
        this.run.baseHp = Math.min(this.run.baseMaxHp, this.run.baseHp + d.autoRepair);
      }
    }
    if (d.lineShield) {
      this.baseShieldTimer += dt;
      if (this.baseShieldTimer > 8) {
        this.baseShieldTimer = 0;
        this.baseShield = Math.max(this.baseShield, d.lineShield * 8);
        this.run.baseShield = this.baseShield;
      }
    }
    if (this.runFlags.has('waveHeal') && this.run.wave.phase === 'intermission') {
      this.timers.waveHeal = (this.timers.waveHeal ?? 0) + dt;
      if (this.timers.waveHeal > 1) {
        this.timers.waveHeal = 0;
        for (const h of this.heroes) if (!h.down) h.heal(h.stats.maxHp * 0.03);
      }
    }
  }

  private updateSpecials(dt: number): void {
    const shieldPer = this.totalBonus.shieldPeriodic ?? 0;
    if (shieldPer > 0) {
      this.timers.shield = (this.timers.shield ?? 0) + dt;
      if (this.timers.shield > 10) {
        this.timers.shield = 0;
        for (const h of this.heroes) if (!h.down) h.addShield(h.stats.maxHp * 0.08 * (1 + shieldPer));
      }
    }
    if (this.runFlags.has('holyRegen')) {
      this.timers.holyRegen = (this.timers.holyRegen ?? 0) + dt;
      if (this.timers.holyRegen > 0.5) {
        this.timers.holyRegen = 0;
        for (const h of this.heroes) {
          if (!h.down && h.cfg.role === 'front') h.heal(h.stats.maxHp * 0.0075);
        }
      }
    }
    if (this.runFlags.has('summonRush') || this.runFlags.has('shadowSummon')) {
      // 召唤物攻速加成已在 spawnSummon 中通过 totalBonus 生效
    }
    for (const h of this.heroes) h.flushToInstance();
  }

  /* ---------------- 波次 ---------------- */

  private updateSpawning(dt: number): void {
    const w = this.run.wave;
    w.waveTime += dt;

    if (w.phase === 'intermission') {
      w.intermission -= dt;
      if (w.intermission <= 0) this.startWave();
      return;
    }
    if (w.phase === 'spawning') {
      while (w.queueIndex < w.queue.length && w.queue[w.queueIndex].at <= w.waveTime) {
        const entry = w.queue[w.queueIndex];
        this.spawnEnemy(entry.enemyId, entry.elite);
        w.queueIndex++;
      }
      if (w.bossId && !w.bossSpawned) {
        this.spawnBoss(w.bossId);
        if (this.run.challengeRules.includes('bossRush')) {
          this.delay(2.5, () => {
            if (!this.finished && w.bossId) this.spawnBoss(w.bossId);
          });
        }
      }
      if (w.queueIndex >= w.queue.length) w.phase = 'clearing';
      return;
    }
    if (w.phase === 'clearing') {
      const bossAlive = this.bosses.length > 0;
      const eliteAlive = this.enemies.some((e) => e.alive && e.elite);
      const cleared = this.enemies.length === 0 && !bossAlive;
      const almostDone = !bossAlive && !eliteAlive && this.enemies.length < 3;
      if (cleared || almostDone || w.waveTime > WAVE_HARD_LIMIT) this.completeWave();
    }
  }

  private startWave(): void {
    const w = this.run.wave;
    this.rng.state = this.run.rngState || this.rng.state;
    const progress = genWaveProgress(this.run, this.map, this.rng, 1);
    progress.wave = w.wave;
    progress.phase = 'spawning';
    progress.waveTime = 0;
    progress.queueIndex = 0;
    progress.bossSpawned = false;
    progress.bossAlive = !!progress.bossId;
    this.run.wave = progress;
    this.run.rngState = this.rng.state;
    const boss = isBossWave(w.wave, this.run.mode);
    useUiStore().pushToast(`第 ${w.wave} 波 · ${waveCategory(w.wave)}`, boss ? '#ff5a5a' : '#8fd8ff');
    if (boss) {
      audio.playSe('warning');
      this.shakes.shake(240, 0.004);
      useUiStore().setWaveWarning({ wave: w.wave, boss: true });
      window.setTimeout(() => useUiStore().setWaveWarning(null), 1600);
    }
  }

  private completeWave(): void {
    const w = this.run.wave;
    w.phase = 'intermission';
    w.intermission = INTERMISSION;
    const gold = 40 + w.wave * 18;
    addGold(this.run, gold, this.totalBonus);
    audio.playSe('waveClear');
    useUiStore().pushToast(`第 ${w.wave} 波清除 · +${gold} 金币`, '#ffd24a');

    if (this.run.mode === 'normal' && w.wave >= 20 && !w.bossAlive && this.bosses.length === 0) {
      this.finish(true);
      return;
    }
    w.wave += 1;
    w.waveTime = 0;
    // 随机事件
    if (w.wave >= 3) {
      this.rng.state = this.run.rngState || this.rng.state;
      if (this.rng.chance(0.24)) {
        this.run.rngState = this.rng.state;
        this.triggerRandomEvent();
      }
    }
  }

  skipIntermission(): void {
    const w = this.run.wave;
    if (w.phase === 'intermission') {
      w.intermission = 0;
      this.startWave();
    } else if (w.phase === 'clearing') {
      w.waveTime = WAVE_HARD_LIMIT + 1;
    }
  }

  /* ---------------- 升级 ---------------- */

  private onLevelUp(count: number): void {
    audio.playSe('levelup');
    this.floats.text({ x: GAME_W / 2, y: 280, text: `LEVEL UP ×${count}`, color: '#8fd8ff', duration: 1200, rise: 50 });
    useUiStore().setPendingLevelUps(this.run.pendingLevelUps);
    if (this.run.autoPick !== 'manual') {
      this.autoResolveLevelUps();
      return;
    }
    if (!this.pausedForChoice) this.openLevelUp();
  }

  private autoResolveLevelUps(): void {
    let guard = 0;
    while (this.run.pendingLevelUps > 0 && guard < 40) {
      guard++;
      const cards = this.drawCards();
      if (cards.length === 0) {
        this.run.pendingLevelUps = 0;
        break;
      }
      const pick = autoPickCard(cards, this.run.autoPick, this.run.customPriority);
      if (!pick) break;
      this.run.pendingLevelUps--;
      applyCard(this.run, pick, this.rng);
    }
    this.afterCardApplied();
    useUiStore().setPendingLevelUps(this.run.pendingLevelUps);
  }

  private openLevelUp(): void {
    this.pausedForChoice = true;
    const cards = this.drawCards();
    if (cards.length === 0) {
      this.pausedForChoice = false;
      this.run.pendingLevelUps = Math.max(0, this.run.pendingLevelUps - 1);
      return;
    }
    useUiStore().openLevelUp(cards, this.run.refreshes, this.run.pendingLevelUps);
  }

  private drawCards(excludeKeys?: Set<string>): UpgradeCard[] {
    return drawCards(this.cardContext(), 3, excludeKeys);
  }

  private cardContext(): CardContext {
    const perma = usePlayerStore().data;
    return {
      heroes: this.run.heroes,
      deployCap: this.run.deployCap,
      passives: this.run.passives,
      relics: this.run.relics,
      defenses: this.run.defenses,
      specials: this.run.specials,
      availableHeroes: perma.unlockedHeroes.length > 0 ? perma.unlockedHeroes : Object.keys(HERO_MAP),
      wave: this.run.wave.wave,
      luck: this.totalBonus.luck ?? 0,
      mode: this.run.mode,
      magesOnly: this.run.challengeRules.includes('magesOnly'),
      rand: () => this.rng.next(),
    };
  }

  chooseCard(card: UpgradeCard): void {
    applyCard(this.run, card, this.rng);
    this.run.pendingLevelUps = Math.max(0, this.run.pendingLevelUps - 1);
    this.afterCardApplied();
    useUiStore().setPendingLevelUps(this.run.pendingLevelUps);
    if (this.run.pendingLevelUps > 0) {
      this.openLevelUp();
    } else {
      this.pausedForChoice = false;
      useUiStore().closeLevelUp();
    }
  }

  refreshCards(locked: UpgradeCard | null): UpgradeCard[] {
    if (this.run.refreshes <= 0) return [];
    this.run.refreshes--;
    const exclude = new Set<string>(locked ? [locked.key] : []);
    const fresh = this.drawCards(exclude);
    useUiStore().setRefreshes(this.run.refreshes);
    if (locked) return [locked, ...fresh.slice(0, 2)];
    return fresh;
  }

  private afterCardApplied(): void {
    this.syncHeroes();
    this.rebuildGlobalMods();
  }

  /** 同步 run.heroes 与场景中的 Hero 对象 */
  private syncHeroes(): void {
    const live = new Map(this.heroes.map((h) => [h.inst.uid, h]));
    // 新增
    for (const inst of this.run.heroes) {
      if (live.has(inst.uid)) continue;
      Hero.createTexturesFor(this, inst.heroId);
      const h = new Hero(this, inst);
      this.heroes.push(h);
      this.fx.ring(inst.x, inst.y - 20, 48, '#8fd8ff', 500);
      audio.playSe('recruit');
      useUiStore().pushToast(`${HERO_MAP[inst.heroId].name} 加入队伍`, '#8fd8ff');
    }
    // 移除（被替换）
    const uids = new Set(this.run.heroes.map((h) => h.uid));
    const kept: Hero[] = [];
    for (const h of this.heroes) {
      if (uids.has(h.inst.uid)) kept.push(h);
      else h.destroy();
    }
    this.heroes = kept;
  }

  /* ---------------- 随机事件 ---------------- */

  private triggerRandomEvent(): void {
    if (this.pausedForChoice) return;
    const candidates = EVENTS.filter((e) => {
      if (this.run.wave.wave < e.minWave) return false;
      return this.run.eventsSeen.filter((x) => x === e.id).length < e.maxPerRun;
    });
    if (candidates.length === 0) return;
    const ev = this.rng.weighted(candidates, (c) => c.weight);
    if (!ev) return;
    this.run.eventsSeen.push(ev.id);
    this.handleEvent(ev.id);
  }

  private handleEvent(id: string): void {
    const ui = useUiStore();
    this.eventOpen = true;
    switch (id) {
      case 'merchant': {
        const offers = this.buildMerchantOffers();
        if (offers.length === 0) {
          this.eventOpen = false;
          return;
        }
        ui.openEvent({
          eventId: 'merchant',
          title: '神秘商人',
          desc: '“用你的金币，换取活过下一波的力量。”',
          multi: true,
          offers,
          options: offers.map((o) => ({
            id: o.id, title: o.title, desc: o.desc, cost: o.cost, icon: o.icon,
            disabled: this.run.gold < o.cost,
          })),
        });
        break;
      }
      case 'blessing': {
        const picks = this.rng.shuffle(BLESSINGS).slice(0, 3);
        ui.openEvent({
          eventId: 'blessing', title: '祝福祭坛', desc: '选择一项祝福，永久作用于本次冒险。',
          options: picks.map((b) => ({ id: b.id, title: b.title, desc: b.desc, icon: b.icon })),
        });
        break;
      }
      case 'curse': {
        const picks = this.rng.shuffle(CURSES).slice(0, 3);
        ui.openEvent({
          eventId: 'curse', title: '诅咒祭坛', desc: '祭坛低语着代价与力量。',
          options: picks.map((c) => ({ id: c.id, title: c.title, desc: c.desc, icon: c.icon })),
        });
        break;
      }
      case 'raid': {
        ui.openEvent({
          eventId: 'raid', title: '怪物突袭', desc: '大量怪物正从右侧涌来，是否立刻迎战？',
          options: [
            { id: 'fight', title: '迎战', desc: '立刻刷新一波额外怪物，可获得额外经验与金币', icon: 'raid' },
            { id: 'brace', title: '固守', desc: '基地获得 25 点护盾，跳过本次突袭', icon: 'shield' },
          ],
        });
        break;
      }
      case 'chest': {
        ui.openEvent({
          eventId: 'chest', title: '幸运宝箱', desc: '宝箱中传来嗡鸣，选择你想要的奖励。',
          options: [
            { id: 'gold', title: '金币', desc: '获得大量金币', icon: 'coin' },
            { id: 'equip', title: '装备', desc: '获得一件史诗装备', icon: 'armor' },
            { id: 'relic', title: '遗物', desc: '获得一件随机遗物', icon: 'relic' },
            { id: 'skill', title: '技能强化', desc: '随机一个技能 +1 级', icon: 'star' },
          ],
        });
        break;
      }
      case 'rescue': {
        const pool = this.cardContext().availableHeroes.filter((h) => !this.run.heroes.some((x) => x.heroId === h));
        const choices = this.rng.shuffle(pool).slice(0, 3);
        ui.openEvent({
          eventId: 'rescue', title: '英雄救援', desc: '一名英雄被围困在怪物潮中。救下他，他就会加入队伍。',
          options: choices.length > 0
            ? choices.map((h) => ({ id: h, title: `救援 ${HERO_MAP[h].name}`, desc: HERO_MAP[h].desc, icon: HERO_MAP[h].spriteKey }))
            : [{ id: 'gold', title: '收下谢礼', desc: '队伍已满，获得金币奖励', icon: 'coin' }],
        });
        break;
      }
    }
  }

  /** 商人货架上的装备，只有购买后才进入背包 */
  private merchantStock = new Map<string, EquipmentItem>();

  /** 永久解锁的遗物才会进入随机池（PRD 14） */
  private relicPool(): string[] {
    const unlocked = usePlayerStore().data.unlockedRelics;
    const base = unlocked.length > 0 ? unlocked : Object.keys(RELIC_MAP);
    return base.filter((r) => RELIC_MAP[r] && !this.run.relics.includes(r));
  }

  private buildMerchantOffers(): MerchantOffer[] {
    const offers: MerchantOffer[] = [];
    const wave = this.run.wave.wave;
    this.merchantStock.clear();
    for (let i = 0; i < 3; i++) {
      const roll = this.rng.next();
      if (roll < 0.45) {
        const quality = roll < 0.12 ? 'epic' : roll < 0.28 ? 'rare' : 'fine';
        const item = makeEquipment(this.rng, { luck: (this.totalBonus.luck ?? 0) + 0.6, level: wave, quality });
        this.merchantStock.set(item.uid, item);
        offers.push({
          id: item.uid,
          kind: 'equipment',
          title: `装备补给（${quality}）`,
          desc: `${item.affixes.length} 条词条，品质优秀`,
          cost: Math.round(120 + wave * 22 + i * 30),
          icon: 'armor',
          payload: { itemUid: item.uid },
        });
      } else if (roll < 0.75) {
        const pool = this.relicPool();
        if (pool.length > 0) {
          const rid = pool[Math.floor(this.rng.next() * pool.length)];
          const rc = RELIC_MAP[rid];
          offers.push({
            id: rid, kind: 'relic', title: `遗物：${rc.name}`, desc: rc.desc,
            cost: Math.round(220 + wave * 30 + i * 20), icon: rc.icon, payload: { relicId: rid },
          });
        }
      } else {
        const opts = [
          { id: 'm_atk', title: '强化：全队攻击', desc: '全队攻击力 +12%', icon: 'sword', effectId: 'attack', value: 0.12 },
          { id: 'm_hp', title: '强化：全队生命', desc: '全队最大生命 +15% 并回满', icon: 'heart', effectId: 'maxHp', value: 0.15 },
          { id: 'm_haste', title: '强化：攻击速度', desc: '全队攻速 +10%', icon: 'boot', effectId: 'attackSpeed', value: 0.1 },
          { id: 'm_cd', title: '强化：冷却缩减', desc: '全队冷却 -6%', icon: 'hourglass', effectId: 'cooldownReduction', value: 0.06 },
          { id: 'm_gold', title: '强化：金币收益', desc: '金币收益 +30%', icon: 'coin', effectId: 'goldGain', value: 0.3 },
        ];
        const o = opts[Math.floor(this.rng.next() * opts.length)];
        offers.push({
          id: o.id, kind: 'upgrade', title: o.title, desc: o.desc,
          cost: Math.round(100 + wave * 18), icon: o.icon,
          payload: { effectId: o.effectId, value: o.value },
        });
      }
    }
    return offers;
  }

  resolveEvent(eventId: string, optionId: string, offers?: MerchantOffer[]): boolean {
    switch (eventId) {
      case 'merchant': {
        const offer = offers?.find((o) => o.id === optionId);
        if (!offer || this.run.gold < offer.cost) return false;
        this.run.gold -= offer.cost;
        if (offer.kind === 'relic' && offer.payload.relicId) {
          if (!this.run.relics.includes(offer.payload.relicId)) {
            this.run.relics.push(offer.payload.relicId);
            useUiStore().pushToast(`获得遗物：${RELIC_MAP[offer.payload.relicId].name}`, '#ffb02e');
          }
        } else if (offer.kind === 'equipment') {
          const uid = offer.payload.itemUid ?? '';
          const item = this.merchantStock.get(uid);
          if (item) {
            this.merchantStock.delete(uid);
            this.equipmentFound.push(item);
            this.run.stats.equipmentFound.push(item.uid);
            useUiStore().pushToast('装备已购买，结算后进入背包', '#b76cff');
            audio.playSe('drop');
          }
        } else if (offer.payload.effectId) {
          const eid = offer.payload.effectId;
          const val = offer.payload.value ?? 0;
          if (eid === 'goldGain') addBonus(this.run.teamMods, 'goldGain', val);
          else if (isFlatStatKey(eid)) addFlat(this.run.teamMods, eid as StatKey, val);
          else addPct(this.run.teamMods, eid as StatKey, val);
          if (eid === 'maxHp') {
            for (const h of this.heroes) if (!h.down) h.inst.hp = heroHpMax(this.run, h.inst);
          }
        }
        this.rebuildGlobalMods();
        return true;
      }
      case 'blessing':
        this.applyBlessing(optionId);
        return true;
      case 'curse':
        this.run.curses.push(optionId);
        const c = CURSES.find((x) => x.id === optionId);
        if (c) useUiStore().pushToast(`接受了诅咒：${c.title}`, '#c070ff');
        if (optionId === 'c_baseSoul') {
          this.run.baseMaxHp = Math.max(10, this.run.baseMaxHp - 15);
          this.run.baseHp = Math.min(this.run.baseHp, this.run.baseMaxHp);
        }
        this.rebuildGlobalMods();
        return true;
      case 'raid': {
        if (optionId === 'fight') {
          const count = 18 + this.run.wave.wave * 2;
          const mult = getWaveMultiplier(this.run.wave.wave, this.run.mode) * this.map.hpMult * 1.2;
          const atkMult = getWaveAttackMultiplier(this.run.wave.wave, this.run.mode) * this.map.hpMult * 1.2;
          const pool = ENEMY_POOL;
          for (let i = 0; i < count; i++) {
            const cfg = ENEMY_MAP[pool[Math.floor(this.rng.next() * pool.length)]];
            if (!cfg) continue;
            this.delay(i * 0.12, () => {
              if (this.finished) return;
              this.spawnEnemyAt(cfg, LAYOUT.spawnX + this.rng.range(-40, 40), this.laneYFor(cfg.abilities.includes('flying')), mult, false, atkMult);
            });
          }
          useUiStore().pushToast('怪物突袭！', '#ff5a5a');
          audio.playSe('warning');
        } else {
          this.baseShield += 25;
          this.run.baseShield = this.baseShield;
        }
        return true;
      }
      case 'chest': {
        if (optionId === 'gold') {
          const g = 150 + this.run.wave.wave * 40;
          addGold(this.run, g, this.totalBonus);
          useUiStore().pushToast(`获得 ${g} 金币`, '#ffd24a');
          audio.playSe('chest');
        } else if (optionId === 'equip') {
          const item = makeEquipment(this.rng, { luck: (this.totalBonus.luck ?? 0) + 1, level: this.run.wave.wave, quality: 'epic' });
          this.equipmentFound.push(item);
          this.run.stats.equipmentFound.push(item.uid);
          useUiStore().pushToast('获得史诗装备', '#b76cff');
          useUiStore().addBattleEquipment?.(item);
        } else if (optionId === 'relic') {
          this.grantRandomRelic();
        } else {
          const hero = this.rng.pick(this.heroes.filter((h) => h.skills.length > 0));
          if (hero) {
            const sk = this.rng.pick(hero.skills);
            if (sk) {
              const cfg = SKILL_MAP[sk.id];
              sk.level = Math.min(cfg.maxLevel, sk.level + 1);
              const inst = hero.inst.skills.find((s) => s.id === sk.id);
              if (inst) inst.level = sk.level;
              useUiStore().pushToast(`「${cfg.name}」升至 Lv.${sk.level}`, '#8fd8ff');
            }
          }
        }
        return true;
      }
      case 'rescue': {
        if (optionId === 'gold') {
          addGold(this.run, 220, this.totalBonus);
          return true;
        }
        if (this.run.heroes.length >= this.run.deployCap) {
          useUiStore().pushToast('部署已满，无法救援', '#ff5a5a');
          return false;
        }
        const cfg = HERO_MAP[optionId];
        if (!cfg) return false;
        const pos = autoPlace(this.run, cfg.id);
        this.run.heroes.push(makeHeroInstance(cfg.id, pos.x, pos.y, this.run.nextUid++, 2));
        this.run.stats.heroesRecruited++;
        this.syncHeroes();
        this.rebuildGlobalMods();
        useUiStore().pushToast(`${cfg.name} 加入了队伍！`, '#8fd8ff');
        return true;
      }
    }
    return false;
  }

  private applyBlessing(id: string): void {
    const m = this.run.teamMods;
    switch (id) {
      case 'b_atk': addPct(m, 'attack', 0.2); break;
      case 'b_hp':
        addPct(m, 'maxHp', 0.25);
        break;
      case 'b_haste': addPct(m, 'attackSpeed', 0.18); break;
      case 'b_crit':
        addFlat(m, 'critRate', 0.12);
        addFlat(m, 'critDamage', 0.25);
        break;
      case 'b_cd': addFlat(m, 'cooldownReduction', 0.12); break;
      case 'b_gold':
        addBonus(m, 'goldGain', 0.5);
        addGold(this.run, 150, this.totalBonus);
        break;
      case 'b_base':
        this.run.baseMaxHp += 30;
        this.run.baseHp = Math.min(this.run.baseMaxHp, this.run.baseHp + 30);
        break;
      case 'b_lifesteal': addFlat(m, 'lifeSteal', 0.08); break;
      case 'b_summon':
        addBonus(m, 'summonCount', 1);
        addBonus(m, 'summonPower', 0.25);
        break;
      case 'b_shield':
        addPct(m, 'defense', 0.3);
        addBonus(m, 'area', 0.15);
        break;
    }
    this.rebuildGlobalMods();
    // 生命类祝福立即回满
    if (id === 'b_hp' || id === 'b_base') {
      for (const h of this.heroes) {
        if (!h.down) h.inst.hp = heroHpMax(this.run, h.inst);
      }
    }
    audio.playSe('chest');
  }

  /* ================================================================ */
  /*  SkillHost 实现                                                  */
  /* ================================================================ */

  spawnProjectile(o: ProjectileOptions): Projectile {
    const p = new Projectile(this, o);
    if (o.hostile) this.hostileProjs.push(p);
    else this.projectiles.push(p);
    return p;
  }

  spawnZone(o: ZoneOptions): Zone {
    const z = new Zone(this, o);
    this.zones.push(z);
    return z;
  }

  spawnSummon(kind: SummonKind, x: number, y: number, owner: Hero, opts: Partial<SummonOptions> = {}): Summon {
    const isMech = kind === 'turret' || kind === 'drone';
    const power = isMech ? 1 + (this.totalBonus.mechPower ?? 0) : 1 + (this.totalBonus.summonPower ?? 0);
    const speedBonus = 1 + (this.totalBonus.summonSpeed ?? 0);
    const durMult = 1 + (this.totalBonus.duration ?? 0);
    const ratio: Record<SummonKind, number> = { skeleton: 0.55, ghost: 0.5, golem: 0.75, turret: 0.55, drone: 0.45 };
    const hpMap: Record<SummonKind, number> = { skeleton: 130, ghost: 70, golem: 560, turret: 280, drone: 60 };
    const speedMap: Record<SummonKind, number> = { skeleton: 96, ghost: 132, golem: 68, turret: 0, drone: 156 };
    const rateMap: Record<SummonKind, number> = { skeleton: 1.1, ghost: 1.35, golem: 0.85, turret: 1.7, drone: 2.0 };
    const rangeMap: Record<SummonKind, number> = { skeleton: 250, ghost: 210, golem: 130, turret: 640, drone: 520 };
    const s = new Summon(this, {
      kind,
      x,
      y,
      ownerUid: owner.inst.uid,
      damage: owner.stats.attack * ratio[kind] * power,
      hp: hpMap[kind] * (1 + (this.totalBonus.summonPower ?? 0)),
      duration: (opts.duration ?? 14) * durMult,
      speed: speedMap[kind],
      attackSpeed: rateMap[kind] * speedBonus,
      range: rangeMap[kind],
      blocks: kind === 'golem' ? 2 : 0,
      stationary: kind === 'turret',
      flying: kind === 'drone' || kind === 'ghost',
      color: kind === 'ghost' ? '#c070ff' : (ELEMENT_COLORS[owner.cfg.element] ?? '#c8d8f0'),
      shadow: this.runFlags.has('shadowSummon'),
      explodeOnDeath: owner.awakened && owner.cfg.id === 'summoner',
      ...opts,
    });
    if (kind === 'turret' && owner.awakened && owner.cfg.id === 'mechanic') s.opts.attackSpeed *= 1.5;
    this.summons.push(s);
    this.fx.ring(x, y - 16, 28, '#c8d8f0', 300);
    return s;
  }

  damage(target: Targetable, raw: number, element: Element, opts: { source: Hero; crit?: boolean }): number {
    const hero = opts.source;
    if (!hero || !hero.stats) return 0;
    const crit = opts.crit ?? false;
    let amount = raw;
    const isBoss = target instanceof Boss;
    const isElite = target instanceof Enemy && target.elite;
    amount *= elementBonus(element, hero.bonus);
    if (crit) amount *= hero.stats.critDamage;
    if (this.runFlags.has('execute') && target.hp / target.maxHp < 0.3) amount *= 1.6;
    const execLv = this.run.specials.executioner ?? 0;
    if (execLv > 0 && target.hp / target.maxHp < 0.35) amount *= 1 + 0.18 * execLv;
    if (isElite) amount *= 1 + (hero.bonus.eliteDmg ?? 0);
    if (isBoss) amount *= 1 + (hero.bonus.bossDmg ?? 0);
    const chainLv = this.run.specials.chainKill ?? 0;
    if (chainLv > 0 && this.killChain > 0) amount *= 1 + Math.min(20, this.killChain) * 0.012 * chainLv;

    const res = isBoss ? (target as Boss).applyDamage(amount) : (target as Enemy).applyDamage(amount);
    const finalDmg = res.dealt;
    hero.inst.damageDealt += finalDmg;
    this.run.stats.totalDamage += finalDmg;
    if (finalDmg > this.run.stats.maxHit) this.run.stats.maxHit = finalDmg;

    if (useSettingsStore().damageNumbers) {
      const color = elementDamageColor(element, crit);
      const key = isBoss ? `boss${target.id}` : `en${target.id}`;
      const oy = isBoss ? 74 : 40;
      this.floats.damage(key, target.x, target.y - oy, finalDmg, color);
    }
    const ls = hero.stats.lifeSteal;
    if (ls > 0 && !hero.down) hero.heal(finalDmg * ls);

    if (res.died) {
      if (isBoss) this.onBossDeath(target as Boss);
      else this.onEnemyDeath(target as Enemy);
      if (hero.awakened && hero.cfg.id === 'warlock' && this.soulChain < 3) {
        this.soulChain++;
        this.fx.burst(target.x, target.y - 18, '#c070ff', 1);
        this.areaDamage(target.x, target.y - 10, 70, hero.stats.attack * 0.9, 'shadow', hero);
        this.soulChain--;
      }
    }
    return finalDmg;
  }

  areaDamage(
    x: number, y: number, r: number, raw: number, element: Element, source: Hero,
    opts: { falloff?: number; status?: StatusSpec; exclude?: Set<number> } = {},
  ): number {
    if (!source || !source.stats) return 0;
    let total = 0;
    const list = [
      ...this.enemiesInRadius(x, y, r),
      ...this.bosses.filter((b) => b.alive && Math.hypot(b.x - x, b.y - y) < r + 20),
    ] as Targetable[];
    for (const t of list) {
      if (opts.exclude?.has(t.id)) continue;
      let dmg = raw;
      if (opts.falloff) {
        const d = Math.hypot(t.x - x, t.y - y);
        dmg *= 1 - Math.min(0.6, (d / Math.max(1, r)) * opts.falloff);
      }
      const crit = Math.random() < source.stats.critRate;
      total += this.damage(t, dmg, element, { source, crit });
      if (opts.status && t.alive) this.status(t, opts.status, opts.status.duration, opts.status.dps);
    }
    return total;
  }

  heal(hero: Hero, amount: number): number {
    if (hero.down) return 0;
    const total = amount * (1 + (this.totalBonus.healPower ?? 0));
    const healed = hero.heal(total);
    const overflow = total - healed;
    if (overflow > 0 && this.heroes.some((h) => h.awakened && h.cfg.id === 'priest')) {
      hero.addShield(Math.min(hero.stats.maxHp * 0.5 - hero.shield, overflow * 0.6));
    }
    if (healed > 0) {
      this.floats.damage(`heal${hero.inst.uid}`, hero.homeX + 16, hero.homeY - 36, Math.round(healed), 'heal', 320);
    }
    return healed;
  }

  status(target: Targetable, spec: StatusSpec, duration?: number, dps?: number): void {
    if (!spec.kind) return;
    const d = (spec.duration ?? duration ?? 2) *
      (spec.kind === 'freeze' || spec.kind === 'slow' ? 1 + (this.totalBonus.freezeDuration ?? 0) : 1);
    const dmg = spec.dps ?? dps ?? 0;
    const partial: Record<string, number> = { [spec.kind]: d };
    if (target instanceof Boss) target.applyStatus(partial as never, d, dmg);
    else (target as Enemy).applyStatus(partial as never, d, dmg);
  }

  emitRing(x: number, y: number, r: number, color: number, duration: number): void {
    this.fx.ring(x, y, r, `#${color.toString(16).padStart(6, '0')}`, duration);
  }

  emitBolt(x1: number, y1: number, x2: number, y2: number, color: number): void {
    this.fx.bolt(x1, y1, x2, y2, `#${color.toString(16).padStart(6, '0')}`);
  }

  emitBurst(x: number, y: number, color: number, scale = 1): void {
    this.fx.burst(x, y, `#${color.toString(16).padStart(6, '0')}`, scale);
  }

  emitSlash(hero: Hero, angle: number, radius: number, color: number): void {
    this.fx.slash(hero.homeX, hero.homeY, angle, radius, `#${color.toString(16).padStart(6, '0')}`);
  }

  shake(duration: number, amount: number): void {
    this.shakes.shake(duration, amount);
  }

  schedule(delay: number, fn: () => void): void {
    this.delay(delay, fn);
  }

  /* ================================================================ */
  /*  控制接口（供 Vue UI 调用）                                      */
  /* ================================================================ */

  setSpeed(s: number): void {
    this.speed = s;
  }

  getSpeed(): number {
    return this.speed;
  }

  /** 事件窗口关闭后恢复战斗 */
  closeEventPause(): void {
    this.eventOpen = false;
  }

  setPaused(p: boolean): void {
    this.paused = p;
    if (p) audio.pauseBgm();
    else audio.resumeBgm();
  }

  getIsPaused(): boolean {
    return this.paused;
  }

  setAutoPick(strategy: RunState['autoPick'], priority: string[]): void {
    this.run.autoPick = strategy;
    this.run.customPriority = priority;
    if (strategy !== 'manual' && this.pausedForChoice) {
      useUiStore().closeLevelUp();
      this.pausedForChoice = false;
      this.autoResolveLevelUps();
    }
  }

  moveHero(uid: number, x: number, y: number): boolean {
    const res = this.clampHeroPos(uid, x, y);
    if (!res) return false;
    const hero = this.findHeroByUid(uid);
    if (!hero) return false;
    hero.moveTo(res.x, res.y);
    return true;
  }

  clampHeroPos(uid: number, x: number, y: number): { x: number; y: number } | null {
    if (x < LAYOUT.heroMinX - 40 || x > LAYOUT.heroMaxX + 40) return null;
    if (y < LAYOUT.laneTop - 30 || y > LAYOUT.laneBottom + 30) return null;
    const cx = Math.max(LAYOUT.heroMinX, Math.min(LAYOUT.heroMaxX, x));
    const cy = Math.max(LAYOUT.laneTop, Math.min(LAYOUT.laneBottom, y));
    for (const h of this.heroes) {
      if (h.inst.uid === uid) continue;
      if (Math.hypot(h.homeX - cx, h.homeY - cy) < 30) return null;
    }
    return { x: cx, y: cy };
  }

  autoArrange(): void {
    const order = this.heroes.slice().sort((a, b) => {
      const rank = (r: string) => (r === 'front' ? 0 : r === 'mid' ? 1 : 2);
      return rank(a.cfg.role) - rank(b.cfg.role);
    });
    const counts: Record<string, number> = { front: 0, mid: 0, back: 0 };
    for (const h of order) {
      const pos = formationSlot(h.cfg.role, counts[h.cfg.role]++);
      h.moveTo(pos.x, pos.y);
    }
    useUiStore().pushToast('已自动布阵', '#8fd8ff');
  }

  heroAt(x: number, y: number): Hero | null {
    let best: Hero | null = null;
    let bd = 50;
    for (const h of this.heroes) {
      const d = Math.hypot(h.homeX - x, h.homeY - y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  snapshotEnemies(): void {
    this.run.enemies = this.enemies
      .filter((e) => e.alive)
      .slice(0, 400)
      .map((e) => ({ id: e.cfg.id, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, elite: e.elite, boss: false, mult: e.mult, atkMult: e.atkMult }));
    this.run.rngState = this.rng.state;
  }

  poolStats(): { enemyCreated: number; enemyReused: number; projCreated: number; projReused: number } | null {
    const p = pools.current;
    if (!p) return null;
    return {
      enemyCreated: p.enemySprites.created,
      enemyReused: p.enemySprites.reused,
      projCreated: p.projectileSprites.created,
      projReused: p.projectileSprites.reused,
    };
  }

  getEquipmentFound(): EquipmentItem[] {
    return this.equipmentFound;
  }

  /* ---------------- HUD / 结算 ---------------- */

  private publishHud(force: boolean): void {
    const w = this.run.wave;
    const hud: HudState = {
      wave: w.wave,
      maxWave: this.run.maxWave,
      baseHp: Math.max(0, Math.round(this.run.baseHp)),
      baseMaxHp: this.run.baseMaxHp,
      baseShield: Math.round(this.baseShield),
      gold: Math.round(this.run.gold),
      level: this.run.teamLevel,
      exp: Math.floor(this.run.teamExp),
      expNext: expForLevel(this.run.teamLevel),
      kills: this.run.stats.kills,
      time: this.run.elapsedTime,
      speed: this.speed,
      paused: this.paused,
      phase: w.phase,
      intermission: Math.max(0, w.intermission),
      enemies: this.enemies.length + this.bosses.length,
      fps: Math.round(this.game.loop.actualFps),
      refreshes: this.run.refreshes,
      canSkipWave: w.phase === 'intermission' || w.phase === 'clearing',
      eliteWave: this.enemies.some((e) => e.alive && e.elite),
      heroes: this.heroes.map((h) => ({
        uid: h.inst.uid,
        heroId: h.inst.heroId,
        star: h.inst.star,
        hp: Math.max(0, Math.round(h.inst.hp)),
        maxHp: Math.round(h.stats.maxHp),
        shield: Math.round(h.shield),
        x: h.homeX,
        y: h.homeY,
        down: h.down,
        downTimer: Math.max(0, h.inst.downTimer),
        damage: Math.round(h.inst.damageDealt),
        skills: h.skills.map((s) => ({ id: s.id, level: s.level, cd: Math.max(0, s.cd) })),
      })),
      relics: this.run.relics.slice(),
      synergies: this.run.stats.synergies.slice(),
      defenses: { ...this.run.defenses },
      specials: { ...this.run.specials },
      passives: { ...this.run.passives },
      deployCap: this.run.deployCap,
    };
    useUiStore().setHud(hud);
    if (this.bosses.length > 0) {
      const b = this.bosses[0];
      useUiStore().setBossBar({
        visible: true, name: b.cfg.name, title: b.cfg.title,
        hp: Math.max(0, Math.round(b.hp)), maxHp: Math.round(b.maxHp),
        shield: b.shielded, enraged: b.enraged,
      });
      this.lastBossHadBar = true;
    } else if (this.lastBossHadBar) {
      this.lastBossHadBar = false;
      useUiStore().setBossBar({ visible: false, name: '', title: '', hp: 0, maxHp: 0, shield: false, enraged: false });
    }
    void force;
  }

  private finish(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.paused = true;
    this.run.enemies = [];
    if (victory) {
      // 胜利动画：英雄原地跳跃庆祝
      for (const h of this.heroes) {
        if (h.down) h.revive(0.5);
        h.updateVisual(0);
        this.tweens.add({
          targets: [h.sprite, h.weapon].filter(Boolean),
          y: '-=18',
          duration: 220,
          yoyo: true,
          repeat: 5,
          ease: 'Quad.easeOut',
          delay: Math.random() * 200,
        });
        this.fx.ring(h.homeX, h.homeY - 20, 40, '#ffd24a', 700);
      }
    }
    audio.playSe(victory ? 'victory' : 'defeat');
    audio.playBgm(victory ? 'victory' : 'defeat');
    useUiStore().setBossBar({ visible: false, name: '', title: '', hp: 0, maxHp: 0, shield: false, enraged: false });
    // 交给 RunController 结算（永久金币、装备入包、成就、纪录、清除检查点）
    this.game.events.emit('battle-finished', this.buildResult(victory));
  }

  private buildResult(victory: boolean): BattleResult {
    const s = this.run.stats;
    const perma = usePlayerStore().data;
    const talentGold = 1 + (perma.talents['t_gold'] ?? 0) * 0.08;
    const base = s.kills * 1.2 + s.goldEarned * 0.08 + this.run.wave.wave * 60 + (victory ? 900 : 0);
    const permGold = Math.round(base * talentGold * (1 + (this.totalBonus.goldGain ?? 0) * 0.4) * this.map.goldMult);
    return {
      victory,
      mode: this.run.mode,
      mapId: this.run.mapId,
      wave: this.run.wave.wave,
      kills: s.kills,
      totalDamage: Math.round(s.totalDamage),
      maxHit: Math.round(s.maxHit),
      time: this.run.elapsedTime,
      goldEarned: Math.round(s.goldEarned),
      permGold,
      equipment: this.equipmentFound.map((e) => e.uid),
      achievements: [],
      newRecord: false,
      teamLevel: this.run.teamLevel,
      heroes: this.heroes.map((h) => ({ heroId: h.inst.heroId, star: h.inst.star, damage: Math.round(h.inst.damageDealt) })),
      stats: {
        kills: s.kills, elites: s.elitesKilled, bosses: s.bossesKilled,
        evolutions: s.evolutions, breaches: s.breaches, maxStar: s.maxStar,
        synergies: s.synergies, relics: this.run.relics.length,
        equipment: this.equipmentFound.length, recruited: s.heroesRecruited,
      },
    };
  }
}

const ENEMY_POOL = Object.keys(ENEMY_MAP);

function isFlatStatKey(k: string): boolean {
  return k === 'critRate' || k === 'critDamage' || k === 'dodgeRate' || k === 'cooldownReduction' || k === 'lifeSteal' || k === 'blockCapacity';
}
