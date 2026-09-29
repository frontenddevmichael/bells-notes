<script setup lang="ts">
// Home — fixed-viewport landing (100dvh, no scroll). Renders nav (App-level),
// hero (badge/headline/search), Start-here bento, and the footprint stats.
// Trending/recent/manifesto are hidden below the fold-line (v-show="false") —
// components kept, zero rendering cost. Line-art book+pages (bottom-left) and
// moon+constellation (top-right) sit behind glass surfaces.
import heroBook from '@/assets/hero-book.webp'
import heroMoon from '@/assets/hero-moon.webp'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDriveStore } from '@/stores/drive'
import { formatCount } from '@/script/design'
import type { Paper } from '@/script/design'
import { trendingSubjects } from '@/script/trends'
import Icon from '@/components/Icon.vue'
import IndexStack from '@/components/IndexStack.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { useSearchAutocomplete } from '@/composables/useSearchAutocomplete'

const drive = useDriveStore()
const router = useRouter()
const {
  query,
  suggestions,
  showDropdown,
  highlightedIndex,
  selectSuggestion,
  handleKeydown,
  containerRef,
  onInput,
} = useSearchAutocomplete()

const stats = computed(() => [
  { value: drive.stats.papers.toLocaleString(), label: 'Papers' },
  { value: drive.stats.contributors.toLocaleString(), label: 'Contributors' },
  { value: formatCount(drive.stats.reads), label: 'Reads/month' },
  { value: drive.stats.subjects.toLocaleString(), label: 'Subjects' },
])

const quickSubjects = computed(() =>
  trendingSubjects(drive.subjects, drive.papers, drive.searchTrends).slice(0, 8),
)

function openPaper(p: Paper) {
  router.push({ name: 'paper', params: { id: p.id } })
}

function handleBlur(): void {
  window.setTimeout(() => {
    showDropdown.value = false
    highlightedIndex.value = -1
  }, 120)
}

const DAY_PHRASES = [
  'What do you wanna learn today?',
  'Good morning — what are we studying?',
  'Locked in. I see you.',
  'Semester survival starts here.',
  "Coffee in hand? Let's find your book.",
  'Lecture notes not cutting it? Let\'s dig deeper.',
  "Deadline szn or just curious today?",
  "What's today's rabbit hole?",
  'Back at it. What are we reading?',
  "Library's open, brain's (hopefully) online.",
];

const NIGHT_PHRASES = [
  'Hey night owl…',
  'Burning the midnight oil?',
  "It's late — the library is still open.",
  'Night shift. I see you.',
  'Essay due tomorrow? I got you.',
  '3am thoughts, 3am research.',
  'The library never sleeps. Neither do you, apparently.',
  "Cramming or just can't sleep?",
  "Quiet hours, loud thoughts. What's up?",
  "Everyone else is asleep. We're not.",
  'Last-minute reading list? Let\'s go.',
  'Dark mode on. Brain still on too.',
];

const cycledText = ref('')

type Season = 'exam' | 'test' | 'term' | ''

const SEASON_PHRASES: Record<Exclude<Season, ''>, string[]> = {
  exam: [
    'Exam season — one past paper at a time.',
    "Finals week. The library's your study room.",
    'Past papers, mock exams, last-minute notes.',
    "Final stretch. One more paper and you're done.",
    "Exams don't wait. Neither does the library.",
  ],
  test: [
    'Mid-terms are coming. Stock up now.',
    'Test week survival starts here.',
    'Practice sets for the tests ahead.',
    "Cram session? The library's got you.",
  ],
  term: [
    'New term, new syllabus. Grab your reading list.',
    'Welcome back — your courses are waiting.',
    'New semester, fresh notes ahead.',
    "First week back. Let's get organized.",
  ],
}

