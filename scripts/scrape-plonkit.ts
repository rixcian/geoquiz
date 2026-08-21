/**
 * Plonk It scraper — run this on your own machine, not in CI.
 *
 *   npm run scrape -- --help
 *
 * Reads country guide pages, groups the images and prose under each heading
 * into meta cards, downloads the images, and writes:
 *
 *   src/content/scraped/cards.json   the card data
 *   src/content/scraped/index.ts     re-export consumed by src/content/index.ts
 *   public/images/plonkit/<slug>/    downloaded images
 *
 * Cards whose id matches a seed card replace it, so scraping upgrades the
 * built-in content in place instead of duplicating it.
 *
 * Politeness: obeys robots.txt (including Crawl-delay), sends a descriptive
 * User-Agent, sleeps between requests, and caches every response under
 * .scrape-cache/ so re-runs and parser tweaks cost zero extra requests.
 *
 * A caveat worth reading: the selectors below are a best-effort guess at the
 * page structure. Run with --dry-run --limit 1 first, look at what comes out,
 * and adjust SELECTORS / HEADING_MAP until the extraction is right. The
 * caching means iterating on the parser is fast.
 *
 * Licensing is your call and your responsibility. Images on guide sites are
 * frequently Street View captures owned by Google rather than by the site, so
 * check the terms before republishing anything you download here.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, ".scrape-cache");
const IMAGE_DIR = join(ROOT, "public", "images", "plonkit");
const OUT_JSON = join(ROOT, "src", "content", "scraped", "cards.json");
const OUT_INDEX = join(ROOT, "src", "content", "scraped", "index.ts");

const BASE = "https://www.plonkit.net";
const USER_AGENT =
  "GeoQuizScraper/0.1 (personal study tool; contact via repository owner)";

/** Tweak these if the extraction comes out wrong. */
const SELECTORS = {
  /** Links on the index page that lead to a country guide. */
  countryLink: "a[href^='/']",
  /** Container holding the guide body. Falls back to <body> if absent. */
  content: "main, #content, [role='main']",
  /** Elements treated as section headings. */
  heading: "h1, h2, h3, h4",
  /** Elements treated as prose. */
  paragraph: "p, li",
  image: "img",
};

/** Heading keyword -> our category id. First match wins, so order matters. */
const HEADING_MAP: [RegExp, string][] = [
  [/bollard/i, "bollards"],
  [/\b(pole|utility|electric|power line)/i, "utility-poles"],
  [/\b(road line|line marking|road marking|centre line|center line|marking)/i, "road-lines"],
  [/\b(plate|licence|license)/i, "license-plates"],
  [/\b(sign|chevron|guardrail|guard rail|bus stop)/i, "road-signs"],
  [/\b(language|script|alphabet|letter)/i, "scripts"],
  [/\b(car|camera|vehicle|snorkel|antenna|blur)/i, "google-car"],
  [/\b(architect|landscape|vegetation|terrain|domain|soil|climate)/i, "landscape"],
];

