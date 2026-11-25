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

const normaliseTerm = (value) => String(value ?? "").trim().toLocaleLowerCase("en-GB");

function migrateLearnerProgress(oldCourse, learner, currentCourse) {
  const oldWords = new Map((oldCourse?.words ?? []).map((word) => [normaliseTerm(word.term), word]));
  const progress = {};
  const mappedMeanings = new Map();

  for (const currentWord of currentCourse.words) {
    const oldWord = oldWords.get(normaliseTerm(currentWord.term));
    if (!oldWord) continue;
    for (const currentMeaning of currentWord.meanings) {
      const oldMeaning = (oldWord.meanings ?? []).find((meaning) => normaliseTerm(meaning.text) === normaliseTerm(currentMeaning.text));
      if (!oldMeaning) continue;
      const oldKey = oldWord.id + ":" + oldMeaning.id;
      const newKey = currentWord.id + ":" + currentMeaning.id;
      mappedMeanings.set(oldKey, {
        wordId: currentWord.id,
        meaningId: currentMeaning.id,
        text: currentMeaning.text,
        newKey
      });
      const previousProgress = learner.wordProgress?.[oldKey];
      if (previousProgress) progress[newKey] = structuredClone(previousProgress);
    }
  }

  learner.wordProgress = progress;
  learner.mistakes = (learner.mistakes ?? []).flatMap((mistake) => {
    const mapped = mappedMeanings.get(mistake.wordId + ":" + mistake.meaningId);
    if (!mapped) return [];
    return [{
      ...mistake,
      wordId: mapped.wordId,
      meaningId: mapped.meaningId,
      expected: mapped.text
    }];
  });
  return learner;
}

export function migrateCourseAndLearner(savedCourse, savedLearner) {
  const defaults = structuredClone(INITIAL_COURSE);
  const learner = structuredClone(savedLearner ?? createLearner(DEFAULT_CONFIG.progression.startingHearts));
  const isCurrentMasterSheet = savedCourse?.masterSheetVersion === defaults.masterSheetVersion;

  if (!isCurrentMasterSheet) {
    migrateLearnerProgress(savedCourse, learner, defaults);
    return { course: defaults, learner };
  }

  const course = {
    ...defaults,
    ...savedCourse,
    words: structuredClone(savedCourse.words ?? defaults.words),
    units: structuredClone(defaults.units),
    grammar: structuredClone(defaults.grammar),
    languageNotes: structuredClone(defaults.languageNotes),
    principles: structuredClone(defaults.principles),
    examples: structuredClone(defaults.examples),
    archivedWords: structuredClone(savedCourse.archivedWords ?? defaults.archivedWords),
    importHistory: structuredClone(savedCourse.importHistory ?? defaults.importHistory)
  };
  return { course, learner };
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
  const migrated = migrateCourseAndLearner(saved.course, saved.learner);
  return {
    ...defaults,
    ...saved,
    course: migrated.course,
    learner: {
      ...defaults.learner,
      ...migrated.learner,
      wordProgress: migrated.learner.wordProgress ?? {},
      mistakes: migrated.learner.mistakes ?? [],
      lessonHistory: migrated.learner.lessonHistory ?? [],
      achievements: migrated.learner.achievements ?? []
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
