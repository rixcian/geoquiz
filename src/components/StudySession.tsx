"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORY_IDS, REGION_IDS, type Card, type CategoryId, type RegionId } from "@/lib/types";
import { categoryName, regionName } from "@/lib/taxonomy";
import { buildQueue, describeInterval, gradeCard, type CardProgress } from "@/lib/srs";
import { useProgress } from "@/lib/storage";
import { useNow } from "@/lib/useNow";
import { CardFace } from "./CardFace";
import { Flag } from "./Flag";
import { Pill } from "./Pill";

/**
 * A session freezes the inputs the queue is built from -- the filtered cards,
 * the progress snapshot and the clock -- at the moment it starts. Grading a
 * card must not reorder the deck underneath the user, so nothing downstream of
 * a review feeds back into queue construction.
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

  const filterKey = `${params.get("c") ?? ""}|${params.get("r") ?? ""}`;

  const filtered = useMemo(() => {
    const cats = parseList(params.get("c"), CATEGORY_IDS) as CategoryId[];
    const regs = parseList(params.get("r"), REGION_IDS) as RegionId[];
    const catSet = cats.length ? new Set(cats) : null;
    const regSet = regs.length ? new Set(regs) : null;
    return cards.filter((c) => (!catSet || catSet.has(c.category)) && (!regSet || regSet.has(c.region)));
  }, [cards, params]);

  const sessionKey = `${filterKey}|${studyAhead}|${restarts}`;

  // Adjusting state during render when the identity of the session changes.
  // This is React's documented pattern for deriving state from changing props,
  // and it keeps the frozen snapshot in sync without an effect round-trip.
  const [session, setSession] = useState<Session | null>(null);
  if (session === null || session.key !== sessionKey) {
    setSession({ key: sessionKey, progress: state.cards, startedAt: now });
    setIndex(0);
    setFlipped(false);
    setTally({ correct: 0, wrong: 0 });
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
        <Link href="/" className="text-accent hover:underline">
          Back to the deck builder
        </Link>
      </Empty>
    );
  }

  if (queue.length === 0) {
    return (
      <Empty title="Nothing due right now">
        <p>Every card in this deck is scheduled for a later date. That is the system working.</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={() => setStudyAhead(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
          >
            Study ahead anyway
          </button>
          <Link href="/stats" className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-raised">
            See stats
          </Link>
        </div>
      </Empty>
    );
  }

  if (!current) {
    const total = tally.correct + tally.wrong;
    const pct = total ? Math.round((tally.correct / total) * 100) : 0;
    return (
      <Empty title="Session complete">
        <p className="text-base text-ink">
          <span className="font-semibold tabular-nums">{tally.correct}</span> of{" "}
          <span className="font-semibold tabular-nums">{total}</span> ({pct}%)
        </p>
        <p>Missed cards dropped back to box 1 and will resurface tomorrow.</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={() => setRestarts((n) => n + 1)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
          >
            Go again
          </button>
          <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-raised">
            Build another deck
          </Link>
          <Link href="/stats" className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-raised">
            See stats
          </Link>
        </div>
      </Empty>
    );
  }

  const progressPct = Math.round((index / queue.length) * 100);
  const currentProgress = state.cards[current.id];
  const nextBox = gradeCard(currentProgress, true, session?.startedAt ?? now).box;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs text-faint">
        <span className="tabular-nums">
          {index + 1} / {queue.length}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="tabular-nums text-good">{tally.correct}</span>
        <span className="tabular-nums text-bad">{tally.wrong}</span>
      </div>

      <article className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Pill tone="accent">{categoryName(current.category)}</Pill>
          {/* Region is withheld until the reveal: naming it up front would
              narrow the answer to a handful of countries. */}
          {flipped ? <Pill>{regionName(current.region)}</Pill> : null}
          {flipped && current.provenance === "seed" ? <Pill tone="warn">seed</Pill> : null}
          <span className="ml-auto shrink-0 text-xs text-faint">box {currentProgress?.box ?? 1}/5</span>
        </div>

        <div className="flex min-h-[320px] items-center justify-center bg-raised/40 sm:min-h-[380px]">
          <CardFace card={current} priority={index === 0} />
        </div>

        {flipped ? (
          <div className="animate-fade-up border-t border-line px-4 py-4 sm:px-5">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Flag code={current.countryCode} className="text-2xl" />
              {current.country}
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-ink">{current.tell}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{current.detail}</p>
            {current.lookalikes?.length ? (
              <p className="mt-3 text-xs text-faint">
                <span className="font-medium uppercase tracking-wider">Confusable with</span>{" "}
                {current.lookalikes.join(" · ")}
              </p>
            ) : null}
            {current.source ? (
              <a
                href={current.source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-block text-xs text-accent hover:underline"
              >
                {current.source.label} ↗
              </a>
            ) : null}
          </div>
        ) : (
          <div className="border-t border-line px-4 py-4 text-sm text-faint sm:px-5">
            Which country, and what gave it away?
          </div>
        )}
      </article>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => grade(false)}
            className="rounded-lg border border-bad/50 bg-bad/10 px-4 py-3 text-sm font-medium text-bad transition-colors hover:bg-bad/20"
          >
            Missed it
            <span className="ml-1.5 hidden text-xs opacity-70 sm:inline">— back to box 1</span>
          </button>
          <button
            type="button"
            onClick={() => grade(true)}
            className="rounded-lg border border-good/50 bg-good/10 px-4 py-3 text-sm font-medium text-good transition-colors hover:bg-good/20"
          >
            Got it
            <span className="ml-1.5 hidden text-xs opacity-70 sm:inline">— {describeInterval(nextBox)}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          Reveal answer
        </button>
      )}

      <p className="text-center text-xs text-faint">Space to reveal · 1 missed · 2 got it</p>
    </div>
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="flex flex-col gap-2 text-sm text-muted">{children}</div>
    </div>
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
