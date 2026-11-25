// Official Karlun snapshot supplied by Huw. Do not invent or auto-derive words here.
const meanings = (wordId, items) => items.map((text, index) => ({
  id: `${wordId}-m${index + 1}`,
  text,
  order: index + 1,
  status: "approved"
}));

const word = (id, term, glosses, unit, options = {}) => ({
  id,
  term,
  aliases: options.aliases ?? [],
  meanings: meanings(id, glosses),
  unitId: unit,
  notes: options.notes ?? "",
  wordClass: "flexible",
  modifierCompatibility: { sa: "unspecified", ne: "unspecified" },
  pluralCompatibility: "unspecified",
  spellingVariant: options.spellingVariant ?? true,
  status: "approved",
  sourceVersion: "2026-11-05"
});

export const INITIAL_WORDS = [
  word("w-sa", "sa", ["yes", "really good", "very positive", "right", "correct", "up"], "foundations"),
  word("w-sata", "sata", ["okay", "fairly good", "acceptable", "slightly positive"], "foundations"),
  word("w-ta", "ta", ["maybe", "neutral", "normal", "middle"], "foundations", { notes: "Not a productive meaning modifier." }),
  word("w-neta", "neta", ["fairly bad", "poor-ish", "slightly negative"], "foundations"),
  word("w-ne", "ne", ["no", "really bad", "very negative", "wrong", "down"], "foundations"),

  word("w-salo", "salo", ["hello", "greeting"], "social"),
  word("w-nero", "nero", ["goodbye", "farewell", "leaving"], "social"),
  word("w-mara", "mara", ["thanks", "gratitude", "appreciation"], "social"),
  word("w-lena", "lena", ["please", "polite request marker"], "social"),
  word("w-sima", "sima", ["sorry", "excuse me", "pardon me"], "social"),

  word("w-kema", "kema", ["want", "need", "require", "desire", "seek", "request", "ask for", "can I have"], "actions"),
  word("w-loma", "loma", ["have", "own", "possess", "hold", "keep", "retain", "carry"], "actions"),
  word("w-kato", "kato", ["do", "make", "create", "act", "perform", "work", "carry out", "cause"], "actions"),
  word("w-sopo", "sopo", ["say", "talk", "ask"], "actions"),

  word("w-sato", "sato", ["see", "visible", "clear", "transparent", "open", "unobstructed", "unblocked"], "seeing"),
  word("w-nesato", "nesato", ["not see", "invisible", "blocked", "blurry", "opaque", "closed", "obstructed"], "seeing"),

  word("w-soma", "soma", ["person", "people", "someone", "anyone", "human"], "people"),
  word("w-sako", "sako", ["good thing", "good stuff", "valuable", "worthwhile", "something worth keeping"], "people"),
  word("w-neko", "neko", ["bad thing", "bad stuff", "poor thing", "waste", "trash", "something to get rid of"], "people"),
  word("w-ko", "ko", ["it", "thing", "stuff"], "people"),

  word("w-dela", "dela", ["know", "understand", "knowledge", "smart", "intelligent", "aware", "knowledgeable"], "knowledge"),
  word("w-nedela", "nedela", ["not know", "not understand", "confused", "unaware", "dumb", "ignorant"], "knowledge"),

  word("w-tora", "tora", ["enter", "move forwards", "travel", "go"], "movement"),
  word("w-netora", "netora", ["backwards", "exit", "reverse", "stop"], "movement"),

  word("w-mi", "mi", ["I", "me"], "pronouns"),
  word("w-mu", "mu", ["you"], "pronouns"),
  word("w-mo", "mo", ["we", "us", "our"], "pronouns"),
  word("w-re", "re", ["they", "them", "their"], "pronouns"),
  word("w-le", "le", ["he", "him", "male", "boy"], "pronouns"),
  word("w-la", "la", ["she", "her", "female", "girl"], "pronouns"),

  word("w-kesa", "kesa", ["how", "confused", "questioning"], "questions", { notes: "Concept + kesa can form a question, e.g. soma kesa = who?" }),

  word("w-bera", "bera", ["because"], "connectors", { aliases: ["bura"] }),
  word("w-bur", "bur", ["but"], "connectors", { aliases: ["ber"] }),
  word("w-en", "en", ["and"], "connectors"),
  word("w-ori", "ori", ["or"], "connectors"),

  word("w-tima", "tima", ["time", "when"], "time"),
  word("w-naro", "naro", ["now"], "time"),
  word("w-lora", "lora", ["location", "place", "where"], "time"),
  word("w-nara", "nara", ["today"], "time"),
  word("w-mosa", "mosa", ["tomorrow"], "time"),
  word("w-mone", "mone", ["yesterday"], "time"),
  word("w-sena", "sena", ["second"], "time"),
  word("w-mena", "mena", ["minute"], "time"),
  word("w-hora", "hora", ["hour"], "time"),
  word("w-dana", "dana", ["day"], "time"),
  word("w-mona", "mona", ["month"], "time"),
  word("w-yara", "yara", ["year"], "time"),

  word("w-pira", "pira", ["red"], "colours"),
  word("w-galo", "galo", ["blue"], "colours"),
  word("w-fema", "fema", ["green"], "colours"),
  word("w-boda", "boda", ["yellow"], "colours"),
  word("w-doka", "doka", ["black"], "colours"),
  word("w-hopa", "hopa", ["white"], "colours")
];

