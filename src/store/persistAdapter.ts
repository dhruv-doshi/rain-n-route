import type { StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

/**
 * Zustand StateStorage adapter backed by IndexedDB via idb-keyval.
 * Falls back to in-memory storage if IndexedDB is unavailable (e.g. private mode).
 */
const memoryFallback = new Map<string, string>();

export const idbStorage: StateStorage = {
  async getItem(name) {
    try {
      const value = await get<string>(name);
      return value ?? null;
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  async setItem(name, value) {
    try {
      await set(name, value);
    } catch {
      memoryFallback.set(name, value);
    }
  },
  async removeItem(name) {
    try {
      await del(name);
    } catch {
      memoryFallback.delete(name);
    }
  },
};
