type OfflineActionType = 'transaction' | 'expense' | 'closingStock';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  createdAt: number;
}

const STORAGE_KEY = 'offlineQueueV1';
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

const readQueue = (): OfflineAction[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OfflineAction[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

const writeQueue = (queue: OfflineAction[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const getOfflineQueue = (): OfflineAction[] => {
  const now = Date.now();
  const queue = readQueue().filter((item) => now - item.createdAt <= MAX_AGE_MS);
  if (queue.length !== readQueue().length) {
    writeQueue(queue);
  }
  return queue;
};

export const enqueueOfflineAction = (type: OfflineActionType, payload: any): string => {
  const queue = getOfflineQueue();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  queue.push({ id, type, payload, createdAt: Date.now() });
  writeQueue(queue);
  return id;
};

export const removeOfflineActions = (ids: string[]) => {
  if (ids.length === 0) {
    return;
  }
  const queue = getOfflineQueue().filter((item) => !ids.includes(item.id));
  writeQueue(queue);
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(STORAGE_KEY);
};
