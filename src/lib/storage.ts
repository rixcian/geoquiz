"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { gradeCard, type CardProgress } from "./srs";

const STORAGE_KEY = "geoquiz.progress.v1";

export interface ReviewEvent {
  /** Epoch day number, so history stays compact over a year of use. */
  day: number;
  correct: number;
  wrong: number;
}

export interface ProgressState {
  version: 1;
  cards: Record<string, CardProgress>;
  history: ReviewEvent[];
  /** Epoch day of the last study session, used for the day streak. */
  lastStudiedDay: number | null;
  dayStreak: number;
}

export const EMPTY_PROGRESS: ProgressState = {
  version: 1,
  cards: {},
  history: [],
  lastStudiedDay: null,
  dayStreak: 0,
};

export function epochDay(ms: number): number {
  return Math.floor(ms / 86_400_000);
}

/* ------------------------------------------------------------------ *
 * External store
 *
 * localStorage is an external system, so it is exposed through
 * useSyncExternalStore rather than mirrored into component state inside an
 * effect. That keeps the server snapshot deterministic, avoids a render pass
 * with stale empty data, and means every hook instance in the tab sees the
 * same value without a manual broadcast list.
 * ------------------------------------------------------------------ */

let cache: ProgressState = EMPTY_PROGRESS;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): ProgressState {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_PROGRESS;
    const p = parsed as Partial<ProgressState>;
    if (p.version !== 1 || typeof p.cards !== "object" || p.cards === null) return EMPTY_PROGRESS;
    return {
      version: 1,
      cards: p.cards as Record<string, CardProgress>,
      history: Array.isArray(p.history) ? p.history : [],
      lastStudiedDay: typeof p.lastStudiedDay === "number" ? p.lastStudiedDay : null,
      dayStreak: typeof p.dayStreak === "number" ? p.dayStreak : 0,
    };
  } catch {
    // Corrupt payload. Start clean rather than crashing the app.
    return EMPTY_PROGRESS;
  }
}

/** Must return a referentially stable value when nothing changed. */
function getSnapshot(): ProgressState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, site-data restrictions). Treat as empty.
    return cache;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = parse(raw);
  }
  return cache;
}

function getServerSnapshot(): ProgressState {
  return EMPTY_PROGRESS;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // `storage` only fires for other tabs, which is exactly what it is for here;
  // same-tab writes notify through the listener set.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function persist(next: ProgressState): void {
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cacheRaw = raw;
  } catch {
    // Quota or blocked storage: keep the value in memory for this session.
    cacheRaw = null;
  }
  cache = next;
  for (const l of listeners) l();
}

export function readProgress(): ProgressState {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  return getSnapshot();
}

export function useProgress() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const record = useCallback((cardId: string, correct: boolean, now: number) => {
    const current = readProgress();
    const today = epochDay(now);

    const history = [...current.history];
    const last = history[history.length - 1];
    if (last && last.day === today) {
      history[history.length - 1] = {
        day: today,
        correct: last.correct + (correct ? 1 : 0),
        wrong: last.wrong + (correct ? 0 : 1),
      };
    } else {
      history.push({ day: today, correct: correct ? 1 : 0, wrong: correct ? 0 : 1 });
    }
    while (history.length > 365) history.shift();

    const streakContinues = current.lastStudiedDay === today - 1;
    const alreadyToday = current.lastStudiedDay === today;
    const dayStreak = alreadyToday ? current.dayStreak : streakContinues ? current.dayStreak + 1 : 1;

    persist({
      version: 1,
      cards: { ...current.cards, [cardId]: gradeCard(current.cards[cardId], correct, now) },
      history,
      lastStudiedDay: today,
      dayStreak,
    });
  }, []);

  const resetCard = useCallback((cardId: string) => {
    const current = readProgress();
    const cards = { ...current.cards };
    delete cards[cardId];
    persist({ ...current, cards });
  }, []);

  const resetAll = useCallback(() => persist(EMPTY_PROGRESS), []);

  return useMemo(() => ({ state, record, resetCard, resetAll }), [state, record, resetCard, resetAll]);
}

export { STORAGE_KEY };
