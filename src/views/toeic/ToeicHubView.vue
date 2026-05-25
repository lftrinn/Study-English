<script setup lang="ts">
/**
 * TOEIC Hub — landing screen for the Training Center.
 * Lays out: score progress · 3-phase roadmap · Part×skill heatmap ·
 * 7 module entry cards · "recommended today" CTA.
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import IconBlock from '@/components/common/IconBlock.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import { TOEIC_PARTS, TOEIC_PHASES } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';
import { useViewport } from '@/composables/useViewport';

const router = useRouter();
const toeic = useToeicStore();
const { isDesktop } = useViewport();

const modules = [
  { id: 'part', name: 'Part Practice', sub: 'Luyện từng Part 1–7', icon: 'cards', color: '#22D3EE', badge: '7 Parts', route: '/toeic/part' },
  { id: 'skill', name: 'Skill Practice', sub: 'Luyện từng kỹ năng', icon: 'brain', color: '#A78BFA', badge: '4 skills', route: '/toeic/skill' },
  { id: 'mini', name: 'Mini Test', sub: '5 · 10 · 20 câu', icon: 'target', color: '#34D399', badge: '5–20 câu', route: '/toeic/mini' },
  { id: 'exam', name: 'Exam Mode', sub: 'Mô phỏng luật thi thật', icon: 'trophy', color: '#F59E0B', badge: '120 phút', route: '/toeic/exam' },
  { id: 'mistakes', name: 'Mistake Notebook', sub: 'Ôn lại lỗi sai', icon: 'refresh', color: '#FB7185', badge: '', route: '/toeic/mistakes' },
  { id: 'bank', name: 'TOEIC Chunk Bank', sub: 'Workplace theo Part', icon: 'library', color: '#60A5FA', badge: '550 chunks', route: '/toeic/bank' },
  { id: 'progress', name: 'Progress by Part', sub: 'Part nào yếu nhất', icon: 'wave', color: '#FB923C', badge: 'analytics', route: '/toeic/progress' },
];

const progressPct = computed(() => {
  const { current, target } = toeic.goal;
  return Math.max(0, Math.min(100, ((current - 100) / (target - 100)) * 100));
});
const remaining = computed(() => toeic.goal.target - toeic.goal.current);

const lastExamLabel = computed(() => {
  const last = toeic.lastExam;
  if (!last?.takenAt) return 'Chưa có bài thi';
  const d = new Date(last.takenAt);
  return `${d.getDate()}/${d.getMonth() + 1}`;
});

// Rough projection from the recent score trend: gain-per-exam × exams to go.
const projection = computed(() => {
  const s = toeic.examScores;
  if (s.length < 2) return null;
  const gain = s[s.length - 1].total - s[s.length - 2].total;
  const remain = toeic.goal.target - toeic.goal.current;
  if (gain <= 0 || remain <= 0) return null;
  return Math.ceil(remain / gain);
});

const currentPhaseInfo = computed(() => {
  const id = toeic.currentPhase;
  return TOEIC_PHASES.find((p) => p.id === id) ?? TOEIC_PHASES[0];
});

// — "Start here" — a single primary next-step that adapts to the user's state:
// no content → import; content but never tested → placement test; otherwise →
// drill the weakest Part.
const startCta = computed(() => {
  if (!toeic.hasUserContent) {
    return {
      eye: 'Bắt đầu ở đây',
      title: 'Thêm đề TOEIC của bạn',
      sub: 'Đang dùng đề mẫu. Import đề + audio của bạn để luyện sát đề thật.',
      icon: 'library',
      color: '#22D3EE',
      action: 'Thêm nội dung',
      route: '/toeic/content',
      secondary: { label: 'Làm thử đề mẫu', route: '/toeic/mini' },
    };
  }
  if (toeic.examScores.length === 0) {
    return {
      eye: 'Bắt đầu ở đây',
      title: 'Làm bài kiểm tra xếp loại',
      sub: 'Mini Test 10 câu để biết Part nào mạnh / yếu trước khi vào lộ trình.',
      icon: 'target',
      color: '#34D399',
      action: 'Làm Mini Test 10 câu',
      route: '/toeic/mini',
      secondary: { label: 'Xem lộ trình', route: '/toeic/progress' },
    };
  }
  const weak = toeic.weakestPart;
  const acc = Math.round((toeic.partStats[weak.id]?.accuracy ?? 0) * 100);
  return {
    eye: 'Tiếp tục luyện',
    title: `Luyện ${weak.name} — đang yếu nhất`,
    sub: `${acc}% chính xác · ưu tiên kéo Part này lên.`,
    icon: 'brain',
    color: weak.color,
    action: `Luyện Part ${weak.id}`,
    route: '/toeic/part',
    secondary: { label: 'Thi thử Exam Mode', route: '/toeic/exam' },
  };
});

// — Compact stats for the desktop side column —
const stats = computed(() => {
  const entries = Object.values(toeic.partStats);
  const practiced = entries.reduce((s, p) => s + p.practiced, 0);
  const answered = entries.filter((p) => p.practiced > 0);
  const avgAcc = answered.length
    ? answered.reduce((s, p) => s + p.accuracy * p.practiced, 0) / practiced
    : 0;
  return {
    practiced,
    avgAcc: Math.round(avgAcc * 100),
    mistakes: toeic.mistakeCount,
    lastExam: lastExamLabel.value,
  };
});

function goBack() {
  // Switch back to the Chunk Lab module. Home is its canonical landing, so
  // it's a predictable target regardless of how the user entered TOEIC.
  router.push('/');
}

function go(route: string) {
  router.push(route);
}

function moduleBadge(id: string): string {
  const m = modules.find((x) => x.id === id);
  if (!m) return '';
  if (m.id === 'mistakes') {
    const c = toeic.mistakeCount;
    return c > 0 ? `${c} lỗi` : 'sạch sổ';
  }
  return m.badge;
}

// — Skill heatmap helpers
const MAX_SKILLS = 4;
function cellColor(acc: number | undefined) {
  if (acc === 0 || acc == null) {
    return { bg: 'var(--color-surface-1)', border: 'var(--color-border-1)', text: 'var(--color-text-4)' };
  }
  if (acc < 0.4) return tone('rose', 18, 35);
  if (acc < 0.6) return tone('amber', 22, 38);
  if (acc < 0.8) return tone('cyan', 22, 40);
  return tone('emerald', 28, 50);
}
function tone(name: 'rose' | 'amber' | 'cyan' | 'emerald', bgPct: number, borderPct: number) {
  const v = `var(--color-${name})`;
  return {
    bg: `color-mix(in oklch, ${v} ${bgPct}%, transparent)`,
    border: `color-mix(in oklch, ${v} ${borderPct}%, transparent)`,
    text: v,
  };
}
</script>

<template>
  <div class="thub scrollarea" :class="{ 'is-desktop': isDesktop }">
   <div class="thub__inner">
    <!-- Top bar -->
    <div class="thub__topbar">
      <button class="btn tap thub__back" @click="goBack" aria-label="Về Chunk Lab" title="Về Chunk Lab">
        <Icon name="chevron-left" :size="18" />
      </button>
      <div class="thub__topbar-meta">
        <div class="thub__topbar-eye">TOEIC</div>
        <div class="thub__topbar-title">Training Center</div>
      </div>
      <button class="btn tap thub__back thub__manage" aria-label="Quản lý nội dung" title="Quản lý nội dung" @click="go('/toeic/content')">
        <Icon name="library" :size="18" />
      </button>
    </div>

    <!-- Score hero -->
    <div class="glass-strong thub__hero">
      <div class="thub__hero-glow" aria-hidden="true" />
      <div class="thub__hero-grid">
        <div>
          <div class="thub__hero-label">Điểm hiện tại</div>
          <div class="thub__hero-current">
            <span class="mono thub__hero-current-num">{{ toeic.goal.current }}</span>
            <span class="thub__hero-current-peak">/ {{ toeic.goal.peak }}</span>
          </div>
          <div class="thub__hero-sub">Bài thi gần nhất: {{ lastExamLabel }}</div>
        </div>

        <div class="thub__hero-progress">
          <div class="thub__hero-progress-head">
            <span class="thub__hero-label">Mục tiêu</span>
            <span class="mono thub__hero-target">{{ toeic.goal.target }}</span>
          </div>
          <div class="thub__bar">
            <div class="thub__bar-fill" :style="{ width: `${progressPct}%` }" />
          </div>
          <div class="thub__hero-progress-foot">
            <span>Còn <b class="mono">{{ remaining }}</b> điểm</span>
            <span v-if="projection">Dự kiến ~<b class="mono">{{ projection }}</b> bài nữa</span>
            <span v-else>Luyện đều để thấy tiến bộ</span>
          </div>
        </div>

        <div class="thub__hero-phase">
          <ProgressRing :value="progressPct / 100" :size="isDesktop ? 78 : 64" :stroke="6" color="#22D3EE" :show-label="false">
            <span class="mono thub__hero-ring-num">{{ Math.round(progressPct) }}%</span>
          </ProgressRing>
          <div>
            <div class="thub__hero-label">Phase</div>
            <div class="thub__hero-phase-name">{{ currentPhaseInfo.name }}</div>
            <div class="thub__hero-sub">{{ currentPhaseInfo.vi }} · {{ currentPhaseInfo.weeks }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Start here — adaptive primary next step -->
    <button
      class="btn tap thub__start"
      :style="{
        background: `linear-gradient(135deg, color-mix(in oklch, ${startCta.color} 20%, var(--color-surface-2)), color-mix(in oklch, ${startCta.color} 6%, var(--color-surface-2)))`,
        borderColor: `color-mix(in oklch, ${startCta.color} 45%, transparent)`,
      }"
      @click="go(startCta.route)"
    >
      <IconBlock :icon="startCta.icon" :color="startCta.color" :size="isDesktop ? 52 : 46" />
      <div class="thub__start-body">
        <div class="thub__start-eye" :style="{ color: startCta.color }">{{ startCta.eye }}</div>
        <div class="thub__start-title">{{ startCta.title }}</div>
        <div class="thub__start-sub">{{ startCta.sub }}</div>
      </div>
      <div class="thub__start-actions">
        <span class="thub__start-cta" :style="{ background: startCta.color }">{{ startCta.action }} →</span>
        <span class="thub__start-secondary" @click.stop="go(startCta.secondary.route)">{{ startCta.secondary.label }}</span>
      </div>
    </button>

    <div class="thub__grid">
     <div class="thub__col thub__col--main">
    <!-- Roadmap -->
    <section class="thub__section">
      <div class="thub__section-head">
        <div>
          <h2 class="thub__section-title">Lộ trình 450 → 550</h2>
          <div class="thub__section-sub">Foundation → Expand → Mastery</div>
        </div>
      </div>

      <div class="thub__roadmap">
        <div
          v-for="(ph, i) in TOEIC_PHASES"
          :key="ph.id"
          class="glass thub__phase"
          :class="{ 'is-active': ph.id === toeic.currentPhase }"
          :style="ph.id === toeic.currentPhase ? {
            background: `linear-gradient(135deg, color-mix(in oklch, ${ph.color} 14%, transparent), color-mix(in oklch, ${ph.color} 4%, transparent)), var(--color-surface-2)`,
            borderColor: `color-mix(in oklch, ${ph.color} 50%, transparent)`,
          } : {}"
        >
          <div class="thub__phase-head">
            <div class="thub__phase-num-wrap">
              <span class="mono thub__phase-num" :style="{
                background: `color-mix(in oklch, ${ph.color} 24%, transparent)`,
                borderColor: `color-mix(in oklch, ${ph.color} 40%, transparent)`,
                color: ph.color,
              }">{{ i + 1 }}</span>
              <span class="thub__phase-name">{{ ph.name }}</span>
            </div>
            <span v-if="ph.id === toeic.currentPhase" class="thub__phase-pill" :style="{
              color: ph.color,
              background: `color-mix(in oklch, ${ph.color} 18%, transparent)`,
              borderColor: `color-mix(in oklch, ${ph.color} 30%, transparent)`,
            }">Đang ở</span>
          </div>
          <div class="thub__phase-parts">
            <span
              v-for="p in ph.parts"
              :key="p"
              class="chip"
              :style="{ '--c': TOEIC_PARTS.find((x) => x.id === p)?.color, height: '22px', padding: '0 9px', fontSize: '11px' } as any"
            >{{ TOEIC_PARTS.find((x) => x.id === p)?.name }}</span>
          </div>
          <div class="thub__phase-desc">{{ ph.desc }}</div>
          <div class="thub__phase-foot">
            <span><Icon name="target" :size="11" :style="{ color: ph.color }" /> <span class="mono">{{ ph.target }}</span></span>
            <span>{{ ph.weeks }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Modules -->
    <section class="thub__section">
      <div class="thub__section-head">
        <div>
          <h2 class="thub__section-title">Module</h2>
          <div class="thub__section-sub">Chọn 1 để bắt đầu</div>
        </div>
      </div>

      <div class="thub__modules">
        <button
          v-for="m in modules"
          :key="m.id"
          class="btn tap glass thub__module"
          @click="go(m.route)"
        >
          <div class="thub__module-top">
            <IconBlock :icon="m.icon" :color="m.color" :size="isDesktop ? 44 : 40" />
            <span class="mono thub__module-badge">{{ moduleBadge(m.id) }}</span>
          </div>
          <div class="thub__module-foot">
            <div class="thub__module-name">{{ m.name }}</div>
            <div class="thub__module-sub">{{ m.sub }}</div>
          </div>
        </button>
      </div>
    </section>

     </div><!-- /main col -->

     <div class="thub__col thub__col--side">
    <!-- Heatmap -->
    <section class="thub__section">
      <div class="thub__section-head">
        <div>
          <h2 class="thub__section-title">Heatmap kỹ năng</h2>
          <div class="thub__section-sub">Sáng dần khi accuracy tăng</div>
        </div>
        <button class="btn tap thub__section-action" @click="go('/toeic/progress')">Xem chi tiết →</button>
      </div>

      <div class="glass thub__heatmap">
        <div class="thub__heatmap-grid">
          <div />
          <div v-for="i in MAX_SKILLS" :key="i" class="thub__heatmap-colhead">Skill {{ i }}</div>

          <template v-for="p in TOEIC_PARTS" :key="p.id">
            <div class="thub__heatmap-rowhead">
              <span class="mono thub__heatmap-rowbadge" :style="{
                background: `color-mix(in oklch, ${p.color} 26%, transparent)`,
                color: p.color,
              }">{{ p.id }}</span>
              <span class="thub__heatmap-rowlabel">P{{ p.id }}</span>
            </div>
            <div
              v-for="j in MAX_SKILLS"
              :key="`c-${p.id}-${j}`"
              class="thub__heatmap-cell"
              :style="(() => {
                const cell = toeic.skillMatrix[p.id]?.[j - 1];
                if (!cell) return { background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)' };
                const c = cellColor(cell.accuracy);
                return { background: c.bg, border: `1px solid ${c.border}` };
              })()"
              :title="(() => {
                const cell = toeic.skillMatrix[p.id]?.[j - 1];
                return cell ? `${cell.skill} · ${Math.round(cell.accuracy * 100)}% · ${cell.count} câu` : '';
              })()"
            >
              <template v-if="toeic.skillMatrix[p.id]?.[j - 1]">
                <span class="mono thub__heatmap-cell-num" :style="{ color: cellColor(toeic.skillMatrix[p.id][j - 1].accuracy).text }">
                  {{ toeic.skillMatrix[p.id][j - 1].count === 0 ? '—' : Math.round(toeic.skillMatrix[p.id][j - 1].accuracy * 100) }}
                </span>
                <span class="thub__heatmap-cell-label" :style="{ color: cellColor(toeic.skillMatrix[p.id][j - 1].accuracy).text }">
                  {{ toeic.skillMatrix[p.id][j - 1].skill.split(' ').slice(0, 2).join(' ') }}
                </span>
              </template>
            </div>
          </template>
        </div>

        <div class="thub__heatmap-legend">
          <span class="thub__heatmap-legend-label">Accuracy</span>
          <span v-for="(item, i) in [
            { l: '<40%', c: 'var(--color-rose)' },
            { l: '40–60%', c: 'var(--color-amber)' },
            { l: '60–80%', c: 'var(--color-cyan)' },
            { l: '80%+', c: 'var(--color-emerald)' },
          ]" :key="i" class="thub__heatmap-legend-item">
            <span class="thub__heatmap-legend-swatch" :style="{
              background: `color-mix(in oklch, ${item.c} 28%, transparent)`,
              borderColor: `color-mix(in oklch, ${item.c} 50%, transparent)`,
            }" />
            {{ item.l }}
          </span>
        </div>
      </div>
    </section>

      <!-- Quick stats -->
      <section class="thub__section">
        <div class="thub__section-head">
          <div>
            <h2 class="thub__section-title">Tiến độ</h2>
            <div class="thub__section-sub">Tổng quan luyện tập</div>
          </div>
        </div>
        <div class="glass thub__stats">
          <div class="thub__stat">
            <div class="mono thub__stat-num">{{ stats.practiced }}</div>
            <div class="thub__stat-lbl">Câu đã luyện</div>
          </div>
          <div class="thub__stat">
            <div class="mono thub__stat-num" :style="{ color: 'var(--color-emerald)' }">{{ stats.avgAcc }}%</div>
            <div class="thub__stat-lbl">Chính xác TB</div>
          </div>
          <button class="thub__stat thub__stat--btn" @click="go('/toeic/mistakes')">
            <div class="mono thub__stat-num" :style="{ color: stats.mistakes > 0 ? 'var(--color-rose)' : 'var(--color-text-3)' }">{{ stats.mistakes }}</div>
            <div class="thub__stat-lbl">Lỗi cần ôn →</div>
          </button>
          <div class="thub__stat">
            <div class="mono thub__stat-num" :style="{ fontSize: '16px' }">{{ stats.lastExam }}</div>
            <div class="thub__stat-lbl">Bài thi gần nhất</div>
          </div>
        </div>
      </section>
     </div><!-- /side col -->
    </div><!-- /grid -->
   </div><!-- /inner -->
  </div>
</template>

<style scoped>
.thub {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  padding: 20px 20px 40px;
}
.thub::-webkit-scrollbar { display: none; }
.thub.is-desktop { padding: 28px 28px 60px; }

/* Centered dashboard container */
.thub__inner { width: 100%; max-width: 1120px; margin: 0 auto; }

