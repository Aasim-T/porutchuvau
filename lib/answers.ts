import { byId, editions, normalize, type Verse } from "./corpus";

import { localizedVerse, textFor, type Language } from "./language";

export type Passage = {
  id: number;
  link: "சொல்" | "உவமை" | "கருத்து";
  connection: string;
  limit: string;
  highlights: string[];
};

export type Answer = {
  status: "answer" | "clarify" | "insufficient";
  text: string;
  citations: string[];
  passages: Passage[];
  mode: "notes" | "ai";
};

export type Question = {
  text: string;
  verseId: number;
  selection: string;
  recent: number[];
  language?: Language;
};

const examples: Record<string, Omit<Passage, "id">> = {
  "100:200": {
    link: "கருத்து",
    connection: "இரு குறள்களும் பேசுவதற்கு முன் சொல்லைத் தேர்ந்தெடுக்கச் சொல்கின்றன.",
    limit: "குறள் 100 பேசும் விதத்தையும் சொற்கள் ஏற்படுத்தும் வலியையும் கவனிக்கிறது. குறள் 200 சொல்லின் பயனை அளவுகோலாக்குகிறது.",
    highlights: ["பயனுடைய", "பயனிலாச்"],
  },
  "100:99": {
    link: "கருத்து",
    connection: "இன்சொல்லுக்கும் கடுஞ்சொல்லுக்கும் இடையிலான தேர்வைப் புரிந்துகொள்ள உதவுகிறது.",
    limit: "குறள் 99 ஒருவர் பெற்ற அனுபவத்திலிருந்து கேள்வி எழுப்புகிறது. குறள் 100 தேர்வைக் கனி, காய் உவமையில் காட்டுகிறது.",
    highlights: ["வன்சொல்"],
  },
  "100:96": {
    link: "கருத்து",
    connection: "மற்றவருக்குப் பயன் தரும் சொற்களை இனிமையாகச் சொல்வதைக் குறள் 96 விளக்குகிறது.",
    limit: "குறள் 100 நோகச் செய்யும் சொல்லைத் தவிர்ப்பதை விளக்குகிறது. குறள் 96 நன்மை தரும் சொல்லைக் கண்டறிவதையும் சேர்க்கிறது.",
    highlights: ["நல்லவை", "இனிய சொலின்"],
  },
  "97:192": {
    link: "சொல்",
    connection: "நயன் என்ற சொல்லுக்கு ஒரே விளக்கம் எல்லா இடங்களிலும் பொருந்தாது என்பதைக் காட்டுகிறது.",
    limit: "குறள் 97-இல் பரிமேலழகர் நயனை நீதி என விளக்குகிறார். குறள் 192-இல் நண்பர்களின் விருப்பத்துக்கு மாறான செயலே நயனில.",
    highlights: ["நயனில"],
  },
};

const englishParallels: Record<string, [string, string]> = {
  "100:200": ["Both verses ask you to choose your words before you speak.", "Kural 100 focuses on how words feel to the listener. Kural 200 asks whether the words serve a useful purpose."],
  "100:99": ["Both verses consider why someone would choose harsh words over kind ones.", "Kural 99 starts with the listener’s own experience of kind words. Kural 100 uses the image of ripe and unripe fruit."],
  "100:96": ["Kural 96 connects kind speech with choosing words that benefit others.", "Kural 100 asks us to avoid hurtful words. Kural 96 adds a positive criterion: seek out words that do good."],
  "97:192": ["Both use forms of nayan, but each context calls for a different reading.", "Parimelalagar reads nayan in Kural 97 as justice. In Kural 192, the related form refers to something unwelcome to friends."],
};

function parallel(from: number, to: number, language: Language): Passage | undefined {
  const direct = `${from}:${to}`;
  const key = examples[direct] ? direct : `${to}:${from}`;
  const card = examples[key];
  if (!card) return;
  const [connection, limit] = language === "en" ? englishParallels[key] : [card.connection, card.limit];
  return { ...card, id: to, connection, limit, highlights: key === direct ? card.highlights : [] };
}

