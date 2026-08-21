import type { Category, CategoryId, Region, RegionId } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "bollards",
    name: "Bollards",
    blurb: "Roadside marker posts. Shape, banding and reflector colour pin down a country faster than almost anything else.",
    glyph: "▮",
  },
  {
    id: "utility-poles",
    name: "Utility poles",
    blurb: "Material, cross-section and crossarm style. Wood, round concrete and square concrete split the world into big regions.",
    glyph: "╫",
  },
  {
    id: "road-lines",
    name: "Road lines",
    blurb: "Centre-line colour, edge lines and dash rhythm. The single highest-value glance on any road.",
    glyph: "═",
  },
  {
    id: "license-plates",
    name: "License plates",
    blurb: "Colour, aspect ratio, side strips and header bands. Readable even when blurred.",
    glyph: "▭",
  },
  {
    id: "road-signs",
    name: "Road signs",
    blurb: "Sign shapes, stop-sign wording, speed-limit style and chevron colours.",
    glyph: "⬠",
  },
  {
    id: "scripts",
    name: "Scripts & language",
    blurb: "Alphabets and the specific letters that separate neighbours using the same script.",
    glyph: "文",
  },
  {
    id: "google-car",
    name: "Google car",
    blurb: "The camera vehicle itself: colour, roof rack, snorkel mounts, antennas and blur.",
    glyph: "◍",
  },
  {
    id: "landscape",
    name: "Landscape & misc",
    blurb: "Driving side, sun position, domain suffixes, architecture and other broad tells.",
    glyph: "◈",
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
