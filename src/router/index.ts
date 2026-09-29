import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useSeo } from '@/composables/useSeo'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/browse', name: 'browse', component: () => import('@/views/BrowseView.vue') },
  { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue') },
  { path: '/subject/:id', name: 'subject', component: () => import('@/views/SubjectView.vue') },
  { path: '/paper/:id', name: 'paper', component: () => import('@/views/PaperView.vue') },
  { path: '/s/:code', name: 'shortlink', component: () => import('@/views/ShortLinkView.vue') },
  { path: '/upload', name: 'upload', component: () => import('@/views/UploadView.vue') },
  { path: '/profile/:id', name: 'profile', component: () => import('@/views/ProfileView.vue') },
  { path: '/admin', name: 'admin', component: () => import('@/views/AdminView.vue') },
  { path: '/about', name: 'about', component: () => import('@/views/AboutView.vue') },
  { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('@/views/NotFoundView.vue') },
]

// Per-route SEO (title/description/canonical/OG). Route-level defaults here;
// Paper/Subject/Profile views refine with dynamic data via useSeo().
const SEO: Record<string, { title: string; description: string }> = {
  home: {
    title: 'Bells Notes — Free. Open. No account needed.',
    description:
      'A free library for Bells students. Notes, past questions, and study guides from real students. Free to read, free to contribute — no accounts, no paywalls.',
  },
  browse: {
    title: 'Browse the library',
    description:
      'Every college, every course. Browse 1,000+ notes, past exams and study guides organized by college, program and level.',
  },
  search: {
    title: 'Search papers',
    description:
      'Search notes, past exams and study guides by course, topic or title. Filter by subject, type and year.',
  },
  upload: {
    title: 'Contribute a paper',
    description:
      'Share your notes with every Bells student. Upload in under a minute — human-reviewed before publishing.',
  },
  about: {
    title: 'About',
    description:
      'Bells Notes is built by students, for students — no accounts, no paywalls, no gatekeeping. How the library runs.',
  },
  admin: { title: 'Moderation queue', description: 'Admin access only.' },
  notfound: {
    title: 'Page not found',
    description: 'That page is not on the shelf. Browse the library instead.',
  },
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const seo = SEO[to.name as string]
  if (!seo) return // dynamic views set their own via useSeo()
  useSeo({ title: seo.title, description: seo.description, path: to.path })
})

export default router