/** Country slug -> [display name, ISO alpha-2, region id]. */
const COUNTRIES: Record<string, [string, string, string]> = {
  albania: ["Albania", "al", "europe"],
  argentina: ["Argentina", "ar", "latin-america"],
  australia: ["Australia", "au", "oceania"],
  austria: ["Austria", "at", "europe"],
  bangladesh: ["Bangladesh", "bd", "south-asia"],
  belgium: ["Belgium", "be", "europe"],
  bolivia: ["Bolivia", "bo", "latin-america"],
  brazil: ["Brazil", "br", "latin-america"],
  bulgaria: ["Bulgaria", "bg", "europe"],
  cambodia: ["Cambodia", "kh", "southeast-asia"],
  canada: ["Canada", "ca", "north-america"],
  chile: ["Chile", "cl", "latin-america"],
  colombia: ["Colombia", "co", "latin-america"],
  croatia: ["Croatia", "hr", "europe"],
  czechia: ["Czechia", "cz", "europe"],
  denmark: ["Denmark", "dk", "europe"],
  ecuador: ["Ecuador", "ec", "latin-america"],
  estonia: ["Estonia", "ee", "europe"],
  finland: ["Finland", "fi", "europe"],
  france: ["France", "fr", "europe"],
  germany: ["Germany", "de", "europe"],
  ghana: ["Ghana", "gh", "africa"],
  greece: ["Greece", "gr", "europe"],
  hungary: ["Hungary", "hu", "europe"],
  iceland: ["Iceland", "is", "europe"],
  india: ["India", "in", "south-asia"],
  indonesia: ["Indonesia", "id", "southeast-asia"],
  ireland: ["Ireland", "ie", "europe"],
  israel: ["Israel", "il", "middle-east"],
  italy: ["Italy", "it", "europe"],
  japan: ["Japan", "jp", "east-asia"],
  kenya: ["Kenya", "ke", "africa"],
  latvia: ["Latvia", "lv", "europe"],
  lithuania: ["Lithuania", "lt", "europe"],
  malaysia: ["Malaysia", "my", "southeast-asia"],
  mexico: ["Mexico", "mx", "latin-america"],
  mongolia: ["Mongolia", "mn", "east-asia"],
  netherlands: ["Netherlands", "nl", "europe"],
  "new-zealand": ["New Zealand", "nz", "oceania"],
  nigeria: ["Nigeria", "ng", "africa"],
  norway: ["Norway", "no", "europe"],
  peru: ["Peru", "pe", "latin-america"],
  philippines: ["Philippines", "ph", "southeast-asia"],
  poland: ["Poland", "pl", "europe"],
  portugal: ["Portugal", "pt", "europe"],
  romania: ["Romania", "ro", "europe"],
  russia: ["Russia", "ru", "europe"],
  serbia: ["Serbia", "rs", "europe"],
  slovakia: ["Slovakia", "sk", "europe"],
  slovenia: ["Slovenia", "si", "europe"],
  "south-africa": ["South Africa", "za", "africa"],
  "south-korea": ["South Korea", "kr", "east-asia"],
  spain: ["Spain", "es", "europe"],
  "sri-lanka": ["Sri Lanka", "lk", "south-asia"],
  sweden: ["Sweden", "se", "europe"],
  switzerland: ["Switzerland", "ch", "europe"],
  taiwan: ["Taiwan", "tw", "east-asia"],
  thailand: ["Thailand", "th", "southeast-asia"],
  turkey: ["Turkey", "tr", "middle-east"],
  ukraine: ["Ukraine", "ua", "europe"],
  "united-kingdom": ["United Kingdom", "gb", "europe"],
  "united-states": ["United States", "us", "north-america"],
  uruguay: ["Uruguay", "uy", "latin-america"],
  vietnam: ["Vietnam", "vn", "southeast-asia"],
};

interface Options {
  dryRun: boolean;
  limit: number | null;
  only: string[];
  images: boolean;
  delayMs: number;
  refresh: boolean;
}

function parseArgs(argv: string[]): Options | null {
  const opts: Options = { dryRun: false, limit: null, only: [], images: true, delayMs: 1500, refresh: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--help":
      case "-h":
        return null;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--no-images":
        opts.images = false;
        break;
      case "--refresh":
        opts.refresh = true;
        break;
      case "--limit":
        opts.limit = Number(argv[++i]);
        break;
      case "--delay":
        opts.delayMs = Number(argv[++i]);
        break;
      case "--country":
        opts.only.push(String(argv[++i]));
        break;
      default:
        throw new Error(`Unknown flag: ${arg}. Try --help.`);
    }
  }
  return opts;
}

function usage(): void {
  console.log(`
Plonk It scraper

  npm run scrape -- [flags]

  --dry-run          parse and report, write nothing
  --country <slug>   scrape only this country (repeatable)
  --limit <n>        stop after n countries
  --no-images        skip image downloads, keep the text
  --delay <ms>       pause between requests (default 1500, raised if
                     robots.txt asks for more)
  --refresh          ignore the cache and refetch
  --help

First run:  npm run scrape -- --dry-run --limit 1
`);
}

/* ------------------------------------------------------------ fetching */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cachePath(url: string, ext: string): string {
  return join(CACHE_DIR, `${createHash("sha1").update(url).digest("hex")}.${ext}`);
}

let lastRequestAt = 0;

async function throttle(delayMs: number): Promise<void> {
  const wait = lastRequestAt + delayMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function fetchText(url: string, opts: Options): Promise<string> {
  const cached = cachePath(url, "html");
  if (!opts.refresh && existsSync(cached)) return readFile(cached, "utf8");

  await throttle(opts.delayMs);
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  const body = await res.text();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cached, body);
  return body;
}

/* ------------------------------------------------------------- robots */

