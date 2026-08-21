"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, REGIONS, categoryName, regionName, tintStyle } from "@/lib/taxonomy";
import type { Card, CategoryId } from "@/lib/types";
import { CardFace } from "./CardFace";
import { CategoryIcon } from "./CategoryIcon";
import { Flag } from "./Flag";

type GroupBy = "category" | "region";

/** Reference mode: no grading, no scheduling, just the material laid out. */
export function BrowseLibrary({ cards }: { cards: Card[] }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [query, setQuery] = useState("");

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) =>
      [c.country, c.tell, c.detail, categoryName(c.category), regionName(c.region), ...(c.lookalikes ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [cards, query]);

  const groups = useMemo(() => {
    const order = groupBy === "category" ? CATEGORIES.map((c) => c.id) : REGIONS.map((r) => r.id);
    const label = groupBy === "category" ? categoryName : regionName;
    return order
      .map((key) => ({
        key,
        label: label(key as never),
        items: matched.filter((c) => (groupBy === "category" ? c.category : c.region) === key),
      }))
      .filter((g) => g.items.length > 0);
  }, [matched, groupBy]);

  return (
    <div className="flex flex-col gap-7">
      <div className="animate-rise">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Browse</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
          Every meta in the deck with its tell and its lookalikes. Read before you drill.
        </p>
      </div>

      <div className="sticky top-[65px] z-10 -mx-1 flex flex-wrap items-center gap-2.5 bg-canvas/85 px-1 py-2 backdrop-blur-xl">
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries, tells, categories…"
            aria-label="Search cards"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3.5 text-sm font-medium placeholder:font-normal placeholder:text-faint focus:border-info focus:outline-none focus:ring-2 focus:ring-info/30"
          />
        </div>
        <div className="flex rounded-xl border border-line bg-surface p-1">
          {(["category", "region"] as GroupBy[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              aria-pressed={groupBy === g}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                groupBy === g ? "bg-brand text-white" : "text-muted hover:text-ink"
              }`}
            >
              by {g}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
          Nothing matches “{query}”.
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 border-b border-line/70 pb-2.5">
            {groupBy === "category" ? (
              <span style={tintStyle(group.key as CategoryId)} className="grid h-7 w-7 place-items-center rounded-lg bg-tint/15 text-tint">
                <CategoryIcon id={group.key as CategoryId} className="h-[17px] w-[17px]" />
              </span>
            ) : null}
            <span className="font-display text-sm font-bold uppercase tracking-[0.14em]">{group.label}</span>
            <span className="rounded-md bg-raised/70 px-1.5 py-0.5 font-display text-[11px] font-bold tabular-nums text-faint">
              {group.items.length}
            </span>
          </h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.items.map((card) => (
              <article
                key={card.id}
                style={tintStyle(card.category)}
                className="flex gap-3.5 overflow-hidden rounded-2xl border border-line bg-surface/80 p-3 transition-colors hover:border-tint/40"
              >
                <div className="art-stage relative h-32 w-24 shrink-0 overflow-hidden rounded-xl">
                  <CardFace card={card} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight">
                    <Flag code={card.countryCode} />
                    <span className="truncate">{card.country}</span>
                  </h3>
                  <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink">{card.tell}</p>
                  <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-muted">{card.detail}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-raised/80 px-2 py-0.5 text-[11px] font-semibold text-muted">
                      {groupBy === "category" ? regionName(card.region) : categoryName(card.category)}
                    </span>
                    {card.provenance === "seed" ? (
                      <span className="rounded-md bg-gold/12 px-2 py-0.5 text-[11px] font-semibold text-gold">seed</span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
