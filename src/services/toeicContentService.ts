/**
 * TOEIC content service — validation + import for user-supplied questions
 * and media. Questions come as JSON (one set per Part); media (image/audio)
 * arrives as files matched to questions by filename. Everything is cached in
 * IndexedDB so it works offline / as a PWA without re-granting folder access.
 */
import { storageService, type StoredToeicMedia, type StoredToeicQuestion } from './storageService';
import type { TOEICQuestion, TOEICQuestionKind } from '@/types/toeic';

const VALID_KINDS: TOEICQuestionKind[] = [
  'photo',
  'qa',
  'conv',
  'talk',
  'fill',
  'cloze',
  'passage',
];

export interface ValidationIssue {
  /** Question id or '(set)' for set-level problems. */
  where: string;
  message: string;
}

export interface ParsedSet {
  part: number;
  questions: TOEICQuestion[];
  issues: ValidationIssue[];
}

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
const AUDIO_EXT = ['mp3', 'm4a', 'ogg', 'wav', 'aac'];

function ext(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function isImageFile(name: string): boolean {
  return IMAGE_EXT.includes(ext(name));
}
function isAudioFile(name: string): boolean {
  return AUDIO_EXT.includes(ext(name));
}
export function isQuestionJson(name: string): boolean {
  return ext(name) === 'json';
}

/**
 * Validate + normalize one raw question object. Returns the typed question
 * or pushes an issue and returns null. The schema mirrors src/types/toeic.ts.
 */
function validateQuestion(raw: unknown, part: number, issues: ValidationIssue[]): TOEICQuestion | null {
  if (typeof raw !== 'object' || raw === null) {
    issues.push({ where: '(set)', message: 'Một phần tử không phải object.' });
    return null;
  }
  const q = raw as Record<string, unknown>;
  const id = typeof q.id === 'string' ? q.id : '';
  const kind = q.kind as TOEICQuestionKind;
  const where = id || '(thiếu id)';

  if (!id) {
    issues.push({ where, message: 'Thiếu trường "id".' });
    return null;
  }
  if (!VALID_KINDS.includes(kind)) {
    issues.push({ where, message: `"kind" không hợp lệ: ${String(q.kind)}. Phải là một trong ${VALID_KINDS.join(', ')}.` });
    return null;
  }

  const opts = q.options;
  const hasOptions = Array.isArray(opts) && opts.every((o) => typeof o === 'string');
  const correctOk = (n: unknown, len: number) => typeof n === 'number' && n >= 0 && n < len;

  switch (kind) {
    case 'photo':
    case 'qa':
    case 'conv':
    case 'talk':
    case 'fill': {
      if (!hasOptions || (opts as string[]).length < 2) {
        issues.push({ where, message: '"options" phải là mảng ≥ 2 chuỗi.' });
        return null;
      }
      if (!correctOk(q.correct, (opts as string[]).length)) {
        issues.push({ where, message: '"correct" phải là index hợp lệ trong options.' });
        return null;
      }
      if ((kind === 'qa' || kind === 'fill') && typeof q.q !== 'string') {
        issues.push({ where, message: `Kind "${kind}" cần trường "q" (chuỗi câu hỏi).` });
        return null;
      }
      if ((kind === 'conv' || kind === 'talk') && (typeof q.q !== 'string' || typeof q.context !== 'string')) {
        issues.push({ where, message: `Kind "${kind}" cần "q" và "context".` });
        return null;
      }
      break;
    }
    case 'cloze': {
      if (typeof q.passage !== 'string') {
        issues.push({ where, message: 'Cloze cần "passage".' });
        return null;
      }
      const blanks = q.blanks;
      if (!Array.isArray(blanks) || blanks.length === 0) {
        issues.push({ where, message: 'Cloze cần mảng "blanks" không rỗng.' });
        return null;
      }
      for (const [i, b] of (blanks as Record<string, unknown>[]).entries()) {
        const bopts = b.options;
        if (!Array.isArray(bopts) || !bopts.every((o) => typeof o === 'string')) {
          issues.push({ where, message: `blank ${i + 1}: "options" không hợp lệ.` });
          return null;
        }
        if (!correctOk(b.correct, bopts.length)) {
          issues.push({ where, message: `blank ${i + 1}: "correct" không hợp lệ.` });
          return null;
        }
      }
      break;
    }
    case 'passage': {
      if (typeof q.passage !== 'string') {
        issues.push({ where, message: 'Passage cần "passage".' });
        return null;
      }
      const subs = q.questions;
      if (!Array.isArray(subs) || subs.length === 0) {
        issues.push({ where, message: 'Passage cần mảng "questions" không rỗng.' });
        return null;
      }
      for (const [i, s] of (subs as Record<string, unknown>[]).entries()) {
        const sopts = s.options;
        if (typeof s.q !== 'string' || !Array.isArray(sopts) || !sopts.every((o) => typeof o === 'string')) {
          issues.push({ where, message: `sub-question ${i + 1}: thiếu "q"/"options".` });
          return null;
        }
        if (!correctOk(s.correct, sopts.length)) {
          issues.push({ where, message: `sub-question ${i + 1}: "correct" không hợp lệ.` });
          return null;
        }
      }
      break;
    }
  }

  // Media fields are optional filenames; validate extension if present.
  if (q.image != null && (typeof q.image !== 'string' || !isImageFile(q.image as string))) {
    issues.push({ where, message: `"image" phải là tên file ảnh (${IMAGE_EXT.join('/')}).` });
  }
  if (q.audio != null && (typeof q.audio !== 'string' || !isAudioFile(q.audio as string))) {
    issues.push({ where, message: `"audio" phải là tên file audio (${AUDIO_EXT.join('/')}).` });
  }

  return q as unknown as TOEICQuestion;
}

/** Parse one JSON file's text into a validated set. */
export function parseQuestionSet(text: string, fileName: string): ParsedSet {
  const issues: ValidationIssue[] = [];
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { part: 0, questions: [], issues: [{ where: fileName, message: `JSON lỗi cú pháp: ${(e as Error).message}` }] };
  }

  const obj = json as Record<string, unknown>;
  const part = Number(obj.part);
  if (!Number.isInteger(part) || part < 1 || part > 7) {
    issues.push({ where: fileName, message: '"part" phải là số nguyên 1–7.' });
  }
  const rawQs = obj.questions;
  if (!Array.isArray(rawQs)) {
    issues.push({ where: fileName, message: 'Thiếu mảng "questions".' });
    return { part: part || 0, questions: [], issues };
  }

  const questions: TOEICQuestion[] = [];
  const seen = new Set<string>();
  for (const raw of rawQs) {
    const q = validateQuestion(raw, part, issues);
    if (q) {
      if (seen.has(q.id)) {
        issues.push({ where: q.id, message: 'Trùng "id" trong cùng file.' });
        continue;
      }
      seen.add(q.id);
      questions.push(q);
    }
  }
  return { part: part || 0, questions, issues };
}