/* Body grid — single column on mobile, two columns on desktop */
.thub__grid { display: block; }
.thub.is-desktop .thub__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.32fr) minmax(0, 0.8fr);
  gap: 24px;
  align-items: start;
  margin-top: 28px;
}
.thub__col { min-width: 0; }
/* First section in each desktop column aligns flush with the column top */
.thub.is-desktop .thub__col > .thub__section:first-child { margin-top: 0; }

/* Start-here CTA */
.thub__start {
  width: 100%;
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--color-border-2);
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
}
.thub.is-desktop .thub__start { padding: 20px 22px; margin-top: 20px; }
.thub__start-body { flex: 1; min-width: 0; }
.thub__start-eye {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.thub__start-title { font-size: 17px; font-weight: 700; margin-top: 2px; letter-spacing: -0.01em; }
.thub.is-desktop .thub__start-title { font-size: 19px; }
.thub__start-sub { font-size: 12.5px; color: var(--color-text-2); margin-top: 3px; line-height: 1.45; }
.thub__start-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.thub__start-cta {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 700;
  color: #06121a;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.18);
}
.thub__start-secondary {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
  white-space: nowrap;
}
.thub__start-secondary:hover { color: var(--color-text-1); text-decoration: underline; }
@media (max-width: 560px) {
  .thub__start { flex-wrap: wrap; }
  .thub__start-actions { flex-direction: row; width: 100%; justify-content: space-between; align-items: center; }
}

.thub__topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.thub__back {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  color: var(--color-text-1);
  flex-shrink: 0;
}
.thub__topbar-meta { flex: 1; }
.thub__topbar-eye {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-cyan);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.thub__topbar-title { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }

/* Hero */
.thub__hero {
  padding: 18px;
  position: relative;
  overflow: hidden;
}
.thub.is-desktop .thub__hero { padding: 24px; }
.thub__hero-glow {
  position: absolute;
  top: -40px;
  right: -30px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.22), transparent 70%);
  pointer-events: none;
}
.thub__hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: center;
  position: relative;
}
.thub.is-desktop .thub__hero-grid {
  grid-template-columns: 1fr 1.4fr 1fr;
  gap: 24px;
}
.thub__hero-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.thub__hero-current {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
}
.thub__hero-current-num { font-size: 36px; font-weight: 700; letter-spacing: -0.025em; }
.thub.is-desktop .thub__hero-current-num { font-size: 44px; }
.thub__hero-current-peak { font-size: 13px; color: var(--color-text-3); }
.thub__hero-sub { font-size: 11px; color: var(--color-text-3); margin-top: 4px; }
.thub__hero-progress { grid-column: 1 / -1; min-width: 0; }
.thub.is-desktop .thub__hero-progress { grid-column: auto; }
.thub__hero-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.thub__hero-target { font-size: 12px; font-weight: 700; color: var(--color-cyan); }
.thub__bar {
  position: relative;
  height: 8px;
  background: var(--color-surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.thub__bar-fill {
  position: absolute;
  inset: 0;
  background: var(--grad-primary);
  border-radius: 999px;
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.23);
  transition: width 0.4s ease;
}
.thub__hero-progress-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--color-text-3);
}
.thub__hero-phase { display: flex; align-items: center; gap: 12px; }
.thub__hero-phase-name { font-size: 14px; font-weight: 700; margin-top: 2px; }
.thub__hero-ring-num { font-size: 13px; font-weight: 700; color: var(--color-cyan); }

