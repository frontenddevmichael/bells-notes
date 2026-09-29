<script setup lang="ts">
// Open banner — dismissible, ink bar across the very top of every page
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'

const router = useRouter()
const dismissed = ref(localStorage.getItem('bellsnotes_banner_dismissed') === '1')

function close() {
  dismissed.value = true
  localStorage.setItem('bellsnotes_banner_dismissed', '1')
}
</script>

<template>
  <div v-if="!dismissed" class="banner" role="banner">
    <span class="dot" aria-hidden="true" />
    <span class="copy">
      <strong>Built for Bells. Free forever.</strong>
      <span class="muted">Notes and past questions from real students.</span>
      <a class="how" @click="router.push('/about')">How it works &rarr;</a>
    </span>
    <button class="close" aria-label="Dismiss banner" @click="close">
      <Icon name="x" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.banner {
  height: var(--banner-h);
  background: var(--material-strong);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
  color: var(--text-primary);
  border-bottom: var(--hairline);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  position: relative;
  z-index: 60;
  font-size: 12.5px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-quiet);
  flex-shrink: 0;
}
.copy {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.muted {
  color: var(--text-secondary);
}
.how {
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity var(--dur-fast);
}
.how:hover {
  opacity: 0.65;
}
.close {
  margin-left: auto;
  color: var(--text-tertiary);
  display: grid;
  place-items: center;
  padding: 4px;
  border-radius: 50%;
  transition:
    color var(--dur-fast),
    background-color var(--dur-fast);
}
.close:hover {
  color: var(--text-primary);
  background: var(--paper-2);
}
@media (max-width: 640px) {
  .muted {
    display: none;
  }
  .banner {
    gap: 8px;
    padding: 0 12px;
  }
  .copy {
    gap: 8px;
  }
}
@media (max-width: 400px) {
  .how {
    display: none;
  }
}
</style>
