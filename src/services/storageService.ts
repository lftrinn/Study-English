import { openDB, type IDBPDatabase } from 'idb';
import type { Chunk } from '@/types/chunk';
import type { ChunkProgress, ListeningLog } from '@/types/progress';
import type { PracticeResult } from '@/types/practice';
import type { TOEICQuestion } from '@/types/toeic';

const DB_NAME = 'chunk-listening-lab';
const DB_VERSION = 2;

const STORES = {
  progress: 'progress',
  listeningLogs: 'listeningLogs',
  practiceResults: 'practiceResults',
  customChunks: 'customChunks',
  toeicQuestions: 'toeicQuestions',
  toeicMedia: 'toeicMedia',
} as const;

/** A user-imported TOEIC question, tagged with its Part for indexed lookup. */
export interface StoredToeicQuestion {
  id: string;
  part: number;
  data: TOEICQuestion;
}

/** A media asset (image/audio) stored as a Blob, keyed by its filename. */
export interface StoredToeicMedia {
  key: string;
  blob: Blob;
  type: string;
  size: number;
  uploadedAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // Guarded creates make the upgrade idempotent across versions: a fresh
      // install (oldVersion 0) builds everything; a v1→v2 upgrade adds only
      // the two TOEIC stores.
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.progress)) {
          db.createObjectStore(STORES.progress, { keyPath: 'chunkId' });
        }
        if (!db.objectStoreNames.contains(STORES.listeningLogs)) {
          const s = db.createObjectStore(STORES.listeningLogs, { keyPath: 'id' });
          s.createIndex('byChunkId', 'chunkId');
          s.createIndex('byPlayedAt', 'playedAt');
        }
        if (!db.objectStoreNames.contains(STORES.practiceResults)) {
          const s = db.createObjectStore(STORES.practiceResults, { keyPath: 'id' });
          s.createIndex('byChunkId', 'chunkId');
          s.createIndex('byPracticedAt', 'practicedAt');
        }
        if (!db.objectStoreNames.contains(STORES.customChunks)) {
          db.createObjectStore(STORES.customChunks, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.toeicQuestions)) {
          const s = db.createObjectStore(STORES.toeicQuestions, { keyPath: 'id' });
          s.createIndex('byPart', 'part');
        }
        if (!db.objectStoreNames.contains(STORES.toeicMedia)) {
          db.createObjectStore(STORES.toeicMedia, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export type BackupShape = {
  version: number;
  exportedAt: string;
  progress: ChunkProgress[];
  listeningLogs: ListeningLog[];
  practiceResults: PracticeResult[];
  customChunks: Chunk[];
};

export const storageService = {
  // ----- Progress -----
  async getAllProgress(): Promise<ChunkProgress[]> {
    const db = await getDb();
    return db.getAll(STORES.progress);
  },
  async getProgress(chunkId: string): Promise<ChunkProgress | undefined> {
    const db = await getDb();
    return db.get(STORES.progress, chunkId);
  },
  async putProgress(p: ChunkProgress): Promise<void> {
    const db = await getDb();
    await db.put(STORES.progress, p);
  },

  // ----- Listening logs -----
  async addListeningLog(log: ListeningLog): Promise<void> {
    const db = await getDb();
    await db.put(STORES.listeningLogs, log);
  },
  async getRecentListeningLogs(limit = 500): Promise<ListeningLog[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORES.listeningLogs, 'byPlayedAt');
    return all.slice(-limit).reverse();
  },
  async getListeningLogsSince(isoDate: string): Promise<ListeningLog[]> {
    const db = await getDb();
    const range = IDBKeyRange.lowerBound(isoDate);
    return db.getAllFromIndex(STORES.listeningLogs, 'byPlayedAt', range);
  },

  // ----- Practice results -----
  async addPracticeResult(r: PracticeResult): Promise<void> {
    const db = await getDb();
    await db.put(STORES.practiceResults, r);
  },
  async getRecentPracticeResults(limit = 500): Promise<PracticeResult[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORES.practiceResults, 'byPracticedAt');
    return all.slice(-limit).reverse();
  },

  // ----- Custom chunks -----
  async getAllCustomChunks(): Promise<Chunk[]> {
    const db = await getDb();
    return db.getAll(STORES.customChunks);
  },
  async putCustomChunk(c: Chunk): Promise<void> {
    const db = await getDb();
    await db.put(STORES.customChunks, c);
  },
  async deleteCustomChunk(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORES.customChunks, id);
  },

  // ----- TOEIC questions -----
  async getToeicQuestionsByPart(part: number): Promise<StoredToeicQuestion[]> {
    const db = await getDb();
    return db.getAllFromIndex(STORES.toeicQuestions, 'byPart', part);
  },
  async getAllToeicQuestions(): Promise<StoredToeicQuestion[]> {
    const db = await getDb();
    return db.getAll(STORES.toeicQuestions);
  },
  async putToeicQuestions(rows: StoredToeicQuestion[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(STORES.toeicQuestions, 'readwrite');
    for (const r of rows) await tx.objectStore(STORES.toeicQuestions).put(r);
    await tx.done;
  },
  async deleteToeicQuestion(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORES.toeicQuestions, id);
  },
  async clearToeicQuestionsByPart(part: number): Promise<void> {
    const db = await getDb();
    const rows = await db.getAllFromIndex(STORES.toeicQuestions, 'byPart', part);
    const tx = db.transaction(STORES.toeicQuestions, 'readwrite');
    for (const r of rows) await tx.objectStore(STORES.toeicQuestions).delete(r.id);
    await tx.done;
  },

  // ----- TOEIC media (image/audio blobs) -----
  async getToeicMedia(key: string): Promise<StoredToeicMedia | undefined> {
    const db = await getDb();
    return db.get(STORES.toeicMedia, key);
  },
  async getAllToeicMediaKeys(): Promise<string[]> {
    const db = await getDb();
    return (await db.getAllKeys(STORES.toeicMedia)) as string[];
  },
  async getAllToeicMedia(): Promise<StoredToeicMedia[]> {
    const db = await getDb();
    return db.getAll(STORES.toeicMedia);
  },
  async putToeicMedia(rows: StoredToeicMedia[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(STORES.toeicMedia, 'readwrite');
    for (const r of rows) await tx.objectStore(STORES.toeicMedia).put(r);
    await tx.done;
  },
  async deleteToeicMedia(key: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORES.toeicMedia, key);
  },
  async clearToeicContent(): Promise<void> {
    const db = await getDb();
    await Promise.all([db.clear(STORES.toeicQuestions), db.clear(STORES.toeicMedia)]);
  },

  // ----- Bulk -----
  async clearAll(): Promise<void> {
    const db = await getDb();
    await Promise.all([
      db.clear(STORES.progress),
      db.clear(STORES.listeningLogs),
      db.clear(STORES.practiceResults),
      db.clear(STORES.customChunks),
      db.clear(STORES.toeicQuestions),
      db.clear(STORES.toeicMedia),
    ]);
  },

  async exportBackup(): Promise<BackupShape> {
    const [progress, listeningLogs, practiceResults, customChunks] = await Promise.all([
      this.getAllProgress(),
      this.getRecentListeningLogs(100000),
      this.getRecentPracticeResults(100000),
      this.getAllCustomChunks(),
    ]);
    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      progress,
      listeningLogs,
      practiceResults,
      customChunks,
    };
  },

  async importBackup(b: BackupShape): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(
      [STORES.progress, STORES.listeningLogs, STORES.practiceResults, STORES.customChunks],
      'readwrite',
    );
    for (const p of b.progress ?? []) await tx.objectStore(STORES.progress).put(p);
    for (const l of b.listeningLogs ?? []) await tx.objectStore(STORES.listeningLogs).put(l);
    for (const r of b.practiceResults ?? []) await tx.objectStore(STORES.practiceResults).put(r);
    for (const c of b.customChunks ?? []) await tx.objectStore(STORES.customChunks).put(c);
    await tx.done;
  },
};