const WEEKDAY_PHRASES: Record<number, string[]> = {
  0: ['Sunday reset — light read or deep dive?', 'Weekend stay-in-study mode.'],
  1: ['Monday fresh start. Pick a course.', 'New week, new rabbit hole.'],
  2: ['Tuesday traction. Keep the streak.', 'Mid-quad day. What needs a second look?'],
  3: ['Hump day — push through one more.', 'Wednesday. Halfway to the weekend.'],
  4: ['Thursday grind. Almost there.', 'Weekend preview. One more topic?'],
  5: ['Friday wind-down. Review or relax?', "Last push before the weekend."],
  6: ['Saturday study sesh.', 'Weekend deep-dive. No rush.'],
}

function seasonFor(date: Date): Season {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const inWindow = (fromM: number, fromD: number, toM: number, toD: number): boolean => {
    const from = fromM * 100 + fromD
    const to = toM * 100 + toD
    const today = m * 100 + d
    return today >= from && today <= to
  }
  if (inWindow(11, 15, 12, 31) || inWindow(3, 10, 4, 30)) return 'exam'
  if (inWindow(10, 1, 11, 14) || inWindow(2, 15, 3, 9)) return 'test'
  if (inWindow(1, 5, 2, 14) || inWindow(8, 15, 9, 30)) return 'term'
  return ''
}

function phraseFor(date: Date): string {
  const h = date.getHours()
  const isNight = h >= 18 || h < 6
  const base = isNight ? NIGHT_PHRASES : DAY_PHRASES
  const season = seasonFor(date)
  const seasonal = season ? SEASON_PHRASES[season] : undefined
  const weekday = WEEKDAY_PHRASES[date.getDay()]
  const pool = [...base, ...(seasonal ?? []), ...(weekday ?? [])]
  const dayNum = Math.floor(date.getTime() / 86400000)
  return pool[dayNum % pool.length]!
}

function nextBoundary(now: Date): Date {
  const at6 = new Date(now)
  at6.setHours(6, 0, 0, 0)
  if (at6 <= now) at6.setDate(at6.getDate() + 1)
  const at18 = new Date(now)
  at18.setHours(18, 0, 0, 0)
  if (at18 <= now) at18.setDate(at18.getDate() + 1)
  return at6 < at18 ? at6 : at18
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer)
  const wait = nextBoundary(new Date()).getTime() - Date.now()
  refreshTimer = setTimeout(() => {
    cycledText.value = phraseFor(new Date())
    scheduleRefresh()
  }, wait)
}
onMounted(() => {
  cycledText.value = phraseFor(new Date())
  scheduleRefresh()
})
onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})
const isLoading = computed(() => drive.loading && drive.papers.length === 0)
// ⌘K from Home opens the global command palette (App.vue mounts it; it owns
// the shortcut — this page previously kept its own duplicate handler).
// (The book zone is reserved purely in CSS — see .section padding / .hero.)
</script>

