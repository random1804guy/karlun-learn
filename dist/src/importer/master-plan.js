const stripDecorators = (value) => value.trim().replace(/^[`*_]+|[`*_]+$/g, "").trim();
const norm = (value) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
const safeIdPart = (value) => norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "meaning";

export function parseMasterPlan(rawText) {
  const lines = String(rawText ?? "").split(/\r?\n/);
  const parsed = new Map();
  const unparsed = [];
  const diagnostics = [];
  let parsedLines = 0;

  lines.forEach((original, index) => {
    let line = original.trim();
    if (!line || /^#{1,6}\s/.test(line) || /^[-*_]{3,}$/.test(line) || /^\|?\s*(word|term)\s*\|/i.test(line)) return;
    line = line.replace(/^[-*+]\s+/, "");
    const match = line.match(/^([`*_a-z][`*_a-z0-9-]*(?:\s*\/\s*[`*_a-z][`*_a-z0-9-]*)*)\s*(?:=|:|→)\s*(.+)$/i);
    if (!match) {
      if (line.includes("=") || line.includes("→")) unparsed.push({ line: index + 1, text: original });
      return;
    }
    const variants = match[1].split("/").map(stripDecorators).filter(Boolean);
    const term = variants[0];
    const glosses = match[2].split(/[;/]/).map(stripDecorators).filter(Boolean);
    if (!term || !glosses.length) {
      diagnostics.push(`Line ${index + 1}: word or meaning was empty.`);
      unparsed.push({ line: index + 1, text: original });
      return;
    }
    const key = norm(term);
    if (parsed.has(key)) {
      diagnostics.push(`Line ${index + 1}: duplicate entry for “${term}”; the later entry was ignored.`);
      return;
    }
    parsed.set(key, { term, aliases: variants.slice(1), glosses, line: index + 1 });
    parsedLines += 1;
  });

  const entries = [...parsed.values()];
  const tokenOwners = new Map();
  let hasAliasConflict = false;
  for (const entry of entries) {
    for (const token of [entry.term, ...entry.aliases]) {
      const key = norm(token);
      const owner = tokenOwners.get(key);
      if (owner && owner !== norm(entry.term)) {
        diagnostics.push(`“${token}” is used by more than one word (${owner} and ${entry.term}). Resolve the spelling conflict before importing.`);
        hasAliasConflict = true;
      } else tokenOwners.set(key, norm(entry.term));
    }
  }

  return {
    entries,
    unparsed,
    diagnostics,
    parsedLines,
    totalLines: lines.length,
    valid: parsedLines > 0 && !hasAliasConflict
  };
}

function entryForWord(entry, existing) {
  const previous = existing ?? null;
  const previousByText = new Map((previous?.meanings ?? []).map((m) => [norm(m.text), m]));
  const wordId = previous?.id ?? `w-${safeIdPart(entry.term)}`;
  const meanings = entry.glosses.map((text, index) => {
    const match = previousByText.get(norm(text));
    return {
      id: match?.id ?? `${wordId}-m-${safeIdPart(text)}-${index + 1}`,
      text,
      order: index + 1,
      status: "approved"
    };
  });
  return {
    id: wordId,
    term: entry.term,
    aliases: [...new Set(entry.aliases.filter((alias) => norm(alias) !== norm(entry.term)))],
    meanings,
    unitId: previous?.unitId ?? "imported",
    notes: previous?.notes ?? "",
    wordClass: previous?.wordClass ?? "flexible",
    modifierCompatibility: previous?.modifierCompatibility ?? { sa: "unspecified", ne: "unspecified" },
    pluralCompatibility: previous?.pluralCompatibility ?? "unspecified",
    spellingVariant: previous?.spellingVariant ?? true,
    status: "approved",
    sourceVersion: new Date().toISOString().slice(0, 10)
  };
}

export function compareMasterPlan(course, parsed, options = {}) {
  const current = course.words ?? [];
  const byTerm = new Map();
  current.forEach((word) => {
    byTerm.set(norm(word.term), word);
    (word.aliases ?? []).forEach((alias) => byTerm.set(norm(alias), word));
  });
  const matchedIds = new Set();
  const additions = [];
  const unchanged = [];
  const modified = [];
  const importedWords = [];

  for (const entry of parsed.entries) {
    const existing = byTerm.get(norm(entry.term)) ?? entry.aliases.map((a) => byTerm.get(norm(a))).find(Boolean) ?? null;
    if (existing) matchedIds.add(existing.id);
    const updated = entryForWord(entry, existing);
    importedWords.push(updated);
    if (!existing) additions.push({ before: null, after: updated });
    else {
      const beforeText = existing.meanings.map((m) => norm(m.text)).join("|");
      const afterText = updated.meanings.map((m) => norm(m.text)).join("|");
      const aliasChanged = (existing.aliases ?? []).map(norm).sort().join("|") !== updated.aliases.map(norm).sort().join("|");
      if (beforeText === afterText && norm(existing.term) === norm(updated.term) && !aliasChanged) unchanged.push({ before: existing, after: updated });
      else modified.push({ before: existing, after: updated });
    }
  }
  const removed = options.archiveMissing
    ? current.filter((word) => !matchedIds.has(word.id)).map((word) => ({ before: word, after: null }))
    : [];
  return { additions, unchanged, modified, removed, importedWords, canApply: parsed.valid };
}

export function applyMasterPlan(course, diff, options = {}) {
  if (!diff.canApply) throw new Error("No recognised vocabulary entries were found.");
  const removedIds = new Set(diff.removed.map((item) => item.before.id));
  const archivedWords = [...(course.archivedWords ?? []), ...diff.removed.map((item) => ({ ...item.before, archivedAt: new Date().toISOString() }))];
  const remaining = (course.words ?? []).filter((word) => !removedIds.has(word.id));
  const nextById = new Map(remaining.map((word) => [word.id, word]));
  diff.importedWords.forEach((word) => nextById.set(word.id, word));
  const version = options.version ?? new Date().toISOString();
  const history = [...(course.importHistory ?? []), {
    version,
    importedCount: diff.importedWords.length,
    added: diff.additions.length,
    modified: diff.modified.length,
    archived: diff.removed.length,
    sourceText: String(options.sourceText ?? "").slice(0, 100000)
  }];
  return {
    ...course,
    words: [...nextById.values()],
    archivedWords,
    importHistory: history,
    sourceVersion: version
  };
}
