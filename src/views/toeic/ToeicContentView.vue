<script setup lang="ts">
/**
 * TOEIC content manager — import user questions + media, see coverage, and
 * read the in-app authoring guide. The folder picker (webkitdirectory) reads
 * a whole content folder at once; a multi-file picker is the iOS fallback.
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';
import { storageService } from '@/services/storageService';
import {
  clearMediaUrlCache,
  computeCoverage,
  estimateStorage,
  importMediaFiles,
  importQuestionSet,
  isQuestionJson,
  parseQuestionSet,
  requestPersistentStorage,
  type PartCoverage,
  type ValidationIssue,
} from '@/services/toeicContentService';

const router = useRouter();
const toeic = useToeicStore();

const folderInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const pasteOpen = ref(false);
const pasteText = ref('');
const guideOpen = ref(true);

const busy = ref(false);
const coverage = ref<PartCoverage[]>([]);
const storageInfo = ref<{ usage: number; quota: number } | null>(null);
const persisted = ref(false);

const report = ref<{
  importedQuestions: number;
  importedMedia: number;
  skippedFiles: string[];
  issues: ValidationIssue[];
} | null>(null);

const totalQuestions = computed(() =>
  coverage.value.reduce((s, c) => s + c.questionCount, 0),
);

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function refresh() {
  coverage.value = await computeCoverage();
  storageInfo.value = await estimateStorage();
  await toeic.loadUserContent();
}

onMounted(async () => {
  persisted.value = await requestPersistentStorage();
  await refresh();
});

async function ingestFiles(files: File[]) {
  busy.value = true;
  const issues: ValidationIssue[] = [];
  let importedQuestions = 0;
  // 1) Question JSON files
  const jsonFiles = files.filter((f) => isQuestionJson(f.name));
  for (const f of jsonFiles) {
    const text = await f.text();
    const set = parseQuestionSet(text, f.name);
    issues.push(...set.issues);
    importedQuestions += await importQuestionSet(set);
  }
  // 2) Media files (everything else handled inside importMediaFiles)
  const mediaFiles = files.filter((f) => !isQuestionJson(f.name));
  const { stored, skipped } = await importMediaFiles(mediaFiles);

  clearMediaUrlCache();
  report.value = {
    importedQuestions,
    importedMedia: stored,
    skippedFiles: skipped,
    issues,
  };
  await refresh();
  busy.value = false;
}

function pickFolder() {
  folderInput.value?.click();
}
function pickFiles() {
  fileInput.value?.click();
}
async function onFolderChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length) await ingestFiles(files);
  input.value = '';
}
async function onFilesChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length) await ingestFiles(files);
  input.value = '';
}
async function importPaste() {
  if (!pasteText.value.trim()) return;
  busy.value = true;
  const set = parseQuestionSet(pasteText.value, '(dán)');
  const imported = await importQuestionSet(set);
  report.value = {
    importedQuestions: imported,
    importedMedia: 0,
    skippedFiles: [],
    issues: set.issues,
  };
  pasteText.value = '';
  pasteOpen.value = false;
  await refresh();
  busy.value = false;
}

function downloadTemplate() {
  const template = {
    part: 1,
    questions: [
      {
        id: 'p1-001',
        kind: 'photo',
        topic: 'office',
        image: 'p1-001.jpg',
        audio: 'p1-001.mp3',
        options: [
          'The woman is typing on a keyboard.',
          'The woman is holding a coffee mug.',
          'The woman is closing a laptop.',
          'The woman is talking on the phone.',
        ],
        correct: 0,
        explain: 'Hành động thấy được: typing.',
        tags: ['Động từ trạng thái'],
      },
    ],
  };
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'part1.template.json';
  a.click();
  URL.revokeObjectURL(url);
}

const confirmClear = ref(false);
async function clearAll() {
  await storageService.clearToeicContent();
  clearMediaUrlCache();
  confirmClear.value = false;
  report.value = null;
  await refresh();
}

function partName(p: number) {
  return TOEIC_PARTS.find((x) => x.id === p)?.vi ?? `Part ${p}`;
}

function onClose() {
  router.push('/toeic');
}
</script>

<template>
  <ModeShell title="TOEIC · Quản lý nội dung" subtitle="Thêm đề & media của bạn" :on-close="onClose">
    <div class="tcm">
      <!-- Guide -->
      <section class="glass tcm__guide">
        <button class="btn tap tcm__guide-head" @click="guideOpen = !guideOpen">
          <Icon name="sparkle" :size="14" :style="{ color: 'var(--color-cyan)' }" />
          <span class="tcm__guide-title">Hướng dẫn thêm dữ liệu</span>
          <Icon :name="guideOpen ? 'chevron-up' : 'chevron-down'" :size="16" :style="{ color: 'var(--color-text-3)' }" />
        </button>

        <div v-if="guideOpen" class="tcm__guide-body">
          <ol class="tcm__steps">
            <li>
              <b>Tạo 1 folder</b> trên máy (tên gì cũng được, vd <code>my-toeic/</code>) chứa file câu hỏi <code>.json</code> và file ảnh/audio.
            </li>
            <li>
              <b>File câu hỏi</b>: mỗi Part 1 file JSON dạng
              <code>{ "part": 1, "questions": [...] }</code>. Tên file tùy ý (vd <code>part1.json</code>).
            </li>
            <li>
              <b>Đặt ID câu hỏi</b> theo quy ước <code>p{PART}-{NNN}</code> — vd <code>p1-001</code>, <code>p5-014</code>.
            </li>
            <li>
              <b>Đặt tên file media</b> trùng với field trong JSON:
              <div class="tcm__naming">
                <span>Ảnh: <code>{id}.jpg|png|webp</code> → <code>p1-001.jpg</code></span>
                <span>Audio: <code>{id}.mp3|m4a|ogg</code> → <code>p1-001.mp3</code></span>
              </div>
              Trong JSON ghi <code>"image": "p1-001.jpg"</code>, <code>"audio": "p1-001.mp3"</code> (chỉ tên file, không nhúng dữ liệu).
            </li>
            <li>
              Bấm <b>Chọn folder</b> bên dưới → trình duyệt xin quyền đọc folder → app tự khớp ảnh/audio với câu hỏi theo tên file.
            </li>
          </ol>

          <div class="tcm__kinds">
            <div class="tcm__kinds-title">7 loại câu (field bắt buộc)</div>
            <table class="tcm__table">
              <thead><tr><th>kind</th><th>Part</th><th>Field chính</th></tr></thead>
              <tbody>
                <tr><td><code>photo</code></td><td>1</td><td>options[], correct, image?, audio?</td></tr>
                <tr><td><code>qa</code></td><td>2</td><td>q, options[], correct, audio?</td></tr>
                <tr><td><code>conv</code></td><td>3</td><td>q, context, options[], correct, audio?</td></tr>
                <tr><td><code>talk</code></td><td>4</td><td>q, context, options[], correct, audio?</td></tr>
                <tr><td><code>fill</code></td><td>5</td><td>q (có ___), options[], correct</td></tr>
                <tr><td><code>cloze</code></td><td>6</td><td>passage, blanks[]&#123;options,correct&#125;</td></tr>
                <tr><td><code>passage</code></td><td>7</td><td>passage, questions[]&#123;q,options,correct&#125;</td></tr>
              </tbody>
            </table>
          </div>

          <div class="tcm__perm">
            <Icon name="eye" :size="13" :style="{ color: 'var(--color-amber)' }" />
            <div>
              <b>Quyền & lưu trữ:</b> trình duyệt chỉ <b>đọc</b> folder bạn chọn (không sửa/xoá file gốc). Dữ liệu được copy vào <b>IndexedDB trên thiết bị này</b> — không gửi lên server nào. Muốn dùng trên máy khác: giữ folder đó và import lại. App đã xin quyền <b>persistent storage</b> để tránh bị trình duyệt tự xoá.
            </div>
          </div>

          <button class="btn tap tcm__template-btn" @click="downloadTemplate">
            <Icon name="download" :size="13" /> Tải file mẫu (part1.template.json)
          </button>
        </div>
      </section>

      <!-- Import actions -->
      <section class="tcm__actions">
        <button class="btn tap tcm__action tcm__action--primary" :disabled="busy" @click="pickFolder">
          <Icon name="library" :size="16" :style="{ color: '#fff' }" />
          <span>Chọn folder</span>
        </button>
        <button class="btn tap tcm__action" :disabled="busy" @click="pickFiles">
          <Icon name="upload" :size="16" />
          <span>Chọn nhiều file</span>
        </button>
        <button class="btn tap tcm__action" :disabled="busy" @click="pasteOpen = !pasteOpen">
          <Icon name="edit" :size="16" />
          <span>Dán JSON</span>
        </button>
      </section>
      <div class="tcm__hint">
        <b>Chọn folder</b> nhập cả đề + media một lần (Chrome/Edge/Firefox/Safari desktop).
        iPhone/iPad dùng <b>Chọn nhiều file</b>.
      </div>

      <!-- hidden inputs -->
      <input ref="folderInput" type="file" webkitdirectory multiple :style="{ display: 'none' }" @change="onFolderChange" />
      <input ref="fileInput" type="file" multiple accept=".json,image/*,audio/*" :style="{ display: 'none' }" @change="onFilesChange" />

      <!-- Paste box -->
      <div v-if="pasteOpen" class="tcm__paste">
        <textarea
          v-model="pasteText"
          class="tcm__paste-area"
          placeholder='{ "part": 1, "questions": [ ... ] }'
          rows="8"
        />
        <button class="btn tap tcm__paste-btn" :disabled="busy || !pasteText.trim()" @click="importPaste">Import JSON đã dán</button>
      </div>

      <!-- Import report -->
      <div v-if="report" class="glass tcm__report" :class="{ 'has-errors': report.issues.length > 0 }">
        <div class="tcm__report-head">
          <Icon :name="report.issues.length ? 'eye' : 'check'" :size="14" :style="{ color: report.issues.length ? 'var(--color-amber)' : 'var(--color-emerald)' }" />
          Kết quả import
        </div>
        <div class="tcm__report-line">
          Câu hỏi: <b class="mono">{{ report.importedQuestions }}</b> · Media: <b class="mono">{{ report.importedMedia }}</b>
          <template v-if="report.skippedFiles.length"> · Bỏ qua: <b class="mono">{{ report.skippedFiles.length }}</b> file</template>
        </div>
        <ul v-if="report.issues.length" class="tcm__report-issues">
          <li v-for="(iss, i) in report.issues.slice(0, 20)" :key="i">
            <span class="mono tcm__report-where">{{ iss.where }}</span> — {{ iss.message }}
          </li>
          <li v-if="report.issues.length > 20" class="tcm__report-more">… và {{ report.issues.length - 20 }} lỗi nữa</li>
        </ul>
      </div>

      <!-- Coverage per Part -->
      <section class="glass tcm__coverage">
        <div class="tcm__coverage-head">
          <span>Nội dung hiện có</span>
          <span class="mono tcm__coverage-total">{{ totalQuestions }} câu</span>
        </div>
        <div v-if="coverage.length === 0" class="tcm__coverage-empty">
          Chưa có câu nào được import. Đang dùng câu mẫu mặc định.
        </div>
        <div v-else class="tcm__coverage-rows">
          <div v-for="c in coverage" :key="c.part" class="tcm__coverage-row">
            <span class="mono tcm__coverage-p" :style="{
              color: TOEIC_PARTS.find((p) => p.id === c.part)?.color,
              background: `color-mix(in oklch, ${TOEIC_PARTS.find((p) => p.id === c.part)?.color} 18%, transparent)`,
            }">P{{ c.part }}</span>
            <div class="tcm__coverage-body">
              <div class="tcm__coverage-name">{{ partName(c.part) }} · <span class="mono">{{ c.questionCount }}</span> câu</div>
              <div class="tcm__coverage-media">
                <span :class="{ 'is-ok': c.needImage > 0 && c.haveImage === c.needImage }">
                  Ảnh {{ c.haveImage }}/{{ c.needImage }}
                </span>
                <span :class="{ 'is-ok': c.needAudio > 0 && c.haveAudio === c.needAudio }">
                  Audio {{ c.haveAudio }}/{{ c.needAudio }}
                </span>
                <span v-if="c.missingMedia.length" class="tcm__coverage-missing">
                  thiếu {{ c.missingMedia.length }} file
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Storage + danger -->
      <section class="glass tcm__storage">
        <div class="tcm__storage-row">
          <Icon name="gauge" :size="14" :style="{ color: 'var(--color-cyan)' }" />
          <div class="tcm__storage-text">
            <div class="tcm__storage-lbl">Dung lượng đã dùng</div>
            <div class="mono tcm__storage-val" v-if="storageInfo">
              {{ fmtBytes(storageInfo.usage) }} / {{ fmtBytes(storageInfo.quota) }}
            </div>
            <div class="mono tcm__storage-val" v-else>Không đo được</div>
          </div>
          <span class="tcm__persist" :class="{ 'is-on': persisted }">
            {{ persisted ? 'Persistent ✓' : 'Best-effort' }}
          </span>
        </div>
        <button class="btn tap tcm__clear" @click="confirmClear = true">
          <Icon name="trash" :size="14" :style="{ color: 'var(--color-rose)' }" /> Xoá toàn bộ nội dung đã import
        </button>
      </section>

      <!-- confirm clear -->
      <div v-if="confirmClear" class="tcm__confirm">
        <div class="tcm__confirm-text">Xoá hết câu hỏi + media đã import? Câu mẫu mặc định vẫn còn. Không hoàn tác.</div>
        <div class="tcm__confirm-actions">
          <button class="btn tap glass tcm__confirm-cancel" @click="confirmClear = false">Huỷ</button>
          <button class="btn tap tcm__confirm-ok" @click="clearAll">Xoá hết</button>
        </div>
      </div>
    </div>
  </ModeShell>
</template>

<style scoped>
.tcm {
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Guide */
.tcm__guide { padding: 0; overflow: hidden; }
.tcm__guide-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: transparent;
}
.tcm__guide-title { flex: 1; text-align: left; font-size: 14px; font-weight: 700; }
.tcm__guide-body {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tcm__steps {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}
.tcm__steps li { margin-bottom: 6px; }
.tcm__steps code, .tcm__perm code, .tcm__naming code, .tcm__table code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  padding: 1px 5px;
  border-radius: 5px;
  color: var(--color-cyan);
}
.tcm__naming {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 6px 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.tcm__kinds-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.tcm__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}
.tcm__table th, .tcm__table td {
  text-align: left;
  padding: 5px 6px;
  border-bottom: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  vertical-align: top;
}
.tcm__table th {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-3);
}
.tcm__perm {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--color-amber) 9%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-amber) 22%, transparent);
  font-size: 12px;
  line-height: 1.55;
  color: var(--color-text-2);
}
.tcm__template-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
}

