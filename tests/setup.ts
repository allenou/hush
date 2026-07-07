import { vi } from 'vitest';

// In-memory storage for chrome.storage.local mock
const store: Record<string, unknown> = {};

function buildMockStorage() {
  return {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (!keys) return { ...store };
      if (typeof keys === 'string') {
        return { [keys]: keys in store ? structuredClone(store[keys]) : null };
      }
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          result[key] = key in store ? structuredClone(store[key]) : null;
        }
        return result;
      }
      return { ...store, ...keys };
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [key, val] of Object.entries(items)) {
        store[key] = structuredClone(val);
      }
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const ks = Array.isArray(keys) ? keys : [keys];
      for (const key of ks) {
        delete store[key];
      }
    }),
    clear: vi.fn(async () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    }),
  };
}

const mockStorage = buildMockStorage();

// Mock global chrome API
vi.stubGlobal('chrome', {
  storage: {
    local: mockStorage,
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    openOptionsPage: vi.fn(),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setTitle: vi.fn(),
  },
  tabs: {
    query: vi.fn(async () => [{ url: 'https://www.google.com/search?q=test' }]),
  },
});

// Expose reset helper that tests can import
export function resetMockStorage(): void {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  mockStorage.get.mockClear();
  mockStorage.set.mockClear();
  mockStorage.remove.mockClear();
  mockStorage.clear.mockClear();
}
