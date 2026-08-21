import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { THEME_BOOT_SCRIPT } from "@/components/ThemeProvider";

// Outfit carries the display weights (headings, scores, buttons); Jakarta does
// the reading. Both are geometric enough to feel playful without getting cute.
const display = Outfit({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GeoQuiz — drill the metas",
    template: "%s · GeoQuiz",
  },
  description:
    "Spaced-repetition drilling for GeoGuessr metas: bollards, utility poles, road lines, license plates and more, sliced by category or by region.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f21" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fc" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <div className="flex min-h-dvh flex-col">
          <SiteNav />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:px-6">{children}</main>
          <footer className="border-t border-line/60 px-4 py-8 text-xs leading-relaxed text-faint sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-col gap-1.5">
              <p>
                <span className="font-display font-bold text-muted">GeoQuiz</span> — spaced-repetition drilling for
                GeoGuessr metas. Progress lives in this browser only.
              </p>
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