/* Actions */
.tcm__actions { display: flex; gap: 8px; }
.tcm__action {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
}
.tcm__action--primary {
  background: var(--grad-primary);
  color: #fff;
  border: none;
  box-shadow: 0 10px 28px rgba(34, 211, 238, 0.35);
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
}
.tcm__action[disabled] { opacity: 0.5; cursor: not-allowed; }
.tcm__hint { font-size: 11px; color: var(--color-text-3); line-height: 1.5; }

/* Paste */
.tcm__paste { display: flex; flex-direction: column; gap: 8px; }
.tcm__paste-area {
  width: 100%;
  resize: vertical;
  padding: 12px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-1);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
  outline: none;
}
.tcm__paste-btn {
  align-self: flex-start;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
}
.tcm__paste-btn[disabled] { opacity: 0.5; }

/* Report */
.tcm__report { padding: 14px; }
.tcm__report.has-errors { border-color: color-mix(in oklch, var(--color-amber) 35%, transparent); }
.tcm__report-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
}
.tcm__report-line { font-size: 13px; color: var(--color-text-2); }
.tcm__report-issues {
  margin: 8px 0 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.5;
}
.tcm__report-where { color: var(--color-rose); }
.tcm__report-more { color: var(--color-text-4); }

/* Coverage */
.tcm__coverage { padding: 14px; }
.tcm__coverage-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.tcm__coverage-total { color: var(--color-text-1); }
.tcm__coverage-empty { font-size: 13px; color: var(--color-text-3); }
.tcm__coverage-rows { display: flex; flex-direction: column; gap: 8px; }
.tcm__coverage-row { display: flex; align-items: center; gap: 12px; }
.tcm__coverage-p {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 6px;
  min-width: 36px;
  text-align: center;
}
.tcm__coverage-body { flex: 1; min-width: 0; }
.tcm__coverage-name { font-size: 13px; font-weight: 600; }
.tcm__coverage-media {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
  flex-wrap: wrap;
}
.tcm__coverage-media .is-ok { color: var(--color-emerald); }
.tcm__coverage-missing { color: var(--color-rose); }

/* Storage */
.tcm__storage { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.tcm__storage-row { display: flex; align-items: center; gap: 10px; }
.tcm__storage-text { flex: 1; }
.tcm__storage-lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tcm__storage-val { font-size: 13px; margin-top: 2px; }
.tcm__persist {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-surface-2);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
}
.tcm__persist.is-on {
  color: var(--color-emerald);
  background: color-mix(in oklch, var(--color-emerald) 14%, transparent);
  border-color: color-mix(in oklch, var(--color-emerald) 30%, transparent);
}
.tcm__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-rose);
  background: color-mix(in oklch, var(--color-rose) 10%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-rose) 26%, transparent);
}

/* Confirm */
.tcm__confirm {
  padding: 14px;
  border-radius: 14px;
  background: color-mix(in oklch, var(--color-rose) 10%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-rose) 28%, transparent);
}
.tcm__confirm-text { font-size: 13px; color: var(--color-text-2); line-height: 1.5; }
.tcm__confirm-actions { display: flex; gap: 8px; margin-top: 12px; }
.tcm__confirm-cancel { flex: 1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 700; }
.tcm__confirm-ok {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  background: var(--color-rose);
  color: #fff;
}
</style>
