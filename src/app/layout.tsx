import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { THEME_BOOT_SCRIPT } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "GeoQuiz",
    template: "%s · GeoQuiz",
  },
  description:
    "Drill GeoGuessr metas as spaced-repetition flashcards: bollards, utility poles, road lines, license plates and more, sliced by category or by region.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#101113" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="flex min-h-dvh flex-col">
          <SiteNav />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-6 sm:px-6">{children}</main>
          <footer className="border-t border-line/70 px-4 py-6 text-xs text-faint sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-col gap-1">
              <p>GeoQuiz — spaced-repetition drilling for GeoGuessr metas. Progress is stored in this browser only.</p>
              <p>
                Seed content is written from general knowledge and is a starting point, not a verified reference. Run
                the scraper or edit the JSON to replace it.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
