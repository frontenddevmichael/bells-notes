# Production & SEO checklist — Bells Notes web

Status legend: ✅ done · 🔲 pending (needs you/external) · 🔁 recurring

---

## 1. SEO foundations (this pass)

- ✅ **Unique per-route `<title>`** — router `afterEach` sets static routes; Paper/Subject/Profile set dynamic titles via `useSeo()`.
- ✅ **Meta description per route** — same mechanism; every route covered (incl. 404).
- ✅ **Canonical URLs** — `<link rel="canonical">` on every route, origin `https://bells-notes.omalemcmails.workers.dev`.
- ✅ **Open Graph + Twitter cards** — og:title/description/type/url/image + twitter:card, defaults in `index.html`, updated per route. Social crawlers that don't run JS see the static defaults.
- ✅ **JSON-LD structured data** — `WebSite` (+ SearchAction), `Organization` in index.html; `ScholarlyArticle` per paper page.
- ✅ **robots.txt** — allows all, sitemap pointer (`public/robots.txt` → copied to dist by Vite).
- ✅ **lang="en"** on `<html>` (was already set).
- ✅ **SearchAction wired to the real search route** (`/search?q=`) — eligible for a sitelinks search box.
- ✅ **Preconnect** to the Convex origin (faster first data paint = better CWV).
- ✅ **SPA fallback** — Workers `not_found_handling: single-page-application`; no soft-404s for deep links.

## 2. SEO — pending / recurring

- 🔲 **Sitemap generation** — generate `sitemap.xml` listing `/`, `/browse`, `/search`, `/upload`, `/about` + every `/subject/:id`, `/paper/:id`, `/profile/:id`. Recommended: a `scripts/generate-sitemap.mjs` run in `deploy` (reads Convex data via the same store/query), committed to `public/` or written into `dist/` post-build.
- 🔲 **Submit to Google Search Console** — verify the workers.dev origin (DNS token won't work; use the HTML file or meta-tag method), submit sitemap, request indexing for `/` and top subjects. GSC is also where you'll see mobile-usability and CWV field data.
- 🔲 **Submit to Bing Webmaster Tools** — imports from GSC in one click.
- 🔲 **Custom domain** — workers.dev URLs are treated as lower-trust and can't set cookies cross-site; a real domain (e.g. bellsnotes.com) improves CTR and shareability. CF dashboard → Workers & Pages → bells-notes → Domains. Update `SITE` in `useSeo.ts` + `index.html` canonicals when it exists.
- 🔲 **Favicon suite** — currently one `favicon.png`. Add 32/180/192 ICO/PNG + `apple-touch-icon` + webmanifest for PWA polish and cleaner tab/OG rendering.
- 🔲 **OG image (1200×630)** — the favicon is a weak share card. Make one branded image (bell wordmark + "Free. Open." tagline); optionally per-subject OG images later.
- 🔲 **Dynamic OG for papers** — social scrapers don't run JS, so paper pages share the static card. Real fix = serving OG tags from the edge (a tiny Worker `fetch` handler that injects paper meta for `/paper/*` requests) — moderate effort, big share-quality win.
- 🔲 **Content depth** — engines rank destinations, not scaffolding: paper pages already have titles/course codes; consider a short human-written subject intro paragraph on SubjectView (crawlable text above the fold).
- 🔁 **Re-crawl after big content drops** — request indexing in GSC after each term's upload wave.
- 🔁 **GSC coverage review monthly** — watch for soft-404s, excluded-by-canonical, and CWV regressions.

## 3. Performance (Core Web Vitals)

- ✅ Route-level code splitting (Vite default) — Home chunk ~12 kB, lazily loaded views.
- ✅ No webfonts (SF system stack) — zero font-swap CLS.
- ✅ Hero art in WebP (95 kB total for book+moon), stats/counters text-first.
- ✅ Preconnect to backend above.
- 🔲 **Measure real numbers** — run Lighthouse (prod build, not dev) on `/`, `/browse`, `/paper/:id`; record LCP/CLS/INP. Dev-server numbers lie.
- 🔲 **Lazy-load the PDF preview** — PaperView mounts PDFPreview on the Preview tab; ensure the pdf.js worker is only fetched when the tab opens (check network waterfall).
- 🔲 **Hero art LCP check** — if book/moon art is the LCP element, add `fetchpriority="high"` / preload; if the title is, nothing to do.
- 🔲 **BFCache** — verify back/forward navigation restores instantly (Convex WS shouldn't block it).
- 🔁 **Bundle watch** — main chunk 197 kB (59 kB gzip) is fine; re-check after each feature wave (`vite build` output).

## 4. Robustness / production hygiene

- ✅ Global error handler + unhandledrejection logging (`main.ts`).
- ✅ Backend env baked correctly (verified Convex URL in bundle); admin passphrase server-side only.
- ✅ SPA fallback verified live (`/paper/abc123`, `/admin` → app renders, no 404).
- ✅ Dark/light theme-color metas; viewport-fit for notches.
- 🔲 **404 page SEO** — NotFoundView should return a real "not found" state; SPA can't send 404 status (acceptable for now; note for the edge-Worker pass).
- 🔲 **Analytics decision** — Vercel Analytics is disabled on CF; either remove the dep or add a CF-friendly counter (Cloudflare Web Analytics is free, one script tag).
- 🔲 **Error monitoring** — Sentry (or CF-tail) wired to the existing errorHandler; console-only errors are invisible in prod.
- 🔲 **Security headers** — `_headers` file in `public/` (Workers assets honors it): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a CSP allowing `connect-src https://tough-antelope-495.convex.cloud wss://...` (CSP is breaking-change-prone — stage it).
- 🔲 **Backup plan for the Worker** — `wrangler deploy` is immutable-versioned; note the last-good version ID (currently `3b946f30`).

## 5. Data / content ops

- ✅ Backend canonical deployment documented (tough-antelope-495, repo-root pushes only).
- 🔁 **Cron health** — the 12h catalogue sync cron: check Convex dashboard logs occasionally for silent failures (the run-doc 400 case).
- 🔲 **Reading metrics privacy** — reads/votes are anonymous already; document it in About (trust + GDPR-ish hygiene).
- 🔲 **Link hygiene** — footer/nav links use `router.push` on `<a>` without `href` (clicks work, but crawlers don't see them as links). Low priority since nav links exist in real hrefs elsewhere; worth a pass adding `href` + `@click.prevent` for semantics.

## 6. Ship checklist (every deploy)

1. `npm run build` green (type-check included).
2. `npx wrangler deploy` (or `npm run deploy`).
3. Open the live URL — home renders, one deep route renders, footer pinned.
4. If routes changed: sitemap regenerated + resubmitted (once it exists).
5. Spot-check title/description in the browser tab + view-source for the route.

---

**Current live state:** https://bells-notes.omalemcmails.workers.dev · version 3b946f30 · SEO pass ✅ (items in §1) — everything in §2–§5 marked 🔲 is sequenced, owner-ready work.
