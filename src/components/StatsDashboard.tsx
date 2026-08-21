"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, REGIONS, categoryName, regionName, tintStyle } from "@/lib/taxonomy";
import type { Card, CategoryId } from "@/lib/types";
import { BOX_INTERVALS_DAYS, MAX_BOX, formatDue } from "@/lib/srs";
import { epochDay, useProgress } from "@/lib/storage";
import { useNow } from "@/lib/useNow";
import { CategoryIcon } from "./CategoryIcon";
import { Flag } from "./Flag";

export function StatsDashboard({ cards }: { cards: Card[] }) {
  const { state, resetAll } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const now = useNow();

  const seen = useMemo(() => cards.filter((c) => state.cards[c.id] !== undefined), [cards, state.cards]);

  const totals = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let due = 0;
    for (const card of cards) {
      const p = state.cards[card.id];
      if (!p) continue;
      correct += p.correct;
      wrong += p.wrong;
      if (p.due <= now) due += 1;
    }
    return { correct, wrong, due, reviews: correct + wrong };
  }, [cards, state.cards, now]);

  const boxes = useMemo(() => {
    const counts = Array.from({ length: MAX_BOX }, () => 0);
    for (const card of cards) {
      const p = state.cards[card.id];
      if (!p) continue;
      const i = Math.min(Math.max(p.box, 1), MAX_BOX) - 1;
      counts[i] = (counts[i] ?? 0) + 1;
    }
    return counts;
  }, [cards, state.cards]);

  const byCategory = useMemo(
    () => breakdown(cards, state.cards, (c) => c.category, CATEGORIES.map((c) => c.id), categoryName),
    [cards, state.cards],
  );
  const byRegion = useMemo(
    () => breakdown(cards, state.cards, (c) => c.region, REGIONS.map((r) => r.id), regionName),
    [cards, state.cards],
  );

  const weakest = useMemo(
    () =>
      cards
        .map((c) => ({ card: c, p: state.cards[c.id] }))
        .filter((x): x is { card: Card; p: NonNullable<typeof x.p> } => x.p !== undefined && x.p.wrong > 0)
        .sort((a, b) => {
          const ra = a.p.correct / (a.p.correct + a.p.wrong);
          const rb = b.p.correct / (b.p.correct + b.p.wrong);
          return ra - rb || b.p.wrong - a.p.wrong;
        })
        .slice(0, 8),
    [cards, state.cards],
  );

  const heat = useMemo(() => {
    const today = epochDay(now);
    const map = new Map(state.history.map((h) => [h.day, h.correct + h.wrong]));
    return Array.from({ length: 91 }, (_, i) => {
      const day = today - 90 + i;
      return { day, count: map.get(day) ?? 0 };
    });
  }, [state.history, now]);

  if (totals.reviews === 0) {
    return (
      <div className="mx-auto flex max-w-md animate-pop-in flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-7 shadow-xl shadow-black/20">
        <h1 className="font-display text-xl font-extrabold tracking-tight">No reviews yet</h1>
        <p className="text-sm leading-relaxed text-muted">
          Stats fill in once you have graded some cards. Everything is stored in this browser only.
        </p>
        <Link href="/" className="btn btn-brand mt-1 px-5 py-2.5 text-sm">
          Start drilling
        </Link>
      </div>
    );
  }

  const accuracy = Math.round((totals.correct / totals.reviews) * 100);
  const maxHeat = Math.max(1, ...heat.map((h) => h.count));

  return (
    <div className="flex flex-col gap-9">
      <div className="animate-rise">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Stats</h1>
        <p className="mt-2 text-sm text-muted">Stored in this browser only. Clearing site data clears this.</p>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${accuracy}%`} sub={`${totals.correct}/${totals.reviews} reviews`} tone="accent" />
        <Stat label="Cards seen" value={`${seen.length}`} sub={`of ${cards.length}`} />
        <Stat label="Due now" value={`${totals.due}`} sub={totals.due ? "ready to review" : "all caught up"} />
        <Stat label="Day streak" value={`${state.dayStreak}`} sub={state.dayStreak === 1 ? "day" : "days"} tone="gold" />
      </section>

      <section>
        <SectionHeading>Box distribution</SectionHeading>
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface/70 p-4">
          {boxes.map((count, i) => {
            const max = Math.max(1, ...boxes);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="font-display text-xs font-bold tabular-nums text-muted">{count}</span>
                <div className="flex w-full items-end" style={{ height: 96 }}>
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      count === 0 ? "bg-raised" : "bg-accent/75"
                    }`}
                    style={{ height: `${Math.max(5, (count / max) * 100)}%` }}
                  />
                </div>
                <span className="font-display text-[11px] font-bold text-faint">
                  {i + 1}
                  <span className="hidden font-medium opacity-70 sm:inline"> · {BOX_INTERVALS_DAYS[i]}d</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-faint">
          Box 1 repeats tomorrow, box 5 in two months. Cards drift right as you keep getting them.
        </p>
      </section>

      <section>
        <SectionHeading>Last 90 days</SectionHeading>
        <div className="flex flex-wrap gap-[3px] rounded-2xl border border-line bg-surface/70 p-4">
          {heat.map((h) => (
            <div
              key={h.day}
              title={`${h.count} review${h.count === 1 ? "" : "s"}`}
              className="h-3.5 w-3.5 rounded-[4px]"
              style={{
                backgroundColor:
                  h.count === 0 ? "rgb(var(--raised))" : `rgb(var(--accent) / ${0.3 + 0.7 * (h.count / maxHeat)})`,
              }}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <SectionHeading>By category</SectionHeading>
          <Breakdown rows={byCategory} withIcon />
        </section>
        <section>
          <SectionHeading>By region</SectionHeading>
          <Breakdown rows={byRegion} />
        </section>
      </div>

      {weakest.length > 0 ? (
        <section>
          <SectionHeading>Weakest cards</SectionHeading>
          <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-surface/70">
            {weakest.map(({ card, p }) => {
              const pct = Math.round((p.correct / (p.correct + p.wrong)) * 100);
              return (
                <li key={card.id} style={tintStyle(card.category)} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-tint/15 text-tint">
                    <CategoryIcon id={card.category} className="h-4 w-4" />
                  </span>
                  <Flag code={card.countryCode} />
                  <span className="min-w-0 flex-1 truncate font-medium">{card.country}</span>
                  <span className="hidden shrink-0 text-xs text-faint sm:inline">{formatDue(p.due, now)}</span>
                  <span
                    className={`w-11 shrink-0 text-right font-display font-bold tabular-nums ${
                      pct < 50 ? "text-bad" : "text-muted"
                    }`}
                  >
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface/70 p-4">
        <SectionHeading>Reset</SectionHeading>
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">Erase all progress, scheduling and history in this browser?</p>
            <button
              type="button"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
              }}
              className="btn btn-bad px-4 py-2 text-sm"
            >
              Yes, erase it
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="btn btn-ghost px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="btn btn-ghost px-4 py-2 text-sm">
            Reset all progress
          </button>
        )}
      </section>
    </div>
  );
}

interface Row {
  key: string;
  label: string;
  correct: number;
  wrong: number;
  total: number;
  seen: number;
}

function breakdown(
  cards: Card[],
  progress: Record<string, { correct: number; wrong: number } | undefined>,
  keyOf: (c: Card) => string,
  order: string[],
  label: (k: never) => string,
): Row[] {
  return order
    .map((key) => {
      const group = cards.filter((c) => keyOf(c) === key);
      let correct = 0;
      let wrong = 0;
      let seen = 0;
      for (const c of group) {
        const p = progress[c.id];
        if (!p) continue;
        seen += 1;
        correct += p.correct;
        wrong += p.wrong;
      }
      return { key, label: label(key as never), correct, wrong, total: group.length, seen };
    })
    .filter((r) => r.total > 0 && r.correct + r.wrong > 0)
    .sort((a, b) => a.correct / (a.correct + a.wrong) - b.correct / (b.correct + b.wrong));
}

function Breakdown({ rows, withIcon }: { rows: Row[]; withIcon?: boolean }) {
  if (rows.length === 0) {
    return <p className="text-sm text-faint">Nothing reviewed here yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const pct = Math.round((row.correct / (row.correct + row.wrong)) * 100);
        return (
          <li key={row.key} style={withIcon ? tintStyle(row.key as CategoryId) : undefined}>
            <div className="mb-1.5 flex items-center gap-2 text-sm">
              {withIcon ? (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-tint/15 text-tint">
                  <CategoryIcon id={row.key as CategoryId} className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <span className="truncate font-medium">{row.label}</span>
              <span className="ml-auto shrink-0 text-xs tabular-nums text-faint">
                {row.seen}/{row.total} seen
              </span>
              <span
                className={`w-10 shrink-0 text-right font-display font-bold tabular-nums ${
                  pct < 60 ? "text-bad" : "text-muted"
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct < 60 ? "bg-bad" : "bg-good"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "accent" | "gold";
}) {
  const valueClass = tone === "accent" ? "text-accent" : tone === "gold" ? "text-gold" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-surface/70 px-4 py-3.5">
      <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={`mt-1 font-display text-3xl font-extrabold tabular-nums leading-none ${valueClass}`}>{value}</div>
      <div className="mt-1.5 text-xs text-faint">{sub}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-faint">{children}</h2>;
}
