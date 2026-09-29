<script setup lang="ts">
// Search — full-facet search with highlighted matches. Rewritten for Bells Notes.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchAutocomplete } from '@/composables/useSearchAutocomplete'
import { useDriveStore } from '@/stores/drive'
import { formatCount } from '@/script/design'
import type { Paper } from '@/script/design'
import Icon from '@/components/Icon.vue'
import IndexStack from '@/components/IndexStack.vue'
import Avatar from '@/components/Avatar.vue'

const drive = useDriveStore()
const route = useRoute()
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

query.value = typeof route.query.q === 'string' ? route.query.q : ''
watch(
  () => route.query.q,
  (q) => {
    query.value = typeof q === 'string' ? q : ''
  },
)

const selSubjects = ref<string[]>([])
const selTypes = ref<string[]>([])
const sort = ref<'relevance' | 'newest' | 'votes' | 'downloads'>('relevance')
const showFacets = ref(false)

const yearBounds = computed(() => {
  const years = drive.papers.map((p) => p.year)
  const min = years.length ? Math.min(...years) : 2020
  const max = years.length ? Math.max(...years) : 2026
  return { min, max }
})
const yearMin = ref(yearBounds.value.min)
const yearMax = ref(yearBounds.value.max)

watch(
  () => yearBounds.value,
  (b) => {
    if (yearMin.value < b.min) yearMin.value = b.min
    if (yearMax.value > b.max) yearMax.value = b.max
  },
)

const results = computed<Paper[]>(() => {
  let list = drive.search(query.value, {
    subjects: selSubjects.value.length ? selSubjects.value : undefined,
    types: selTypes.value.length ? selTypes.value : undefined,
    yearMin: yearMin.value,
    yearMax: yearMax.value,
  })
  if (sort.value === 'newest') list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  else if (sort.value === 'votes') list = [...list].sort((a, b) => b.upvotes - a.upvotes)
  else if (sort.value === 'downloads') list = [...list].sort((a, b) => b.downloads - a.downloads)
  return list
})

const PAGE = 10
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(results.value.length / PAGE)))
const pageResults = computed(() => results.value.slice((page.value - 1) * PAGE, page.value * PAGE))

const isLoading = computed(() => drive.loading && drive.papers.length === 0)

watch([selSubjects, selTypes, sort, query], () => {
  page.value = 1
})

const SORTS: { id: typeof sort.value; label: string }[] = [
  { id: 'relevance', label: 'Relevant' },
  { id: 'newest', label: 'Newest' },
  { id: 'votes', label: 'Most upvoted' },
  { id: 'downloads', label: 'Most downloaded' },
]

function toggleSubject(id: string) {
  selSubjects.value = selSubjects.value.includes(id)
    ? selSubjects.value.filter((s) => s !== id)
    : [...selSubjects.value, id]
}
function toggleType(t: string) {
  selTypes.value = selTypes.value.includes(t)
    ? selTypes.value.filter((x) => x !== t)
    : [...selTypes.value, t]
}
function resetFilters() {
  selSubjects.value = []
  selTypes.value = []
  yearMin.value = yearBounds.value.min
  yearMax.value = yearBounds.value.max
}

function setYearMin(v: number) {
  yearMin.value = Math.min(v, yearMax.value)
}
function setYearMax(v: number) {
  yearMax.value = Math.max(v, yearMin.value)
}

function segments(text: string): { text: string; hit: boolean }[] {
  const q = query.value.trim().toLowerCase()
  if (!q) return [{ text, hit: false }]
  const out: { text: string; hit: boolean }[] = []
  let rest = text
  let idx = rest.toLowerCase().indexOf(q)
  while (idx !== -1) {
    if (idx > 0) out.push({ text: rest.slice(0, idx), hit: false })
    out.push({ text: rest.slice(idx, idx + q.length), hit: true })
    rest = rest.slice(idx + q.length)
    idx = rest.toLowerCase().indexOf(q)
  }
  if (rest) out.push({ text: rest, hit: false })
  return out
}

const visiblePages = computed<number[]>(() => {
  const total = pageCount.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: number[] = []
  const first = Math.max(1, page.value - 2)
  const last = Math.min(total, first + 4)
  for (let i = first; i <= last; i++) pages.push(i)
  return pages
})

function openPaper(p: Paper) {
  router.push({ name: 'paper', params: { id: p.id } })
}

function handleBlur(): void {
  window.setTimeout(() => {
    showDropdown.value = false
    highlightedIndex.value = -1
  }, 120)
}
</script>

