"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 60_000;

/**
 * The wall clock as an external store.
 *
 * Card due-ness changes on the scale of days, so a per-minute snapshot is
 * plenty, and bucketing to the minute keeps the snapshot referentially stable
 * between ticks. Reading the clock this way rather than calling Date.now()
 * during render keeps components pure and gives SSR a deterministic value.
 */
function subscribe(onChange: () => void): () => void {
  const id = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(id);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / TICK_MS);
}

/** 0 on the server, so server-rendered output never depends on the clock. */
function getServerSnapshot(): number {
  return 0;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) * TICK_MS;
}
