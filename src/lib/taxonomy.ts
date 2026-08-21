import type { Category, CategoryId, Region, RegionId } from "./types";

/**
 * `hue` is a raw HSL hue. Saturation and lightness come from theme tokens, so
 * one number per category produces a tint that works in both light and dark
 * without maintaining two palettes.
 */
export const CATEGORIES: Category[] = [
  {
    id: "bollards",
    name: "Bollards",
    blurb: "Shape, banding and reflector colour. Pins a country faster than almost anything else on the road.",
    hue: 34,
  },
  {
    id: "utility-poles",
    name: "Utility poles",
    blurb: "Wood, round concrete or square concrete. Splits the world into big, confident regions.",
    hue: 205,
  },
  {
    id: "road-lines",
    name: "Road lines",
    blurb: "Centre-line colour, edge lines, dash rhythm. The single highest-value glance anywhere.",
    hue: 148,
  },
  {
    id: "license-plates",
    name: "License plates",
    blurb: "Colour, aspect ratio, side strips and header bands. Still readable when badly blurred.",
    hue: 276,
  },
  {
    id: "road-signs",
    name: "Road signs",
    blurb: "Sign shapes, stop-sign wording, speed-limit style and chevron colours.",
    hue: 6,
  },
  {
    id: "scripts",
    name: "Scripts & language",
    blurb: "Alphabets, and the specific letters that separate neighbours sharing one script.",
    hue: 178,
  },
  {
    id: "google-car",
    name: "Google car",
    blurb: "The camera vehicle: colour, roof rack, snorkel mounts, antennas and blur.",
    hue: 322,
  },
  {
    id: "landscape",
    name: "Landscape & misc",
    blurb: "Driving side, sun position, domain suffixes, architecture and other broad tells.",
    hue: 92,
  },
];

export const REGIONS: Region[] = [
  { id: "europe", name: "Europe" },
  { id: "north-america", name: "North America" },
  { id: "latin-america", name: "Latin America" },
  { id: "africa", name: "Africa" },
  { id: "middle-east", name: "Middle East" },
  { id: "central-asia", name: "Central Asia" },
  { id: "south-asia", name: "South Asia" },
  { id: "southeast-asia", name: "Southeast Asia" },
  { id: "east-asia", name: "East Asia" },
  { id: "oceania", name: "Oceania" },
];

const categoryById = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));
const regionById = new Map<RegionId, Region>(REGIONS.map((r) => [r.id, r]));

export function categoryName(id: CategoryId): string {
  return categoryById.get(id)?.name ?? id;
}

export function regionName(id: RegionId): string {
  return regionById.get(id)?.name ?? id;
}

export function getCategory(id: CategoryId): Category | undefined {
  return categoryById.get(id);
}

export function categoryHue(id: CategoryId): number {
  return categoryById.get(id)?.hue ?? 210;
}

/** Inline custom property that drives the `tint` colour for a subtree. */
export function tintStyle(id: CategoryId): React.CSSProperties {
  return { "--tint-h": `${categoryHue(id)}` } as React.CSSProperties;
}