<template>
  <div class="home">
    <!-- Line-art backdrop: book+pages bottom-left, moon+constellation top-right -->
    <div class="hero-art hero-art-book" aria-hidden="true" :style="{ backgroundImage: 'url(' + heroBook + ')' }" />
    <div class="hero-art hero-art-moon" aria-hidden="true" :style="{ backgroundImage: 'url(' + heroMoon + ')' }" />
    <!-- (tinted gradient wash removed per design pass) -->

    <!-- Hero: glass search dock over the art -->
    <section class="hero">
      <!-- (gradient glows removed per design pass) -->
      <div class="hero-inner">
        <h1 class="hero-title">
          <Transition name="cycle" mode="out-in">
            <span :key="cycledText">{{ cycledText }}</span>
          </Transition>
        </h1>

        <div ref="containerRef" class="search-dock">
          <Icon name="search" :size="18" class="search-icon" />
          <input
            v-model="query"
            ref="searchInput"
            class="search-input"
            type="text"
            autocomplete="off"
            placeholder="Search by course, topic, or title..."
            @input="onInput"
            @keydown="handleKeydown"
            @focus="onInput"
            @blur="handleBlur"
          />
          <kbd class="search-kbd"><Icon name="command" :size="11" />K</kbd>
          <div v-if="showDropdown && suggestions.length" class="autocomplete-dropdown">
            <button
              v-for="(s, i) in suggestions"
              :key="s.text + s.type"
              class="ac-item"
              :class="{ highlighted: highlightedIndex === i }"
              @mousedown.prevent="selectSuggestion(s.text)"
              @mouseenter="highlightedIndex = i"
            >
              <Icon :name="s.icon" :size="14" class="ac-icon" />
              <span class="ac-text">{{ s.text }}</span>
              <span class="ac-badge">{{ s.type }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick actions: bento grid (glass) -->
    <section class="section section-start rise glass-zone" style="--stagger: 80ms">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Start here</h2>
        </div>
        <div class="bento">
          <button class="bento-card bento-main" @click="router.push('/browse')">
            <div class="bento-icon"><Icon name="compass" :size="20" /></div>
            <div class="bento-copy">
              <div class="bento-title">Browse the shelves</div>
              <div class="bento-sub">Every college, every course — all {{ drive.stats.papers.toLocaleString() }} papers</div>
            </div>
            <Icon name="chevron" :size="16" class="bento-arrow" />
          </button>
          <button class="bento-card" @click="router.push({ name: 'search' })">
            <div class="bento-icon"><Icon name="search" :size="18" /></div>
            <div class="bento-copy">
              <div class="bento-title">Search</div>
              <div class="bento-sub">Find specific notes</div>
            </div>
            <Icon name="chevron" :size="16" class="bento-arrow" />
          </button>
          <button class="bento-card" @click="router.push({ name: 'upload' })">
            <div class="bento-icon"><Icon name="upload" :size="18" /></div>
            <div class="bento-copy">
              <div class="bento-title">Contribute</div>
              <div class="bento-sub">Share your notes</div>
            </div>
            <Icon name="chevron" :size="16" class="bento-arrow" />
          </button>
          <button class="bento-chip" @click="router.push({ name: 'browse' })">
            <Icon name="zap" :size="13" />
            Saved for later
            <Icon name="chevron" :size="14" class="bento-arrow" />
          </button>
        </div>
      </div>
    </section>

    <!-- Footprint strip: side-rule stats, no box -->
    <section class="section rise glass-zone" style="--stagger: 140ms">
      <div class="section-inner">
        <div class="footprint">
          <template v-if="isLoading">
            <div v-for="i in 4" :key="i" class="footprint-item">
              <div class="sk footprint-val" />
              <div class="sk footprint-lbl" />
            </div>
          </template>
          <template v-else>
            <div v-for="s in stats" :key="s.label" class="footprint-item">
              <div class="footprint-val">{{ s.value }}</div>
              <div class="footprint-lbl">{{ s.label }}</div>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Below the viewport line: hidden (not deleted) per the fixed-viewport
         home spec. v-show=false keeps them mounted-but-unrendered. -->
    <section class="section" v-show="false" v-if="!isLoading && quickSubjects.length">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Trending</h2>
          <button class="section-link" @click="router.push('/browse')">View all →</button>
        </div>
        <div class="trending-grid">
          <button
            v-for="(s, i) in quickSubjects"
            :key="s.id"
            class="trending-chip"
            :style="{ '--chip-delay': 40 * i + 'ms' }"
            @click="router.push({ name: 'subject', params: { id: s.id } })"
          >
            <span class="trending-name">{{ s.name }}</span>
            <span class="trending-count">{{ s.count }}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="section rise" style="--stagger: 200ms" v-show="false">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Recently added</h2>
          <button class="section-link" @click="router.push('/browse')">View all →</button>
        </div>
        <SkeletonCard v-if="isLoading" :count="3" size="sm" />
        <div v-else-if="drive.recentPapers.length" class="recent-scroll">
          <div
            v-for="p in drive.recentPapers.slice(0, 8)"
            :key="p.id"
            class="recent-card"
            @click="openPaper(p)"
          >
            <IndexStack :paper="p" size="sm" />
            <div class="recent-meta">
              <div class="recent-title">{{ p.title }}</div>
              <div class="recent-info">{{ p.type }} · {{ p.year }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-box">{{ drive.error || 'No papers yet.' }}</div>
      </div>
    </section>

    <section class="section rise" style="--stagger: 260ms" v-show="false">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Most loved</h2>
          <button class="section-link" @click="router.push('/browse')">View all →</button>
        </div>
        <SkeletonCard v-if="isLoading" :count="3" size="sm" />
        <div v-else-if="drive.lovedPapers.length" class="recent-scroll">
          <div
            v-for="p in drive.lovedPapers.slice(0, 8)"
            :key="p.id"
            class="recent-card"
            @click="openPaper(p)"
          >
            <IndexStack :paper="p" size="sm" />
            <div class="recent-meta">
              <div class="recent-title">{{ p.title }}</div>
              <div class="recent-info">{{ p.type }} · {{ p.year }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-box">{{ drive.error || 'No papers yet.' }}</div>
      </div>
    </section>

    <section class="section rise" style="--stagger: 320ms" v-show="false">
      <div class="section-inner">
        <div class="manifesto">
          <div class="manifesto-head">
            <span class="manifesto-bell"><Icon name="bell" :size="16" /></span>
            <h2 class="section-title">A library that runs itself</h2>
          </div>
          <p class="manifesto-copy">
            Bells Notes is built by students, for students — no accounts, no paywalls,
            no gatekeeping. Read anything, contribute in under a minute, and every
            paper is checked by real people before it reaches the shelf.
          </p>
          <div class="manifesto-points">
            <div class="m-point"><Icon name="flame" :size="15" /><span>Free forever — no account needed</span></div>
            <div class="m-point"><Icon name="layers" :size="15" /><span>{{ drive.stats.subjects.toLocaleString() }} subjects and counting</span></div>
            <div class="m-point"><Icon name="shield" :size="15" /><span>Human-reviewed before publishing</span></div>
          </div>
          <button class="btn btn-primary manifesto-cta" @click="router.push('/about')">
            How it works
            <Icon name="arrow-right" :size="14" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  animation: fade-in var(--dur-med) var(--ease-out);
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ============================================================
   Fixed-viewport home — everything inside 100dvh, no page scroll.
   Line-art backdrop + glass surfaces over a tinted gradient.
   ============================================================ */
.home {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 40px 40px 20px;
  background: var(--bg);
}

/* Line-art layers — book+pages bottom-left, moon+constellation top-right.
   Dark mode inverts the ink (screen blend keeps the paper transparent). */
.hero-art {
  position: absolute;
  background-repeat: no-repeat;
  background-size: contain;
  pointer-events: none;
  z-index: 0;
  opacity: 0.9;
}
.hero-art-book {
  left: -24px;
  bottom: -10px;
  width: min(46vw, 560px);
  height: 52%;
  background-position: left bottom;
}
.hero-art-moon {
  right: -30px;
  top: 44px;
  width: min(42vw, 500px);
  height: 46%;
  background-position: right top;
}
html.dark .hero-art {
  filter: invert(1);
  mix-blend-mode: screen;
  opacity: 0.5;
}

/* (tinted gradient wash removed per design pass) */

/* Glass recipe — nav/search/cards/stats all share it (nav is app-level) */
.glass-zone .bento-card,
.glass-zone .bento-chip {
  background: var(--material);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.06);
}
.glass-zone .bento-icon {
  background: rgba(255, 255, 255, 0.5);
}
.glass-zone .footprint-item + .footprint-item {
  border-left-color: rgba(255, 255, 255, 0.5);
}
html.dark .glass-zone .bento-card,
html.dark .glass-zone .bento-chip {
  background: rgba(28, 28, 30, 0.55);
  border-color: rgba(255, 255, 255, 0.14);
}
html.dark .glass-zone .bento-icon {
  background: rgba(255, 255, 255, 0.08);
}
html.dark .glass-zone .footprint-item + .footprint-item {
  border-left-color: rgba(255, 255, 255, 0.12);
}

/* Staggered section entrance */
.rise {
  animation: rise-in 640ms var(--ease-out) both;
  animation-delay: var(--stagger, 0ms);
}
@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rise {
    animation: none;
  }
}

/* Hero — top band of the fixed viewport; search docks right of the book zone */
.hero {
  position: relative;
  /* z-2: the autocomplete dropdown OVERFLOWS the hero band into the bento
     section's area — equal z would let the later-in-DOM section glass paint
     OVER the dropdown (see-through suggestions). Hero wins the tie. */
  z-index: 2;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  /* Same horizontal padding recipe as .section so hero + glass zones
     share ONE column. Asymmetric on purpose: the book-zone offset is
     smaller on the left than the 82px right pad, shifting the whole
     column ~50px LEFT of true center (moon art owns the top-right). */
  padding: clamp(40px, 8.5vh, 80px) 82px 0 calc(32px + clamp(0px, 14vw, 170px));
  width: 100%;
}
.hero-inner {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  /* Mirrors .section-inner so both columns share edges. */
  width: min(960px, 100%);
  margin: 0 auto;
}
/* (gradient glows removed per design pass) */

/* (sculpture + badge styles retired) */

/* (badge styles retired) */
.hero-title {
  font-family: var(--font-heading);
  font-size: clamp(26px, 4.2vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.033em;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  min-height: 1.2em;
  max-width: 620px;
}

/* Search dock — glass (matches nav capsule material) */
.search-dock {
  position: relative;
  margin-top: 30px;
  display: flex;
  align-items: center;
  background: var(--material-strong);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.08);
  transition:
    box-shadow var(--dur-med) var(--ease-out),
    transform var(--dur-med) var(--ease-out);
}
html.dark .search-dock {
  background: rgba(28, 28, 30, 0.6);
  border-color: rgba(255, 255, 255, 0.14);
}
.search-dock:focus-within {
  transform: translateY(-2px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 16px 40px rgba(0, 0, 0, 0.12);
}
.search-icon {
  position: absolute;
  left: 18px;
  color: var(--text-tertiary);
  pointer-events: none;
}
.search-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  padding: 17px 12px 17px 48px;
  font-size: 16px;
  color: var(--text-primary);
  font-family: var(--font-sans);
}
.search-input:focus {
  outline: none;
}
.search-input::placeholder {
  color: var(--text-tertiary);
}
.search-kbd {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-right: 14px;
  padding: 4px 8px;
  border-radius: var(--r-sm);
  background: var(--paper-2);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .search-kbd {
    display: none;
  }
}
.autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border: 0.5px solid var(--rule);
  border-radius: var(--r-lg);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  overflow: hidden;
  z-index: 100;
  max-height: 320px;
  overflow-y: auto;
}
.ac-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
  transition: background var(--dur-fast);
}
.ac-item:hover,
.ac-item.highlighted {
  background: var(--bg-default);
}
.ac-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.ac-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-badge {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-quiet);
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: var(--r-xs);
  flex-shrink: 0;
}

