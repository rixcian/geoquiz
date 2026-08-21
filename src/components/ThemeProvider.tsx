"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "geoquiz.theme";

/**
 * Runs before first paint (injected in <head>) so the page never flashes the
 * wrong theme. Kept as a string constant so the inline script and the store
 * below cannot drift apart on the storage key.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})()`;

/* The DOM is the source of truth: the boot script has already applied the
 * class, so the store just reads it back. That keeps the toggle in sync with
 * whatever the script decided without a second resolution pass. */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function apply(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked; the choice still applies for this page view.
  }
  for (const l of listeners) l();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => apply(getSnapshot() === "dark" ? "light" : "dark"), []);
  return useMemo(() => ({ theme, toggle }), [theme, toggle]);
}
