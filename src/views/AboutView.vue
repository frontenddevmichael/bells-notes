<script setup lang="ts">
// About — minimal, visual-first. One idea per screen: what it is, the number,
// who makes it. Copy is plain-spoken; no marketing filler.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDriveStore } from '@/stores/drive'
import { formatCount } from '@/script/design'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'

const drive = useDriveStore()
const router = useRouter()

const stats = computed(() => [
  { value: drive.stats.papers.toLocaleString(), label: 'papers on the shelf' },
  { value: formatCount(drive.stats.reads), label: 'reads every month' },
  { value: String(drive.stats.contributors), label: 'students who shared their notes' },
])

const contributors = computed(() =>
  [...drive.contributors].sort((a, b) => b.uploads - a.uploads).slice(0, 10),
)
</script>

<template>
  <div class="about">
    <!-- 1. What this is -->
    <section class="lead">
      <div class="smallcaps">About</div>
      <h1 class="statement">
        A library built from other students' notebooks.
      </h1>
      <p class="sub">
        Someone took the notes. Someone else needed them. This site just keeps
        the two from getting lost.
      </p>
      <div class="cta">
        <button class="btn btn-primary" @click="router.push({ name: 'browse' })">
          <Icon name="books" :size="15" /> Start browsing
        </button>
      </div>
    </section>

    <!-- 2. The numbers, big -->
    <section class="numbers">
      <div v-for="s in stats" :key="s.label" class="stat">
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </section>

    <!-- 3. How it works — three steps, visual icons -->
    <section class="how">
      <div class="step">
        <div class="step-icon"><Icon name="upload" :size="22" /></div>
        <h2>A student uploads</h2>
        <p>Lecture notes, past exams, guides — anything that helped them pass.</p>
      </div>
      <div class="step">
        <div class="step-icon"><Icon name="eye" :size="22" /></div>
        <h2>A person checks it</h2>
        <p>A moderator reviews every file before it goes on the shelf. No spam survives.</p>
      </div>
      <div class="step">
        <div class="step-icon"><Icon name="download" :size="22" /></div>
        <h2>Everyone reads it</h2>
        <p>Free, no login, forever. The contributor's name stays on the work.</p>
      </div>
    </section>

    <!-- 4. Who's on the shelf — contributors -->
    <section class="people">
      <div class="smallcaps">On the shelf thanks to</div>
      <div class="people-grid">
        <button
          v-for="c in contributors"
          :key="c.id"
          class="person"
          @click="router.push({ name: 'profile', params: { id: c.id } })"
        >
          <Avatar :user="c" :size="40" />
          <span class="person-name">{{ c.name }}</span>
          <span class="person-count">{{ c.uploads }} {{ c.uploads === 1 ? 'paper' : 'papers' }}</span>
        </button>
      </div>
    </section>

    <!-- 5. The fine print, short -->
    <section class="fine">
      <p>
        No ads. No trackers. No accounts. If something here helped you, the
        best thanks is adding something that helps the next person.
      </p>
      <button class="contribute-link" @click="router.push({ name: 'upload' })">
        Contribute a paper <Icon name="arrow-right" :size="14" />
      </button>
    </section>
  </div>
</template>

<style scoped>
.about {
  max-width: 880px;
  margin: 0 auto;
  padding: 72px 32px 24px;
}

/* 1. Lead — one statement, one sub, one button */
.lead {
  padding-bottom: 72px;
}
.statement {
  font-family: var(--font-heading);
  font-size: clamp(38px, 7vw, 76px);
  line-height: 1.02;
  letter-spacing: -0.033em;
  font-weight: 700;
  color: var(--text-primary);
  margin: 20px 0 28px;
  max-width: 720px;
  text-wrap: balance;
}
.sub {
  font-size: 20px;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 520px;
  margin: 0 0 36px;
  letter-spacing: -0.01em;
}
.cta {
  display: flex;
  gap: 12px;
}

/* 2. Numbers — oversized, quiet labels */
.numbers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 56px 0;
  border-top: 0.5px solid var(--rule);
}
.stat-value {
  font-family: var(--font-mono);
  font-size: clamp(34px, 5vw, 56px);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  line-height: 1;
}
.stat-label {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  letter-spacing: 0.01em;
}

/* 3. How — three icon steps */
.how {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  padding: 56px 0;
  border-top: 0.5px solid var(--rule);
}
.step-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--paper-2);
  color: var(--text-primary);
  margin-bottom: 18px;
}
.step h2 {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 8px;
  color: var(--text-primary);
}
.step p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

/* 4. People */
.people {
  padding: 56px 0;
  border-top: 0.5px solid var(--rule);
}
.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 20px;
}
.person {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--bg-elevated);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-fast);
}
.person:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}
.person-main {
  min-width: 0;
}
.person-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.person-count {
  display: block;
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* 5. Fine print */
.fine {
  padding: 56px 0 72px;
  border-top: 0.5px solid var(--rule);
}
.fine p {
  font-size: 16px;
  line-height: 1.65;
  color: var(--text-secondary);
  max-width: 480px;
  margin: 0 0 20px;
}
.contribute-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-bottom: 1.5px solid var(--text-primary);
  padding-bottom: 2px;
  transition: opacity var(--dur-fast);
}
.contribute-link:hover {
  opacity: 0.65;
}

@media (max-width: 720px) {
  .about {
    padding: 48px 20px 24px;
    /* thumb-reach: keep content clear of the bottom tab bar */
    padding-bottom: 110px;
  }
  .lead {
    padding-bottom: 48px;
  }
  .numbers {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 44px 0;
  }
  .how {
    grid-template-columns: 1fr;
    gap: 36px;
    padding: 44px 0;
  }
  .people,
  .fine {
    padding: 44px 0;
  }
  .fine {
    padding-bottom: 56px;
  }
  .sub {
    font-size: 17px;
  }
}
</style>
