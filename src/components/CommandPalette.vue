<script setup lang="ts">
// CommandPalette — macOS-Spotlight-style ⌘K launcher. Searches actions,
// subjects, and papers; full keyboard navigation; teleported overlay.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDriveStore } from '@/stores/drive'
import { useTheme } from '@/composables/useTheme'
import Icon from './Icon.vue'
import type { Paper } from '@/script/design'

const open = ref(false)
const query = ref('')
const active = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const router = useRouter()
const drive = useDriveStore()
const { toggle: toggleTheme } = useTheme()

function openPalette(): void {
  open.value = true
  query.value = ''
  active.value = 0
}
function close(): void {
  open.value = false
}

type Row = {
  id: string
  group: 'Actions' | 'Subjects' | 'Papers'
  icon: string
  label: string
  sub?: string
  run: () => void
}

const ACTIONS: Row[] = [
  { id: 'a-home', group: 'Actions', icon: 'home', label: 'Go to Home', run: () => router.push('/') },
  { id: 'a-browse', group: 'Actions', icon: 'compass', label: 'Browse the library', sub: 'Colleges → programs → levels', run: () => router.push('/browse') },
  { id: 'a-search', group: 'Actions', icon: 'search', label: 'Open Search', run: () => router.push({ name: 'search' }) },
  { id: 'a-upload', group: 'Actions', icon: 'upload', label: 'Contribute a paper', sub: 'Upload notes or past questions', run: () => router.push({ name: 'upload' }) },
  { id: 'a-about', group: 'Actions', icon: 'info', label: 'About Bells Notes', run: () => router.push('/about') },
  { id: 'a-admin', group: 'Actions', icon: 'shield', label: 'Moderation queue', sub: 'Admin', run: () => router.push('/admin') },
]

function themeRow(): Row {
  const dark = document.documentElement.classList.contains('dark')
  return {
    id: 'a-theme',
    group: 'Actions',
    icon: dark ? 'sun' : 'moon',
    label: dark ? 'Switch to light mode' : 'Switch to dark mode',
    sub: 'Theme',
    run: () => toggleTheme(),
  }
}

function themeMatches(q: string): Row[] {
  // Match on theme words, not just the label ("dark" should find the
  // "switch to light" action and vice versa).
  const t = themeRow()
  const hay = `${t.label} theme mode dark light appearance`.toLowerCase()
  return hay.includes(q) ? [t] : []
}

function goPaper(p: Paper): void {
  router.push({ name: 'paper', params: { id: p.id } })
}

const paperRows = computed<Row[]>(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? drive.papers.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.subjectName || '').toLowerCase().includes(q) ||
          (p.courseName || '').toLowerCase().includes(q),
      )
    : drive.recentPapers
  return list.slice(0, q ? 8 : 5).map((p) => ({
    id: `p-${p.id}`,
    group: 'Papers' as const,
    icon: 'file',
    label: p.title,
    sub: `${p.type} · ${p.year}`,
    run: () => goPaper(p),
  }))
})

const subjectRows = computed<Row[]>(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? drive.subjects.filter((s) => s.name.toLowerCase().includes(q))
    : drive.subjects.slice(0, 4)
  return list.slice(0, q ? 5 : 4).map((s) => ({
    id: `s-${s.id}`,
    group: 'Subjects' as const,
    icon: 'books',
    label: s.name,
    sub: `${s.count} papers`,
    run: () => router.push({ name: 'subject', params: { id: s.id } }),
  }))
})

const rows = computed<Row[]>(() => {
  const q = query.value.trim().toLowerCase()
  const actions = ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(q))
  if (q) {
    return [...actions, ...themeMatches(q), ...subjectRows.value, ...paperRows.value]
  }
  return [{ ...themeRow() }, ...actions, ...subjectRows.value, ...paperRows.value]
})

watch(rows, () => {
  active.value = 0
})

const grouped = computed(() => {
  const order: Row['group'][] = ['Actions', 'Subjects', 'Papers']
  return order
    .map((g) => ({ group: g, items: rows.value.filter((r) => r.group === g) }))
    .filter((g) => g.items.length)
})

function flatIndex(id: string): number {
  return rows.value.findIndex((r) => r.id === id)
}

function onKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value ? close() : openPalette()
    return
  }
  if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    close()
  }
}

function onPaletteKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, rows.value.length - 1)
    scrollActive()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
    scrollActive()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const row = rows.value[active.value]
    if (row) {
      close()
      row.run()
    }
  }
}

