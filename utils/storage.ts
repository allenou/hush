export interface ExtensionStorage {
  urls: string[];
  blockCount: number;
  enabled: boolean;
}

const DEFAULT: ExtensionStorage = {
  urls: [],
  blockCount: 0,
  enabled: true,
};

type Listener = (value: ExtensionStorage) => void;
const listeners = new Set<Listener>();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  get().then((v) => listeners.forEach((fn) => fn(v)));
});

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function get(): Promise<ExtensionStorage> {
  try {
    const result = await chrome.storage.local.get('blocker');
    if (result.blocker && typeof result.blocker === 'object') {
      return { ...DEFAULT, ...result.blocker };
    }
    return DEFAULT;
  } catch {
    return DEFAULT;
  }
}

async function set(partial: Partial<ExtensionStorage>): Promise<void> {
  const current = await get();
  await chrome.storage.local.set({ blocker: { ...current, ...partial } });
}

export async function addDomain(domain: string): Promise<void> {
  const { urls } = await get();
  if (!urls.includes(domain)) {
    await set({ urls: [...urls, domain] });
  }
}

export async function removeDomain(index: number): Promise<void> {
  const { urls } = await get();
  urls.splice(index, 1);
  await set({ urls });
}

export async function incrementBlockCount(): Promise<void> {
  const { blockCount } = await get();
  await set({ blockCount: blockCount + 1 });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await set({ enabled });
}
