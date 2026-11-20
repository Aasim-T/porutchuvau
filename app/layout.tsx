import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "பொருட்சுவடு · Porutchuvadu",
  description: "Study classical Tamil with bilingual explanations, source citations, and guided verse comparisons.",
  icons: { icon: "/porul.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ta"><body>{children}</body></html>;
}