/* Section */
.thub__section { margin-top: 22px; }
.thub.is-desktop .thub__section { margin-top: 28px; }
.thub__section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 12px;
}
.thub__section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.thub__section-sub { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }
.thub__section-action {
  font-size: 12px;
  color: var(--color-cyan);
  font-weight: 700;
}

/* Roadmap */
.thub__roadmap {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.thub.is-desktop .thub__roadmap { grid-template-columns: repeat(3, 1fr); }
.thub__phase {
  padding: 14px;
  position: relative;
  overflow: hidden;
}
.thub__phase-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.thub__phase-num-wrap { display: flex; align-items: center; gap: 8px; }
.thub__phase-num {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid;
}
.thub__phase-name { font-size: 14px; font-weight: 700; }
.thub__phase-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 999px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid;
}
.thub__phase-parts {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.thub__phase-desc {
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.45;
}
.thub__phase-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 11px;
  color: var(--color-text-3);
}

/* Heatmap */
.thub__heatmap {
  padding: 14px;
  overflow-x: auto;
}
.thub__heatmap-grid {
  display: grid;
  grid-template-columns: 66px repeat(4, 1fr);
  gap: 4px;
  min-width: 360px;
}
.thub.is-desktop .thub__heatmap-grid { min-width: 0; }
.thub__heatmap-colhead {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-4);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  padding-bottom: 4px;
}
.thub__heatmap-rowhead {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 4px;
}
.thub__heatmap-rowbadge {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
}
.thub__heatmap-rowlabel { font-size: 11px; font-weight: 700; color: var(--color-text-2); }
.thub__heatmap-cell {
  border-radius: 7px;
  padding: 7px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  gap: 2px;
}
.thub__heatmap-cell-num { font-size: 12px; font-weight: 700; }
.thub__heatmap-cell-label {
  font-size: 8px;
  opacity: 0.75;
  text-align: center;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.thub__heatmap-legend {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  font-size: 10px;
  color: var(--color-text-3);
  flex-wrap: wrap;
  align-items: center;
}
.thub__heatmap-legend-label {
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.thub__heatmap-legend-item { display: inline-flex; align-items: center; gap: 4px; }
.thub__heatmap-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 1px solid;
}

/* Modules */
.thub__modules {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.thub.is-desktop .thub__modules { grid-template-columns: repeat(2, 1fr); }
.thub__module {
  padding: 14px;
  border-radius: 18px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 134px;
}
.thub.is-desktop .thub__module { padding: 16px; min-height: 150px; }
.thub__module-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.thub__module-badge {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-3);
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.thub__module-foot { margin-top: auto; }
.thub__module-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.005em;
}
.thub.is-desktop .thub__module-name { font-size: 15px; }
.thub__module-sub {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
  line-height: 1.4;
}

/* Quick stats (side column) */
.thub__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--color-border-1);
  border-radius: 14px;
  overflow: hidden;
}
.thub__stat {
  background: var(--color-surface-2);
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.thub__stat--btn { cursor: pointer; transition: background 0.15s ease; }
.thub__stat--btn:hover { background: var(--color-surface-3); }
.thub__stat-num { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
.thub__stat-lbl { font-size: 11px; color: var(--color-text-3); font-weight: 600; }
</style>
