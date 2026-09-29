<script setup lang="ts">
// App shell — banner + nav + routed screen (with iOS-style page transition) + footer
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppBanner from '@/components/AppBanner.vue'
import TopStrip from '@/components/TopStrip.vue'
import AppFooter from '@/components/AppFooter.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import { useDriveStore } from '@/stores/drive'

const route = useRoute()
const drive = useDriveStore()

onMounted(() => {
  drive.load()
})
</script>

<template>
  <!-- Home is a fixed-viewport screen: the nav floats over the hero art and
       the screen flexes to fill the space above the footer. -->
  <div class="app-shell">
    <AppBanner v-if="route.path !== '/'" />
    <TopStrip />
  <!--
    Page transition (Apple push feel): leaving screen dims and sinks while the
    entering screen rises in — `out-in` keeps one screen on stage at a time.
    Keyed by path (not fullPath) so query changes (e.g. Search ?q=) don't remount.
  -->
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <main :key="route.path" :class="{ 'is-home': route.path === '/' }">
        <component :is="Component" />
      </main>
    </Transition>
  </RouterView>
  <AppFooter />
  </div>
  <CommandPalette />
</template>

<style scoped>
/* Sticky-footer shell: on short pages the footer pins to the viewport floor
   (main flex-grows); on tall pages it flows right after the content. */
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.app-shell > main {
  flex: 1 0 auto;
}
/* Gap between content and footer — off on Home (fixed viewport, no footer,
   .home must stay exactly 100dvh). */
.app-shell > main:not(.is-home) {
  /* 52px here + footer's 20px margin-top = the 72px content↔footer rhythm.
     Home (footer sits inside the fixed screen) uses only the footer margin. */
  padding-bottom: 52px;
}
/* Home: main is the flex frame between nav and footer; .home fills it. */
.app-shell > main.is-home {
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
}
.page-enter-active {
  transition:
    opacity 300ms var(--ease-out),
    transform 300ms var(--ease-out);
}
.page-leave-active {
  transition:
    opacity 180ms var(--ease-in-out),
    transform 180ms var(--ease-in-out);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.995);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.997);
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
