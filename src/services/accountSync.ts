import { API_BASE } from './apiBase';
import { apiFetch } from './apiFetch';
import { getCurrentUserId, getCareToken } from './session';

const prefixes: Record<string, string> = {
  companion: 'puffsqueeze_companion_', companion_moods: 'puffsqueeze_companion_moods_',
  daily_plans: 'puffsqueeze_daily_plans_', poetry_cards: 'puffsqueeze_poetry_cards_',
  fishing_collection: 'puffsqueeze_fishing_collection_v1_', care_local: 'puffsqueeze_care_local_v1_',
  ai_messages: 'puffsqueeze_ai_messages_', care_visuals: 'puffsqueeze_care_visuals_',
  voice_studio: 'puffsqueeze_voice_studio_',
};
export const ACCOUNT_SYNC_EVENT = 'puffsqueeze:account-sync';
type QueuedRecord = { id: string; userId: number; type: 'document' | 'activity'; key: string; value: unknown; time: string; seedOnly?: boolean };
export type SyncState = { status: 'loading' | 'saved' | 'pending' | 'offline' | 'login' | 'storage-error'; pending: number };
let state: SyncState = { status: 'loading', pending: 0 };
let activeUser = 0;
let generation = 0;
let running: Promise<boolean> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let database: Promise<IDBDatabase> | undefined;
let storageFailed = false;

export function accountRecordId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
}
export function getSyncState() { return state; }
export function reportStorageError() { storageFailed = true; publish('storage-error'); }
function publish(status: SyncState['status'], pending = state.pending) {
  if (storageFailed && status !== 'login') status = 'storage-error';
  state = { status, pending }; window.dispatchEvent(new Event(ACCOUNT_SYNC_EVENT));
}
function openQueue(): Promise<IDBDatabase> {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('puffsqueeze-account-sync', 1);
    request.onupgradeneeded = () => { const store = request.result.createObjectStore('pending', { keyPath: 'id' }); store.createIndex('user', 'userId'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close older app tabs to update storage'));
  }).catch(error => { database = undefined; throw error; });
  return database;
}
async function queued(userId: number): Promise<QueuedRecord[]> {
  const db = await openQueue();
  return new Promise<QueuedRecord[]>((resolve, reject) => {
    const request = db.transaction('pending').objectStore('pending').index('user').getAll(userId);
    request.onsuccess = () => resolve((request.result as QueuedRecord[]).sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id)));
    request.onerror = () => reject(request.error);
  });
}
async function changeQueue(records: QueuedRecord[], remove = false): Promise<void> {
  const db = await openQueue();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite');
    for (const record of records) { if (remove) tx.objectStore('pending').delete(record.id); else tx.objectStore('pending').put(record); }
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
let lastTime = 0;
function record(type: QueuedRecord['type'], key: string, value: unknown, userId: number): QueuedRecord {
  // Monotonic timestamps preserve order for multiple writes in the same millisecond.
  lastTime = Math.max(Date.now(), lastTime + 1);
  return { id: accountRecordId(), userId, type, key, value, time: new Date(lastTime).toISOString() };
}
async function enqueue(item: QueuedRecord) {
  try {
    await changeQueue([item]);
    if (item.userId === activeUser) {
      const pending = (await queued(item.userId)).length;
      publish('pending', pending);
      clearTimeout(timer); timer = setTimeout(() => { void flushAccountSync(); }, 400);
    }
    return true;
  } catch { reportStorageError(); return false; }
}

/** Existing UI can still read its local cache synchronously. Uploads are durable IndexedDB jobs. */
export function saveAccountItem(key: string, serialized: string, userId = getCurrentUserId()) {
  let localError: unknown;
  try {
    if (localStorage.getItem(key) === serialized) return;
    localStorage.setItem(key, serialized);
  } catch (error) { localError = error; reportStorageError(); }
  if (userId <= 0) return;
  const document = Object.keys(prefixes).find(name => key === prefixes[name] + userId);
  if (!document) throw new Error('Unsupported account document');
  let value: unknown = serialized;
  if (document !== 'companion') value = JSON.parse(serialized);
  void enqueue(record('document', document, value, userId));
  if (localError) throw localError;
}
export function recordActivity(key: string, value: unknown = {}, userId = getCurrentUserId()) {
  return userId > 0 ? enqueue(record('activity', key, value, userId)) : Promise.resolve(false);
}

export function flushAccountSync(): Promise<boolean> {
  if (running) return running.then(() => flushAccountSync());
  const userId = activeUser;
  running = (async () => {
    if (!userId || getCurrentUserId() !== userId || !getCareToken()) { publish('login'); return false; }
    try {
      let pending = await queued(userId);
      while (pending.length) {
        const batch: QueuedRecord[] = []; let bytes = 0;
        for (const item of pending) {
          const size = new Blob([JSON.stringify(item)]).size;
          if (batch.length && (bytes + size > 4 * 1024 * 1024 || batch.length >= 20)) break;
          batch.push(item); bytes += size;
        }
        if (activeUser !== userId || getCurrentUserId() !== userId || !getCareToken()) return false;
        const res = await apiFetch(`${API_BASE}/api/user-data`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: batch }), signal: AbortSignal.timeout(15000),
        });
        const json = await res.json();
        if (!res.ok || !json.success) { publish(res.status === 401 ? 'login' : 'offline', pending.length); return false; }
        const accepted = new Set<string>(json.data.accepted);
        const completed = batch.filter(item => accepted.has(item.id));
        if (!completed.length) throw new Error('No records acknowledged');
        await changeQueue(completed, true);
        pending = await queued(userId);
        if (activeUser === userId) publish(pending.length ? 'pending' : 'saved', pending.length);
      }
      if (activeUser === userId) publish('saved', 0);
      return true;
    } catch { if (activeUser === userId) publish('offline'); return false; }
  })().finally(() => { running = null; });
  return running;
}

