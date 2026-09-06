/**
 * Plonk It scraper — run this on your own machine, not in CI.
 *
 *   pnpm scrape --help
 *
 * Each country page is a JavaScript app, but it ships the whole guide as JSON
 * in a <script id="__PRELOADED_DATA__"> tag, so there is no DOM to scrape and
 * no headless browser needed. One Plonk It "tip" becomes one card. Writes:
 *
 *   src/content/scraped/cards.json   the card data
 *   src/content/scraped/index.ts     re-export consumed by src/content/index.ts
 *   public/images/plonkit/<slug>/    downloaded images
 *
 * Tips carry their own tags ("bollard", "chevron/sign", "coverage"), which map
 * onto our categories directly, and their own stable ids, which become part of
 * the card id so a re-scrape updates a card rather than duplicating it.
 *
 * Politeness: obeys robots.txt (including Crawl-delay), sends a descriptive
 * User-Agent, sleeps between requests, and caches every response under
 * .scrape-cache/ so re-runs and parser tweaks cost zero extra requests.
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, ".scrape-cache");
const IMAGE_DIR = join(ROOT, "public", "images", "plonkit");
const OUT_JSON = join(ROOT, "src", "content", "scraped", "cards.json");
const OUT_INDEX = join(ROOT, "src", "content", "scraped", "index.ts");

const BASE = "https://www.plonkit.net";
const USER_AGENT =
  "GeoQuizScraper/0.1 (personal study tool; contact via repository owner)";

/**
 * Plonk It's own tip tags -> our category ids. Tags are a fixed vocabulary the
 * site applies by hand, so this is a lookup rather than a guess. An unknown
 * tag falls through to TEXT_FALLBACK below; add it here when one shows up.
 */
const TAG_MAP: Record<string, string> = {
  bollard: "bollards",
  bollards: "bollards",
  pole: "utility-poles",
  poles: "utility-poles",
  roadline: "road-lines",
  roadlines: "road-lines",
  "road lines": "road-lines",
  "license plates": "license-plates",
  "licence plates": "license-plates",
  "chevron/sign": "road-signs",
  sign: "road-signs",
  signs: "road-signs",
  guardrail: "road-signs",
  guardrails: "road-signs",
  bollardsign: "road-signs",
  language: "scripts",
  script: "scripts",
  coverage: "google-car",
  car: "google-car",
  camera: "google-car",
  landscape: "landscape",
  architecture: "landscape",
  vegetation: "landscape",
  other: "landscape",
};

/**
 * Alt text for a card photo. The photo IS the question, and the country is the
 * answer, so this says what kind of thing is in frame and nothing more. Naming
 * the country here would read the answer aloud to a screen reader while the
 * card is still face down.
 */
const ALT_BY_CATEGORY: Record<string, string> = {
  bollards: "A roadside bollard, seen from the road",
  "utility-poles": "A utility pole, seen from the road",
  "road-lines": "Road markings, seen from the road",
  "license-plates": "A vehicle licence plate",
  "road-signs": "A road sign, seen from the road",
  scripts: "Writing on a sign, seen from the road",
  "google-car": "The Street View camera vehicle, or its blur",
  landscape: "A roadside view of the surrounding landscape",
};

/** Used only for tips the site left untagged. First match wins. */
const TEXT_FALLBACK: [RegExp, string][] = [
  [/\bbollard/i, "bollards"],
  [/\b(utility pole|power line|telephone pole)/i, "utility-poles"],
  [/\b(road line|centre line|center line|road marking)/i, "road-lines"],
  [/\b(licence plate|license plate)/i, "license-plates"],
  [/\b(sign|chevron|guardrail|bus stop)/i, "road-signs"],
  [/\b(language|alphabet|script|letter)/i, "scripts"],
  [/\b(camera|coverage|snorkel|antenna|blur|generation \d)/i, "google-car"],
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
  /** Images are small and there are thousands, so they get their own pace. */
  imageDelayMs: number;
  refresh: boolean;
  ignoreRobots: boolean;
}

