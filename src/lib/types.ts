/**
 * Content model.
 *
 * A card is tagged on two independent axes -- `category` (what kind of meta it
 * is) and `region`/`country` (where it points) -- so a deck can be built from
 * either or both: "bollards", "everything in Latin America", "plates in Europe".
 */

export const CATEGORY_IDS = [
  "bollards",
  "utility-poles",
  "road-lines",
  "license-plates",
  "road-signs",
  "scripts",
  "google-car",
  "landscape",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const REGION_IDS = [
  "europe",
  "north-america",
  "latin-america",
  "africa",
  "middle-east",
  "central-asia",
  "south-asia",
  "southeast-asia",
  "east-asia",
  "oceania",
] as const;

export type RegionId = (typeof REGION_IDS)[number];

export interface Category {
  id: CategoryId;
  name: string;
  blurb: string;
  glyph: string;
}

export interface Region {
  id: RegionId;
  name: string;
}

/** Where a card's facts came from. Surfaced in the UI so seed guesses are not
 *  mistaken for verified reference material. */
export type Provenance = "seed" | "plonkit" | "manual";

export interface CardImage {
  src: string;
  alt: string;
  credit?: string;
  creditUrl?: string;
}

/* ------------------------------------------------------------------ *
 * Schematic art
 *
 * Every card renders without a photo. `art` is a small declarative
 * description that <Schematic /> draws as SVG, so the app is usable before a
 * single image has been downloaded, and stays usable for metas where no
 * suitable freely-usable photo exists.
 * ------------------------------------------------------------------ */

export interface BollardArt {
  kind: "bollard";
  shape: "flat" | "domed" | "slanted" | "square" | "tapered";
  body: string;
  /** Bands are placed as percentages of post height, measured from the top. */
  bands?: { color: string; top: number; height: number }[];
  reflector?: { color: string; shape: "rect" | "circle" | "strip"; top: number };
}

export interface PlateArt {
  kind: "plate";
  bg: string;
  fg: string;
  text: string;
  leftStrip?: { color: string; text?: string; textColor?: string };
  rightStrip?: { color: string; text?: string; textColor?: string };
  topBand?: { color: string; text: string; textColor: string };
  border?: string;
  ratio?: "eu" | "us" | "jp";
}

export interface RoadLineArt {
  kind: "roadline";
  surface: string;
  edge: { color: string; style: "solid" | "dashed" | "double" | "none" };
  center: { color: string; style: "solid" | "dashed" | "double" | "none" };
}

export interface PoleArt {
  kind: "pole";
  material: string;
  profile: "round" | "square" | "tapered" | "lattice" | "a-frame";
  crossarms: number;
  arm: string;
}

export interface GlyphArt {
  kind: "glyph";
  glyph: string;
  bg: string;
  fg: string;
  shape?: "circle" | "square" | "diamond" | "triangle" | "octagon";
  note?: string;
}

export type Art = BollardArt | PlateArt | RoadLineArt | PoleArt | GlyphArt;

export interface Card {
  /** Stable slug, e.g. "bollards-pl". Used as the SRS key, so never reuse. */
  id: string;
  category: CategoryId;
  region: RegionId;
  /** Answer text. Usually one country, but may name a group ("Kenya / Nigeria
   *  / Senegal") for metas that genuinely cover several. */
  country: string;
  /** ISO 3166-1 alpha-2, lowercase. Omitted for multi-country cards. */
  countryCode?: string;
  /** The one-line giveaway -- what you should have spotted. */
  tell: string;
  /** The longer "why", shown under the tell on the back of the card. */
  detail: string;
  /** Countries this is commonly confused with. */
  lookalikes?: string[];
  art: Art;
  image?: CardImage;
  provenance: Provenance;
  source?: { label: string; url: string };
}
