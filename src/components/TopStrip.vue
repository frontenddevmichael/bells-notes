<script setup lang="ts">
// TopStrip — minimal header: brand left, theme toggle right. All NAVIGATION
// lives in the bottom tab bar (≤720px) or the footer links + ⌘K palette
// (desktop). On Home it floats fixed (no flow space — fixed-viewport screen).
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
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

// Scroll-linked condensation — the bar tightens once content scrolls under
// it (rAF-throttled; class-driven so the transition owns the motion).
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

      <div class="actions">
        <button
          class="tool"
          @click="toggleTheme"
          :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="18" />
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
    <button class="tab" aria-label="Open command palette (Ctrl+K)" @click="openPalette">
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

/* Right tools — theme toggle only */
.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}
.tool {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 36px;
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

/* ============ Mobile bottom tab bar ============ */
.tabbar {
  display: none;
}
@media (max-width: 720px) {
  .bar {
    height: 52px;
    padding: 0 18px;
  }
  .brand-name {
    display: none;
  }
  .tool {
    height: 38px;
    min-width: 38px;
  }
  .bar.condensed {
    height: 46px;
  }
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
