"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, REGIONS, categoryName, regionName } from "@/lib/taxonomy";
import type { Card } from "@/lib/types";
import { CardFace } from "./CardFace";
import { Flag } from "./Flag";
import { Pill } from "./Pill";

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Browse</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Every meta in the deck, with its tell and its lookalikes. Read before you drill.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries, tells, categories…"
          aria-label="Search cards"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <div className="flex rounded-lg border border-line p-0.5">
          {(["category", "region"] as GroupBy[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              aria-pressed={groupBy === g}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                groupBy === g ? "bg-raised font-medium text-ink" : "text-muted hover:text-ink"
              }`}
            >
              by {g}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted">
          Nothing matches “{query}”.
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h2 className="flex items-baseline gap-2 border-b border-line pb-2 text-sm font-semibold uppercase tracking-wider text-faint">
            {group.label}
            <span className="text-xs font-normal tabular-nums">{group.items.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.items.map((card) => (
              <article key={card.id} className="flex gap-3 overflow-hidden rounded-xl border border-line bg-surface p-3">
                <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-raised/50">
                  <CardFace card={card} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Flag code={card.countryCode} />
                    <span className="truncate">{card.country}</span>
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink">{card.tell}</p>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">{card.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Pill>{groupBy === "category" ? regionName(card.region) : categoryName(card.category)}</Pill>
                    {card.provenance === "seed" ? <Pill tone="warn">seed</Pill> : null}
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