/* Section layout — glass zones align right of the book's corner.
   The two auto margins split the leftover viewport height evenly,
   so the void breathes BETWEEN zones instead of pooling in one place. */
.section {
  position: relative;
  z-index: 1;
  /* Left offset smaller than right pad → shared column sits ~50px left
     of center (matches .hero; see note there). */
  padding: 0 82px 0 calc(32px + clamp(0px, 14vw, 170px));
  margin-top: auto;
}
/* :first-of-type can't be used here — .hero is the first <section>,
   so the bento zone is never first-of-type. Explicit class instead.
   (padding-top removed when the footer joined the viewport — the two
   auto margins alone now read visually even.) */
.section-start {
  padding-top: 0;
}
.glass-zone + .glass-zone {
  margin-top: auto;
  padding-bottom: 8px;
}
.section-inner {
  max-width: 960px;
  margin: 0 auto;
}
.section-header {
  margin-bottom: 14px;
}
.section-title {
  font-size: 16px;
}
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20px;
}
.section-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0;
}
.section-link {
  font-size: 13px;
  color: var(--text-tertiary);
  transition: color var(--dur-fast);
}
.section-link:hover {
  color: var(--text-primary);
}

/* Bento quick actions */
.bento {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-areas:
    'main a b'
    'main c c';
  gap: 12px;
}
/* Higher specificity than .bento-card so the column layout wins
   (the card base sets align-items: center later in the cascade). */