/** Persist a validated set, overwriting questions with the same id. */
export async function importQuestionSet(set: ParsedSet): Promise<number> {
  if (set.part < 1 || set.part > 7 || set.questions.length === 0) return 0;
  const rows: StoredToeicQuestion[] = set.questions.map((q) => ({
    id: q.id,
    part: set.part,
    data: q,
  }));
  await storageService.putToeicQuestions(rows);
  return rows.length;
}

/** Store media files keyed by their filename (overwrite on re-upload). */
export async function importMediaFiles(files: File[]): Promise<{ stored: number; skipped: string[] }> {
  const rows: StoredToeicMedia[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (!isImageFile(f.name) && !isAudioFile(f.name)) {
      skipped.push(f.name);
      continue;
    }
    rows.push({
      key: f.name,
      blob: f,
      type: f.type || (isImageFile(f.name) ? `image/${ext(f.name)}` : `audio/${ext(f.name)}`),
      size: f.size,
      uploadedAt: new Date().toISOString(),
    });
  }
  if (rows.length > 0) await storageService.putToeicMedia(rows);
  return { stored: rows.length, skipped };
}

export interface PartCoverage {
  part: number;
  questionCount: number;
  needImage: number;
  haveImage: number;
  needAudio: number;
  haveAudio: number;
  /** Filenames referenced by questions but not yet uploaded. */
  missingMedia: string[];
}

/** Compute, per Part, how many questions are missing referenced media. */
export async function computeCoverage(): Promise<PartCoverage[]> {
  const [allQs, mediaKeys] = await Promise.all([
    storageService.getAllToeicQuestions(),
    storageService.getAllToeicMediaKeys(),
  ]);
  const have = new Set(mediaKeys);
  const byPart = new Map<number, StoredToeicQuestion[]>();
  for (const r of allQs) {
    const arr = byPart.get(r.part) ?? [];
    arr.push(r);
    byPart.set(r.part, arr);
  }
  const out: PartCoverage[] = [];
  for (const [part, rows] of [...byPart.entries()].sort((a, b) => a[0] - b[0])) {
    let needImage = 0;
    let haveImage = 0;
    let needAudio = 0;
    let haveAudio = 0;
    const missing = new Set<string>();
    for (const { data } of rows) {
      if (data.image) {
        needImage += 1;
        if (have.has(data.image)) haveImage += 1;
        else missing.add(data.image);
      }
      if (data.audio) {
        needAudio += 1;
        if (have.has(data.audio)) haveAudio += 1;
        else missing.add(data.audio);
      }
    }
    out.push({
      part,
      questionCount: rows.length,
      needImage,
      haveImage,
      needAudio,
      haveAudio,
      missingMedia: [...missing],
    });
  }
  return out;
}

// — Media object-URL cache. Object URLs are created lazily and revoked when
// the cache is cleared (e.g. on content re-import) to avoid leaks.
const urlCache = new Map<string, string>();

export async function getMediaUrl(key: string | undefined): Promise<string | null> {
  if (!key) return null;
  if (urlCache.has(key)) return urlCache.get(key)!;
  const row = await storageService.getToeicMedia(key);
  if (!row) return null;
  const url = URL.createObjectURL(row.blob);
  urlCache.set(key, url);
  return url;
}

export function clearMediaUrlCache(): void {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

/** Best-effort request for persistent storage so the browser won't evict. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
