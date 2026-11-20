import Reader from "./reader";
import { byId } from "../lib/corpus";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ kural?: string | string[]; lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const id = typeof params.kural === "string" ? Number(params.kural) : 100;
  return <Reader initialId={byId(id)?.id ?? 100} initialLanguage={params.lang === "en" ? "en" : "ta"} />;
}
