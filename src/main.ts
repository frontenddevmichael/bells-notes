import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Vercel Analytics loads a Vercel-hosted script — skip on other hosts
// (deployed to Cloudflare Workers; the plugin is a silent no-op there).
const isVercel = /\.vercel\.app$|\.vercel\.com$/.test(location.hostname) || import.meta.env.VITE_VERCEL === '1'
const Analytics = isVercel
  ? (await import('@vercel/analytics/vue')).Analytics
  : undefined
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { convexVue } from 'convex-vue'

// Global error capture: surface failures in console with context, keep the
// app alive. (Sentry for web is a follow-up once the DSN is provisioned.)
const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('[app error]', info, err)
}
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('[app warn]', msg, trace)
}
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandled rejection]', e.reason)
})

app.use(createPinia())
app.use(router)
if (Analytics) app.use(Analytics)
app.use(convexVue, {
  url: import.meta.env.VITE_CONVEX_URL,
})

app.mount('#app')
