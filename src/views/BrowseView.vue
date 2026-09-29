<script setup lang="ts">
// Browse — College→Program→Level hierarchy. NOT subject-first shelves.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDriveStore } from '@/stores/drive'
import Icon from '@/components/Icon.vue'
import IndexStack from '@/components/IndexStack.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import type { Paper } from '@/script/design'

const drive = useDriveStore()
const router = useRouter()

// College → Program → Level drill-down state
const selectedCollege = ref<string | null>(null)
const selectedProgram = ref<string | null>(null)
const selectedLevel = ref<string | null>(null)

// Build hierarchy from papers
const colleges = computed(() => {
  const map = new Map<string, { name: string; programs: Map<string, { name: string; levels: Set<string> }> }>()
  for (const p of drive.papers) {
    const college = p.college || 'General'
    const program = p.program || 'General'
    const level = p.level || '100'
    if (!map.has(college)) map.set(college, { name: college, programs: new Map() })
    const c = map.get(college)!
    if (!c.programs.has(program)) c.programs.set(program, { name: program, levels: new Set() })
    c.programs.get(program)!.levels.add(level)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const programs = computed(() => {
  if (!selectedCollege.value) return []
  const college = colleges.value.find(c => c.name === selectedCollege.value)
  if (!college) return []
  return [...college.programs.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const levels = computed(() => {
  if (!selectedCollege.value || !selectedProgram.value) return []
  const college = colleges.value.find(c => c.name === selectedCollege.value)
  if (!college) return []
  const program = college.programs.get(selectedProgram.value)
  if (!program) return []
  return [...program.levels].sort()
})

// Filtered papers based on drill-down
const filteredPapers = computed(() => {
  let list = drive.papers
  if (selectedCollege.value) {
    list = list.filter(p => p.college === selectedCollege.value)
  }
  if (selectedProgram.value) {
    list = list.filter(p => p.program === selectedProgram.value)
  }
  if (selectedLevel.value) {
    list = list.filter(p => p.level === selectedLevel.value)
  }
  return list
})

const isLoading = computed(() => drive.loading && drive.papers.length === 0)

function selectCollege(name: string) {
  selectedCollege.value = name
  selectedProgram.value = null
  selectedLevel.value = null
}

function selectProgram(name: string) {
  selectedProgram.value = name
  selectedLevel.value = null
}

function selectLevel(level: string) {
  selectedLevel.value = level
}

function goBack() {
  if (selectedLevel.value) {
    selectedLevel.value = null
  } else if (selectedProgram.value) {
    selectedProgram.value = null
  } else if (selectedCollege.value) {
    selectedCollege.value = null
  }
}

function openPaper(p: Paper) {
  router.push({ name: 'paper', params: { id: p.id } })
}

// Breadcrumb
const breadcrumb = computed(() => {
  const crumbs: { label: string; action?: () => void }[] = []
  if (selectedCollege.value) {
    crumbs.push({ label: selectedCollege.value, action: () => { selectedCollege.value = null; selectedProgram.value = null; selectedLevel.value = null } })
  }
  if (selectedProgram.value) {
    crumbs.push({ label: selectedProgram.value, action: () => { selectedProgram.value = null; selectedLevel.value = null } })
  }
  if (selectedLevel.value) {
    crumbs.push({ label: `Level ${selectedLevel.value}` })
  }
  return crumbs
})
</script>

<template>
  <div class="browse">
    <!-- Ambient glow -->
    <div class="hero-glow" aria-hidden="true" />

    <!-- Header with back -->
    <div class="browse-header">
      <button v-if="selectedCollege" class="back-btn" @click="goBack">
        <Icon name="arrow-left" :size="18" />
        <span>Back</span>
      </button>
      <h1 class="browse-title">Browse</h1>
    </div>

    <!-- Breadcrumb -->
    <div v-if="breadcrumb.length" class="breadcrumb">
      <button class="crumb" @click="selectedCollege = null; selectedProgram = null; selectedLevel = null">All</button>
      <template v-for="(c, i) in breadcrumb" :key="i">
        <Icon name="chevron" :size="12" class="crumb-sep" />
        <button v-if="c.action" class="crumb crumb-link" @click="c.action">{{ c.label }}</button>
        <span v-else class="crumb">{{ c.label }}</span>
      </template>
    </div>

    <SkeletonCard v-if="isLoading" :count="6" size="sm" />

    <!-- Level picker -->
    <template v-else-if="selectedCollege && selectedProgram && !selectedLevel">
      <div class="tier-label"><Icon name="layers" :size="13" /> Pick a level</div>
      <div class="level-grid">
        <button
          v-for="(level, i) in levels"
          :key="level"
          class="level-card"
          :style="{ '--card-delay': 40 * i + 'ms' }"
          @click="selectLevel(level)"
        >
          <div class="level-num">{{ level }}</div>
          <div class="level-label">Level {{ level }}</div>
        </button>
      </div>
    </template>

    <!-- Program picker -->
    <template v-else-if="selectedCollege && !selectedProgram">
      <div class="tier-label"><Icon name="books" :size="13" /> Programs in {{ selectedCollege.replace(/\s*\([^)]*\)\s*$/, '') }}</div>
      <div class="program-grid">
        <button
          v-for="(prog, i) in programs"
          :key="prog.name"
          class="program-card"
          :style="{ '--card-delay': 40 * i + 'ms' }"
          @click="selectProgram(prog.name)"
        >
          <div class="program-icon"><Icon name="layers" :size="17" /></div>
          <div class="program-body">
            <div class="program-name">{{ prog.name }}</div>
            <div class="program-levels">{{ prog.levels.size }} levels</div>
          </div>
          <Icon name="chevron" :size="15" class="card-arrow" />
        </button>
      </div>
    </template>

    <!-- College picker -->
    <template v-else-if="!selectedCollege">
      <div class="tier-label"><Icon name="compass" :size="13" /> Choose a college</div>
      <div class="college-grid">
        <button
          v-for="(college, i) in colleges"
          :key="college.name"
          class="college-card"
          :style="{ '--card-delay': 40 * i + 'ms' }"
          @click="selectCollege(college.name)"
        >
          <div class="college-icon"><Icon name="books" :size="19" /></div>
          <div class="college-body">
            <div class="college-name">{{ college.name }}</div>
            <div class="college-programs">{{ college.programs.size }} programs</div>
          </div>
          <Icon name="chevron" :size="16" class="card-arrow" />
        </button>
      </div>
    </template>

    <!-- Papers list (when at leaf level) -->
    <template v-else>
      <div class="papers-header">
        <span class="papers-count"><Icon name="file" :size="13" /> {{ filteredPapers.length }} papers</span>
      </div>
      <div class="papers-grid">
        <div
          v-for="(p, i) in filteredPapers"
          :key="p.id"
          class="paper-row"
          :style="{ '--card-delay': 30 * Math.min(i, 10) + 'ms' }"
          @click="openPaper(p)"
        >
          <IndexStack :paper="p" size="xs" />
          <div class="paper-info">
            <div class="paper-title">{{ p.title }}</div>
            <div class="paper-meta">
              <span>{{ p.type }}</span>
              <span class="dot">·</span>
              <span>{{ p.year }}</span>
              <span class="dot">·</span>
              <span>{{ (p as any).course || '' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!filteredPapers.length" class="empty-box">No papers at this level yet.</div>
    </template>
  </div>
</template>

<style scoped>
.browse {
  position: relative;
  max-width: 960px;
  margin: 0 auto;
  padding: 32px;
}

/* Ambient glow — mirrors Home/Paper hero field */
.hero-glow {
  position: absolute;
  top: -180px;
  left: 50%;
  width: 560px;
  height: 420px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(120, 119, 255, 0.12), transparent 62%);
  filter: blur(90px);
  pointer-events: none;
  z-index: -1;
}
html.dark .hero-glow {
  background: radial-gradient(circle, rgba(120, 119, 255, 0.17), transparent 62%);
}

/* Staggered card entrance */
.college-card,
.program-card,
.level-card,
.paper-row {
  animation: rise-in 480ms var(--ease-out) both;
  animation-delay: var(--card-delay, 0ms);
}
@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .college-card,
  .program-card,
  .level-card,
  .paper-row {
    animation: none;
  }
}

/* Tier label — smallcaps with icon */
.tier-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.browse-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  padding: 8px 12px;
  border-radius: var(--r-sm);
  transition: all var(--dur-fast);
}
.back-btn:hover {
  color: var(--text-primary);
  background: var(--bg-default);
}
.browse-title {
  font-family: var(--font-heading);
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.033em;
  color: var(--text-primary);
  margin: 0;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 32px;
  font-size: 13px;
}
.crumb {
  color: var(--text-tertiary);
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: var(--r-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--dur-fast);
}
.crumb-link {
  color: var(--text-secondary);
}
.crumb-link:hover {
  color: var(--text-primary);
  background: var(--bg-default);
}
.crumb-sep {
  color: var(--text-quiet);
}

/* College grid — shadow-built cards, no borders */
.college-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.college-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--bg-elevated);
  border: none;
  border-radius: var(--r-lg);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 14px rgba(0, 0, 0, 0.05);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    box-shadow var(--dur-med) var(--ease-out);
}
.college-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 16px 36px rgba(0, 0, 0, 0.1);
}
.college-card:active {
  transform: scale(0.98);
}
.college-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--paper-2);
  color: var(--text-primary);
  flex-shrink: 0;
}
.college-body {
  flex: 1;
  min-width: 0;
}
.college-name {
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.college-programs {
  font-size: 12.5px;
  color: var(--text-tertiary);
}
.card-arrow {
  color: var(--text-quiet);
  flex-shrink: 0;
  transition: transform var(--dur-fast) var(--ease-out), color var(--dur-fast);
}
.college-card:hover .card-arrow,
.program-card:hover .card-arrow {
  transform: translateX(3px);
  color: var(--text-primary);
}

/* Program grid */
.program-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.program-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-elevated);
  border: none;
  border-radius: var(--r-lg);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 14px rgba(0, 0, 0, 0.05);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    box-shadow var(--dur-med) var(--ease-out);
}
.program-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 16px 36px rgba(0, 0, 0, 0.1);
}
.program-card:active {
  transform: scale(0.98);
}
.program-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--paper-2);
  color: var(--text-primary);
  flex-shrink: 0;
}
.program-body {
  flex: 1;
  min-width: 0;
}
.program-name {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.program-levels {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* Level grid — oversized numerals, hover inverts like iOS */
.level-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.level-card {
  padding: 22px 20px;
  background: var(--bg-elevated);
  border: none;
  border-radius: var(--r-lg);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 14px rgba(0, 0, 0, 0.05);
  text-align: center;
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    background-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-med) var(--ease-out);
}
.level-card:hover {
  background: var(--text-primary);
  transform: translateY(-3px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.05),
    0 16px 36px rgba(0, 0, 0, 0.12);
}
.level-card:active {
  transform: scale(0.97);
}
.level-num {
  font-size: 30px;
  font-weight: 700;
  font-family: var(--font-mono);
  letter-spacing: -0.03em;
}
.level-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-top: 4px;
  transition: color var(--dur-fast);
}
.level-card:hover .level-label {
  color: var(--bg-elevated);
  opacity: 0.7;
}
.level-card:hover .level-num {
  color: var(--bg-elevated);
}

/* Papers */
.papers-header {
  margin-bottom: 16px;
}
.papers-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}
.papers-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.paper-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  cursor: pointer;
  transition:
    background var(--dur-fast),
    transform var(--dur-fast) var(--ease-out);
}
.paper-row:hover {
  background: var(--paper-2);
  transform: translateX(2px);
}
.paper-info {
  flex: 1;
  min-width: 0;
}
.paper-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.paper-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-top: 4px;
}
.dot {
  opacity: 0.3;
}

/* Empty */
.empty-box {
  padding: 48px;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--paper-2);
  border-radius: var(--r-md);
}

@media (max-width: 720px) {
  .browse { padding: 20px; }
  .college-grid, .program-grid { grid-template-columns: repeat(2, 1fr); }
  .level-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
