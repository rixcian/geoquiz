"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, REGIONS, tintStyle } from "@/lib/taxonomy";
import type { Card, CategoryId, RegionId } from "@/lib/types";
import { partitionByDueness } from "@/lib/srs";
import { useProgress } from "@/lib/storage";
import { useNow } from "@/lib/useNow";
import { CategoryIcon } from "./CategoryIcon";
import { HeroSpecimens } from "./HeroSpecimens";

/**
 * The two filter axes are independent and both optional: an empty selection on
 * an axis means "all of it". That makes "bollards", "everything in Latin
 * America" and "bollards in Latin America" the same interaction.
 */
export function DeckBuilder({ cards }: { cards: Card[] }) {
  const [categories, setCategories] = useState<CategoryId[]>([]);
  const [regions, setRegions] = useState<RegionId[]>([]);
  const { state } = useProgress();
  const now = useNow();

  // Three visually distinct art kinds, chosen by id so the hero always shows
  // a post, a plate and a road rather than three of the same thing.
  const showcase = useMemo(() => {
    const wanted = ["bollards-pl", "license-plates-nl", "road-lines-no"];
    const picked = wanted
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is Card => c !== undefined);
    return picked.length === wanted.length ? picked : cards.slice(0, 3);
  }, [cards]);

  const selected = useMemo(() => {
    const cats = categories.length ? new Set(categories) : null;
    const regs = regions.length ? new Set(regions) : null;
    return cards.filter((c) => (!cats || cats.has(c.category)) && (!regs || regs.has(c.region)));
  }, [cards, categories, regions]);

  const counts = useMemo(() => partitionByDueness(selected, state.cards, now), [selected, state.cards, now]);

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (categories.length) params.set("c", categories.join(","));
    if (regions.length) params.set("r", regions.join(","));
    const qs = params.toString();
    return qs ? `/study?${qs}` : "/study";
  }, [categories, regions]);

  const toggle = <T,>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const countBy = (predicate: (c: Card) => boolean) => cards.filter(predicate).length;
  const isFiltered = categories.length > 0 || regions.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex animate-rise items-center justify-between gap-8">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {cards.length} metas loaded
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Learn to read
            <br />
            <span className="text-accent">the road.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
            Pick a category, a region, or both — leave an axis untouched to include all of it. Miss a card and it comes
            back tomorrow. Know it, and it stretches further out each time.
          </p>
        </div>
        <HeroSpecimens cards={showcase} />
      </section>

      <section className="animate-rise">
        <Heading
          label="Category"
          hint={categories.length ? `${categories.length} selected` : "all"}
          onClear={categories.length ? () => setCategories([]) : undefined}
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const active = categories.includes(cat.id);
            const n = countBy((c) => c.category === cat.id);
            if (n === 0) return null;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                style={tintStyle(cat.id)}
                onClick={() => toggle(categories, setCategories, cat.id)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-150 active:translate-y-[2px] ${
                  active
                    ? "border-tint/60 bg-tint/[0.10] shadow-[0_3px_0_hsl(var(--tint-h)_var(--tint-s)_var(--tint-l)_/_0.35)]"
                    : "border-line/80 bg-surface/70 hover:border-tint/40 hover:bg-raised/60"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
                      active ? "bg-tint/20 text-tint" : "bg-raised text-muted group-hover:text-tint"
                    }`}
                  >
                    <CategoryIcon id={cat.id} />
                  </span>
                  <span className="font-display text-[15px] font-bold tracking-tight">{cat.name}</span>
                  <span
                    className={`ml-auto rounded-lg px-1.5 py-0.5 font-display text-xs font-bold tabular-nums ${
                      active ? "bg-tint/20 text-tint" : "text-faint"
                    }`}
                  >
                    {n}
                  </span>
                </span>
                <span className="mt-2.5 block text-[13px] leading-snug text-muted">{cat.blurb}</span>

                {active ? <span className="absolute inset-x-0 top-0 h-[3px] bg-tint" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="animate-rise pb-16 sm:pb-8">
        <Heading
          label="Region"
          hint={regions.length ? `${regions.length} selected` : "all"}
          onClear={regions.length ? () => setRegions([]) : undefined}
        />
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => {
            const active = regions.includes(region.id);
            const n = countBy((c) => c.region === region.id);
            if (n === 0) return null;
            return (
              <button
                key={region.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(regions, setRegions, region.id)}
                className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-150 active:translate-y-[2px] ${
                  active
                    ? "border-accent/60 bg-accent/12 text-accent shadow-[0_3px_0_rgb(var(--accent-deep)/0.4)]"
                    : "border-line/80 bg-surface/70 text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                {region.name}
                <span className="ml-1.5 text-xs font-bold tabular-nums opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="sticky bottom-4 z-20 animate-rise rounded-2xl border border-line bg-surface/95 p-3.5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-extrabold tabular-nums leading-none">{selected.length}</span>
            <span className="text-xs font-medium text-faint">
              card{selected.length === 1 ? "" : "s"}
              {isFiltered ? " selected" : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Chip value={counts.due.length} label="due" tone={counts.due.length ? "accent" : "flat"} />
            <Chip value={counts.fresh.length} label="new" tone="flat" />
            <Chip value={counts.later.length} label="scheduled" tone="flat" />
          </div>

          <Link
            href={href}
            aria-disabled={selected.length === 0}
            className={`btn ml-auto w-full px-6 py-3 text-base sm:w-auto ${
              selected.length === 0 ? "pointer-events-none bg-raised text-faint" : "btn-accent"
            }`}
          >
            Start drilling
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Chip({ value, label, tone }: { value: number; label: string; tone: "accent" | "flat" }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
        tone === "accent" ? "bg-accent/15 text-accent" : "bg-raised/70 text-faint"
      }`}
    >
      <span className="font-display text-sm font-bold tabular-nums">{value}</span>
      {label}
    </span>
  );
}

function Heading({ label, hint, onClear }: { label: string; hint: string; onClear?: () => void }) {
  return (
    <div className="mb-3.5 flex items-baseline gap-2">
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-faint">{label}</h2>
      <span className="text-xs text-faint/70">{hint}</span>
      {onClear ? (
        <button type="button" onClick={onClear} className="ml-auto text-xs font-semibold text-accent hover:underline">
          Clear
        </button>
      ) : null}
    </div>
  );
}
