# Porutchuvadu

Porutchuvadu helps students understand classical Tamil through bilingual explanations and inspectable evidence. The text-only edition covers 20 Tirukkural couplets about speaking kindly and avoiding idle speech.

## Run locally

Use Node.js 22.13 or later.

```sh
npm run install:ci
npm run dev
```

The development server prints the local address. Open `/?kural=100&lang=en` for the English view or use the language switch. The original couplets remain in Tamil.

## Try it

1. Open Kural 100. Select the Tamil phrase for ripe fruit and ask what it means in context.
2. Compare Kural 100 and 200. The response connects the verses and explains how their advice differs.
3. Ask “What does that verse mean?” The reader uses the previous comparison to identify the verse. If several verses were cited, it asks you to choose one.
4. Open Kural 91 and compare the two commentary notes. In each source link, the verse number matches that edition.

## Answer modes and privacy

The default demo answers in the browser using bundled notes and curated comparisons. It supports common passage, phrase, and comparison questions. It shows an evidence limit when the small collection cannot help.

An optional server-side model can answer a wider range of typed questions. Set `OPENAI_API_KEY` as a runtime secret behind the Sites authentication gateway, or use an untracked `.dev.vars` for local Worker testing. The gateway must strip client-supplied identity headers before adding authenticated identity. Open `/signin-with-chatgpt?return_to=%2F` on the local preview to use the development sign-in. The authenticated route limits request size, sends the question and source evidence, verifies citations for the requested verses, and falls back to notes when the provider is unavailable. The app does not store conversations.

## Checks and sources

Run `npm test` to check bilingual search, evidence links, comparison and follow-up behavior, malformed and oversized requests, and model citation validation. Run `npm run lint` for lint checks and `npm run build` for the production build.

The commentary notes, glosses, and explanations are editorial drafts. The source links lead to Project Madurai's editions for [Parimelalagar](https://www.projectmadurai.org/pm_etexts/utf8/pmuni0450_01.html) and [Manakkudavar](https://www.projectmadurai.org/pm_etexts/utf8/pmuni0650.html).
