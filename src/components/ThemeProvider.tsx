"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "geoquiz.theme";

/**
 * Runs before first paint (injected in <head>) so the page never flashes the
 * wrong theme. Dark is the default when nothing is stored and the OS has no
 * preference -- the palette is designed dark-first.
 *
 * Both classes are written explicitly rather than toggling only `dark`,
 * because the light tokens live under `html.light`.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}var c=document.documentElement.classList;c.add(t);c.remove(t==="dark"?"light":"dark")}catch(e){document.documentElement.classList.add("dark")}})()`;

/* The DOM is the source of truth: the boot script has already applied the
 * class, so the store reads it back rather than resolving a second time. */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function apply(theme: Theme): void {
  const classes = document.documentElement.classList;
  classes.add(theme);
  classes.remove(theme === "dark" ? "light" : "dark");
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
