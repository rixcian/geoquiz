# GeoQuiz

Spaced-repetition flashcards for GeoGuessr metas. Drill bollards, utility poles,
road lines, license plates, scripts, Google car variants and more — sliced by
meta category, by region, or by both at once.

Cards are self-graded: look at the image, decide which country it is and what
gave it away, reveal, then mark yourself right or wrong. Missed cards come back
tomorrow, cards you know keep stretching further out.

```bash
npm install
npm run dev        # http://localhost:3000
```

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

`scripts/scrape-plonkit.ts` pulls country guide pages, groups the images and
prose under each heading into cards, and writes `src/content/scraped/cards.json`
plus images into `public/images/plonkit/`. Scraped cards override seed cards
with the same id.

**Run it on your own machine.** It is deliberately not wired into CI or the
build.

```bash
npm run scrape -- --dry-run --limit 1    # always start here
npm run scrape -- --country poland       # one country
npm run scrape                           # everything
npm run build                            # pick up the new content
```

Flags: `--dry-run`, `--country <slug>` (repeatable), `--limit <n>`,
`--no-images`, `--delay <ms>`, `--refresh`, `--help`.

It obeys `robots.txt` including `Crawl-delay`, sends a descriptive User-Agent,
sleeps between requests, and caches every response under `.scrape-cache/` so
iterating on the parser costs no extra requests.

**The selectors are a guess.** `SELECTORS` and `HEADING_MAP` at the top of the
script are a best-effort read of the page structure, written without access to
the live site. Run `--dry-run --limit 1` first, look at the sample card it
prints, and adjust until the extraction is right. If a page yields no sections,
the cached HTML is sitting in `.scrape-cache/` for you to inspect.

**Licensing is on you.** Images on GeoGuessr guide sites are largely Google
Street View captures, which belong to Google rather than to the site hosting
them. Downloading them for private study is a different question from
republishing them. Check the terms before you deploy anything you scraped, and
note that `public/images/plonkit/` and `src/content/scraped/cards.json` are
gitignored by default — remove those lines from `.gitignore` if you decide to
commit scraped content.

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm start          # serve the production build
npm test           # SRS unit tests (node:test)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run scrape     # see above
```

## Deploying

Every route is statically prerendered, so `npm run build` output drops onto
Vercel with no configuration. Push the repo, import it, done. Progress is
client-side, so there is nothing to provision.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 3. No database,
no auth, no runtime services.
