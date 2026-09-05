# GeoQuiz

Spaced-repetition flashcards for GeoGuessr metas. Drill bollards, utility poles,
road lines, license plates, scripts, Google car variants and more — sliced by
meta category, by region, or by both at once.

Cards are self-graded: look at the image, decide which country it is and what
gave it away, reveal, then mark yourself right or wrong. Missed cards come back
tomorrow, cards you know keep stretching further out.

```bash
pnpm install
pnpm dev           # http://localhost:3000
```

pnpm is the package manager here (pinned via `packageManager` in
`package.json`). If you do not have it, `corepack enable` will provide it.

## How it works

**Two filter axes.** Every card is tagged with a category (`bollards`,
`road-lines`, …) and a region (`europe`, `latin-america`, …). Leaving an axis
untouched means "all of it", so the deck builder produces "bollards",
"everything in Southeast Asia" and "bollards in Southeast Asia" through one
interaction.

**Leitner scheduling.** Five boxes at 1, 3, 7, 21 and 60 days. A correct answer
promotes a card one box; a miss drops it straight back to box 1. All progress
lives in `localStorage` under `geoquiz.progress.v1` — no accounts, no backend,
nothing leaves the browser. Clearing site data clears your progress.

**Schematic art.** Cards render without photos. Each one carries a small
declarative `art` description (band positions on a bollard, strip colours on a
plate, centre-line colour and dash rhythm) that is drawn as SVG. That keeps the
app usable before any image has been sourced, and it strips a meta down to the
features it actually turns on. When a card has an `image`, the photo is used
instead.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Deck builder — pick categories and regions, see due/new counts |
| `/study` | The drill loop. Accepts `?c=bollards,road-lines&r=europe` |
| `/browse` | Reference mode: every meta with its tell and lookalikes, searchable |
| `/stats` | Accuracy by category and region, box distribution, 90-day heatmap, weakest cards |

Keyboard during a drill: <kbd>Space</kbd> reveals, <kbd>1</kbd> missed,
<kbd>2</kbd> got it.

## Content

Content is plain JSON in `src/content/seed/`, one file per category, validated
at module load so a malformed card fails the build instead of blanking a page.

Card ids follow `<category>-<countryCode>` (`bollards-pl`,
`license-plates-nl`). That scheme is enforced by the loader, and it is what lets
scraped content replace a seed card in place rather than duplicating it.

To add a card by hand, append an object to the relevant file:

```jsonc
{
  "id": "bollards-si",
  "category": "bollards",
  "region": "europe",
  "country": "Slovenia",
  "countryCode": "si",
  "tell": "The one-line giveaway.",
  "detail": "The longer why, shown under the tell.",
  "lookalikes": ["Croatia", "Austria"],
  "art": { "kind": "bollard", "shape": "flat", "body": "#f4f4f1" },
  "provenance": "manual"
}
```

`art` accepts `bollard`, `plate`, `roadline`, `pole` and `glyph` variants — see
`src/lib/types.ts` for the fields each one takes.

### About the seed content

> The ~76 cards shipped in this repo were written from general GeoGuessr
> knowledge, not transcribed from a verified reference. They are a usable
> starting point and a demonstration of the data model, **not** an authority.
> Cards marked `"provenance": "seed"` are badged in the UI so you can tell them
> apart from content you have verified. Check anything you intend to actually
> learn from, and replace it as you go.

## Scraping Plonk It

`scripts/scrape-plonkit.ts` pulls country guide pages and writes
`src/content/scraped/cards.json`, plus images into `public/images/plonkit/`.

The pages are a JavaScript app, but each one ships its whole guide as JSON in a
`<script id="__PRELOADED_DATA__">` tag, so the scraper reads that instead of
walking a DOM. No headless browser, and nothing to re-tune when the markup
changes. One Plonk It tip becomes one card: Albania yields 35, Japan 53.

