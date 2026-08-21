"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORY_IDS, REGION_IDS, type Card, type CategoryId, type RegionId } from "@/lib/types";
import { categoryName, regionName, tintStyle } from "@/lib/taxonomy";
import { buildQueue, describeInterval, gradeCard, type CardProgress } from "@/lib/srs";
import { useProgress } from "@/lib/storage";
import { useNow } from "@/lib/useNow";
import { CardFace } from "./CardFace";
import { CategoryIcon } from "./CategoryIcon";
import { Flag } from "./Flag";

/**
 * A session freezes the inputs the queue is built from -- the filtered cards,
 * the progress snapshot and the clock -- at the moment it starts. Grading must
 * not reorder the deck underneath the user, so nothing downstream of a review
 * feeds back into queue construction.
 */
interface Session {
  key: string;
  progress: Record<string, CardProgress>;
  startedAt: number;
}

export function StudySession({ cards }: { cards: Card[] }) {
  const params = useSearchParams();
  const { state, record } = useProgress();
  const now = useNow();

  const [studyAhead, setStudyAhead] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [streak, setStreak] = useState(0);
  /** Bumped on every grade so the score chips can replay their pop animation. */
  const [pulse, setPulse] = useState(0);

  const filterKey = `${params.get("c") ?? ""}|${params.get("r") ?? ""}`;

  const filtered = useMemo(() => {
    const cats = parseList(params.get("c"), CATEGORY_IDS) as CategoryId[];
    const regs = parseList(params.get("r"), REGION_IDS) as RegionId[];
    const catSet = cats.length ? new Set(cats) : null;
    const regSet = regs.length ? new Set(regs) : null;
    return cards.filter((c) => (!catSet || catSet.has(c.category)) && (!regSet || regSet.has(c.region)));
  }, [cards, params]);

  const sessionKey = `${filterKey}|${studyAhead}|${restarts}`;

  // Adjusting state during render when the session identity changes. React's
  // documented pattern for deriving state from changing props, and it keeps
  // the frozen snapshot in sync without an effect round-trip.
  const [session, setSession] = useState<Session | null>(null);
  if (session === null || session.key !== sessionKey) {
    setSession({ key: sessionKey, progress: state.cards, startedAt: now });
    setIndex(0);
    setFlipped(false);
    setTally({ correct: 0, wrong: 0 });
    setStreak(0);
  }

  const queue = useMemo(() => {
    if (!session) return [];
    return buildQueue(filtered, session.progress, session.startedAt, {
      includeNotDue: studyAhead,
      shuffle: seededShuffle(session.key + session.startedAt),
    });
  }, [filtered, session, studyAhead]);

  const current = queue[index];

  const grade = useCallback(
    (correct: boolean) => {
      if (!current) return;
      record(current.id, correct, Date.now());
      setTally((t) => ({ correct: t.correct + (correct ? 1 : 0), wrong: t.wrong + (correct ? 0 : 1) }));
      setStreak((s) => (correct ? s + 1 : 0));
      setPulse((p) => p + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [current, record],
  );

  // Light keyboard support: enough that a long session does not need the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (!current) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
      } else if (flipped && (e.key === "1" || e.key === "2")) {
        e.preventDefault();
        grade(e.key === "2");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, grade]);

  if (filtered.length === 0) {
    return (
      <Empty title="Nothing in this deck">
        <p>That combination of filters has no cards yet.</p>
        <Link href="/" className="btn btn-brand mt-1 px-5 py-2.5 text-sm">
          Back to the deck builder
        </Link>
      </Empty>
    );
  }

  if (queue.length === 0) {
    return (
      <Empty title="All caught up" glyph="✓">
        <p>Every card in this deck is scheduled for a later date. That is the system working.</p>
        <div className="flex flex-wrap gap-2.5 pt-1">
          <button type="button" onClick={() => setStudyAhead(true)} className="btn btn-brand px-5 py-2.5 text-sm">
            Study ahead anyway
          </button>
          <Link href="/stats" className="btn btn-ghost px-5 py-2.5 text-sm">
            See stats
          </Link>
        </div>
      </Empty>
    );
  }

  if (!current) {
    return (
      <SessionSummary
        correct={tally.correct}
        wrong={tally.wrong}
        onAgain={() => setRestarts((n) => n + 1)}
      />
    );
  }

  const progressPct = Math.round((index / queue.length) * 100);
  const currentProgress = state.cards[current.id];
  const box = currentProgress?.box ?? 1;
  const nextBox = gradeCard(currentProgress, true, session?.startedAt ?? now).box;

  return (
    <div className="flex flex-col gap-4" style={tintStyle(current.category)}>
      {/* Round bar: where you are, how you are doing, current streak. */}
      <div className="flex items-center gap-3">
        <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-faint">
          Round <span className="text-ink tabular-nums">{index + 1}</span>
          <span className="text-faint/60"> / {queue.length}</span>
        </span>

        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {streak >= 2 ? (
          <span
            key={`streak-${pulse}`}
            className="inline-flex animate-score-pop items-center gap-1 rounded-lg bg-gold/15 px-2 py-1 font-display text-xs font-bold text-gold"
          >
            <FlameIcon />
            {streak}
          </span>
        ) : null}

        <span key={`good-${pulse}`} className="inline-block animate-score-pop font-display text-sm font-bold tabular-nums text-good">
          {tally.correct}
        </span>
        <span key={`bad-${pulse}`} className="inline-block animate-score-pop font-display text-sm font-bold tabular-nums text-bad">
          {tally.wrong}
        </span>
      </div>

      <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 border-b border-line/70 px-4 py-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-tint/15 text-tint">
            <CategoryIcon id={current.category} className="h-[17px] w-[17px]" />
          </span>
          <span className="truncate font-display text-sm font-bold tracking-tight">
            {categoryName(current.category)}
          </span>

          {/* Region is withheld until the reveal: naming it up front would
              narrow the answer to a handful of countries. */}
          {flipped ? (
            <span className="animate-rise shrink-0 whitespace-nowrap rounded-full border border-line bg-raised/70 px-2.5 py-0.5 text-[11px] font-semibold text-muted">
              {regionName(current.region)}
            </span>
          ) : null}
          {flipped && current.provenance === "seed" ? (
            <span className="animate-rise hidden shrink-0 rounded-full border border-gold/40 bg-gold/12 px-2.5 py-0.5 text-[11px] font-semibold text-gold sm:inline">
              seed
            </span>
          ) : null}

          <BoxMeter box={box} />
        </div>

        <div className="art-stage flex min-h-[300px] items-center justify-center sm:min-h-[380px]">
          <CardFace card={current} priority={index === 0} />
        </div>

        {flipped ? (
          <div key={current.id} className="animate-pop-in border-t border-line/70 px-4 py-4 sm:px-5 sm:py-5">
            <h2 className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight">
              <Flag code={current.countryCode} className="text-2xl" />
              {current.country}
            </h2>
            <p className="mt-2.5 text-[15px] font-semibold leading-relaxed text-ink">{current.tell}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{current.detail}</p>
            {current.lookalikes?.length ? (
              <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
                  Watch for
                </span>
                {current.lookalikes.map((name) => (
                  <span key={name} className="rounded-md bg-raised/80 px-2 py-0.5 text-[11px] font-medium text-muted">
                    {name}
                  </span>
                ))}
              </div>
            ) : null}
            {current.source ? (
              <a
                href={current.source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
              >
                {current.source.label} ↗
              </a>
            ) : null}
          </div>
        ) : (
          <div className="border-t border-line/70 px-4 py-4 text-sm font-medium text-faint sm:px-5">
            Which country — and what gave it away?
          </div>
        )}
      </article>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => grade(false)} className="btn btn-bad flex-col gap-0.5 px-4 py-3.5">
            <span className="text-[15px]">Missed it</span>
            <span className="text-[11px] font-medium opacity-70">back to box 1</span>
          </button>
          <button type="button" onClick={() => grade(true)} className="btn btn-good flex-col gap-0.5 px-4 py-3.5">
            <span className="text-[15px]">Got it</span>
            <span className="text-[11px] font-medium opacity-70">{describeInterval(nextBox)}</span>
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setFlipped(true)} className="btn btn-brand px-4 py-4 text-base">
          Reveal answer
        </button>
      )}

      <p className="text-center text-xs text-faint">
        <Key>Space</Key> reveal <span className="mx-1 opacity-40">·</span> <Key>1</Key> missed{" "}
        <span className="mx-1 opacity-40">·</span> <Key>2</Key> got it
      </p>
    </div>
  );
}

