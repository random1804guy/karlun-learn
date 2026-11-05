import { scheduleNextReview } from "../review/scheduler.js";

export function createLearner(startingHearts = 5) {
  return {
    xp: 0,
    level: 1,
    hearts: Math.max(0, Math.min(1000, Number(startingHearts) || 0)),
    lastStudyDate: null,
    streak: 0,
    completedLessons: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    wordProgress: {},
    mistakes: [],
    lessonHistory: [],
    achievements: []
  };
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function updateStreak(learner, now = new Date()) {
  const today = localDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);
  if (learner.lastStudyDate === today) return learner.streak;
  learner.streak = learner.lastStudyDate === yesterday ? learner.streak + 1 : 1;
  learner.lastStudyDate = today;
  return learner.streak;
}

export function recordAnswer(learnerInput, exercise, rawAnswer, correct, now = new Date(), intervalsDays, maxHearts = 5) {
  const learner = structuredClone(learnerInput);
  const key = `${exercise.wordId}:${exercise.meaningId}`;
  const old = learner.wordProgress[key] ?? { correct: 0, incorrect: 0, intervalIndex: -1, dueAt: null, seen: 0, mastery: 0 };
  old.seen += 1;
  learner.totalAnswered += 1;
  if (correct) {
    old.correct += 1;
    learner.totalCorrect += 1;
    old.mastery = Math.min(100, old.mastery + (old.mastery < 60 ? 20 : 10));
    learner.hearts = Math.min(maxHearts, (learner.hearts ?? maxHearts) + 1);
    learner.mistakes = learner.mistakes.map((item) => item.wordId === exercise.wordId && item.meaningId === exercise.meaningId ? { ...item, resolved: true } : item);
  } else {
    old.incorrect += 1;
    learner.hearts = Math.max(0, (learner.hearts ?? 5) - 1);
    old.mastery = Math.max(0, old.mastery - 15);
    learner.mistakes.unshift({
      id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      wordId: exercise.wordId,
      meaningId: exercise.meaningId,
      prompt: exercise.prompt,
      given: String(rawAnswer ?? ""),
      expected: exercise.acceptedAnswers?.[0] ?? exercise.expected,
      createdAt: now.toISOString(),
      resolved: false
    });
    if (learner.mistakes.length > 250) learner.mistakes.length = 250;
  }
  Object.assign(old, scheduleNextReview(old, correct, now, intervalsDays));
  old.lastSeenAt = now.toISOString();
  learner.wordProgress[key] = old;
  return learner;
}

export function finishLesson(learnerInput, { correctCount, answeredCount, now = new Date(), xpBonus = 10, xpPerCorrect = 5, xpPerLevel = 100, maxHearts = 5 }) {
  const learner = structuredClone(learnerInput);
  learner.completedLessons += 1;
  const earned = Math.max(0, correctCount * xpPerCorrect + xpBonus);
  learner.xp += earned;
  learner.level = Math.floor(learner.xp / Math.max(1, xpPerLevel)) + 1;
  learner.hearts = Math.min(maxHearts, learner.hearts + (correctCount === answeredCount ? 1 : 0));
  updateStreak(learner, now);
  learner.lessonHistory.unshift({
    id: `lesson-${Date.now()}`,
    date: now.toISOString(),
    correctCount,
    answeredCount,
    xpEarned: earned
  });
  if (learner.lessonHistory.length > 100) learner.lessonHistory.length = 100;
  if (learner.completedLessons >= 1 && !learner.achievements.includes("first-lesson")) learner.achievements.push("first-lesson");
  if (learner.streak >= 3 && !learner.achievements.includes("three-day-streak")) learner.achievements.push("three-day-streak");
  return { learner, earned };
}

export function getLevelProgress(xp, xpPerLevel = 100) {
  const required = Math.max(1, xpPerLevel);
  const level = Math.floor(Math.max(0, xp) / required) + 1;
  const current = Math.max(0, xp) % required;
  return { level, current, required, percent: current / required * 100 };
}
