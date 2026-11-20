import { chapterLabel, localizedVerse, textFor, type Language } from "./language";
import entries from "./verses.json";

export const editions = {
  p: {
    name: "பரிமேலழகர்",
    englishName: "Parimelalagar",
    url: "https://www.projectmadurai.org/pm_etexts/utf8/pmuni0450_01.html",
    edition: "Project Madurai 450.1 · அறத்துப்பால்",
  },
  m: {
    name: "மணக்குடவர்",
    englishName: "Manakkudavar",
    url: "https://www.projectmadurai.org/pm_etexts/utf8/pmuni0650.html",
    edition: "Project Madurai 650 · திருக்குறள் மூலமும் உரையும்",
  },
} as const;

export type Verse = {
  id: number;
  manakkudavar: number;
  lines: string[];
  alternate: string[];
  summary: string;
  notes: { p: string; m: string };
  gloss: { phrase: string; meaning: string }[];
  tags: string[];
};

export const chapters = [
  { label: "இனியவை கூறல்", start: 91, end: 100 },
  { label: "பயனில சொல்லாமை", start: 191, end: 200 },
];

export const verses: Verse[] = entries;
export const byId = (id: number) => verses.find((verse) => verse.id === id);
export const chapterOf = (id: number) =>
  chapters.find(({ start, end }) => id >= start && id <= end);
export const verseHref = (id: number, language: Language = "ta") => `/?kural=${id}${language === "en" ? "&lang=en" : ""}`;

export function normalize(text: string) {
  return text.normalize("NFC").toLowerCase()
    .replace(/[௦-௯]/g, (digit) => String(digit.charCodeAt(0) - 0x0be6))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}

export function searchVerses(text: string, language: Language = "ta") {
  const query = normalize(text);
  if (!query) return verses;
  const numeric = query.match(/^(?:குறள்\s+|kural\s+)?(\d+)$/u);
  if (numeric) return verses.filter(({ id }) => String(id).startsWith(numeric[1]));
  return verses.filter((v) => [v.lines.join(" "), v.alternate.join(" "), v.summary,
    chapterOf(v.id)?.label ?? "", chapterLabel(chapterOf(v.id)!.start, language),
    localizedVerse(v, language).summary, ...v.tags,
    ...localizedVerse(v, language).gloss.flatMap((g) => [g.phrase, g.meaning])]
    .some((term) => normalize(term).includes(query)));
}

export function evidenceFor(v: Verse, kind: "text" | "p" | "m", language: Language = "ta") {
  if (kind === "text") return {
    id: `${v.id}:text`, verseId: v.id, label: textFor(language, `குறள் ${v.id} · மூலம்`, `Kural ${v.id} · Original text`),
    text: v.lines.join("\n"), url: verseHref(v.id, language),
  };
  const source = editions[kind];
  const number = kind === "m" ? v.manakkudavar : v.id;
  const fragment = (kind === "m" ? v.alternate : v.lines)[0].split(/\s+/).slice(0, 3).join(" ");
  return {
    id: `${v.id}:${kind}`, verseId: v.id,
    label: textFor(language, `${source.name} · பதிப்பில் ${number}`, `${source.englishName} · Verse ${number} in this edition`),
    text: localizedVerse(v, language).notes[kind],
    url: `${source.url}#:~:text=${encodeURIComponent(fragment).replaceAll("-", "%2D")}`,
  };
}
