import type { SearchEngineConfig } from '../helpers/search-engines';
import {
  BUILT_IN_ENGINES,
  matchEngineConfig,
  normalizeHostname,
  rankEngineConfigMatch,
} from '../helpers/search-engines';

export interface ExtensionStorage {
  urls: string[];
  blockedUrls: string[];
  blockCount: number;
  adBlockCount: number;
  domainBlockCount: number;
  blockedDomainStats: { domain: string; count: number }[];
  enabled: boolean;
  blockAds: boolean;
  blockSubdomains: boolean;
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

export type BlockRecordType = 'ad' | 'domain' | 'url' | 'selector';

const DEFAULT: ExtensionStorage = {
  urls: [],
  blockedUrls: [],
  blockCount: 0,
  adBlockCount: 0,
  domainBlockCount: 0,
  blockedDomainStats: [],
  enabled: true,
  blockAds: true,
  blockSubdomains: true,
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
    blockedDomainStats: [...DEFAULT.blockedDomainStats],
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
  if (BUILT_IN_ENGINES.some((e) => e.hostname === normalizeHostname(config.hostname))) {
    console.log('[SRB] Reject: cannot add built-in engine', config.hostname);
    return;
  }
  const { customEngines } = await get();
  const existing = customEngines.findIndex((e) =>
    normalizeHostname(e.hostname) === normalizeHostname(config.hostname)
      && (e.pathnamePattern ?? '') === (config.pathnamePattern ?? ''),
  );
  if (existing >= 0) {
    customEngines[existing] = config;
    await set({ customEngines });
  } else {
    await set({ customEngines: [...customEngines, config] });
  }
}

export function findMatchingCustomEngine(
  customEngines: SearchEngineConfig[],
  target: { hostname: string; pathname: string },
): SearchEngineConfig | null {
  let best: SearchEngineConfig | null = null;
  let bestRank = -1;
  for (const engine of customEngines) {
    const rank = rankEngineConfigMatch(engine, target);
    if (rank > bestRank) {
      best = engine;
      bestRank = rank;
    }
  }
  return best;
}

export function hasExactCustomEngine(
  customEngines: SearchEngineConfig[],
  target: { hostname: string; pathname: string },
): boolean {
  return customEngines.some((engine) =>
    matchEngineConfig(engine, target)
    && Boolean(engine.pathnamePattern),
  );
}

export async function removeCustomEngine(index: number): Promise<void> {
  const { customEngines } = await get();
  customEngines.splice(index, 1);
  await set({ customEngines });
}

export async function recordBlock(type?: BlockRecordType, domain?: string): Promise<void> {
  const { blockCount, adBlockCount, domainBlockCount, stats, blockedDomainStats } = await get();
  const today = new Date().toISOString().slice(0, 10);
  const existing = stats.find((s) => s.date === today);
  if (existing) {
    existing.count++;
  } else {
    stats.push({ date: today, count: 1 });
  }
  const pruned = stats.slice(-30);

  const patch: Partial<ExtensionStorage> = {
    blockCount: blockCount + 1,
    stats: pruned,
  };

  if (type === 'ad') {
    patch.adBlockCount = (adBlockCount ?? 0) + 1;
  } else if (type === 'domain') {
    patch.domainBlockCount = (domainBlockCount ?? 0) + 1;
  }

  if (domain) {
    const list = blockedDomainStats ?? [];
    const existingDomain = list.find((d) => d.domain === domain);
    if (existingDomain) {
      existingDomain.count++;
    } else {
      list.push({ domain, count: 1 });
    }
    list.sort((a, b) => b.count - a.count);
    patch.blockedDomainStats = list.slice(0, 10);
  }

  await set(patch);
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

export async function setBlockSubdomains(blockSubdomains: boolean): Promise<void> {
  await set({ blockSubdomains });
}
