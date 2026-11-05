export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(date));
}

export function getMeaningCount(course) {
  return course.words.reduce((total, word) => total + word.meanings.length, 0);
}

export function findWord(course, wordId) {
  return course.words.find((word) => word.id === wordId) ?? course.archivedWords?.find((word) => word.id === wordId) ?? null;
}

export function cssText(value) {
  return escapeHtml(String(value).replace(/[;{}]/g, ""));
}


// Karlun permits ur ↔ er spelling variation unless an entry records an exception.
export function getAcceptedSpellings(word) {
  const values = [word?.term, ...(word?.aliases ?? [])].filter(Boolean).map((value) => String(value).trim());
  if (word?.spellingVariant !== false) {
    for (const value of [...values]) {
      if (/(?:ur|er)/i.test(value)) {
        const alternate = value.replace(/ur|er/gi, (match) => match.toLowerCase() === "ur" ? "er" : "ur");
        values.push(alternate);
      }
    }
  }
  return [...new Set(values)];
}
