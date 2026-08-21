"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const LINKS = [
  { href: "/", label: "Drill" },
  { href: "/browse", label: "Browse" },
  { href: "/stats", label: "Stats" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight">GeoQuiz</span>
          <span className="hidden text-xs text-faint sm:inline">meta drills</span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-raised font-medium text-ink" : "text-muted hover:bg-raised/60 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="ml-1 rounded-md border border-line px-2 py-1.5 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </div>
    </header>
  );
}
