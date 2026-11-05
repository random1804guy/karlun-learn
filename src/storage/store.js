import { INITIAL_COURSE } from "../course/initial-course.js";
import { DEFAULT_SETTINGS, DEFAULT_CONFIG, validateConfig } from "../config/defaults.js";
import { createLearner } from "../progress/progression.js";

const DB_NAME = "karlun-learn";
const DB_VERSION = 1;
const STORE_NAME = "appState";
const STATE_KEY = "main";
let dbPromise;
let memoryState = null;
let persistenceMode = "checking";

export function createDefaultState() {
  return {
    schemaVersion: DB_VERSION,
    course: structuredClone(INITIAL_COURSE),
    learner: createLearner(DEFAULT_CONFIG.progression.startingHearts),
    settings: structuredClone(DEFAULT_SETTINGS),
    config: structuredClone(DEFAULT_CONFIG),
    savedAt: new Date().toISOString()
  };
}

function openDatabase() {
  if (!("indexedDB" in globalThis)) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      // Some embedded/opaque browser contexts deny IndexedDB synchronously.
      resolve(null);
    }
  });
  return dbPromise;
}

async function readIndexed() {
  const db = await openDatabase();
  if (!db) return { available: false, value: null };
  persistenceMode = "indexeddb";
  try {
    const value = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    });
    return { available: true, value };
  } catch {
    return { available: false, value: null };
  }
}

async function writeIndexed(state) {
  const db = await openDatabase();
  if (!db) return false;
  try {
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(state, STATE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

function readFallback() {
  try {
    const raw = globalThis.localStorage?.getItem("karlun-learn-state");
    if (raw) {
      persistenceMode = "localstorage";
      return JSON.parse(raw);
    }
  } catch {
    // Privacy modes and embedded previews can deny localStorage access.
  }
  persistenceMode = "session";
  return memoryState;
}

function writeFallback(state) {
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem("karlun-learn-state", JSON.stringify(state));
      persistenceMode = "localstorage";
      return true;
    }
  } catch {
    // Keep the app usable for this tab even when browser storage is denied.
  }
  memoryState = structuredClone(state);
  persistenceMode = "session";
  return true;
}

export function getPersistenceMode() {
  return persistenceMode;
}

export async function loadState() {
  const indexed = await readIndexed();
  let saved = indexed.available ? indexed.value : null;
  if (!saved) {
    const fallback = readFallback();
    if (fallback) saved = fallback;
    else if (indexed.available) persistenceMode = "indexeddb";
  }
  if (!saved || typeof saved !== "object") return createDefaultState();
  const defaults = createDefaultState();
  return {
    ...defaults,
    ...saved,
    course: {
      ...defaults.course,
      ...(saved.course ?? {}),
      archivedWords: saved.course?.archivedWords ?? defaults.course.archivedWords,
      importHistory: saved.course?.importHistory ?? defaults.course.importHistory,
      grammar: saved.course?.grammar ?? defaults.course.grammar,
      examples: saved.course?.examples ?? defaults.course.examples,
      units: saved.course?.units ?? defaults.course.units,
      words: saved.course?.words ?? defaults.course.words
    },
    learner: {
      ...defaults.learner,
      ...(saved.learner ?? {}),
      wordProgress: saved.learner?.wordProgress ?? {},
      mistakes: saved.learner?.mistakes ?? [],
      lessonHistory: saved.learner?.lessonHistory ?? [],
      achievements: saved.learner?.achievements ?? []
    },
    settings: { ...defaults.settings, ...(saved.settings ?? {}) },
    config: validateConfig(saved.config ?? defaults.config)
  };
}

export async function saveState(state) {
  const snapshot = { ...state, savedAt: new Date().toISOString() };
  const saved = await writeIndexed(snapshot);
  if (saved) persistenceMode = "indexeddb";
  else if (!writeFallback(snapshot)) throw new Error("Your browser could not save data. Export a backup before continuing.");
  return snapshot;
}

export async function clearStateForTests() {
  memoryState = null;
  persistenceMode = "checking";
  const db = await openDatabase();
  if (db) {
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(STATE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }
  try { localStorage.removeItem("karlun-learn-state"); } catch { /* ignored */ }
}
