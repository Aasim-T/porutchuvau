import { englishVerses } from "./english-verses";
import type { Verse } from "./corpus";

export type Language = "ta" | "en";

export function textFor(language: Language, tamil: string, english: string) {
  return language === "en" ? english : tamil;
}

export function localizedVerse(verse: Verse, language: Language): Verse {
  if (language === "ta") return verse;
  const [summary, p, m, meanings] = englishVerses[verse.id];
  return { ...verse, summary, notes: { p, m },
    gloss: verse.gloss.map((item, index) => ({ ...item, meaning: meanings[index] })),
  };
}

export function chapterLabel(start: number, language: Language) {
  return start === 91 ? textFor(language, "இனியவை கூறல்", "Speaking kindly")
    : textFor(language, "பயனில சொல்லாமை", "Avoiding idle speech");
}
