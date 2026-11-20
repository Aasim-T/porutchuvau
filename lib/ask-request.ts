import { z } from "zod";
import { selectedText } from "./answers";
import { byId } from "./corpus";

const maximumBytes = 8192;
const questionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  verseId: z.number().int(),
  selection: z.string().max(180).default(""),
  recent: z.array(z.number().int()).max(3).default([]),
  language: z.enum(["ta", "en"]).default("ta"),
});

export async function readQuestion(request: Request) {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json") return { error: "invalid-request", status: 415 } as const;
  if (Number(request.headers.get("content-length")) > maximumBytes) {
    return { error: "question-too-large", status: 413 } as const;
  }
  if (!request.body) return { error: "invalid-question", status: 400 } as const;

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let json = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        void reader.cancel().catch(() => {});
        return { error: "question-too-large", status: 413 } as const;
      }
      json += decoder.decode(value, { stream: true });
    }
    const parsed = questionSchema.safeParse(JSON.parse(json + decoder.decode()));
    if (parsed.success) {
      const verse = byId(parsed.data.verseId);
      if (verse) return { question: {
        ...parsed.data,
        selection: selectedText(verse, parsed.data.selection),
        recent: [...new Set(parsed.data.recent.filter(byId))],
      } };
    }
  } catch {
    void reader.cancel().catch(() => {});
  } finally {
    reader.releaseLock();
  }
  return { error: "invalid-question", status: 400 } as const;
}