interface Robots {
  disallow: string[];
  crawlDelayMs: number;
}

async function loadRobots(opts: Options): Promise<Robots> {
  const robots: Robots = { disallow: [], crawlDelayMs: 0 };
  let text: string;
  try {
    text = await fetchText(`${BASE}/robots.txt`, opts);
  } catch {
    console.warn("! robots.txt unreachable; proceeding with the default delay");
    return robots;
  }

  // Collect rules from the wildcard group and from any group naming us.
  let applies = false;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLowerCase() ?? "";
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      applies = value === "*" || USER_AGENT.toLowerCase().startsWith(value.toLowerCase());
    } else if (applies && key === "disallow" && value) {
      robots.disallow.push(value);
    } else if (applies && key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) robots.crawlDelayMs = Math.max(robots.crawlDelayMs, seconds * 1000);
    }
  }
  return robots;
}

function allowed(robots: Robots, path: string): boolean {
  return !robots.disallow.some((rule) => path.startsWith(rule));
}

/* ------------------------------------------------------------ discovery */

async function discoverCountries(opts: Options): Promise<string[]> {
  if (opts.only.length) return opts.only;

  const found = new Set<string>();
  try {
    const html = await fetchText(`${BASE}/`, opts);
    const $ = cheerio.load(html);
    $(SELECTORS.countryLink).each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const slug = href.replace(/^\//, "").replace(/\/$/, "").toLowerCase();
      if (slug in COUNTRIES) found.add(slug);
    });
  } catch (err) {
    console.warn(`! could not read the index page (${(err as Error).message}); falling back to the built-in country list`);
  }

  // The index is JavaScript-rendered on some builds of the site, so fall back
  // to the known slugs rather than silently scraping nothing.
  const slugs = found.size > 0 ? [...found] : Object.keys(COUNTRIES);
  return slugs.sort();
}

/* ------------------------------------------------------------ extraction */

interface Extracted {
  category: string;
  headingText: string;
  paragraphs: string[];
  images: string[];
}

function categoryFor(heading: string): string | null {
  for (const [pattern, category] of HEADING_MAP) {
    if (pattern.test(heading)) return category;
  }
  return null;
}

function extractSections(html: string, pageUrl: string): Extracted[] {
  const $ = cheerio.load(html);
  const root = $(SELECTORS.content).first().length ? $(SELECTORS.content).first() : $("body");

  const sections: Extracted[] = [];
  let current: Extracted | null = null;

  root.find(`${SELECTORS.heading}, ${SELECTORS.paragraph}, ${SELECTORS.image}`).each((_, el) => {
    const node = $(el);
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";

    if (/^h[1-4]$/.test(tag)) {
      const text = node.text().trim();
      if (!text) return;
      const category = categoryFor(text);
      current = category ? { category, headingText: text, paragraphs: [], images: [] } : null;
      if (current) sections.push(current);
      return;
    }

    if (!current) return;

    if (tag === "img") {
      const src = node.attr("src") ?? node.attr("data-src") ?? "";
      if (!src || src.startsWith("data:")) return;
      try {
        current.images.push(new URL(src, pageUrl).toString());
      } catch {
        /* unparseable src; skip */
      }
      return;
    }

    const text = node.text().replace(/\s+/g, " ").trim();
    // Drop nav crumbs and one-word fragments that are not really prose.
    if (text.length > 25) current.paragraphs.push(text);
  });

  return sections.filter((s) => s.paragraphs.length > 0 || s.images.length > 0);
}

