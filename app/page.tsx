import Reader from "./reader";
import { getChatGPTUser } from "./chatgpt-auth";
import { byId } from "../lib/corpus";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ kural?: string | string[]; lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const id = typeof params.kural === "string" ? Number(params.kural) : 100;
  const hasServerAnswers = Boolean(process.env.OPENAI_API_KEY && await getChatGPTUser());
  return (
    <Reader
      initialId={byId(id)?.id ?? 100}
      initialLanguage={params.lang === "en" ? "en" : "ta"}
      hasServerAnswers={hasServerAnswers}
    />
  );
}
