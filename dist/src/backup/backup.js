const BACKUP_FORMAT = "karlun-learn-backup";
const BACKUP_VERSION = 1;

export function createBackup(state, now = new Date()) {
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    appState: structuredClone(state)
  };
  return JSON.stringify(payload, null, 2);
}

export function validateBackup(raw) {
  let parsed;
  try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return { valid: false, error: "That file is not valid JSON." }; }
  if (!parsed || parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION || !parsed.appState) {
    return { valid: false, error: "This is not a supported Karlun Learn backup." };
  }
  const state = parsed.appState;
  if (!state.course || !Array.isArray(state.course.words) || !state.learner || typeof state.learner !== "object" || !state.settings) {
    return { valid: false, error: "The backup is missing course, learner or settings data." };
  }
  const wordIds = new Set();
  const terms = new Set();
  for (const word of state.course.words) {
    const term = String(word?.term ?? "").trim().toLocaleLowerCase("en-GB");
    if (!word?.id || !term || !Array.isArray(word.meanings) || wordIds.has(word.id) || terms.has(term)) {
      return { valid: false, error: "The backup contains an invalid or duplicate vocabulary entry." };
    }
    wordIds.add(word.id);
    terms.add(term);
    const meaningIds = new Set();
    for (const meaning of word.meanings) {
      if (!meaning?.id || !String(meaning.text ?? "").trim() || meaningIds.has(meaning.id)) {
        return { valid: false, error: `The backup contains an invalid meaning for “${word.term}”.` };
      }
      meaningIds.add(meaning.id);
    }
  }
  if (state.course.grammar !== undefined && !Array.isArray(state.course.grammar)) {
    return { valid: false, error: "The backup contains invalid grammar data." };
  }
  if (state.learner.wordProgress !== undefined && (typeof state.learner.wordProgress !== "object" || Array.isArray(state.learner.wordProgress))) {
    return { valid: false, error: "The backup contains invalid learning progress." };
  }
  return { valid: true, state };
}
