import type { BattleSave, RunState } from '@/types/game';
import type { PermanentData } from '@/stores/playerStore';
import type { SettingsState } from '@/stores/settingsStore';
import { defaultPermanent } from '@/stores/playerStore';
import { RUN_VERSION, deserializeRun, serializeRun } from '@/game/utils/RunState';
import type { EquipmentItem } from '@/game/utils/equipment';

const DB_NAME = 'pixel-horde';
const DB_VERSION = 1;
const STORE = 'kv';

export interface SaveBundle {
  version: number;
  exportedAt: number;
  permanent: PermanentData;
  settings: SettingsState | null;
  battle: BattleSave | null;
  checksum: string;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) {
    const raw = localStorage.getItem(`${DB_NAME}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) {
    try {
      localStorage.setItem(`${DB_NAME}:${key}`, JSON.stringify(value));
    } catch {
      /* 忽略容量错误 */
    }
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    localStorage.removeItem(`${DB_NAME}:${key}`);
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function checksum(obj: unknown): string {
  const str = JSON.stringify(obj);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export class SaveService {
  static async loadPermanent(): Promise<PermanentData | null> {
    const raw = await idbGet<PermanentData>('permanent');
    if (!raw) return null;
    try {
      return migratePermanent(raw);
    } catch {
      return null;
    }
  }

  static async savePermanent(data: PermanentData): Promise<void> {
    data.lastSeenAt = Date.now();
    await idbSet('permanent', JSON.parse(JSON.stringify(data)));
  }

  static async loadSettings(): Promise<SettingsState | null> {
    return idbGet<SettingsState>('settings');
  }

  static async saveSettings(s: SettingsState): Promise<void> {
    await idbSet('settings', JSON.parse(JSON.stringify(s)));
  }

  static async loadBattle(): Promise<RunState | null> {
    const save = await idbGet<BattleSave>('battle');
    if (!save) return null;
    return deserializeRun(save);
  }

  static async saveBattle(run: RunState): Promise<void> {
    await idbSet('battle', serializeRun(run));
  }

  static async clearBattle(): Promise<void> {
    await idbDel('battle');
  }

  static async exportBundle(permanent: PermanentData, settings: SettingsState | null, battle: RunState | null): Promise<string> {
    const payload: SaveBundle = {
      version: RUN_VERSION,
      exportedAt: Date.now(),
      permanent: JSON.parse(JSON.stringify(permanent)),
      settings: settings ? JSON.parse(JSON.stringify(settings)) : null,
      battle: battle ? serializeRun(battle) : null,
      checksum: '',
    };
    payload.checksum = checksum({ p: payload.permanent, s: payload.settings });
    return JSON.stringify(payload, null, 2);
  }

  static importBundle(text: string): { ok: boolean; message: string; bundle?: SaveBundle } {
    try {
      const parsed = JSON.parse(text) as SaveBundle;
      if (!parsed || typeof parsed !== 'object') return { ok: false, message: '存档格式无效' };
      if (!parsed.permanent) return { ok: false, message: '缺少永久数据' };
      const expect = checksum({ p: parsed.permanent, s: parsed.settings ?? null });
      if (parsed.checksum && parsed.checksum !== expect) {
        return { ok: false, message: '存档校验失败（可能已损坏）' };
      }
      return { ok: true, message: '存档读取成功', bundle: parsed };
    } catch {
      return { ok: false, message: 'JSON 解析失败' };
    }
  }

  static async resetAll(): Promise<void> {
    await idbDel('permanent');
    await idbDel('battle');
    await idbDel('settings');
  }

  static download(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** 存档迁移：补齐缺失字段，绝不抛错（PRD 31.4） */
export function migratePermanent(raw: Partial<PermanentData>): PermanentData {
  const base = defaultPermanent();
  const out: PermanentData = { ...base, ...raw };
  out.unlockedHeroes = Array.isArray(raw.unlockedHeroes) && raw.unlockedHeroes.length ? raw.unlockedHeroes : base.unlockedHeroes;
  out.unlockedMaps = Array.isArray(raw.unlockedMaps) && raw.unlockedMaps.length ? raw.unlockedMaps : base.unlockedMaps;
  out.unlockedRelics = Array.isArray(raw.unlockedRelics) ? raw.unlockedRelics : base.unlockedRelics;
  out.heroStars = raw.heroStars ?? {};
  out.talents = raw.talents ?? {};
  out.achievements = raw.achievements ?? {};
  out.bestWave = raw.bestWave ?? {};
  out.equipmentBag = (raw.equipmentBag ?? []).filter((e): e is EquipmentItem => !!e && typeof e.uid === 'string');
  out.equipped = raw.equipped ?? {};
  out.seenHeroes = raw.seenHeroes ?? [];
  out.seenEnemies = raw.seenEnemies ?? [];
  out.seenBosses = raw.seenBosses ?? [];
  out.seenRelics = raw.seenRelics ?? [];
  out.seenEquipment = raw.seenEquipment ?? [];
  out.challengesWon = raw.challengesWon ?? [];
  out.permGold = Number.isFinite(raw.permGold) ? (raw.permGold as number) : 0;
  out.version = base.version;
  // 清理已不存在的数据引用
  const validHeroIds = new Set(base.unlockedHeroes);
  out.unlockedHeroes = out.unlockedHeroes.filter((h) => typeof h === 'string');
  void validHeroIds;
  return out;
}

/* ------------------------------------------------------------------ */
/*  离线收益                                                          */
/* ------------------------------------------------------------------ */

export interface OfflineReward {
  seconds: number;
  gold: number;
  capped: boolean;
}

export const OFFLINE_MAX_SECONDS = 8 * 3600;

export function computeOfflineReward(lastSeen: number, offlineRateBonus: number): OfflineReward {
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - lastSeen) / 1000));
  const seconds = Math.min(OFFLINE_MAX_SECONDS, elapsed);
  if (seconds < 120) return { seconds, gold: 0, capped: elapsed > OFFLINE_MAX_SECONDS };
  // 每分钟约 12 金币，受天赋影响；不模拟战斗、不推进关卡（PRD 20.4）
  const perMinute = 12 * (1 + offlineRateBonus);
  const gold = Math.floor((seconds / 60) * perMinute);
  return { seconds, gold, capped: elapsed > OFFLINE_MAX_SECONDS };
}