<template>
  <div class="search">
    <div class="search-header">
      <div class="eyebrow">Search</div>
      <div ref="containerRef" class="search-input-wrap">
        <Icon name="search" :size="18" class="search-icon" />
        <input
          v-model="query"
          class="search-input"
          type="text"
          autocomplete="off"
          placeholder="Find papers, subjects, courses…"
          @input="onInput"
          @keydown="handleKeydown"
          @focus="onInput"
          @blur="handleBlur"
        />
        <div v-if="showDropdown && suggestions.length" class="autocomplete">
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
      <div class="result-count">
        {{ results.length.toLocaleString() }} result<span v-if="results.length !== 1">s</span>
        <span v-if="query"> for <strong>"{{ query }}"</strong></span>
      </div>
    </div>

    <div class="search-body">
      <!-- Filter rail — iOS toggle chips grouped under quiet headers -->
      <button class="filter-toggle" :class="{ open: showFacets }" @click="showFacets = !showFacets">
        <Icon name="filter" :size="14" />
        {{ showFacets ? 'Hide filters' : 'Filters' }}
      </button>
      <aside class="filters" :class="{ hidden: !showFacets }">
        <div class="filter-group">
          <div class="filter-label">Subject</div>
          <div class="chip-cloud">
            <button
              v-for="s in drive.subjects.slice(0, 12)"
              :key="s.id"
              class="chip"
              :class="{ on: selSubjects.includes(s.id) }"
              :aria-pressed="selSubjects.includes(s.id)"
              @click="toggleSubject(s.id)"
            >
              {{ s.name }}
              <span class="chip-count">{{ s.count }}</span>
            </button>
          </div>
        </div>
        <div class="filter-group">
          <div class="filter-label">Type</div>
          <div class="chip-cloud">
            <button
              v-for="t in ['Study Guide', 'Lecture Notes', 'Past Exam', 'Problem Set', 'Essay', 'Cheat Sheet']"
              :key="t"
              class="chip"
              :class="{ on: selTypes.includes(t) }"
              :aria-pressed="selTypes.includes(t)"
              @click="toggleType(t)"
            >
              {{ t }}
            </button>
          </div>
        </div>
        <div class="filter-group">
          <div class="filter-label">Year</div>
          <div class="year-range">
            <div class="year-track">
              <input type="range" class="year-input" :min="yearBounds.min" :max="yearBounds.max" :value="yearMin" @input="setYearMin(Number(($event.target as HTMLInputElement).value))" />
              <input type="range" class="year-input" :min="yearBounds.min" :max="yearBounds.max" :value="yearMax" @input="setYearMax(Number(($event.target as HTMLInputElement).value))" />
            </div>
            <div class="year-labels">
              <span>{{ yearMin }}</span>
              <span>—</span>
              <span>{{ yearMax }}</span>
            </div>
          </div>
        </div>
        <button class="btn-reset" @click="resetFilters">
          <Icon name="refresh" :size="12" /> Reset filters
        </button>
      </aside>

      <!-- Results -->
      <main>
        <div class="sort-row">
          <button v-for="s in SORTS" :key="s.id" class="sort-tab" :class="{ active: sort === s.id }" @click="sort = s.id">
            {{ s.label }}
          </button>
        </div>

        <div v-if="isLoading" class="skeleton">
          <div v-for="i in 5" :key="i" class="sk-row">
            <div class="sk-stack" />
            <div class="sk-content">
              <div class="sk-line sk-tag" />
              <div class="sk-line sk-title" />
              <div class="sk-line sk-sub" />
            </div>
          </div>
        </div>

        <div v-else-if="pageResults.length">
          <div v-for="p in pageResults" :key="p.id" class="result-row" @click="openPaper(p)">
            <IndexStack :paper="p" size="xs" />
            <div class="result-main">
              <div class="result-tags">
                <span class="tag">{{ p.subjectName }}</span>
                <span class="tag tag-type">{{ p.type }}</span>
              </div>
              <div class="result-title">
                <template v-for="(seg, i) in segments(p.title)" :key="i">
                  <mark v-if="seg.hit">{{ seg.text }}</mark>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </div>
              <div class="result-sub">{{ p.subtitle }}</div>
              <div class="result-meta">
                <Avatar :name="p.contributorName" :size="18" />
                <span>{{ p.contributorName }}</span>
                <span class="dot">·</span>
                <span>{{ p.year }}</span>
                <span class="dot">·</span>
                <span>{{ p.pages }} pp</span>
              </div>
            </div>
            <div class="result-side">
              <span class="votes">↑ {{ formatCount(p.upvotes) }}</span>
              <span class="dl-count">{{ formatCount(p.downloads) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-results">
          <div class="no-title">No papers found.</div>
          <div class="no-sub">Try different keywords or fewer filters.</div>
        </div>

        <div v-if="pageCount > 1" class="pagination">
          <button v-for="n in visiblePages" :key="n" class="page-btn" :class="{ active: page === n }" @click="page = n">{{ n }}</button>
          <span v-if="pageCount > 7 && !visiblePages.includes(pageCount)" class="ellipsis">…</span>
          <button v-if="pageCount > 7 && !visiblePages.includes(pageCount)" class="page-btn" @click="page = pageCount">{{ pageCount }}</button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.search { position: relative; max-width: var(--max-content); margin: 0 auto; padding: 48px 32px; }
/* Ambient glow — mirrors Home hero field */
.search::before { content: ''; position: absolute; top: -200px; left: 50%; width: 620px; height: 440px; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(circle, rgba(120, 119, 255, 0.12), transparent 62%); filter: blur(90px); pointer-events: none; z-index: -1; }
html.dark .search::before { background: radial-gradient(circle, rgba(120, 119, 255, 0.17), transparent 62%); }
.search-header { margin-bottom: 32px; }
.eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; color: var(--text-tertiary); font-family: var(--font-sans); margin-bottom: 14px; }
.search-input-wrap { position: relative; max-width: 780px; display: flex; align-items: center; }
.search-icon { position: absolute; left: 18px; color: var(--text-tertiary); pointer-events: none; }
.search-input { width: 100%; background: var(--material-strong); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur); border: var(--hairline); border-radius: 18px; padding: 15px 20px 15px 50px; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; color: var(--text-primary); font-family: var(--font-sans); box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08); transition: box-shadow var(--dur-med) var(--ease-out), transform var(--dur-med) var(--ease-out); }
.search-input::placeholder { color: var(--text-quiet); font-weight: 500; }
.search-input:focus { outline: none; transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,0.05), 0 16px 40px rgba(0,0,0,0.12); }
.result-count { margin-top: 14px; color: var(--text-secondary); font-size: 14px; }
.result-count strong { color: var(--text-primary); font-weight: 600; }

