import assert from "node:assert/strict";
import test from "node:test";
import { fromNotes, selectedText, type Question } from "../lib/answers";
import { byId, evidenceFor, searchVerses, verses } from "../lib/corpus";
import { localizedVerse } from "../lib/language";
import { readQuestion } from "../lib/ask-request";
import { validateModelAnswer } from "../lib/model-answer";

function ask(text: string, overrides: Partial<Question> = {}) {
  return fromNotes({ text, verseId: 100, selection: "", recent: [], language: "en", ...overrides });
}

test("all 20 verses retain Tamil text and have complete English notes", () => {
  assert.equal(verses.length, 20);
  for (const verse of verses) {
    const english = localizedVerse(verse, "en");
    assert.deepEqual(english.lines, verse.lines);
    assert.match(english.summary, /[A-Za-z]/);
    assert.ok(english.notes.p && english.notes.m);
    assert.ok(english.gloss.every(({ meaning }) => meaning));
  }
});

test("search accepts Tamil numerals and English terms", () => {
  assert.equal(searchVerses("௨௦௦")[0].id, 200);
  assert.ok(searchVerses("ripe fruit", "en").some(({ id }) => id === 100));
});

test("cites Manakkudavar's edition number and retains English links", () => {
  const verse = byId(200)!;
  assert.match(evidenceFor(verse, "m", "en").label, /191/);
  assert.equal(evidenceFor(verse, "text", "en").url, "/?kural=200&lang=en");
});

test("typed questions use passage or phrase context in the selected language", () => {
  assert.match(ask("What does this word mean here?", { selection: "கனி" }).text, /ripe fruit/);
  assert.match(ask("இந்தக் குறளின் பொருள் என்ன?", { language: "ta" }).text, /இனிய சொற்கள்/);
  assert.equal(selectedText(byId(100)!, " not in the selected verse "), "");
});

test("a related-verse query uses the selected verse as its anchor", () => {
  const result = ask("Find a similar idea in Kural 200");
  assert.deepEqual(result.citations, ["100:text", "200:text"]);
  assert.equal(result.passages[0].id, 200);
  assert.match(result.passages[0].limit, /useful purpose/);
});

test("questions outside the collection return an evidence limit", () => {
  const result = ask("What does Kural 500 mean?");
  assert.equal(result.status, "insufficient");
  assert.deepEqual(result.citations, []);
});

test("playback requests receive no playback action in the text reader", () => {
  const result = ask("Read aloud Kural 100");
  assert.equal(result.status, "insufficient");
  assert.equal("playId" in result, false);
});

test("indexed search retains both languages and field boundaries", () => {
  const verse = byId(100)!;
  for (const language of ["en", "ta", "en"] as const) {
    assert.deepEqual(searchVerses("குறள் ௧௦", language).map(({ id }) => id), [100]);
    const crossingFields = `${verse.lines[1].split(" ").at(-1)} ${verse.alternate[0].split(" ")[0]}`;
    assert.ok(!searchVerses(crossingFields, language).includes(verse));
  }
});

test("follow-up questions use the cited verse or ask the learner to choose", () => {
  assert.equal(ask("What does that verse mean?", { recent: [200] }).citations[0], "200:text");
  const ambiguous = ask("What does the other verse mean?", { recent: [200, 99] });
  assert.equal(ambiguous.status, "clarify");
  assert.deepEqual(ambiguous.citations, []);
  assert.equal(ask("Compare Kural 100, 200 and 191").status, "insufficient");
});

function post(body: BodyInit, type = "application/json") {
  return new Request("https://reader.test/api/ask", {
    method: "POST", headers: { "Content-Type": type }, body,
  });
}

test("question requests validate media type, byte size, input, and verse context", async () => {
  assert.equal((await readQuestion(post("{}", "application/json-other"))).status, 415);
  assert.equal((await readQuestion(post(" ".repeat(8193)))).status, 413);
  assert.equal((await readQuestion(post("{"))).status, 400);
  assert.equal((await readQuestion(post(JSON.stringify({ text: "Explain", verseId: 500 })))).status, 400);
  const result = await readQuestion(post(JSON.stringify({
    text: "  பொருள் என்ன?  ", verseId: 100, selection: "கனி", recent: [200, 200, 500],
  }), "Application/JSON; charset=UTF-8"));
  assert.deepEqual(result.question, {
    text: "பொருள் என்ன?", verseId: 100, selection: "கனி", recent: [200], language: "ta",
  });
});

test("model comparisons require every named verse and keep only verbatim highlights", () => {
  const card = {
    id: 200, link: "கருத்து", connection: "Speaking", limit: "Usefulness",
    highlights: ["பயனுடைய", "invented", "பயனுடைய"],
  };
  const output = {
    status: "answer", text: "Both discuss speech", citations: ["100:text", "200:text"], passages: [card],
  };
  const validate = (value: unknown) => validateModelAnswer(value, [100, 200], "en");
  assert.deepEqual(validate(output)?.passages[0].highlights, ["பயனுடைய"]);
  assert.equal(validate({ ...output, citations: ["100:text"], passages: [] }), undefined);
  assert.equal(validate({ ...output, citations: ["100:text", "0200:text"] }), undefined);
  assert.equal(validate({ ...output, passages: [card, card] }), undefined);
});
