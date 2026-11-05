export const DEFAULT_SETTINGS = {
  theme: "light",
  accent: "#76b947",
  accentDark: "#4e8c2b",
  background: "#f5f8f2",
  card: "#ffffff",
  text: "#243225",
  muted: "#6f7b70",
  dailyGoal: 15,
  heartsEnabled: true,
  showXp: true,
  showStreak: true,
  animations: true,
  fontScale: 1,
  appName: "Karlun Learn"
};

export const DEFAULT_CONFIG = {
  lesson: { questionCount: 8, newWordsPerLesson: 5, reviewRatio: 0.35, typedQuestionRatio: 0.3, allowTypedAnswers: true },
  progression: { xpPerCorrect: 5, xpLessonBonus: 10, xpPerLevel: 100, startingHearts: 5, maxHearts: 5 },
  review: { intervalsDays: [1, 2, 4, 7, 14, 30, 60] },
  navigation: ["home", "learn", "words", "review", "stats"],
  branding: { productName: "Karlun Learn", courseName: "Karlun" }
};

const HEX = /^#[0-9a-f]{6}$/i;

export function validateSettings(input = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...(input && typeof input === "object" ? input : {}) };
  if (!["light", "dark", "system"].includes(settings.theme)) settings.theme = DEFAULT_SETTINGS.theme;
  for (const key of ["accent", "accentDark", "background", "card", "text", "muted"]) {
    if (typeof settings[key] !== "string" || !HEX.test(settings[key])) settings[key] = DEFAULT_SETTINGS[key];
  }
  if (!Number.isFinite(Number(settings.dailyGoal))) settings.dailyGoal = DEFAULT_SETTINGS.dailyGoal;
  settings.dailyGoal = Math.max(5, Math.min(120, Math.round(Number(settings.dailyGoal))));
  if (!Number.isFinite(Number(settings.fontScale))) settings.fontScale = DEFAULT_SETTINGS.fontScale;
  settings.fontScale = Math.max(0.85, Math.min(1.25, Number(settings.fontScale)));
  for (const key of ["heartsEnabled", "showXp", "showStreak", "animations"]) settings[key] = Boolean(settings[key]);
  settings.appName = String(settings.appName || DEFAULT_SETTINGS.appName).trim().slice(0, 32) || DEFAULT_SETTINGS.appName;
  return settings;
}

export function validateConfig(input = {}) {
  const config = structuredClone(DEFAULT_CONFIG);
  if (!input || typeof input !== "object") return config;
  if (input.lesson && typeof input.lesson === "object") {
    const count = Number(input.lesson.questionCount);
    const typedRatio = Number(input.lesson.typedQuestionRatio);
    if (Number.isFinite(count)) config.lesson.questionCount = Math.max(4, Math.min(20, Math.round(count)));
    if (Number.isFinite(typedRatio)) config.lesson.typedQuestionRatio = Math.max(0, Math.min(1, typedRatio));
  }
  if (input.progression && typeof input.progression === "object") {
    for (const key of ["xpPerCorrect", "xpLessonBonus", "xpPerLevel", "startingHearts", "maxHearts"]) {
      const value = Number(input.progression[key]);
      if (Number.isFinite(value)) config.progression[key] = Math.max(key === "xpPerLevel" ? 10 : 0, Math.min(10000, Math.round(value)));
    }
  }
  config.progression.startingHearts = Math.min(config.progression.startingHearts, config.progression.maxHearts);
  if (input.review?.intervalsDays && Array.isArray(input.review.intervalsDays)) {
    const values = input.review.intervalsDays.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 365);
    if (values.length) config.review.intervalsDays = [...new Set(values)].sort((a, b) => a - b).slice(0, 20);
  }
  return config;
}