/* Autocomplete — floating frosted panel */
.autocomplete { position: absolute; top: 100%; left: 0; right: 0; margin-top: 6px; background: var(--material-strong); -webkit-backdrop-filter: var(--blur-strong); backdrop-filter: var(--blur-strong); border: var(--hairline); border-radius: var(--r-md); box-shadow: 0 2px 4px rgba(0,0,0,0.05), 0 16px 40px rgba(0,0,0,0.12); overflow: hidden; z-index: 100; max-height: 320px; overflow-y: auto; }
.ac-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 14px; text-align: left; font-family: var(--font-sans); font-size: 13.5px; color: var(--text-primary); background: transparent; cursor: pointer; transition: background 0.12s; }
.ac-item:hover, .ac-item.highlighted { background: var(--paper-2); }
.ac-icon { color: var(--text-tertiary); flex-shrink: 0; }
.ac-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-badge { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); background: var(--paper-2); padding: 3px 8px; border-radius: 980px; flex-shrink: 0; border: none; }

.search-body { display: grid; grid-template-columns: 240px 1fr; gap: 40px; }

/* Filters — grouped quiet cards */
.filter-toggle { display: none; align-items: center; gap: 6px; justify-content: center; padding: 10px 14px; font-size: 13px; font-weight: 600; border: none; border-radius: 980px; background: var(--paper-2); color: var(--text-primary); margin-bottom: 16px; cursor: pointer; }
.filter-toggle.open { background: var(--text-primary); color: var(--bg-elevated); }
.filters { display: flex; flex-direction: column; gap: 22px; position: sticky; top: 72px; }
.filter-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; color: var(--text-tertiary); font-family: var(--font-sans); margin-bottom: 10px; }
.filter-group { display: flex; flex-direction: column; }
.chip-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 980px; border: var(--hairline); background: var(--bg-elevated); font-size: 12.5px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all var(--dur-fast) var(--ease-out); }
.chip:hover { border-color: var(--rule-strong); color: var(--text-primary); transform: translateY(-1px); }
.chip:active { transform: scale(0.96); }
.chip.on { background: var(--text-primary); border-color: var(--text-primary); color: var(--bg-elevated); font-weight: 600; }
.chip-count { font-family: var(--font-mono); font-size: 10px; opacity: 0.55; }
.filter-count { font-size: 10px; color: var(--text-quiet); font-family: var(--font-mono); }
.year-range { padding: 4px 2px; }
.year-track { position: relative; height: 20px; }
.year-input { position: absolute; width: 100%; height: 20px; margin: 0; -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; }
.year-input::-webkit-slider-runnable-track { height: 3px; background: var(--border-strong); border-radius: var(--r-xs); }
.year-input::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--text-primary); border: 2px solid var(--bg-default); pointer-events: auto; cursor: pointer; margin-top: -5px; }
.year-input::-moz-range-track { height: 3px; background: var(--border-strong); border-radius: var(--r-xs); }
.year-input::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--text-primary); border: 2px solid var(--bg-default); pointer-events: auto; cursor: pointer; }
.year-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-quiet); font-family: var(--font-mono); margin-top: 6px; }
.btn-reset { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: var(--paper-2); border: none; border-radius: 980px; padding: 8px 14px; cursor: pointer; transition: all var(--dur-fast) var(--ease-out); }
.btn-reset:hover { color: var(--text-primary); transform: translateY(-1px); }

