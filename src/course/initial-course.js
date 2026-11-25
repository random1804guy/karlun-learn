// Official Karlun content from Huw's current Master Sheet. Do not add unapproved words or rules.
const meanings = (wordId, items) => items.map((text, index) => ({
  id: wordId + "-m" + (index + 1),
  text,
  order: index + 1,
  status: "approved"
}));

const word = (term, glosses, unit, notes = "") => {
  const id = "w-" + term;
  return {
    id,
    term,
    aliases: [],
    meanings: meanings(id, glosses),
    unitId: unit,
    notes,
    wordClass: "flexible",
    modifierCompatibility: { sa: "unspecified", ne: "unspecified" },
    pluralCompatibility: "unspecified",
    status: "approved",
    sourceVersion: "2026-11-25"
  };
};

export const INITIAL_WORDS = [
  // 1. Core Polarity
  word("sa", ["yes", "really good", "very positive", "right", "correct", "up"], "core-polarity"),
  word("sata", ["okay", "fairly good", "acceptable", "slightly positive"], "core-polarity"),
  word("ta", ["maybe", "neutral", "normal", "middle"], "core-polarity"),
  word("neta", ["fairly bad", "poor-ish", "slightly negative"], "core-polarity", "Mildly negative. It is not as strongly negative as ne."),
  word("ne", ["no", "really bad", "very negative", "wrong", "down"], "core-polarity", "Strongly negative. neta is only mildly negative."),

  // 2. Social / Politeness
  word("salo", ["hello", "greeting"], "social"),
  word("nero", ["goodbye", "farewell", "leaving"], "social"),
  word("mara", ["thanks", "gratitude", "appreciation"], "social"),
  word("lena", ["please", "polite request marker"], "social", "Can be used broadly for polite requests."),
  word("sima", ["sorry", "excuse me", "pardon me"], "social"),

  // 3. Wanting / Possession / Action
  word("kema", ["want", "need", "require", "desire", "seek", "request", "ask for", "can I have"], "actions", "Can be used for a more direct request."),
  word("loma", ["have", "own", "possess", "hold", "keep", "retain", "carry"], "actions"),
  word("kesa", ["do", "make", "create", "act", "perform", "work", "carry out", "cause", "move"], "actions"),

  // 4. Communication
  word("sopa", ["say", "speak", "talk", "chat", "ask", "tell", "communicate", "converse", "discuss"], "communication", "Covers general communication, including asking questions."),

  // 5. Vision
  word("sato", ["see", "visible", "clear", "transparent", "open", "unobstructed", "unblocked"], "vision"),
  word("nesato", ["not see", "invisible", "blocked", "blurry", "opaque", "closed", "obstructed"], "vision"),

  // 6. People / Things / Value
  word("soma", ["person", "people", "someone", "anyone", "human"], "people-things"),
  word("sako", ["good thing", "good stuff", "valuable", "worthwhile", "something worth keeping"], "people-things"),
  word("neko", ["bad thing", "bad stuff", "poor thing", "waste", "trash", "something to get rid of"], "people-things"),
  word("ko", ["it", "thing", "stuff"], "pronouns", "Also listed under People / Things / Value in the Master Sheet."),

  // 7. Knowledge
  word("dela", ["know", "understand", "knowledge", "smart", "intelligent", "aware", "knowledgeable"], "knowledge"),
  word("nedela", ["not know", "not understand", "confused", "unaware", "dumb", "ignorant"], "knowledge"),

  // 8. Movement
  word("tora", ["enter", "move forwards", "travel", "go"], "movement"),
  word("netora", ["backwards", "exit", "reverse", "stop"], "movement"),

  // 9. Pronouns
  word("mi", ["I", "me"], "pronouns"),
  word("mu", ["you"], "pronouns"),
  word("mo", ["we", "us", "our"], "pronouns"),
  word("re", ["they", "them", "their"], "pronouns"),
  word("le", ["he", "him", "male", "boy"], "pronouns"),
  word("la", ["she", "her", "female", "girl"], "pronouns"),

  // 10. Questions
  word("kato", ["confused", "questioning", "how"], "questions", "Combines with a concept to specify what is being questioned. See the Question System guide."),

  // 11. Connectors
  word("bera", ["because"], "connectors"),
  word("bur", ["but"], "connectors"),
  word("en", ["and"], "connectors"),
  word("ori", ["or"], "connectors"),

  // 12. Time / Location
  word("tima", ["time"], "time-location"),
  word("naro", ["now"], "time-location"),
  word("lora", ["location", "place"], "time-location"),
  word("tara", ["today"], "time-location"),
  word("mosa", ["tomorrow"], "time-location"),
  word("mone", ["yesterday"], "time-location"),

  // 13. Time Units
  word("sena", ["second"], "time-units"),
  word("mena", ["minute"], "time-units"),
  word("hora", ["hour"], "time-units"),
  word("dana", ["day"], "time-units"),
  word("mona", ["month"], "time-units"),
  word("yara", ["year"], "time-units"),

  // 14. Colours
  word("rira", ["red"], "colours"),
  word("balo", ["blue"], "colours"),
  word("grogu", ["green"], "colours"),
  word("yopa", ["yellow"], "colours"),
  word("boka", ["black"], "colours"),
  word("wopa", ["white"], "colours")
];

