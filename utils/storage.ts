import type { SearchEngineConfig } from './search-engines';
import { BUILT_IN_ENGINES } from './search-engines';

export interface ExtensionStorage {
  urls: string[];
  blockedUrls: string[];
  blockCount: number;
  enabled: boolean;
  blockAds: boolean;
  customEngines: SearchEngineConfig[];
  blockedSelectors: string[];
  stats: BlockStats[];
}

export interface BlockItem {
  type: 'domain' | 'url' | 'selector';
  value: string;
  index: number;
}

export interface BlockStats {
  date: string;
  count: number;
}

const DEFAULT: ExtensionStorage = {
  urls: [],
  blockedUrls: [],
  blockCount: 0,
  enabled: true,
  blockAds: false,
  customEngines: [],
  blockedSelectors: [],
  stats: [],
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

function freshDefaults(): ExtensionStorage {
  return {
    ...DEFAULT,
    urls: [...DEFAULT.urls],
    blockedUrls: [...DEFAULT.blockedUrls],
    blockedSelectors: [...DEFAULT.blockedSelectors],
    customEngines: [...DEFAULT.customEngines],
    stats: [...DEFAULT.stats],
  };
}

export async function get(): Promise<ExtensionStorage> {
  try {
    const result = await chrome.storage.local.get('blocker');
    if (result.blocker && typeof result.blocker === 'object') {
      return { ...freshDefaults(), ...result.blocker };
    }
    return freshDefaults();
  } catch {
    return freshDefaults();
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

export async function addBlockedUrl(url: string): Promise<void> {
  const { blockedUrls } = await get();
  if (!blockedUrls.includes(url)) {
    await set({ blockedUrls: [...blockedUrls, url] });
  }
}

export async function removeBlockedUrl(index: number): Promise<void> {
  const { blockedUrls } = await get();
  blockedUrls.splice(index, 1);
  await set({ blockedUrls });
}

export async function removeBlockedItem(type: 'domain' | 'url' | 'selector', index: number): Promise<void> {
  if (type === 'domain') {
    await removeDomain(index);
  } else if (type === 'url') {
    await removeBlockedUrl(index);
  } else {
    await removeBlockedSelector(index);
  }
}

export async function getAllBlocked(): Promise<BlockItem[]> {
  const { urls, blockedUrls, blockedSelectors } = await get();
  const domains: BlockItem[] = urls.map((value, index) => ({ type: 'domain', value, index }));
  const urlItems: BlockItem[] = blockedUrls.map((value, index) => ({ type: 'url', value, index }));
  const selectorItems: BlockItem[] = blockedSelectors.map((s, index) => {
    const sep = s.indexOf('||');
    return { type: 'selector', value: sep >= 0 ? s.slice(sep + 2) : s, index };
  });
  return [...domains, ...urlItems, ...selectorItems];
}

export async function addBlockedSelector(selector: string): Promise<void> {
  const { blockedSelectors } = await get();
  if (!blockedSelectors.includes(selector)) {
    await set({ blockedSelectors: [...blockedSelectors, selector] });
  }
}

export async function removeBlockedSelector(index: number): Promise<void> {
  const { blockedSelectors } = await get();
  blockedSelectors.splice(index, 1);
  await set({ blockedSelectors });
}

export async function addCustomEngine(config: SearchEngineConfig): Promise<void> {
  // 禁止添加已在内置列表中的搜索引擎
  if (BUILT_IN_ENGINES.some((e) => e.hostname === config.hostname)) {
    console.log('[SRB] Reject: cannot add built-in engine', config.hostname);
    return;
  }
  const { customEngines } = await get();
  const existing = customEngines.findIndex((e) => e.hostname === config.hostname);
  if (existing >= 0) {
    customEngines[existing] = config;
    await set({ customEngines });
  } else {
    await set({ customEngines: [...customEngines, config] });
  }
}

export async function removeCustomEngine(index: number): Promise<void> {
  const { customEngines } = await get();
  customEngines.splice(index, 1);
  await set({ customEngines });
}

export async function recordBlock(): Promise<void> {
  const { blockCount, stats } = await get();
  const today = new Date().toISOString().slice(0, 10);
  const existing = stats.find((s) => s.date === today);
  if (existing) {
    existing.count++;
  } else {
    stats.push({ date: today, count: 1 });
  }
  const pruned = stats.slice(-30);
  await set({ blockCount: blockCount + 1, stats: pruned });
}

export async function incrementBlockCount(): Promise<void> {
  const { blockCount } = await get();
  await set({ blockCount: blockCount + 1 });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await set({ enabled });
}

export async function setBlockAds(blockAds: boolean): Promise<void> {
  await set({ blockAds });
}
