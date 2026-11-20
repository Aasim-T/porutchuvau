import { z } from "zod";
import { byId } from "./corpus";
import { citationFor, outside, type Answer } from "./answers";
import type { Language } from "./language";

const passageSchema = z.object({
  id: z.number().int(),
  link: z.enum(["சொல்", "உவமை", "கருத்து"]),
  connection: z.string().trim().min(1).max(350),
  limit: z.string().trim().min(1).max(350),
  highlights: z.array(z.string()).max(3),
});
const outputSchema = z.object({
  status: z.enum(["answer", "clarify", "insufficient"]),
  text: z.string().trim().min(1).max(1100),
  citations: z.array(z.string()).max(10),
  passages: z.array(passageSchema).max(3),
});

export function validateModelAnswer(
  value: unknown, requiredVerses: readonly number[], language: Language,
): Answer | undefined {
  const parsed = outputSchema.safeParse(value);
  if (!parsed.success) return;
  const result = parsed.data;
  if (result.status !== "answer") {
    if (result.citations.length || result.passages.length) return;
    if (result.status === "insufficient") return { ...outside(language), mode: "ai" };
    return { ...result, mode: "ai" };
  }
  const citations = [...new Set(result.citations)];
  const citedVerses = new Set<number>();
  for (const id of citations) {
    const citation = citationFor(id);
    if (!citation) return;
    citedVerses.add(citation.verse.id);
  }
  if (!requiredVerses.every((id) => citedVerses.has(id))) return;
  const seen = new Set<number>();
  for (const card of result.passages) {
    const verse = byId(card.id);
    if (!verse || card.id === requiredVerses[0] || seen.has(card.id) || !citations.includes(`${card.id}:text`)) return;
    seen.add(card.id);
    card.highlights = [...new Set(card.highlights.filter((phrase) =>
      phrase.trim() && verse.lines.some((line) => line.includes(phrase))))];
  }
  return { ...result, citations, mode: "ai" };
}
