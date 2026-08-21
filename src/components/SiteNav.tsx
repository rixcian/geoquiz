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
    <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2.5">
          <Mark />
          <span className="font-display text-lg font-extrabold tracking-tight">
            Geo<span className="text-accent">Quiz</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 rounded-xl border border-line/70 bg-surface/60 p-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-accent text-accent-ink" : "text-muted hover:bg-raised hover:text-ink"
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
          className="ml-1 grid h-9 w-9 place-items-center rounded-xl border border-line/70 bg-surface/60 text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}

/** A globe reduced to a meridian and a parallel: the smallest readable mark. */
function Mark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-ink shadow-[0_3px_0_rgb(var(--accent-deep))]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" aria-hidden className="h-[18px] w-[18px]">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" />
        <path d="M12 3.5c2.6 2.5 2.6 14.5 0 17" />
        <path d="M12 3.5c-2.6 2.5-2.6 14.5 0 17" />
      </svg>
    </span>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="h-[18px] w-[18px]">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-[18px] w-[18px]">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}