Tips carry their own tags (`bollard`, `chevron/sign`, `coverage`, `language`),
which map onto our eight categories in `TAG_MAP`, and their own stable ids,
which go into the card id as `<category>-<code>-<tipId>`. A re-scrape therefore
updates cards rather than duplicating them. Where a scrape covers a country and
category that a seed card was standing in for, the seed card is retired in
`src/content/index.ts` so the same meta does not appear twice.

**Run it on your own machine.** It is deliberately not wired into CI or the
build.

```bash
pnpm scrape --dry-run --limit 1    # always start here
pnpm scrape --country poland       # one country
pnpm scrape                        # everything
pnpm build                         # pick up the new content
```

Flags: `--dry-run`, `--country <slug>` (repeatable), `--limit <n>`,
`--no-images`, `--delay <ms>`, `--refresh`, `--ignore-robots`, `--help`.

It obeys `robots.txt` including `Crawl-delay`, sends a descriptive User-Agent,
sleeps between requests, and caches every response under `.scrape-cache/` so
iterating on the parser costs no extra requests.

**By default the scraper returns nothing, and that is correct.**
`https://www.plonkit.net/robots.txt` ends with a `User-agent: *` /
`Disallow: /` group; the only crawlers it admits are Googlebot, Bingbot and
DuckDuckBot. Every country is skipped with `disallowed by robots.txt`, and the
script says so rather than looking broken.

`--ignore-robots` overrides that path check. It changes only that: the
`Crawl-delay` is still honoured, and the User-Agent still identifies the script
rather than impersonating an allowed crawler. Know what you are overriding. The
file carries a `Content-Signal: ai-train=no` and describes itself as an express
reservation of rights under Article 4 of the EU copyright directive. The
alternatives are asking the Plonk It maintainers for permission or a data
export, or expanding the seed cards in `src/content/seed/` by hand.

**Images do not come down; text does.** Guide pages return 200, but
`/images/` answers 403 to anything that is not a browser. That is bot
protection, an actual server-side control rather than a posted request, and
the scraper does not try to defeat it: it reports the refusal once and carries
on. Cards are complete otherwise and render with their schematic art, which is
what that art is for. Use `--no-images` to skip the attempts and the wait.

**Licensing is on you.** The prose is Plonk It's, and the images, if you ever
obtain them another way, are largely Google's Street View captures rather than
Plonk It's. Private study is a different question from republishing. Note that
`public/images/plonkit/` and `src/content/scraped/cards.json` are gitignored by
default; remove those lines from `.gitignore` only if you have decided to
publish what you scraped.

## Commands

```bash
pnpm dev           # dev server
pnpm build         # production build
pnpm start         # serve the production build
pnpm test          # SRS unit tests (node:test)
pnpm lint          # eslint
pnpm typecheck     # tsc --noEmit
pnpm scrape        # see above
```

## Deploying

Every route is statically prerendered and there is nothing to provision — no
database, no environment variables, no runtime services. Import the repo on
Vercel and the defaults are correct: the `pnpm-lock.yaml` in the repo makes
Vercel install with pnpm and run `pnpm build`, output handled by the Next.js
preset.

Two things worth knowing:

- **Production branch.** This repository was created empty, so GitHub set its
  default branch to the branch the work was done on. `main` now carries the
  same commits. Either set `main` as the default under GitHub's
  Settings → General → Default branch, or pick it directly as the Production
  Branch in Vercel's project settings.
- **Scraped content is not deployed.** `public/images/plonkit/` and
  `src/content/scraped/cards.json` are gitignored, so anything `pnpm scrape`
  produces stays on your machine and Vercel will build from the seed content
  alone. That is deliberate — it keeps a licensing decision from being made by
  accident. Both are ignored together, so there is no half-state where cards
  reference images that were not deployed. Remove those two lines from
  `.gitignore` and commit the output when you want scraped content live.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 3. No database,
no auth, no runtime services.