export function mentionedIds(text: string) {
  return [...new Set((normalize(text).match(/\b\d{1,4}\b/g) ?? []).map(Number))];
}

export function isComparison(text: string) {
  return /ஒப்பிடு|compare|தொடர்பு|இதே கருத்து|இதே மாதிரி|வேற எங்க|வேறு (?:குறள்|எங்க)|similar|parallel|related/iu.test(text);
}

export function citationFor(id: string) {
  const match = /^(\d+):(text|p|m)$/.exec(id);
  const verse = match && byId(Number(match[1]));
  if (!verse || !match) return;
  const kind = match[2] as "text" | "p" | "m";
  return { verse, kind };
}

function response(text: string, options: Partial<Answer> = {}): Answer {
  return {
    status: "answer", text, citations: [], passages: [], mode: "notes", ...options,
  };
}

export function outside(language: Language = "ta"): Answer {
  return response(textFor(language, "இந்தத் தொகுப்பில் அதற்குப் போதுமான சான்று கிடைக்கவில்லை. குறள் 91–100 அல்லது 191–200 இலிருந்து ஒரு வரியைத் தேர்ந்தெடுத்துக் கேளுங்கள்.", "This collection has insufficient evidence to answer. Try selecting a line from Kural 91–100 or 191–200."), { status: "insufficient" });
}

export function fromNotes(q: Question): Answer {
  const ids = mentionedIds(q.text);
  if (ids.some((id) => !byId(id))) return outside(q.language);
  const original = byId(q.verseId);
  const question = normalize(q.text);
  const compare = isComparison(question);
  const source = ids.length === 1 && !compare ? byId(ids[0]) : original;
  const language = q.language ?? "ta";
  if (!source) return outside(language);
  const verse = localizedVerse(source, language);
  const citations = [`${verse.id}:text`, `${verse.id}:p`, `${verse.id}:m`];
  if (/உரையாசிரியர்|உரைகள்|மணக்குடவர்|பரிமேலழகர்|commenta(?:r|t)/iu.test(question)) {
    const name = (kind: "p" | "m") => textFor(language, editions[kind].name, editions[kind].englishName);
    return response(`${name("p")}: ${verse.notes.p}\n\n${name("m")}: ${verse.notes.m}`, { citations });
  }
  if (compare || ids.length > 1) {
    const first = ids.length > 1 ? ids[0] : verse.id;
    const explicit = ids.filter((id) => id !== first);
    const targets = explicit.length ? explicit : first === 100 ? [200, 99, 96] : [100, 97, 192];
    const passages = targets.flatMap((id) => parallel(first, id, language) ?? []);
    if (!passages.length) return outside(language);
    const summary = passages.length === 1
      ? textFor(language, `குறள் ${first} உடன் குறள் ${passages[0].id}-ஐ ஒப்பிடலாம்.`, `Compare Kural ${first} with Kural ${passages[0].id}.`) + ` ${passages[0].limit}`
      : textFor(language, "இவற்றை ஒப்பிட்டுப் பார்த்தால், நல்ல பேச்சைத் தேர்ந்தெடுப்பதற்கான வெவ்வேறு காரணங்கள் தெரியும்.", "These passages give different reasons for choosing your words carefully.");
    return response(summary, { citations: [`${first}:text`, ...passages.map(({ id }) => `${id}:text`)], passages });
  }
  const gloss = verse.gloss.find(({ phrase }) => normalize(phrase) === normalize(q.selection))
    ?? verse.gloss.find(({ phrase }) => normalize(phrase).length > 1 && question.includes(normalize(phrase)));
  if (gloss) return response(`${gloss.phrase} — ${gloss.meaning}. ${verse.summary}`, { citations });
  if (/அர்த்தம்|பொருள்|விளக்|என்ன சொல்|meaning|explain|what does/iu.test(question)) {
    return response(verse.summary, { citations });
  }
  return outside(language);
}

export function selectedText(verse: Verse, text: string) {
  const selection = normalize(text);
  if (!selection) return "";
  return [...verse.lines, ...verse.gloss.map((item) => item.phrase)]
    .find((value) => normalize(value) === selection) ?? "";
}