export const INITIAL_UNITS = [
  { id: "core-polarity", title: "Core Polarity", description: "The positive-to-negative scale", order: 1 },
  { id: "social", title: "Social / Politeness", description: "Greetings, manners and requests", order: 2 },
  { id: "actions", title: "Wanting / Possession / Action", description: "Wanting, having and doing", order: 3 },
  { id: "communication", title: "Communication", description: "Speaking, asking and telling", order: 4 },
  { id: "vision", title: "Vision", description: "Seeing, visibility and obstruction", order: 5 },
  { id: "people-things", title: "People / Things / Value", description: "People, things and value", order: 6 },
  { id: "knowledge", title: "Knowledge", description: "Knowing and not knowing", order: 7 },
  { id: "movement", title: "Movement", description: "Going, entering and reversing", order: 8 },
  { id: "pronouns", title: "Pronouns", description: "People and pronouns", order: 9 },
  { id: "questions", title: "Questions", description: "Questioning with kato", order: 10 },
  { id: "connectors", title: "Connectors", description: "Because, but, and or", order: 11 },
  { id: "time-location", title: "Time / Location", description: "Time and places", order: 12 },
  { id: "time-units", title: "Time Units", description: "Seconds, minutes and larger units", order: 13 },
  { id: "colours", title: "Colours", description: "Six basic colour words", order: 14 }
];

export const INITIAL_GRAMMAR = [
  {
    id: "g-sentence-structure",
    title: "Sentence Structure",
    text: "Karlun follows the same default sentence structure as English: Subject → Verb → Object. Example: “mi kema chips” = “I want chips.” This is the default structure, but other arrangements can be acceptable when the meaning remains clear.",
    status: "approved",
    approved: true
  },
  {
    id: "g-meaning-modifiers",
    title: "Meaning Modifiers",
    text: "Only these are productive meaning modifiers: sa- = Positive / stronger positive meaning; ne- = Negative / opposite meaning. ta- is NOT a modifier. Examples: dela → nedela; sato → nesato.",
    status: "approved",
    approved: true
  },
  {
    id: "g-plurals",
    title: "Plurals",
    text: "Plural nouns can use either -s or -es. Choose whichever works naturally with the word.",
    status: "approved",
    approved: true
  },
  {
    id: "g-possession",
    title: "Possession",
    text: "Possession is flexible. All three forms are acceptable: “John car”, “John's car”, and “Johns car”. Use whichever works best. There is no single compulsory possessive format.",
    status: "approved",
    approved: true
  },
  {
    id: "g-english-fallback",
    title: "English Fallback",
    text: "If Karlun does not have a word for something, use the English word. Karlun does not need a dedicated word for every English concept.",
    status: "approved",
    approved: true
  },
  {
    id: "g-capitalisation",
    title: "Capitalisation",
    text: "The first word of a sentence can begin with either an uppercase or lowercase letter. Names and other proper nouns can use capital letters, even in the middle of a sentence. Ordinary words elsewhere in a sentence should use lowercase. Random capitalisation or mixed uppercase and lowercase letters within ordinary words is not valid. Valid: “Mi kesa sa”, “mi kesa sa”, “John kema chips”, “mi sopa John”. Invalid: “MI KesA sA”, “mi Kesa sa”, “mi kesa Sa”. Capitalisation does not change the meaning of a Karlun word.",
    status: "approved",
    approved: true
  },
  {
    id: "g-pronunciation",
    title: "Pronunciation",
    text: "gu - ju. gue - ju (vibrate long).",
    status: "approved",
    approved: true
  }
];