.bento .bento-main {
  grid-area: main;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 188px;
  padding: 22px;
}
.bento-main .bento-arrow {
  position: absolute;
  right: 18px;
  top: 18px;
}
.bento-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: none;
  border-radius: var(--r-lg);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 14px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    box-shadow var(--dur-med) var(--ease-out);
  text-align: left;
}
.bento-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 16px 36px rgba(0, 0, 0, 0.1);
}
.bento-card:active {
  transform: scale(0.98);
}
.bento-main .bento-title {
  font-size: 17px;
}
.bento-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--paper-2);
  color: var(--text-primary);
  flex-shrink: 0;
}
.bento-main .bento-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
}
.bento-title {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}
.bento-sub {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin-top: 3px;
}
.bento-arrow {
  color: var(--text-quiet);
  margin-left: auto;
  flex-shrink: 0;
  transition: transform var(--dur-fast) var(--ease-out);
}
.bento-card:hover .bento-arrow {
  transform: translateX(3px);
  color: var(--text-primary);
}
.bento-chip {
  grid-area: c;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 980px;
  background: var(--material);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
  border: var(--hairline);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color var(--dur-fast),
    transform var(--dur-fast) var(--ease-spring);
}
.bento-chip:hover {
  color: var(--text-primary);
}
.bento-chip:active {
  transform: scale(0.97);
}
.bento-chip .bento-arrow {
  margin-left: auto;
}
@media (max-width: 720px) {
  .bento {
    grid-template-columns: 1fr;
    grid-template-areas: 'main' 'a' 'b' 'c';
  }
  .bento-main {
    flex-direction: row;
    align-items: center;
  }
}

