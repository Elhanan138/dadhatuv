import type { AppState } from "@/lib/types";
import { INITIAL_STATE, STATE_VERSION } from "@/lib/seed/defaults";

const DB_NAME = "abba-hatuv";
const STORE_NAME = "state";
const KEY = "app";
const LS_KEY = "abba-hatuv:state";

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<AppState | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => resolve((req.result as AppState) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(state: AppState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(state, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Fills in anything a stored snapshot from an older version is missing. */
export function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return INITIAL_STATE;
  const s = raw as Partial<AppState>;
  return {
    version: STATE_VERSION,
    onboarded: s.onboarded ?? false,
    profile: s.profile ?? null,
    engine: { ...INITIAL_STATE.engine, ...(s.engine ?? {}) },
    settings: {
      ...INITIAL_STATE.settings,
      ...(s.settings ?? {}),
      manualTargets: { ...INITIAL_STATE.settings.manualTargets, ...(s.settings?.manualTargets ?? {}) },
      alerts: s.settings?.alerts?.length ? s.settings.alerts : INITIAL_STATE.settings.alerts,
      categories: s.settings?.categories?.length ? s.settings.categories : INITIAL_STATE.settings.categories,
    },
    foods: s.foods?.length ? s.foods : INITIAL_STATE.foods,
    recipes: s.recipes ?? [],
    entries: s.entries ?? [],
    days: s.days ?? {},
  };
}

export async function loadState(): Promise<AppState> {
  try {
    if (hasIDB()) {
      const fromIdb = await idbGet();
      if (fromIdb) return migrate(fromIdb);
    }
  } catch {
    // fall through to localStorage
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // corrupt payload — start clean rather than crash the app
  }
  return INITIAL_STATE;
}

export async function saveState(state: AppState): Promise<void> {
  try {
    if (hasIDB()) await idbSet(state);
  } catch {
    // IndexedDB can be blocked in private mode; localStorage still runs below
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — IndexedDB copy above is the source of truth
  }
}

export async function clearState(): Promise<void> {
  try {
    if (hasIDB()) {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(KEY);
    }
  } catch {
    // nothing to clear
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // nothing to clear
  }
}

export interface ImportResult {
  ok: boolean;
  state?: AppState;
  error?: string;
}

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "הקובץ אינו JSON תקין." };
  }
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !("foods" in obj) || !("version" in obj)) {
    return { ok: false, error: "הקובץ אינו גיבוי של אבא חטוב." };
  }
  return { ok: true, state: migrate(obj) };
}