/** Five pips showing how far up the Leitner ladder this card has climbed. */
function BoxMeter({ box }: { box: number }) {
  return (
    <span className="ml-auto hidden shrink-0 items-center gap-2 xs:flex" title={`Leitner box ${box} of 5`}>
      <span className="hidden font-display text-[10px] font-bold uppercase tracking-[0.14em] text-faint sm:inline">
        box
      </span>
      <span className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-3 rounded-full transition-colors ${i <= box ? "bg-accent" : "bg-raised"}`}
          />
        ))}
      </span>
    </span>
  );
}

function SessionSummary({ correct, wrong, onAgain }: { correct: number; wrong: number; onAgain: () => void }) {
  const total = correct + wrong;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const verdict = pct >= 90 ? "Sharp." : pct >= 70 ? "Solid round." : pct >= 40 ? "Getting there." : "Plenty to learn.";

  return (
    <div className="mx-auto flex max-w-md animate-pop-in flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-7 text-center shadow-2xl shadow-black/25">
      <div className="relative grid h-32 w-32 place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(var(--raised))" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
          />
        </svg>
        <span className="font-display text-4xl font-extrabold tabular-nums">{pct}%</span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{verdict}</h1>
        <p className="mt-1.5 text-sm text-muted">
          <span className="font-display font-bold text-good tabular-nums">{correct}</span> right,{" "}
          <span className="font-display font-bold text-bad tabular-nums">{wrong}</span> missed. Misses drop to box 1 and
          resurface tomorrow.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2.5 sm:flex-row">
        <button type="button" onClick={onAgain} className="btn btn-brand flex-1 px-5 py-3 text-sm">
          Go again
        </button>
        <Link href="/" className="btn btn-ghost flex-1 px-5 py-3 text-sm">
          New deck
        </Link>
        <Link href="/stats" className="btn btn-ghost flex-1 px-5 py-3 text-sm">
          Stats
        </Link>
      </div>
    </div>
  );
}

function Empty({ title, glyph, children }: { title: string; glyph?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md animate-pop-in flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/20">
      {glyph ? (
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 font-display text-xl font-bold text-accent">
          {glyph}
        </span>
      ) : null}
      <h1 className="font-display text-xl font-extrabold tracking-tight">{title}</h1>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-line bg-raised/70 px-1.5 py-0.5 font-display text-[10px] font-bold text-muted">
      {children}
    </kbd>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
      <path d="M12 2c.6 3.2-1.3 4.6-2.7 6C7.6 9.6 6 11.2 6 14a6 6 0 0 0 12 0c0-2.4-1-4-2.2-5.6-.5 1-1.2 1.7-2 2 .5-3.4-1-6.2-1.8-8.4z" />
    </svg>
  );
}

function parseList(raw: string | null, allowed: readonly string[]): string[] {
  if (!raw) return [];
  const set = new Set(allowed);
  return raw.split(",").filter((v) => set.has(v));
}

/**
 * Fisher-Yates driven by a seeded PRNG rather than Math.random, so shuffling
 * stays a pure function of the session. Two renders of the same session
 * produce the same order; a new session produces a different one.
 */
function seededShuffle(seed: string): <T>(items: T[]) => T[] {
  return <T,>(items: T[]): T[] => {
    const rand = mulberry32(hashString(seed));
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
