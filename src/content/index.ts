import { CATEGORY_IDS, REGION_IDS, type Card, type CategoryId, type RegionId } from "@/lib/types";

import bollards from "./seed/bollards.json";
import googleCar from "./seed/google-car.json";
import landscape from "./seed/landscape.json";
import licensePlates from "./seed/license-plates.json";
import roadLines from "./seed/road-lines.json";
import roadSigns from "./seed/road-signs.json";
import scripts from "./seed/scripts.json";
import utilityPoles from "./seed/utility-poles.json";

/**
 * Scraped content is produced by `pnpm scrape`. It takes precedence over a
 * seed card sharing the same id, so running the scraper upgrades cards in
 * place rather than duplicating them.
 */
import { SCRAPED_CARDS } from "./scraped";

const CATEGORY_SET = new Set<string>(CATEGORY_IDS);
const REGION_SET = new Set<string>(REGION_IDS);

function fail(where: string, message: string): never {
  throw new Error(`Invalid card content (${where}): ${message}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, where: string, field: string): string {
  if (typeof v !== "string" || v.length === 0) fail(where, `"${field}" must be a non-empty string`);
  return v;
}

/**
 * Runtime validation of JSON content. Runs at module load, which means an
 * malformed card fails the production build rather than blanking a page at
 * runtime -- worth it, because content is hand-edited and machine-generated.
 */
function validate(raw: unknown, index: number): Card {
  const where = `card #${index}`;
  if (!isRecord(raw)) fail(where, "expected an object");

  const id = str(raw.id, where, "id");
  const category = str(raw.category, `card "${id}"`, "category");
  if (!CATEGORY_SET.has(category)) fail(`card "${id}"`, `unknown category "${category}"`);
  const region = str(raw.region, `card "${id}"`, "region");
  if (!REGION_SET.has(region)) fail(`card "${id}"`, `unknown region "${region}"`);

  // Ids are `<category>-<suffix>`, which the filters and the scraper both
  // rely on. Enforced here because a silent mismatch shows up as a card
  // filed under the wrong heading, not as an error.
  if (!id.startsWith(`${category}-`)) {
    fail(`card "${id}"`, `id must start with its category, "${category}-"`);
  }

  if (!isRecord(raw.art)) fail(`card "${id}"`, `"art" must be an object`);
  str(raw.art.kind, `card "${id}"`, "art.kind");

  return {
    id,
    category: category as CategoryId,
    region: region as RegionId,
    country: str(raw.country, `card "${id}"`, "country"),
    countryCode: typeof raw.countryCode === "string" ? raw.countryCode : undefined,
    tell: str(raw.tell, `card "${id}"`, "tell"),
    detail: str(raw.detail, `card "${id}"`, "detail"),
    lookalikes: Array.isArray(raw.lookalikes) ? raw.lookalikes.filter((x): x is string => typeof x === "string") : undefined,
    art: raw.art as unknown as Card["art"],
    image: isRecord(raw.image) && typeof raw.image.src === "string"
      ? {
          src: raw.image.src,
          alt: typeof raw.image.alt === "string" ? raw.image.alt : "",
          credit: typeof raw.image.credit === "string" ? raw.image.credit : undefined,
          creditUrl: typeof raw.image.creditUrl === "string" ? raw.image.creditUrl : undefined,
        }
      : undefined,
    provenance: raw.provenance === "plonkit" || raw.provenance === "manual" ? raw.provenance : "seed",
    source: isRecord(raw.source) && typeof raw.source.url === "string"
      ? { label: typeof raw.source.label === "string" ? raw.source.label : "Source", url: raw.source.url }
      : undefined,
  };
}

function build(): Card[] {
  const seeds: unknown[] = [
    ...bollards,
    ...utilityPoles,
    ...roadLines,
    ...licensePlates,
    ...roadSigns,
    ...scripts,
    ...googleCar,
    ...landscape,
  ];

  const byId = new Map<string, Card>();
  seeds.forEach((raw, i) => {
    const card = validate(raw, i);
    if (byId.has(card.id)) fail(`card "${card.id}"`, "duplicate id in seed content");
    byId.set(card.id, card);
  });

  // Scraped cards override seeds sharing an id.
  const scraped = SCRAPED_CARDS.map((raw, i) => validate(raw, i));
  scraped.forEach((card) => byId.set(card.id, card));

  // A scrape produces one card per Plonk It tip, so a country and category
  // that seeded a single hand-written card can come back as several with
  // different ids. Retire the seed card in that case: it was a placeholder
  // for exactly this content, and keeping it would show the same meta twice.
  const covered = new Set(
    scraped.map((c) => `${c.category}/${c.countryCode ?? c.country}`),
  );
  for (const [id, card] of byId) {
    if (card.provenance !== "seed") continue;
    if (covered.has(`${card.category}/${card.countryCode ?? card.country}`)) {
      byId.delete(id);
    }
  }

  return [...byId.values()].sort((a, b) =>
    a.category === b.category ? a.country.localeCompare(b.country) : a.category.localeCompare(b.category),
  );
}

export const ALL_CARDS: Card[] = build();

export const CARDS_BY_ID: ReadonlyMap<string, Card> = new Map(ALL_CARDS.map((c) => [c.id, c]));

export function getCard(id: string): Card | undefined {
  return CARDS_BY_ID.get(id);
}

export function filterCards(opts: { categories?: CategoryId[]; regions?: RegionId[] }): Card[] {
  const cats = opts.categories?.length ? new Set(opts.categories) : null;
  const regs = opts.regions?.length ? new Set(opts.regions) : null;
  return ALL_CARDS.filter(
    (c) => (!cats || cats.has(c.category)) && (!regs || regs.has(c.region)),
  );
}
