"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, MessageSquareText, Send, X } from "lucide-react";
import { byId, chapterOf, editions, evidenceFor, verseHref, verses } from "../lib/corpus";
import { citationFor, fromNotes, type Answer, type Question } from "../lib/answers";
import { chapterLabel, localizedVerse, textFor, type Language } from "../lib/language";
import { VerseLibrary } from "./verse-library";

function highlight(line: string, phrases: string[]) {
  const phrase = phrases.find((candidate) => candidate && line.includes(candidate));
  if (!phrase) return line;
  const start = line.indexOf(phrase);
  return <>{line.slice(0, start)}<mark>{phrase}</mark>{line.slice(start + phrase.length)}</>;
}

type ReaderProps = { initialId: number; initialLanguage: Language; hasServerAnswers: boolean };

export default function Reader({ initialId, initialLanguage, hasServerAnswers }: ReaderProps) {
  const [language, setLanguage] = useState(initialLanguage);
  const t = (ta: string, en: string) => textFor(language, ta, en);
  const href = (number: number) => verseHref(number, language);
  const [id, setId] = useState(initialId);
  const [selection, setSelection] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [recent, setRecent] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const original = byId(id)!;
  const verse = useMemo(() => localizedVerse(original, language), [original, language]);
  const sources = useMemo(() => (["p", "m"] as const).map((kind) => ({
    kind, url: evidenceFor(original, kind, language).url,
  })), [original, language]);
  const activeGloss = verse.gloss.find(({ phrase }) => selection === phrase);
  const chapter = chapterOf(id)!;
  const index = verses.findIndex((item) => item.id === id);

  const cancelQuestion = useCallback(() => {
    request.current?.abort();
    request.current = null;
  }, []);

  useEffect(() => {
    const pop = () => {
      cancelQuestion();
      const params = new URLSearchParams(location.search);
      const value = Number(params.get("kural"));
      setLanguage(params.get("lang") === "en" ? "en" : "ta");
      setId(byId(value)?.id ?? 100);
      setSelection("");
      setAnswer(null);
      setRecent([]);
      setBusy(false);
    };
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      cancelQuestion();
    };
  }, [cancelQuestion]);

  const open = useCallback((next: number) => {
    if (!byId(next)) return;
    cancelQuestion();
    if (next !== id) {
      window.history.pushState({}, "", verseHref(next, language));
      setId(next);
      setSelection("");
    }
    setAnswer(null);
    setRecent([]);
    setBusy(false);
    requestAnimationFrame(() => heading.current?.focus());
  }, [cancelQuestion, id, language]);

  function changeLanguage(next: Language) {
    if (next === language) return;
    cancelQuestion();
    setBusy(false);
    setLanguage(next);
    setAnswer(null);
    setRecent([]);
    window.history.pushState({}, "", verseHref(id, next));
  }

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const navigate = useCallback((event: MouseEvent<HTMLAnchorElement>, next: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(next);
  }, [open]);

  function pick(text: string) {
    setSelection((current) => current === text ? "" : text);
  }

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || request.current) return;
    const payload: Question = { text: clean, verseId: id, selection, recent, language };
    setQuestion(clean);
    if (!hasServerAnswers) {
      showAnswer(fromNotes(payload));
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setAnswer(null);
    let result: Answer;
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      result = response.ok ? await response.json() as Answer : fromNotes(payload);
    } catch {
      if (controller.signal.aborted) return;
      result = fromNotes(payload);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
    if (controller.signal.aborted) return;
    showAnswer(result);
  }

  function showAnswer(result: Answer) {
    setAnswer(result);
    const nextRecent = result.passages.length
      ? result.passages.map(({ id: passageId }) => passageId)
      : [...new Set(result.citations.flatMap((evidence) => {
          const source = citationFor(evidence);
          return source && source.verse.id !== id ? [source.verse.id] : [];
        }))];
    if (nextRecent.length) setRecent(nextRecent.slice(0, 3));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const suggestions = [
    selection ? t("இந்தச் சொல்லுக்கு இங்கே என்ன பொருள்?", "What does this word mean here?") : t("இந்தக் குறளின் பொருள் என்ன?", "What does this verse mean?"),
    t("இதே கருத்தை வேற எங்க சொல்லியிருக்காங்க?", "Where else does a similar idea appear?"),
    id === 100 ? t("குறள் 100 மற்றும் 200-ஐ ஒப்பிடு", "Compare Kural 100 and 200") : t("இரண்டு உரையாசிரியர்களும் என்ன சொல்கிறார்கள்?", "What do the two commentators say?"),
  ];

  return <div lang={language}>
    <a className="skip" href="#verse-title">{t("குறளுக்குச் செல்", "Skip to verse")}</a>
    <header className="top"><div className="top-inner">
      <a className="brand" href={href(100)} onClick={(event) => navigate(event, 100)}>
        <img src="/porul.svg" width={36} height={36} alt="" /><span>{t("பொருட்சுவடு", "Porutchuvadu")}</span>
      </a>
      <nav className="top-links" aria-label={t("பக்கம்", "Page")}>
        <a href="#library">{t("குறள்கள்", "Verses")}</a><a href="#sources">{t("மூலங்கள்", "Sources")}</a>
        <div className="language-switch" role="group" aria-label={t("மொழி", "Language")}>
          <button type="button" lang="ta" aria-pressed={language === "ta"} onClick={() => changeLanguage("ta")}>தமிழ்</button>
          <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => changeLanguage("en")}>English</button>
        </div>
      </nav>
    </div></header>

    <main className="shell">
      <section className="main" aria-label={t("குறள் வாசிப்பு", "Verse reader")}>
        <article className="verse-card" id="verse">
          <div className="eyebrow"><BookOpen size={17} aria-hidden="true" /> {t("திருக்குறள்", "Tirukkural")} · {chapterLabel(chapter.start, language)}</div>
          <h1 id="verse-title" ref={heading} tabIndex={-1}>{t("குறள்", "Kural")} {id}</h1>
          <blockquote className="poem" lang="ta">
            {verse.lines.map((line) => <button type="button" key={line}
              className="line-picker"
              aria-pressed={selection === line} onClick={() => pick(line)}>{line}</button>)}
          </blockquote>
          <a className="ask-link" href="#question">{t("குறளைப் பற்றிக் கேள்", "Ask about this verse")}</a>
        </article>

        <section className="card">
          <h2>{t("எளிய பொருள்", "Plain-English meaning")}</h2><p>{verse.summary}</p>
          <div className="row phrase-list" role="group" aria-label={t("குறளின் சொற்கள்", "Words in this verse")}>
            {verse.gloss.map(({ phrase, meaning }) => <button className="soft" key={phrase} type="button"
              onClick={() => pick(phrase)} aria-pressed={selection === phrase} lang="ta" title={meaning}>{phrase}</button>)}
          </div>
          <div aria-live="polite">
            {activeGloss && <p className="hint"><strong lang="ta">{activeGloss.phrase}</strong> · {activeGloss.meaning}</p>}
          </div>
        </section>

        <section className="card" id="sources">
          <h2>{t("உரையும் மூலமும்", "Commentaries and sources")}</h2>
          <p className="credits">{t("உரைக் குறிப்புகள் · மதிப்பாய்வுக்கான வரைவு", "Commentary notes · Draft for review")}</p>
          <div className="source-grid">{sources.map(({ kind, url }) =>
            <article className="source-item" key={kind}>
              <h3>{t(editions[kind].name, editions[kind].englishName)}</h3>
              <p>{verse.notes[kind]}</p>
              <a href={url} target="_blank" rel="noreferrer">{t("பதிப்பில் குறள்", "Verse in this edition")} {kind === "m" ? verse.manakkudavar : id} <ExternalLink size={13} aria-hidden="true" /></a>
            </article>
          )}</div>
          <details className="privacy">
            <summary>{t("மணக்குடவர் பதிப்பில் உள்ள வரிகள்", "Tamil text in Manakkudavar’s edition")}</summary>
            <p lang="ta">{verse.alternate[0]}<br />{verse.alternate[1]}</p>
          </details>
          <p className="credits" style={{ marginTop: 10 }}>{t("மின்னூல் ஆதாரம்", "Digital edition")} · <a href="https://www.projectmadurai.org/" target="_blank" rel="noreferrer">{t("மதுரைத் திட்டம்", "Project Madurai")}</a></p>
        </section>

        <nav className="row jump" aria-label={t("அடுத்த அல்லது முந்தைய குறள்", "Previous or next verse")}>
          {verses[index - 1] ? <a className="soft" href={href(verses[index - 1].id)} onClick={(e) => navigate(e, verses[index - 1].id)}><ChevronLeft size={16} aria-hidden="true" /> {t("முந்தைய குறள்", "Previous verse")}</a> : <span />}
          {verses[index + 1] && <a className="soft" href={href(verses[index + 1].id)} onClick={(e) => navigate(e, verses[index + 1].id)}>{t("அடுத்த குறள்", "Next verse")} <ChevronRight size={16} aria-hidden="true" /></a>}
        </nav>
      </section>

      <aside className="panel" aria-labelledby="ask">
        <div className="panel-head"><MessageSquareText size={21} aria-hidden="true" /><h2 id="ask">{t("குறளைப் பற்றிக் கேள்", "Ask about this verse")}</h2></div>
        <p className="small" id="question-help">{t("ஒரு வரி அல்லது சொல்லைத் தேர்ந்தெடுத்துக் கேளுங்கள். பதிலைச் சான்றுகளுடன் சரிபாருங்கள்.", "Select a line or word and ask about it. Use the citations to check the explanation.")}</p>
        <form onSubmit={submit}>
          {selection && <div className="selection"><span lang="ta">{selection}</span><button type="button" aria-label={t("தேர்வை நீக்கு", "Clear selection")} onClick={() => setSelection("")}><X size={16} aria-hidden="true" /></button></div>}
          <label className="question-label" htmlFor="question">{t("உங்கள் கேள்வி", "Your question")}</label>
          <textarea id="question" aria-describedby="question-help" value={question}
            onChange={(e) => setQuestion(e.target.value)} maxLength={500} />
          <div className="row composer">
            <button type="submit" className="primary" aria-disabled={!question.trim() || busy}>{t("கேள்", "Ask")} <Send size={15} aria-hidden="true" /></button>
          </div>
        </form>
        <div className="examples">{suggestions.map((example) =>
          <button type="button" className="soft" key={example} aria-disabled={busy} onClick={() => void ask(example)}>{example}</button>)}</div>
        <div className={busy ? "hint" : "sr-only"} role="status">
          {busy ? t("சான்றுகளைத் தேடுகிறது…", "Looking for evidence…") : answer?.text}
        </div>

        {answer && <section className="answer" aria-labelledby="answer-title">
          <h3 id="answer-title">{answer.status === "clarify" ? t("ஒரு விளக்கம் தேவை", "Clarification needed") : t("பதில்", "Answer")}</h3>
          {answer.text.split("\n\n").map((line, index) => <p key={index}>{line}</p>)}
          {answer.passages.length > 0 && <ol>{answer.passages.map((related) => {
            const target = byId(related.id)!;
            return <li className="source-item" key={related.id}>
              <h3><a href={href(target.id)} onClick={(e) => navigate(e, target.id)}>{t("குறள்", "Kural")} {target.id}</a> · {t(related.link, { "சொல்": "Wording", "உவமை": "Imagery", "கருத்து": "Theme" }[related.link])}</h3>
              <p lang="ta">{highlight(target.lines[0], related.highlights)}<br />{highlight(target.lines[1], related.highlights)}</p>
              <p>{related.connection}</p><p className="small">{related.limit}</p>
            </li>;
          })}</ol>}
          {answer.citations.length > 0 && <ul aria-label={t("சான்றுகள்", "Evidence")}>{answer.citations.map((id) => {
            const citation = citationFor(id);
            if (!citation) return null;
            const link = evidenceFor(citation.verse, citation.kind, language);
            return <li key={id}><a href={link.url} target={citation.kind !== "text" ? "_blank" : undefined}
              rel="noreferrer" onClick={citation.kind === "text" ? (e) => navigate(e, citation.verse.id) : undefined}>{link.label}</a></li>;
          })}</ul>}
          <p className="small">{answer.mode === "ai" ? t("ஆதாரங்களிலிருந்து உருவாக்கிய பதில்", "Answer generated from the cited evidence") : t("தொகுப்பிலுள்ள குறிப்புகளின் அடிப்படையில்", "Based on notes in this collection")}</p>
        </section>}
      </aside>
      <VerseLibrary verseId={id} language={language} onNavigate={navigate} />
    </main>
  </div>;
}
