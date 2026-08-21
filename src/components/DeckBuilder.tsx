"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, REGIONS } from "@/lib/taxonomy";
import type { Card, CategoryId, RegionId } from "@/lib/types";
import { partitionByDueness } from "@/lib/srs";
import { useProgress } from "@/lib/storage";
import { useNow } from "@/lib/useNow";
import { Pill } from "./Pill";

/**
 * The two filter axes are independent and both optional: an empty selection on
 * an axis means "all of it". That makes "bollards" and "everything in Latin
 * America" and "bollards in Latin America" the same interaction.
 */
export function DeckBuilder({ cards }: { cards: Card[] }) {
  const [categories, setCategories] = useState<CategoryId[]>([]);
  const [regions, setRegions] = useState<RegionId[]>([]);
  const { state } = useProgress();
  const now = useNow();

  const selected = useMemo(() => {
    const cats = categories.length ? new Set(categories) : null;
    const regs = regions.length ? new Set(regions) : null;
    return cards.filter((c) => (!cats || cats.has(c.category)) && (!regs || regs.has(c.region)));
  }, [cards, categories, regions]);

  const counts = useMemo(
    () => partitionByDueness(selected, state.cards, now),
    [selected, state.cards, now],
  );

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (categories.length) params.set("c", categories.join(","));
    if (regions.length) params.set("r", regions.join(","));
    const qs = params.toString();
    return qs ? `/study?${qs}` : "/study";
  }, [categories, regions]);

  const toggle = <T,>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const cardCountFor = (predicate: (c: Card) => boolean) => cards.filter(predicate).length;

  return (
    <div className="flex flex-col gap-8">
      <section className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Drill the metas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Pick a category, a region, or both. Leave an axis untouched to include all of it. Cards you miss come back
          sooner; cards you know keep stretching further out.
        </p>
      </section>

      <section className="animate-fade-up">
        <Heading label="Category" hint={categories.length ? `${categories.length} selected` : "all"} onClear={categories.length ? () => setCategories([]) : undefined} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const active = categories.includes(cat.id);
            const n = cardCountFor((c) => c.category === cat.id);
            if (n === 0) return null;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(categories, setCategories, cat.id)}
                className={`group flex flex-col gap-1 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-line bg-surface hover:border-line hover:bg-raised"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-base leading-none text-faint">
                    {cat.glyph}
                  </span>
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="ml-auto text-xs tabular-nums text-faint">{n}</span>
                </span>
                <span className="text-xs leading-snug text-muted">{cat.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="animate-fade-up">
        <Heading label="Region" hint={regions.length ? `${regions.length} selected` : "all"} onClear={regions.length ? () => setRegions([]) : undefined} />
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => {
            const active = regions.includes(region.id);
            const n = cardCountFor((c) => c.region === region.id);
            if (n === 0) return null;
            return (
              <button
                key={region.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(regions, setRegions, region.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  active ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                {region.name}
                <span className="ml-1.5 text-xs tabular-nums text-faint">{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="sticky bottom-4 animate-fade-up rounded-xl border border-line bg-surface/95 p-4 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tabular-nums">{selected.length}</span>
            <span className="text-xs text-faint">cards in deck</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill tone={counts.due.length ? "accent" : "neutral"}>{counts.due.length} due</Pill>
            <Pill>{counts.fresh.length} new</Pill>
            <Pill>{counts.later.length} scheduled</Pill>
          </div>

          <Link
            href={href}
            aria-disabled={selected.length === 0}
            className={`ml-auto rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
              selected.length === 0
                ? "pointer-events-none bg-raised text-faint"
                : "bg-accent text-accent-ink hover:opacity-90"
            }`}
          >
            Start drilling
          </Link>
        </div>
      </section>
    </div>
  );
}

function Heading({ label, hint, onClear }: { label: string; hint: string; onClear?: () => void }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">{label}</h2>
      <span className="text-xs text-faint">{hint}</span>
      {onClear ? (
        <button type="button" onClick={onClear} className="ml-auto text-xs text-accent hover:underline">
          Clear
        </button>
      ) : null}
    </div>
  );
}
