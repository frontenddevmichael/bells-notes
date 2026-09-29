// SEO — per-route <title>/<meta>/OG/Twitter/JSON-LD management.
// SPA caveats handled: social crawlers (Facebook/LinkedIn/iMessage) don't run
// JS, so they see index.html's static defaults; Google, Bing and X do run JS
// and get the per-route values this composable sets. Canonical points at the
// production origin.
const SITE = 'https://bells-notes.omalemcmails.workers.dev'
const SITE_NAME = 'Bells Notes'
const DEFAULT_DESC =
  'A free library for Bells students. Notes, past questions, and study guides from real students. Free to read, free to contribute — no accounts, no paywalls.'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export interface SeoInput {
  title: string
  description?: string
  /** Path-only canonical (e.g. '/search'); SITE origin is prepended. */
  path?: string
  /** Absolute image URL for OG/Twitter cards. Defaults to favicon. */
  image?: string
  /** Optional JSON-LD block (replaced wholesale each call). */
  jsonLd?: Record<string, unknown>
}

export function useSeo({ title, description, path, image, jsonLd }: SeoInput): void {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`
  const desc = description ?? DEFAULT_DESC
  const url = SITE + (path ?? '')
  const img = image ?? `${SITE}/favicon.png`

  document.title = fullTitle
  upsertMeta('name', 'description', desc)
  upsertLink('canonical', url)

  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', desc)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:image', img)

  upsertMeta('name', 'twitter:card', 'summary')
  upsertMeta('name', 'twitter:title', fullTitle)
  upsertMeta('name', 'twitter:description', desc)
  upsertMeta('name', 'twitter:image', img)

  const existing = document.getElementById('seo-jsonld')
  if (existing) existing.remove()
  if (jsonLd) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'seo-jsonld'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)
  }
}

export { SITE, SITE_NAME, DEFAULT_DESC }