/* Footprint strip — glass-washed stats */
.footprint {
  display: flex;
  padding: 0;
}
.footprint-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 32px 8px;
}
.footprint-item + .footprint-item {
  border-left: 1px solid rgba(255, 255, 255, 0.5);
}
.footprint-item:first-child {
  padding-left: 0;
}
.footprint-val {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  font-family: var(--font-mono);
}
.footprint-lbl {
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}
html.dark .footprint-item + .footprint-item {
  border-left-color: rgba(255, 255, 255, 0.12);
}
@media (max-width: 720px) {
  .footprint {
    flex-wrap: wrap;
    gap: 12px 0;
  }
  .footprint-item {
    flex: 1 1 40%;
    padding: 6px 20px;
  }
  .footprint-item:nth-child(3) {
    border-left: none;
    padding-left: 0;
  }
  .footprint-val {
    font-size: 18px;
  }
}

/* Trending chips — staggered entrance, no borders */
.trending-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.trending-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: none;
  border-radius: 980px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-elevated);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 3px 10px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  animation: rise-in 480ms var(--ease-out) both;
  animation-delay: var(--chip-delay, 0ms);
  transition:
    transform var(--dur-fast) var(--ease-spring),
    box-shadow var(--dur-fast) var(--ease-out);
}
@media (prefers-reduced-motion: reduce) {
  .trending-chip {
    animation: none;
  }
}
.trending-chip:hover {
  transform: translateY(-2px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 10px 22px rgba(0, 0, 0, 0.1);
}
.trending-chip:active {
  transform: scale(0.96);
}
.trending-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}
.trending-chip:hover .trending-count {
  color: var(--bg-default);
  opacity: 0.6;
}