function scrollActive(): void {
  requestAnimationFrame(() => {
    const el = listEl.value?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function choose(row: Row): void {
  close()
  row.run()
}

watch(open, (v) => {
  if (v) requestAnimationFrame(() => inputEl.value?.focus())
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <!-- Explicit duration: removal is timer-driven, so a missed
         transitionend (cold CSS, reduced-motion) can never strand the scrim. -->
    <Transition name="palette" :duration="{ enter: 300, leave: 180 }">
      <div v-if="open" class="scrim" @mousedown.self="close">
        <div class="palette" role="dialog" aria-label="Command palette">
          <div class="field">
            <Icon name="search" :size="17" class="field-icon" />
            <input
              ref="inputEl"
              v-model="query"
              class="field-input"
              type="text"
              placeholder="Search papers, subjects, actions…"
              autocomplete="off"
              @keydown="onPaletteKey"
            />
            <kbd class="esc">esc</kbd>
          </div>
          <div ref="listEl" class="list">
            <div v-for="g in grouped" :key="g.group" class="group">
              <div class="group-label">{{ g.group }}</div>
              <button
                v-for="r in g.items"
                :key="r.id"
                class="row"
                :data-active="flatIndex(r.id) === active"
                @click="choose(r)"
                @mousemove="active = flatIndex(r.id)"
              >
                <span class="row-icon"><Icon :name="r.icon" :size="15" /></span>
                <span class="row-main">
                  <span class="row-label">{{ r.label }}</span>
                  <span v-if="r.sub" class="row-sub">{{ r.sub }}</span>
                </span>
                <Icon v-if="flatIndex(r.id) === active" name="arrow-right" :size="13" class="row-go" />
              </button>
            </div>
            <div v-if="!rows.length" class="empty">Nothing matches "{{ query }}".</div>
          </div>
          <div class="foot">
            <span class="hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span class="hint"><kbd>↵</kbd> open</span>
            <span class="hint"><kbd>⌘K</kbd> toggle</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--overlay);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  padding: 14vh 20px 20px;
}

.palette {
  width: 100%;
  max-width: 580px;
  max-height: 460px;
  display: flex;
  flex-direction: column;
  background: var(--material-strong);
  -webkit-backdrop-filter: var(--blur-strong);
  backdrop-filter: var(--blur-strong);
  border: var(--hairline);
  border-radius: 18px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.1),
    0 32px 80px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

/* Field */
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 14px;
  border-bottom: 0.5px solid var(--rule);
}
.field-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.field-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-sans);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.015em;
  color: var(--text-primary);
}
.field-input::placeholder {
  color: var(--text-quiet);
  font-weight: 400;
}
.esc {
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--paper-2);
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* List */
.list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.group + .group {
  margin-top: 10px;
}
.group-label {
  padding: 6px 10px 4px;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  color: var(--text-quiet);
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.row[data-active='true'] {
  background: var(--text-primary);
}
.row-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--paper-2);
  color: var(--text-primary);
  flex-shrink: 0;
}
.row[data-active='true'] .row-icon {
  background: rgba(255, 255, 255, 0.18);
  color: var(--bg-elevated);
}
.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row[data-active='true'] .row-label {
  color: var(--bg-elevated);
}
.row-sub {
  font-size: 11.5px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row[data-active='true'] .row-sub {
  color: var(--bg-elevated);
  opacity: 0.65;
}
.row-go {
  color: var(--bg-elevated);
  opacity: 0.7;
  flex-shrink: 0;
}
.empty {
  padding: 40px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* Foot */
.foot {
  display: flex;
  gap: 16px;
  padding: 10px 16px;
  border-top: 0.5px solid var(--rule);
}
.hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-quiet);
}
.hint kbd {
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--paper-2);
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Transition — scale from the trigger point, Apple style */
.palette-enter-active {
  transition: opacity 200ms var(--ease-out);
}
.palette-leave-active {
  transition: opacity 140ms var(--ease-in-out);
}
.palette-enter-active .palette {
  transition:
    transform 260ms var(--ease-spring),
    opacity 200ms var(--ease-out);
}
.palette-leave-active .palette {
  transition:
    transform 140ms var(--ease-in-out),
    opacity 140ms var(--ease-in-out);
}
.palette-enter-from {
  opacity: 0;
}
.palette-leave-to {
  opacity: 0;
}
.palette-enter-from .palette {
  transform: translateY(-8px) scale(0.98);
  opacity: 0;
}
.palette-leave-to .palette {
  transform: translateY(-4px) scale(0.985);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .palette-enter-active,
  .palette-leave-active,
  .palette-enter-active .palette,
  .palette-leave-active .palette {
    transition: none;
  }
}

@media (max-width: 560px) {
  .scrim {
    padding-top: 8vh;
  }
  .palette {
    max-height: 70vh;
  }
}
</style>