export const INITIAL_UNITS = [
  { id: "foundations", title: "The foundations", description: "The positive-to-negative scale", order: 1 },
  { id: "social", title: "Social basics", description: "Greetings, manners and thanks", order: 2 },
  { id: "actions", title: "Actions & communication", description: "Wanting, doing and saying", order: 3 },
  { id: "seeing", title: "Seeing things", description: "Visibility and obstruction", order: 4 },
  { id: "people", title: "People & things", description: "People, objects and value", order: 5 },
  { id: "knowledge", title: "Knowledge", description: "Knowing and not knowing", order: 6 },
  { id: "movement", title: "Movement", description: "Going, entering and reversing", order: 7 },
  { id: "pronouns", title: "Pronouns", description: "Who is being talked about", order: 8 },
  { id: "questions", title: "Questions", description: "Asking and understanding questions", order: 9 },
  { id: "connectors", title: "Connecting ideas", description: "Because, but, and or", order: 10 },
  { id: "time", title: "Time & places", description: "When and where", order: 11 },
  { id: "colours", title: "Colours", description: "Six basic colour words", order: 12 }
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
    text: "Only these are productive meaning modifiers: sa- = positive / stronger positive meaning; ne- = negative / opposite meaning. ta- is NOT a modifier. Examples: dela → nedela; sato → nesato.",
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
    text: "The first word of a sentence can begin with either an uppercase or lowercase letter. Names and other proper nouns can use capital letters anywhere, including in the middle of a sentence. Ordinary words elsewhere in a sentence should use lowercase. Random capitalisation or mixed uppercase and lowercase letters within ordinary words is not valid. Valid: “Mi kesa sa”, “mi kesa sa”, “John kema chips”, “mi sopa John”. Invalid: “MI KesA sA”, “mi Kesa sa”, “mi kesa Sa”. Capitalisation does not change the meaning of a Karlun word.",
    status: "approved",
    approved: true
  },
  {
    id: "g-pronunciation",
    title: "Pronunciation",
    text: "gu = ju. gue = ju (vibrate long).",
    status: "approved",
    approved: true
  }
];

export const INITIAL_COURSE = {
  id: "karlun-main",
  name: "Karlun",
  sourceVersion: "2026-11-05",
  sourceDescription: "Huw's approved master plan snapshot",
  words: INITIAL_WORDS,
  units: INITIAL_UNITS,
  grammar: INITIAL_GRAMMAR,
  examples: [
    { id: "ex-soma-kesa", karlun: "soma kesa", english: "Who?", note: "A concept followed by kesa specifies the question.", status: "approved" },
    { id: "ex-ko-kesa", karlun: "ko kesa", english: "What?", note: "A concept followed by kesa specifies the question.", status: "approved" },
    { id: "ex-lora-kesa", karlun: "lora kesa", english: "Where?", note: "A concept followed by kesa specifies the question.", status: "approved" },
    { id: "ex-tima-kesa", karlun: "tima kesa", english: "When?", note: "A concept followed by kesa specifies the question.", status: "approved" },
    { id: "ex-kesa", karlun: "kesa", english: "How?", note: "Standalone kesa can mean how.", status: "approved" },
    { id: "ex-lena-chips", karlun: "lena chips", english: "Please, chips / Please can I have chips?", note: "Lena is a polite request marker.", status: "approved" },
    { id: "ex-lena-jump", karlun: "lena jump", english: "Please can you jump?", note: "An English word may be used when Karlun has no word for it.", status: "approved" },
    { id: "ex-mi-ne-kema", karlun: "mi ne-kema chips", english: "I do not want chips.", note: "Negation applies to the individual word.", status: "approved" },
    { id: "ex-possession-a", karlun: "John car", english: "John's car", note: "Possession is flexible.", status: "approved" },
    { id: "ex-possession-b", karlun: "John's car", english: "John's car", note: "Possession is flexible.", status: "approved" },
    { id: "ex-possession-c", karlun: "Johns car", english: "John's car", note: "Possession is flexible.", status: "approved" }
  ],
  linguisticProfile: { influences: ["English (primary)", "Greek"], designGoal: "Words should be easy to say." },
  archivedWords: [],
  importHistory: []
};