/* --------------------------------------------------------------- images */

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function downloadImage(url: string, slug: string, index: number, opts: Options): Promise<string | null> {
  try {
    await throttle(opts.delayMs);
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    const ext = EXT_BY_TYPE[type];
    if (!ext) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;

    const dir = join(IMAGE_DIR, slug);
    await mkdir(dir, { recursive: true });
    const name = `${index}.${ext}`;
    await writeFile(join(dir, name), buf);
    return `/images/plonkit/${slug}/${name}`;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ main */

function firstSentence(text: string): string {
  const match = text.match(/^(.{20,220}?[.!?])(\s|$)/);
  return (match?.[1] ?? text.slice(0, 200)).trim();
}

async function main(): Promise<void> {
  let opts: Options | null;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
    return;
  }
  if (!opts) {
    usage();
    return;
  }

  const robots = await loadRobots(opts);
  if (robots.crawlDelayMs > opts.delayMs) {
    console.log(`robots.txt asks for ${robots.crawlDelayMs}ms between requests; using that`);
    opts.delayMs = robots.crawlDelayMs;
  }

  let slugs = await discoverCountries(opts);
  if (opts.limit !== null) slugs = slugs.slice(0, opts.limit);
  console.log(`${slugs.length} countr${slugs.length === 1 ? "y" : "ies"} to scrape, ${opts.delayMs}ms apart\n`);

  const cards: unknown[] = [];
  let skipped = 0;

  for (const slug of slugs) {
    const meta = COUNTRIES[slug];
    if (!meta) {
      console.warn(`? ${slug}: not in the country table, skipping (add it to COUNTRIES)`);
      skipped++;
      continue;
    }
    const [name, code, region] = meta;
    const path = `/${slug}`;
    if (!allowed(robots, path)) {
      console.warn(`- ${slug}: disallowed by robots.txt`);
      skipped++;
      continue;
    }

    const url = `${BASE}${path}`;
    let html: string;
    try {
      html = await fetchText(url, opts);
    } catch (err) {
      console.warn(`! ${slug}: ${(err as Error).message}`);
      skipped++;
      continue;
    }

    const sections = extractSections(html, url);
    if (sections.length === 0) {
      console.warn(`! ${slug}: no recognised sections. Check SELECTORS and HEADING_MAP against the saved HTML in .scrape-cache/`);
      skipped++;
      continue;
    }

    for (const section of sections) {
      const detail = section.paragraphs.join(" ").slice(0, 900);
      if (!detail) continue;

      let image: { src: string; alt: string; credit: string; creditUrl: string } | undefined;
      const firstImage = section.images[0];
      if (opts.images && !opts.dryRun && firstImage) {
        const local = await downloadImage(firstImage, slug, cards.length, opts);
        if (local) {
          image = {
            src: local,
            alt: `${name} — ${section.headingText}`,
            credit: "via Plonk It",
            creditUrl: url,
          };
        }
      }

      cards.push({
        // Matching the seed id scheme means this replaces the built-in card
        // for the same country and category rather than duplicating it.
        id: `${section.category}-${code}`,
        category: section.category,
        region,
        country: name,
        countryCode: code,
        tell: firstSentence(detail),
        detail,
        art: fallbackArt(section.category),
        ...(image ? { image } : {}),
        provenance: "plonkit",
        source: { label: "Plonk It", url },
      });
    }

    console.log(`✓ ${slug}: ${sections.length} section${sections.length === 1 ? "" : "s"}`);
  }

  console.log(`\n${cards.length} cards from ${slugs.length - skipped} countries (${skipped} skipped)`);

  if (opts.dryRun) {
    console.log("\n--dry-run: nothing written. Sample card:\n");
    console.log(JSON.stringify(cards[0] ?? null, null, 2));
    return;
  }

  await mkdir(dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, `${JSON.stringify(cards, null, 2)}\n`);
  await writeFile(
    OUT_INDEX,
    `/**\n * Regenerated by \`npm run scrape\`. Do not edit by hand.\n */\nimport cards from "./cards.json";\n\nexport const SCRAPED_CARDS: unknown[] = cards;\n`,
  );
  console.log(`\nwrote ${OUT_JSON}`);
  console.log(`wrote ${OUT_INDEX}`);
  console.log("\nrun `npm run build` to pick the new content up");
}

/** Scraped cards carry a photo, but keep a schematic so nothing renders blank
 *  if an image download failed. */
function fallbackArt(category: string): Record<string, unknown> {
  switch (category) {
    case "bollards":
      return { kind: "bollard", shape: "flat", body: "#f2f2f0", bands: [{ color: "#333333", top: 8, height: 10 }] };
    case "utility-poles":
      return { kind: "pole", material: "#adaba5", profile: "round", crossarms: 2, arm: "#8b8983" };
    case "road-lines":
      return {
        kind: "roadline",
        surface: "#3b3b3d",
        edge: { color: "#f2f2f2", style: "solid" },
        center: { color: "#f2f2f2", style: "dashed" },
      };
    case "license-plates":
      return { kind: "plate", bg: "#f6f6f4", fg: "#141414", text: "AB 1234", ratio: "eu" };
    default:
      return { kind: "glyph", glyph: "◈", bg: "#3b4252", fg: "#f2f2f2", shape: "square" };
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
