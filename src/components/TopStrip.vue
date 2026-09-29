<script setup lang="ts">
// TopStrip — full-width frosted toolbar (macOS-style). Logo left, centered
// nav links with active capsule, actions right (⌘K palette, About, theme).
// Condenses on scroll. On Home it floats fixed (no flow space — that screen
// is a fixed-viewport composition).
// ≤720px: toolbar keeps brand + tools; NAVIGATION moves to a padded bottom
// tab bar (thumb-reach, iOS style) with Browse/Search/Upload/About + palette.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const route = useRoute()
const { scheme: theme, toggle: toggleTheme } = useTheme()

function goHome() {
  router.push({ name: 'home' })
}

function openPalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
}

const TABS = [
  { name: 'browse', label: 'Browse', icon: 'books', match: ['browse', 'subject'] },
  { name: 'search', label: 'Search', icon: 'search', match: ['search'] },
  { name: 'upload', label: 'Upload', icon: 'upload', match: ['upload'] },
  { name: 'about', label: 'About', icon: 'info', match: ['about'] },
]
const activeTab = computed(() => TABS.find((t) => t.match.includes(route.name as string))?.name ?? null)

function go(tab: (typeof TABS)[number]) {
  router.push({ name: tab.name })
}

// Scroll-linked condensation — the toolbar tightens once content scrolls
// under it (rAF-throttled; class-driven so the transition owns the motion).
const condensed = ref(false)
let ticking = false
function onScroll(): void {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    condensed.value = window.scrollY > 24
    ticking = false
  })
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="nav" :class="{ 'nav-fixed': route.path === '/' }">
    <div class="bar" :class="{ condensed }">
      <button class="brand" @click="goHome" aria-label="Bells Notes — home">
        <Icon name="bell" :size="18" />
        <span class="brand-name">Bells Notes</span>
      </button>

      <nav class="links" aria-label="Primary">
        <button
          class="link"
          :class="{ active: route.name === 'browse' || route.name === 'subject' }"
          @click="router.push('/browse')"
        >
          Browse
        </button>
        <button
          class="link"
          :class="{ active: route.name === 'search' }"
          @click="router.push({ name: 'search' })"
        >
          Search
        </button>
        <button
          class="link"
          :class="{ active: route.name === 'upload' }"
          @click="router.push({ name: 'upload' })"
        >
          Upload
        </button>
      </nav>

      <div class="actions">
        <button class="tool palette-btn" @click="openPalette" aria-label="Open command palette (Ctrl+K)">
          <Icon name="search" :size="15" />
          <span class="palette-label">Search</span>
          <kbd class="palette-kbd"><Icon name="command" :size="10" />K</kbd>
        </button>
        <button class="tool tool-about" @click="router.push('/about')" aria-label="About">
          <Icon name="info" :size="17" />
        </button>
        <button
          class="tool"
          @click="toggleTheme"
          :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="17" />
        </button>
      </div>
    </div>
  </header>

  <!-- Mobile bottom tab bar — padded, thumb-reach navigation -->
  <nav class="tabbar" aria-label="Primary">
    <button
      v-for="t in TABS"
      :key="t.name"
      class="tab"
      :class="{ active: activeTab === t.name }"
      :aria-current="activeTab === t.name ? 'page' : undefined"
      @click="go(t)"
    >
      <Icon :name="t.icon" :size="21" />
      <span class="tab-label">{{ t.label }}</span>
    </button>
    <button class="tab" :aria-label="'Open command palette (Ctrl+K)'" @click="openPalette">
      <Icon name="command" :size="21" />
      <span class="tab-label">Palette</span>
    </button>
  </nav>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
}
/* Home is a fixed-viewport screen: float without flow space. */
.nav-fixed {
  position: fixed;
  left: 0;
  right: 0;
}

.bar {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 56px;
  padding: 0 28px;
  background: var(--material);
  -webkit-backdrop-filter: var(--blur-strong);
  backdrop-filter: var(--blur-strong);
  border-bottom: var(--hairline);
  transition:
    height var(--dur-med) var(--ease-out),
    background-color var(--dur-med) var(--ease-out),
    box-shadow var(--dur-med) var(--ease-out);
}
.bar.condensed {
  height: 46px;
  background: var(--material-strong);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 6px 20px rgba(0, 0, 0, 0.07);
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  flex-shrink: 0;
  transition: opacity var(--dur-fast);
}
.brand:hover {
  opacity: 0.7;
}
.brand-name {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.022em;
  color: var(--text-primary);
  line-height: 1;
  transition: font-size var(--dur-med) var(--ease-out);
}
.bar.condensed .brand-name {
  font-size: 14.5px;
}
.bar.condensed .brand svg {
  transform: scale(0.9);
}
.brand svg {
  transition: transform var(--dur-med) var(--ease-out);
}

/* Centered links — underline-dot active state */
.links {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 auto;
}
.link {
  position: relative;
  padding: 7px 14px;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text-secondary);
  border-radius: var(--r-sm);
  transition:
    color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
.link:hover {
  color: var(--text-primary);
  background: var(--paper-2);
}
.link.active {
  color: var(--text-primary);
  font-weight: 600;
}
.link.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-primary);
  transform: translateX(-50%);
}

/* Right tools */
.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.tool {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 34px;
  min-width: 34px;
  padding: 0 8px;
  border-radius: var(--r-sm);
  color: var(--text-secondary);
  transition:
    color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-spring);
}
.tool:hover {
  color: var(--text-primary);
  background: var(--paper-2);
}
.tool:active {
  transform: scale(0.94);
}

/* Palette button — a real affordance, not just an icon */
.palette-btn {
  padding: 0 6px 0 10px;
  gap: 7px;
  color: var(--text-tertiary);
}
.palette-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
}
.palette-kbd {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--paper-2);
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
}

@media (max-width: 720px) {
  .bar {
    height: 52px;
    padding: 0 18px;
    gap: 8px;
  }
  .brand-name,
  .links {
    display: none;
  }
  .brand {
    margin-right: auto;
  }
  .palette-label,
  .palette-kbd {
    display: none;
  }
  /* About lives in the bottom tab bar on mobile — don't duplicate it here */
  .tool-about {
    display: none;
  }
  .palette-btn {
    padding: 0 8px;
  }
  .tool {
    height: 38px;
    min-width: 38px;
  }
  .bar.condensed {
    height: 46px;
  }
}

/* ============ Mobile bottom tab bar ============ */
.tabbar {
  display: none;
}
@media (max-width: 720px) {
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 55;
    display: flex;
    align-items: stretch;
    gap: 2px;
    /* generous padding: 10px top, safe-area floor, 8px sides */
    padding: 10px 8px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--material-strong);
    -webkit-backdrop-filter: var(--blur-strong);
    backdrop-filter: var(--blur-strong);
    border-top: var(--hairline);
  }
  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 7px 2px 5px;
    border-radius: var(--r-md);
    color: var(--text-tertiary);
    transition:
      color var(--dur-fast) var(--ease-out),
      background-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-spring);
  }
  .tab:active {
    transform: scale(0.94);
  }
  .tab.active {
    color: var(--text-primary);
    background: var(--paper-2);
  }
  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
}
</style>