async function hydrate(userId: number, epoch: number) {
  const response = await apiFetch(`${API_BASE}/api/user-data`, { signal: AbortSignal.timeout(10000) });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error('Account restore unavailable');
  if (activeUser !== userId || getCurrentUserId() !== userId || generation !== epoch) return;
  const documents = json.data.documents as Record<string, unknown>;
  const jobs: QueuedRecord[] = [];
  const backup: Record<string, unknown> = {};
  const restores: { key: string; value: string }[] = [];
  for (const [name, prefix] of Object.entries(prefixes)) {
    const key = prefix + userId, local = localStorage.getItem(key);
    let localValue: unknown;
    try { localValue = local === null ? undefined : name === 'companion' ? local : JSON.parse(local); } catch { continue; }
    if (Object.prototype.hasOwnProperty.call(documents, name)) {
      const server = documents[name];
      if (local !== null && JSON.stringify(localValue) !== JSON.stringify(server)) backup[name] = localValue;
      restores.push({ key, value: name === 'companion' ? String(server) : JSON.stringify(server) });
    } else if (local !== null) jobs.push({ ...record('document', name, localValue, userId), seedOnly: true });
  }
  // Preserve pre-sync data that differs from another device's latest document.
  for (const [name, value] of Object.entries(backup)) jobs.push(record('activity', 'local_import_backup', { document: name, value }, userId));
  // Commit any old local content to the durable outbox before replacing it.
  try {
    if (jobs.length) await changeQueue(jobs);
    if (generation !== epoch || activeUser !== userId || getCurrentUserId() !== userId) return;
    for (const item of restores) localStorage.setItem(item.key, item.value);
  } catch (error) { reportStorageError(); throw error; }
}

/** Mount once per signed-in account, before private screens read their caches. */
export function startAccountSync(userId: number): { ready: Promise<void>; stop: () => void } {
  const epoch = ++generation;
  activeUser = userId; publish('loading');
  const retry = () => { if (activeUser === userId) void flushAccountSync(); };
  const wake = () => { if (!document.hidden) retry(); };
  window.addEventListener('online', retry); document.addEventListener('visibilitychange', wake);
  const interval = setInterval(retry, 15000);
  const stop = () => {
    window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', wake); clearInterval(interval);
    if (generation === epoch) { generation++; activeUser = 0; clearTimeout(timer); }
  };
  const ready = (async () => { try {
    // Old pending edits must be acknowledged before replacing the local cache.
    if (await flushAccountSync() && generation === epoch && activeUser === userId) {
      await hydrate(userId, epoch);
      if (generation === epoch) await flushAccountSync();
    }
  } catch { if (generation === epoch) publish('offline'); } })();
  return { ready, stop };
}