function parseArgs(argv: string[]): Options | null {
  const opts: Options = {
    dryRun: false,
    limit: null,
    only: [],
    images: true,
    delayMs: 1500,
    imageDelayMs: 400,
    refresh: false,
    ignoreRobots: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--":
        // pnpm forwards a literal `--` through to the script; ignore it.
        break;
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
      case "--ignore-robots":
        opts.ignoreRobots = true;
        break;
      case "--limit":
        opts.limit = Number(argv[++i]);
        break;
      case "--delay":
        opts.delayMs = Number(argv[++i]);
        break;
      case "--image-delay":
        opts.imageDelayMs = Number(argv[++i]);
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

  pnpm scrape [flags]

  --dry-run          parse and report, write nothing
  --country <slug>   scrape only this country (repeatable)
  --limit <n>        stop after n countries
  --no-images        skip image downloads, keep the text
  --delay <ms>       pause between page requests (default 1500, raised if
                     robots.txt asks for more)
  --image-delay <ms> pause between image requests (default 400). There are
                     thousands of images and each is a few hundred KB.
  --refresh          ignore the cache and refetch
  --ignore-robots    fetch pages robots.txt asks crawlers not to fetch.
                     Plonk It's robots.txt admits only Googlebot, Bingbot and
                     DuckDuckBot, so without this the run returns nothing. The
                     Crawl-delay is still honoured and the User-Agent is still
                     honest; this skips the path check, nothing else.
  --help

First run:  pnpm scrape --dry-run --limit 1
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

/**
 * The index page is an empty app shell with no preloaded data, so there is
 * nothing to discover from it and fetching it would just be a wasted request.
 * COUNTRIES below is the list. Add a slug there when Plonk It adds a country.
 */
function discoverCountries(opts: Options): string[] {
  return (opts.only.length ? opts.only : Object.keys(COUNTRIES)).sort();
}

/* ------------------------------------------------------------ extraction */

/**
 * The bits of __PRELOADED_DATA__ we read. Every field is optional: it is
 * someone else's payload and can change shape without warning, so the parser
 * checks rather than assumes, and a page that no longer matches is reported as
 * yielding no tips instead of throwing.
 */
interface PreloadedItem {
  kind?: string;
  id?: string;
  tags?: string[];
  data?: {
    text?: string[];
    image?: { imageUrl?: string; imageLink?: string; alt?: string };
  };
}

interface PreloadedGuide {
  title?: string;
  code?: string;
  steps?: { title?: string; items?: PreloadedItem[] }[];
}

/** One Plonk It tip, flattened into what a card needs. */
interface Tip {
  /** Plonk It's own stable id, e.g. "nK4e". Becomes part of the card id. */
  id: string;
  category: string;
  paragraphs: string[];
  imageUrl?: string;
  /** Street View link behind the tip's image, when there is one. */
  streetView?: string;
}

const PRELOADED_RE =
  /<script id="__PRELOADED_DATA__"[^>]*>([\s\S]*?)<\/script>/;

function parsePreloaded(html: string): PreloadedGuide | null {
  const raw = html.match(PRELOADED_RE)?.[1];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { data?: { public?: PreloadedGuide } };
    return parsed.data?.public ?? null;
  } catch {
    return null;
  }
}

/** Plonk It writes markdown in its tip text; cards render plain strings. */
function plain(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFor(tags: string[], text: string): string | null {
  for (const tag of tags) {
    const mapped = TAG_MAP[tag.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  for (const [pattern, category] of TEXT_FALLBACK) {
    if (pattern.test(text)) return category;
  }
  return null;
}

function extractTips(guide: PreloadedGuide, pageUrl: string): Tip[] {
  const tips: Tip[] = [];

  for (const step of guide.steps ?? []) {
    for (const item of step.items ?? []) {
      if (item.kind !== "tip" || !item.id) continue;

      const paragraphs = (item.data?.text ?? [])
        .map(plain)
        .filter((p) => p.length > 0);
      if (paragraphs.length === 0) continue;

      const category = categoryFor(item.tags ?? [], paragraphs.join(" "));
      if (!category) continue;

      const tip: Tip = { id: item.id, category, paragraphs };

      const image = item.data?.image;
      if (image?.imageUrl) {
        try {
          tip.imageUrl = new URL(image.imageUrl, pageUrl).toString();
        } catch {
          /* unparseable path; the card keeps its schematic */
        }
      }
      // imageLink is sometimes a Street View permalink and sometimes just the
      // image again. Only the former is worth recording as a source.
      if (image?.imageLink && /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.[a-z.]+\/maps)/.test(image.imageLink)) {
        tip.streetView = image.imageLink;
      }

      tips.push(tip);
    }
  }

  return tips;
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

/**
 * The payload gives raw paths like /images/albania/Bollards.png, and those are
 * not public: they answer 403. The site serves every image through a resizing
 * endpoint instead, /images/resize/<width>/<quality>/<path>, which is what its
 * own pages request and what returns 200. 1200/80 is the width and quality the
 * site itself uses for tip images; it converts to webp on the way out.
 */
const IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 80;

function resizedUrl(rawUrl: string): string {
  return rawUrl.replace(
    /\/images\/(?!resize\/)/,
    `/images/resize/${IMAGE_WIDTH}/${IMAGE_QUALITY}/`,
  );
}

/** First refusal from the image host, so main can explain it once instead of
 *  silently producing cards with no photos. */
let imageRefusal: string | null = null;

/**
 * Images are named after the tip they belong to, not after their position in
 * the run, which makes the name stable across re-scrapes and means a file you
 * put there yourself is picked up as that card's photo. Anything already on
 * disk wins and costs no request.
 */
function existingImage(slug: string, tipId: string): string | null {
  for (const ext of new Set(Object.values(EXT_BY_TYPE))) {
    if (existsSync(join(IMAGE_DIR, slug, `${tipId}.${ext}`))) {
      return `/images/plonkit/${slug}/${tipId}.${ext}`;
    }
  }
  return null;
}

async function downloadImage(url: string, slug: string, tipId: string, opts: Options): Promise<string | null> {
  const already = existingImage(slug, tipId);
  if (already) return already;

  try {
    await throttle(opts.imageDelayMs);
    const res = await fetch(resizedUrl(url), { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) {
      imageRefusal ??= `${res.status} ${res.statusText}`;
      return null;
    }
    const type = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    const ext = EXT_BY_TYPE[type];
    if (!ext) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;

    const dir = join(IMAGE_DIR, slug);
    await mkdir(dir, { recursive: true });
    const name = `${tipId}.${ext}`;
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
  if (opts.ignoreRobots) {
    console.log(
      "--ignore-robots: fetching pages robots.txt asks crawlers to leave alone.\n" +
        "Crawl-delay is still honoured and the User-Agent still identifies this\n" +
        "script. Republishing what comes back is a separate question from\n" +
        "downloading it; see the licensing note in the README.\n",
    );
  }
  if (robots.crawlDelayMs > opts.delayMs) {
    console.log(`robots.txt asks for ${robots.crawlDelayMs}ms between requests; using that`);
    opts.delayMs = robots.crawlDelayMs;
  }

  let slugs = discoverCountries(opts);
  if (opts.limit !== null) slugs = slugs.slice(0, opts.limit);
  console.log(`${slugs.length} countr${slugs.length === 1 ? "y" : "ies"} to scrape, ${opts.delayMs}ms apart\n`);

  const cards: unknown[] = [];
  let skipped = 0;
  let blockedByRobots = 0;

  for (const slug of slugs) {
    const meta = COUNTRIES[slug];
    if (!meta) {
      console.warn(`? ${slug}: not in the country table, skipping (add it to COUNTRIES)`);
      skipped++;
      continue;
    }
    const [name, code, region] = meta;
    const path = `/${slug}`;
    if (!opts.ignoreRobots && !allowed(robots, path)) {
      console.warn(`- ${slug}: disallowed by robots.txt`);
      skipped++;
      blockedByRobots++;
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

    const guide = parsePreloaded(html);
    if (!guide) {
      console.warn(
        `! ${slug}: no __PRELOADED_DATA__ in the page. The site's shape may have` +
          ` changed; the response is saved in .scrape-cache/ for you to look at.`,
      );
      skipped++;
      continue;
    }

    const tips = extractTips(guide, url);
    if (tips.length === 0) {
      console.warn(`! ${slug}: payload parsed but held no usable tips`);
      skipped++;
      continue;
    }

    // Prefer the page's own title and country code over the local table.
    const country = guide.title?.trim() || name;
    const countryCode = guide.code?.trim().toLowerCase() || code;

    for (const tip of tips) {
      const detail = tip.paragraphs.join(" ").slice(0, 900);

      // A file already on disk is linked whatever the flags say: --no-images
      // means "do not download", not "ignore the images I already have".
      let local = existingImage(slug, tip.id);
      if (!local && opts.images && !opts.dryRun && tip.imageUrl) {
        local = await downloadImage(tip.imageUrl, slug, tip.id, opts);
      }

      const image = local
        ? {
            src: local,
            alt: ALT_BY_CATEGORY[tip.category] ?? "A roadside view",
            credit: "via Plonk It",
            creditUrl: tip.streetView ?? url,
          }
        : undefined;

      cards.push({
        // Plonk It's tip id keeps this stable across re-scrapes, so a card is
        // updated rather than duplicated when the guide is edited.
        id: `${tip.category}-${countryCode}-${tip.id}`,
        category: tip.category,
        region,
        country,
        countryCode,
        tell: firstSentence(detail),
        detail,
        art: fallbackArt(tip.category),
        ...(image ? { image } : {}),
        provenance: "plonkit",
        source: { label: "Plonk It", url },
      });
    }

    console.log(`✓ ${slug}: ${tips.length} tip${tips.length === 1 ? "" : "s"}`);
  }

  console.log(`\n${cards.length} cards from ${slugs.length - skipped} countries (${skipped} skipped)`);

  if (imageRefusal) {
    console.log(
      `\nThe image host refused every download (${imageRefusal}). Guide pages come\n` +
        `back fine, but /images/ sits behind bot protection that this script does\n` +
        `not try to defeat. The cards are complete otherwise and render with their\n` +
        `schematic art, so add --no-images to skip the attempts and the wait.`,
    );
  }

  if (blockedByRobots === slugs.length) {
    console.log(
      `\nEverything was blocked by ${BASE}/robots.txt, which ends with a\n` +
        `\`User-agent: *\` / \`Disallow: /\` group. The site allows Googlebot,\n` +
        `Bingbot and DuckDuckBot and no one else. That is the site asking not to\n` +
        `be crawled, so this script stops rather than working around it.\n\n` +
        `Ask the Plonk It maintainers for permission or a data export, write\n` +
        `cards by hand in src/content/seed/, or pass --ignore-robots if you have\n` +
        `decided to fetch anyway.`,
    );
    return;
  }

  if (opts.dryRun) {
    console.log("\n--dry-run: nothing written. Sample card:\n");
    console.log(JSON.stringify(cards[0] ?? null, null, 2));
    return;
  }

  await mkdir(dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, `${JSON.stringify(cards, null, 2)}\n`);
  await writeFile(
    OUT_INDEX,
    `/**\n * Regenerated by \`pnpm scrape\`. Do not edit by hand.\n */\nimport cards from "./cards.json";\n\nexport const SCRAPED_CARDS: unknown[] = cards;\n`,
  );
  console.log(`\nwrote ${OUT_JSON}`);
  console.log(`wrote ${OUT_INDEX}`);
  console.log("\nrun `pnpm build` to pick the new content up");
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
