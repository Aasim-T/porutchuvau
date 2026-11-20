import { memo, useMemo, useState, type MouseEvent } from "react";
import { LibraryBig, Search } from "lucide-react";
import { chapterOf, chapters, searchVerses, verseHref } from "../lib/corpus";
import { chapterLabel, textFor, versePreview, type Language } from "../lib/language";

type LibraryProps = {
  verseId: number;
  language: Language;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, id: number) => void;
};

export const VerseLibrary = memo(function VerseLibrary({ verseId, language, onNavigate }: LibraryProps) {
  const [search, setSearch] = useState("");
  const t = (ta: string, en: string) => textFor(language, ta, en);
  const matches = useMemo(() => searchVerses(search, language), [search, language]);
  const activeChapter = chapterOf(verseId);

  return (
    <nav className="library" id="library" aria-label={t("திருக்குறள் தொகுப்பு", "Tirukkural collection")}>
      <div className="row">
        <LibraryBig size={18} aria-hidden="true" />
        <h2>{t("குறள் தொகுப்பு", "Verse collection")}</h2>
      </div>
      <label className="search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          aria-label={t("குறள் தேடல்", "Search verses")}
          placeholder={t("எண் அல்லது சொல்", "Number or keyword")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <p className={search && !matches.length ? "small" : "sr-only"} role="status">
        {search.trim() && (matches.length
          ? t(`பொருந்தும் குறள்கள்: ${matches.length}`, `${matches.length} matching verses`)
          : t("பொருந்தும் குறள் இல்லை.", "No matching verses."))}
      </p>
      {chapters.map((chapter) => {
        const entries = matches.filter(({ id }) => id >= chapter.start && id <= chapter.end);
        return entries.length > 0 && (
          <details className="chapter" key={chapter.start} open={Boolean(search) || chapter === activeChapter}>
            <summary>{chapterLabel(chapter.start, language)}</summary>
            <ul>
              {entries.map((verse) => (
                <li key={verse.id}>
                  <a
                    className="verse-link"
                    href={verseHref(verse.id, language)}
                    aria-current={verse.id === verseId ? "page" : undefined}
                    onClick={(event) => onNavigate(event, verse.id)}
                  >
                    <span>{verse.id}</span><span lang={language}>{versePreview(verse, language)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </nav>
  );
});
