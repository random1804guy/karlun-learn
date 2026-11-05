// Replaceable scheduler contract. This simple interval ladder is intentionally transparent.
// It is not FSRS; the interface allows a tested FSRS implementation to replace it later.
export function scheduleNextReview(progress, correct, now = new Date(), intervals = [1, 2, 4, 7, 14, 30, 60]) {
  const previous = Number.isInteger(progress?.intervalIndex) ? progress.intervalIndex : -1;
  const intervalIndex = correct ? Math.min(previous + 1, intervals.length - 1) : 0;
  const days = correct ? intervals[intervalIndex] : 1;
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  return { intervalIndex, intervalDays: days, dueAt: due.toISOString() };
}

export function isDue(progress, now = new Date()) {
  if (!progress?.dueAt) return true;
  return new Date(progress.dueAt).getTime() <= now.getTime();
}