/* Results — segmented sort control (matches nav + paper tabs) */
.sort-row { display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 980px; background: var(--paper-2); width: fit-content; margin-bottom: 16px; }
.sort-tab { padding: 7px 14px; font-size: 12.5px; font-weight: 600; letter-spacing: -0.01em; color: var(--text-secondary); background: none; border: none; border-radius: 980px; cursor: pointer; white-space: nowrap; transition: color var(--dur-fast), background-color var(--dur-fast), box-shadow var(--dur-fast); }
.sort-tab:hover { color: var(--text-primary); }
.sort-tab.active { color: var(--text-primary); background: var(--bg-elevated); box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06); }
.result-row { display: grid; grid-template-columns: 80px 1fr auto; gap: 20px; padding: 24px 16px; border-radius: var(--r-md); cursor: pointer; transition: background var(--dur-fast), transform var(--dur-fast) var(--ease-out); align-items: start; }
.result-row:hover { background: var(--paper-2); transform: translateX(2px); }
.result-tags { display: flex; gap: 6px; margin-bottom: 8px; }
.result-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 20px; font-weight: 500; letter-spacing: -0.02em; color: var(--text-primary); line-height: 1.2; margin-bottom: 4px; }
.result-sub { font-size: 14px; color: var(--text-quiet); margin-bottom: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
.result-meta .dot { opacity: 0.4; }
.result-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.votes { font-size: 11px; color: var(--text-primary); font-family: var(--font-mono); }
.dl-count { font-size: 10px; color: var(--text-quiet); font-family: var(--font-mono); }

/* Skeleton */
.skeleton { display: flex; flex-direction: column; }
.sk-row { display: flex; gap: 20px; padding: 24px 16px; align-items: start; }
.sk-stack { width: 64px; height: 88px; border-radius: var(--r-sm); background: var(--bg-elevated); border: none; position: relative; overflow: hidden; }
.sk-stack::after { content: ''; position: absolute; inset: 0; background: var(--bg-skeleton); animation: pulse 2s ease-in-out infinite; }
.sk-content { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.sk-line { height: 12px; border-radius: var(--r-sm); background: var(--bg-elevated); position: relative; overflow: hidden; }
.sk-line::after { content: ''; position: absolute; inset: 0; background: var(--bg-skeleton); animation: pulse 2s ease-in-out infinite; }
.sk-tag { width: 80px; height: 16px; }
.sk-title { width: 70%; height: 18px; }
.sk-sub { width: 40%; }
@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.no-results { padding: 80px 16px; text-align: center; }
.no-title { font-size: 20px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
.no-sub { font-size: 14px; color: var(--text-quiet); }

/* Pagination — pill buttons */
.pagination { display: flex; justify-content: center; gap: 6px; margin-top: 32px; }
.page-btn { width: 36px; height: 36px; border-radius: 50%; font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); background: var(--bg-elevated); border: none; box-shadow: 0 1px 2px rgba(0,0,0,0.04); cursor: pointer; transition: all 0.15s var(--ease-spring); }
.page-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); color: var(--text-primary); }
.page-btn.active { background: var(--text-primary); color: var(--bg-elevated); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.ellipsis { display: flex; align-items: center; padding: 0 4px; color: var(--text-quiet); }

@media (max-width: 900px) {
  .search-body { grid-template-columns: 1fr; }
  .filter-toggle { display: flex; }
  .filters.hidden { display: none; }
}
@media (max-width: 640px) {
  .search { padding: 32px 20px; }
  .search-input { font-size: 19px; padding: 13px 16px 13px 46px; }
  .search-icon { left: 16px; }
  .result-count { margin-bottom: 24px; font-size: 13px; }
  .sort-row { gap: 14px; overflow-x: auto; scrollbar-width: none; }
  .sort-row::-webkit-scrollbar { display: none; }
  .result-row { grid-template-columns: 56px 1fr; gap: 14px; padding: 18px 8px; }
  .result-side { grid-column: 2; flex-direction: row; align-items: center; gap: 12px; }
  .result-title { font-size: 17px; }
  .result-meta { flex-wrap: wrap; row-gap: 4px; }
  .pagination { flex-wrap: wrap; gap: 4px; }
  .page-btn { width: 32px; height: 32px; font-size: 12px; }
  .no-results { padding: 48px 8px; }
}
</style>