export const INITIAL_LANGUAGE_NOTES = [
  {
    id: "note-polarity",
    title: "Core Polarity",
    text: "Polarity scale: sa → sata → ta → neta → ne. neta is mildly negative, whereas ne is strongly negative."
  },
  {
    id: "note-social",
    title: "Social / Politeness",
    text: "lena can be used broadly for polite requests. kema can be used for a more direct request."
  },
  {
    id: "note-communication",
    title: "Communication",
    text: "sopa covers general communication, including asking questions."
  },
  {
    id: "note-pronouns",
    title: "Pronouns",
    text: "mo and re are separate pronouns. ko is also used for it / thing / stuff."
  },
  {
    id: "note-questions",
    title: "Question System",
    text: "kato combines with a concept to specify what is being questioned: soma kato = Who?; ko kato = What?; lora kato = Where?; tima kato = When?; kato = How? “karlun kato” can be used when confused about Karlun or when someone does not understand a Karlun expression."
  }
];

export const INITIAL_LANGUAGE_PRINCIPLES = [
  "Grammar should remain simple and flexible.",
  "English-style sentence order is the default.",
  "Clear meaning is more important than rigid grammar.",
  "Related meanings may share roots.",
  "Not every word needs to be mechanically derived from another.",
  "Spelling should generally be predictable.",
  "Normal keyboard characters are preferred.",
  "Words should be practical, memorable and comfortable to use.",
  "Words should be tested in real sentences before being accepted.",
  "Unapproved suggestions are not official vocabulary."
];

export const INITIAL_COURSE = {
  id: "karlun-main",
  name: "Karlun",
  masterSheetVersion: "2026-11-25",
  sourceVersion: "2026-11-25",
  sourceDescription: "Current Karlun Master Sheet supplied by Huw",
  words: INITIAL_WORDS,
  units: INITIAL_UNITS,
  grammar: INITIAL_GRAMMAR,
  languageNotes: INITIAL_LANGUAGE_NOTES,
  principles: INITIAL_LANGUAGE_PRINCIPLES,
  examples: [
    { id: "ex-svo", karlun: "mi kema chips", english: "I want chips.", note: "Default Subject → Verb → Object order." },
    { id: "ex-action", karlun: "mi kesa sa", english: "I jump.", note: "Example of kesa used for an action." },
    { id: "ex-lena-chips", karlun: "lena chips", english: "Please, chips / Please can I have chips.", note: "Lena can be used broadly for polite requests." },
    { id: "ex-lena-jump", karlun: "lena jump", english: "Please can you jump.", note: "An English word can be used when Karlun does not have a word for it." },
    { id: "ex-who", karlun: "soma kato", english: "Who?", note: "A concept followed by kato specifies the question." },
    { id: "ex-what", karlun: "ko kato", english: "What?", note: "A concept followed by kato specifies the question." },
    { id: "ex-where", karlun: "lora kato", english: "Where?", note: "A concept followed by kato specifies the question." },
    { id: "ex-when", karlun: "tima kato", english: "When?", note: "A concept followed by kato specifies the question." },
    { id: "ex-how", karlun: "kato", english: "How?", note: "Standalone kato." },
    { id: "ex-karlun-kato", karlun: "karlun kato", english: "Confused about Karlun / not understanding a Karlun expression.", note: "A phrase that can be used when confused about Karlun." },
    { id: "ex-possession-a", karlun: "John car", english: "John's car", note: "An acceptable possession format." },
    { id: "ex-possession-b", karlun: "John's car", english: "John's car", note: "An acceptable possession format." },
    { id: "ex-possession-c", karlun: "Johns car", english: "John's car", note: "An acceptable possession format." }
  ],
  archivedWords: [],
  importHistory: []
};
