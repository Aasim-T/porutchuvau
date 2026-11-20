import assert from "node:assert/strict";
import test from "node:test";
import { fromNotes, selectedText, type Question } from "../lib/answers";
import { byId, evidenceFor, searchVerses, verses } from "../lib/corpus";
import { localizedVerse } from "../lib/language";

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
