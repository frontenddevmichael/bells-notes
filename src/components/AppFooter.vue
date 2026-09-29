<script setup lang="ts">
// Footer — minimalist: one brand row (wordmark + inline quiet links) over a
// mono legal row. No columns, no copy block. Pinned to the viewport floor
// on short pages by the App.vue flex shell. Home is a fixed-viewport screen
// (no footer there — App.vue), so this renders on every scrolled view only.
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'

const router = useRouter()

const links: { label: string; to: string }[] = [
  { label: 'Browse', to: '/browse' },
  { label: 'Search', to: '/search' },
  { label: 'Contribute', to: '/upload' },
  { label: 'About', to: '/about' },
]
</script>

<template>
  <footer class="footer">
    <div class="inner">
      <div class="brand-row">
        <span class="wordmark">
          <Icon name="bell" :size="15" />
          Bells Notes
        </span>
        <nav class="links" aria-label="Footer">
          <a
            v-for="link in links"
            :key="link.label"
            class="footer-link"
            @click="router.push(link.to)"
          >
            {{ link.label }}
          </a>
        </nav>
      </div>
      <div class="legal-row">
        <span>© 2026 Bells Notes</span>
        <span>Free to read. Free to contribute.</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--bg-default);
  border-top: 0.5px solid var(--rule);
  margin-top: 20px;
}
.inner {
  max-width: var(--max-content);
  margin: 0 auto;
  padding: 28px 32px;
}
.brand-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px 32px;
  flex-wrap: wrap;
}
.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.022em;
  color: var(--text-primary);
}
.wordmark svg {
  color: var(--text-secondary);
}
.links {
  display: flex;
  align-items: baseline;
  gap: 22px;
  flex-wrap: wrap;
}
.footer-link {
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--dur-fast);
}
.footer-link:hover {
  color: var(--text-primary);
}
.legal-row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px 24px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-quiet);
}
@media (max-width: 560px) {
  .inner {
    padding: 24px 20px;
  }
  .brand-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .links {
    gap: 16px;
  }
}
</style>