/* Recent papers — horizontal scroll row */
.recent-scroll {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
}
.recent-scroll::-webkit-scrollbar {
  height: 4px;
}
.recent-scroll::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--r-xs);
}
.recent-card {
  flex-shrink: 0;
  width: 140px;
  scroll-snap-align: start;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.recent-card:hover {
  transform: translateY(-4px);
}
.recent-meta {
  margin-top: 10px;
}
.recent-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.recent-info {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
  font-family: var(--font-mono);
}

/* Skeleton */
.sk {
  position: relative;
  overflow: hidden;
  background: var(--paper-2);
  border-radius: var(--r-sm);
}
.sk::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bg-skeleton);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.stat-val { width: 48px; height: 22px; }
.stat-lbl { width: 64px; height: 10px; }

/* Manifesto panel — quiet authority */
.manifesto {
  position: relative;
  padding: 40px 44px;
  border-radius: var(--r-2xl);
  background: linear-gradient(135deg, var(--paper-2), transparent 60%);
  overflow: hidden;
}
.manifesto::before {
  content: '';
  position: absolute;
  right: -60px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(120, 119, 255, 0.08), transparent 65%);
}
.manifesto-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.manifesto-bell {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--text-primary);
  color: var(--bg-elevated);
  flex-shrink: 0;
}
.manifesto-copy {
  font-size: 15.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  max-width: 560px;
  margin: 0 0 20px;
}
.manifesto-points {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin-bottom: 24px;
}
.m-point {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.m-point svg {
  color: var(--text-tertiary);
}
.manifesto-cta {
  display: inline-flex;
}
@media (max-width: 640px) {
  .manifesto {
    padding: 28px 24px;
    border-radius: var(--r-xl);
  }
}

/* Empty */
.empty-box {
  padding: 48px;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--paper-2);
  border-radius: var(--r-md);
}

/* Cycle transitions */
.cycle-enter-active,
.cycle-leave-active {
  transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out);
}
.cycle-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.cycle-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ============================================================
   Narrow (≤900px): book drops below the fold-line; UI stacks full-width
   ============================================================ */
@media (max-width: 900px) {
  .home {
    padding: 24px 20px 14px;
  }
  .hero {
    padding: 8px 20px;
  }
  .hero-art-book {
    width: 72vw;
    height: 40%;
    left: -20px;
    bottom: -8px;
    opacity: 0.75;
  }
  .hero-art-moon {
    width: 58vw;
    height: 34%;
    right: -24px;
    top: 36px;
    opacity: 0.6;
  }
  .section {
    padding: 0 20px;
  }
}

/* ============================================================
   Phone (≤720px): compact vertical budget — bento reflows to
   main / a+b / chip so everything still fits one 100dvh screen.
   ============================================================ */
@media (max-width: 720px) {
  .stats-row { gap: 24px; flex-wrap: wrap; }
  .recent-card { width: 120px; }
  .hero-title {
    font-size: clamp(21px, 6.4vw, 28px);
  }
  .search-dock {
    margin-top: 12px;
    border-radius: 15px;
  }
  .search-input {
    padding-top: 13px;
    padding-bottom: 13px;
    font-size: 15px;
  }
  .section-header {
    margin-bottom: 8px;
  }
  .section-title {
    font-size: 14px;
  }
  .bento {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'main main'
      'a b'
      'c c';
    gap: 8px;
  }
  .bento-main {
    flex-direction: row;
    align-items: center;
  }
  .bento-main .bento-sub {
    display: none;
  }
  .bento-card {
    padding: 12px 14px;
  }
  .bento-main .bento-title {
    font-size: 15px;
  }
  .bento-title {
    font-size: 13px;
  }
  .bento-sub {
    font-size: 11px;
    margin-top: 2px;
  }
  .bento-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }
  .bento-chip {
    padding: 9px 14px;
    font-size: 12px;
  }
  .footprint-item {
    padding: 4px 14px;
  }
  .footprint-val {
    font-size: 16px;
  }
  .footprint-lbl {
    font-size: 8.5px;
  }
}
</style>
