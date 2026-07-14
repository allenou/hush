import { storage } from 'wxt/utils/storage';
import type { SearchEngineConfig, SearchRecord } from '@/helpers/search-engines';
import {
  BUILT_IN_ENGINES,
  matchEngineConfig,
  normalizeHostname,
  rankEngineConfigMatch,
} from '@/helpers/search-engines';
import {
  formatLocalDateKey,
  STATISTICS_RETENTION_DAYS,
} from '@/utils/statistics';

export interface ExtensionStorage {
  urls: string[];
  blockedUrls: string[];
  rules: BlockRule[];
  blockCount: number;
  adBlockCount: number;
  domainBlockCount: number;
  blockedDomainStats: { domain: string; count: number }[];
  searchHistory: SearchRecord[];
  recordSearchHistory: boolean;
  enabled: boolean;
  blockAds: boolean;
  blockSubdomains: boolean;
  customEngines: SearchEngineConfig[];
  blockedSelectors: string[];
  stats: BlockStats[];
  locale?: string;
}

export interface BlockItem {
  type: 'domain' | 'url' | 'selector';
  value: string;
  index: number;
  scope?: string;
}

export interface BlockRule {
  id: string;
  type: BlockItem['type'];
  value: string;
  scope?: string;
  enabled: boolean;
  source: 'manual' | 'picker' | 'migration';
  createdAt: number;
  hitCount: number;
}

export interface BlockStats {
  date: string;
  count: number;
}

export type BlockRecordType = 'ad' | 'domain' | 'url' | 'selector';

export interface StorageBackup {
  app: 'SearchKit';
  version: 1;
  exportedAt: string;
  data: ExtensionStorage;
}

const DEFAULT: ExtensionStorage = {
  urls: [],
  blockedUrls: [],
  rules: [],
  blockCount: 0,
  adBlockCount: 0,
  domainBlockCount: 0,
  blockedDomainStats: [],
  searchHistory: [],
  recordSearchHistory: true,
  enabled: true,
  blockAds: true,
  blockSubdomains: true,
  customEngines: [],
  blockedSelectors: [],
  stats: [],
};

type Listener = (value: ExtensionStorage) => void;
const listeners = new Set<Listener>();

const blockerItem = storage.defineItem<Partial<ExtensionStorage>>('local:blocker', {
  fallback: DEFAULT,
});

let unwatchBlocker: (() => void) | null = null;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  if (!unwatchBlocker) {
    unwatchBlocker = blockerItem.watch((value) => {
      const next = normalizeStorage(value);
      listeners.forEach((listener) => listener(next));
    });
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && unwatchBlocker) {
      unwatchBlocker();
      unwatchBlocker = null;
    }
  };
}

function freshDefaults(): ExtensionStorage {
  return {
    ...DEFAULT,
    urls: [...DEFAULT.urls],
    blockedUrls: [...DEFAULT.blockedUrls],
    rules: [...DEFAULT.rules],
    blockedSelectors: [...DEFAULT.blockedSelectors],
    customEngines: [...DEFAULT.customEngines],
    stats: [...DEFAULT.stats],
    blockedDomainStats: [...DEFAULT.blockedDomainStats],
  };
}

function isSearchEngineStatDomain(domain: string): boolean {
  const normalized = normalizeHostname(domain);
  const trackingHosts = ['googleadservices.com', 'doubleclick.net'];
  return BUILT_IN_ENGINES.some((engine) =>
    normalized === engine.hostname || normalized.endsWith(`.${engine.hostname}`),
  ) || trackingHosts.some((host) =>
    normalized === host || normalized.endsWith(`.${host}`),
  );
}

function normalizeStorage(value: Partial<ExtensionStorage> | null | undefined): ExtensionStorage {
  const merged = value && typeof value === 'object'
    ? { ...freshDefaults(), ...value }
    : freshDefaults();
  const rules = normalizeRules(value);
  const compatibility = deriveCompatibilityLists(rules);
  return {
    ...merged,
    urls: compatibility.urls,
    blockedUrls: compatibility.blockedUrls,
    rules,
    blockedSelectors: compatibility.blockedSelectors,
    customEngines: [...(merged.customEngines ?? [])],
    stats: [...(merged.stats ?? [])],
    blockedDomainStats: [...(merged.blockedDomainStats ?? [])]
      .filter((item) => !isSearchEngineStatDomain(item.domain)),
    searchHistory: [...(merged.searchHistory ?? [])],
  };
}

export { type SearchRecord };

export async function get(): Promise<ExtensionStorage> {
  try {
    return normalizeStorage(await blockerItem.getValue());
  } catch {
    return freshDefaults();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function createStorageBackup(): Promise<StorageBackup> {
  return {
    app: 'SearchKit',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: await get(),
  };
}

function isValidBackupData(data: Record<string, unknown>): boolean {
  const arrayFields = [
    'urls', 'blockedUrls', 'rules', 'searchHistory', 'customEngines',
    'blockedSelectors', 'stats', 'blockedDomainStats',
  ];
  const booleanFields = ['recordSearchHistory', 'enabled', 'blockAds', 'blockSubdomains'];
  const numberFields = ['blockCount', 'adBlockCount', 'domainBlockCount'];

  if (arrayFields.some((key) => key in data && !Array.isArray(data[key]))) return false;
  if (booleanFields.some((key) => key in data && typeof data[key] !== 'boolean')) return false;
  if (numberFields.some((key) => key in data && typeof data[key] !== 'number')) return false;
  if ('locale' in data && data.locale !== undefined && typeof data.locale !== 'string') return false;

  if (Array.isArray(data.urls) && !data.urls.every((item) => typeof item === 'string')) return false;
  if (Array.isArray(data.blockedUrls) && !data.blockedUrls.every((item) => typeof item === 'string')) return false;
  if (Array.isArray(data.blockedSelectors) && !data.blockedSelectors.every((item) => typeof item === 'string')) return false;
  if (Array.isArray(data.searchHistory) && !data.searchHistory.every((item) =>
    isRecord(item)
      && typeof item.query === 'string'
      && typeof item.engineName === 'string'
      && typeof item.engineHostname === 'string'
      && typeof item.timestamp === 'number')) return false;
  if (Array.isArray(data.stats) && !data.stats.every((item) =>
    isRecord(item) && typeof item.date === 'string' && typeof item.count === 'number')) return false;
  if (Array.isArray(data.blockedDomainStats) && !data.blockedDomainStats.every((item) =>
    isRecord(item) && typeof item.domain === 'string' && typeof item.count === 'number')) return false;
  if (Array.isArray(data.rules) && !data.rules.every((item) => normalizeRule(item) !== null)) return false;
  if (Array.isArray(data.customEngines) && !data.customEngines.every((item) =>
    isRecord(item)
      && typeof item.name === 'string'
      && typeof item.hostname === 'string'
      && typeof item.containerSelector === 'string'
      && typeof item.itemSelector === 'string'
      && typeof item.linkSelector === 'string'
      && (item.pathnamePattern === undefined || typeof item.pathnamePattern === 'string'))) return false;

  return true;
}

let mutationQueue: Promise<void> = Promise.resolve();

function mutateStorage<T>(
  updater: (current: ExtensionStorage) => { next: ExtensionStorage; result: T },
): Promise<T> {
  const operation = mutationQueue.then(async (): Promise<T> => {
    const current = await get();
    const { next, result } = updater(current);
    await blockerItem.setValue(next);
    return result;
  });
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function restoreStorageBackup(value: unknown): Promise<ExtensionStorage> {
  if (!isRecord(value)
    || value.app !== 'SearchKit'
    || value.version !== 1
    || !isRecord(value.data)
    || !isValidBackupData(value.data)) {
    throw new Error('Invalid SearchKit backup');
  }

  const normalized = normalizeStorage(value.data as Partial<ExtensionStorage>);
  return mutateStorage(() => ({ next: normalized, result: normalized }));
}

async function set(partial: Partial<ExtensionStorage>): Promise<void> {
  await mutateStorage((current) => ({
    next: { ...current, ...partial },
    result: undefined,
  }));
}

function isBlockRuleSource(value: unknown): value is BlockRule['source'] {
  return value === 'manual' || value === 'picker' || value === 'migration';
}

function buildRuleId(type: BlockItem['type'], value: string, scope?: string): string {
  if (type === 'url') return `url:${encodeURIComponent(value)}`;
  if (type === 'selector') return `selector:${scope ?? ''}:${value}`;
  return `domain:${value}`;
}

function getRuleKey(rule: Pick<BlockRule, 'type' | 'value' | 'scope'>): string {
  return `${rule.type}||${rule.scope ?? ''}||${rule.value}`;
}

function createRule(
  type: BlockItem['type'],
  value: string,
  source: BlockRule['source'],
  scope?: string,
): BlockRule {
  return {
    id: buildRuleId(type, value, scope),
    type,
    value,
    ...(scope ? { scope } : {}),
    enabled: true,
    source,
    createdAt: Date.now(),
    hitCount: 0,
  };
}

function parseSelectorEntry(entry: string): { scope?: string; value: string } {
  const sep = entry.indexOf('||');
  if (sep === -1) return { value: entry };
  return {
    scope: entry.slice(0, sep),
    value: entry.slice(sep + 2),
  };
}

function formatSelectorEntry(rule: Pick<BlockRule, 'scope' | 'value'>): string {
  return rule.scope ? `${rule.scope}||${rule.value}` : rule.value;
}

function normalizeRule(value: unknown): BlockRule | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<BlockRule>;
  if (raw.type !== 'domain' && raw.type !== 'url' && raw.type !== 'selector') return null;
  if (typeof raw.value !== 'string' || raw.value.length === 0) return null;
  const scope = typeof raw.scope === 'string' && raw.scope.length > 0 ? raw.scope : undefined;
  return {
    id: typeof raw.id === 'string' && raw.id.length > 0
      ? raw.id
      : buildRuleId(raw.type, raw.value, scope),
    type: raw.type,
    value: raw.value,
    ...(scope ? { scope } : {}),
    enabled: raw.enabled !== false,
    source: isBlockRuleSource(raw.source) ? raw.source : 'migration',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    hitCount: typeof raw.hitCount === 'number' ? raw.hitCount : 0,
  };
}

function pushUniqueRule(rules: BlockRule[], seen: Set<string>, rule: BlockRule): void {
  const key = getRuleKey(rule);
  if (seen.has(key)) return;
  seen.add(key);
  rules.push(rule);
}

function normalizeRules(value: Partial<ExtensionStorage> | null | undefined): BlockRule[] {
  const rules: BlockRule[] = [];
  const seen = new Set<string>();

  const rawRules = Array.isArray(value?.rules) ? value.rules : [];
  for (const rawRule of rawRules) {
    const rule = normalizeRule(rawRule);
    if (rule) pushUniqueRule(rules, seen, rule);
  }

  for (const domain of value?.urls ?? []) {
    pushUniqueRule(rules, seen, createRule('domain', domain, 'migration'));
  }
  for (const url of value?.blockedUrls ?? []) {
    pushUniqueRule(rules, seen, createRule('url', url, 'migration'));
  }
  for (const entry of value?.blockedSelectors ?? []) {
    const { scope, value: selector } = parseSelectorEntry(entry);
    pushUniqueRule(rules, seen, createRule('selector', selector, 'migration', scope));
  }

  return rules;
}

function deriveCompatibilityLists(rules: BlockRule[]): Pick<ExtensionStorage, 'urls' | 'blockedUrls' | 'blockedSelectors'> {
  const enabledRules = rules.filter((rule) => rule.enabled);
  return {
    urls: enabledRules.filter((rule) => rule.type === 'domain').map((rule) => rule.value),
    blockedUrls: enabledRules.filter((rule) => rule.type === 'url').map((rule) => rule.value),
    blockedSelectors: enabledRules
      .filter((rule) => rule.type === 'selector')
      .map((rule) => formatSelectorEntry(rule)),
  };
}

async function mutateRules(updater: (rules: BlockRule[]) => BlockRule[]): Promise<void> {
  await mutateStorage((current) => {
    const rules = updater(current.rules);
    return {
      next: {
        ...current,
        rules,
        ...deriveCompatibilityLists(rules),
      },
      result: undefined,
    };
  });
}

export async function addDomain(domain: string): Promise<void> {
  await mutateRules((rules) => rules.some((rule) => rule.type === 'domain' && rule.value === domain)
    ? rules
    : [...rules, createRule('domain', domain, 'manual')]);
}

export async function removeDomain(index: number): Promise<void> {
  await mutateStorage((current) => {
    const domain = current.urls[index];
    if (!domain) return { next: current, result: undefined };
    const rules = current.rules.filter((rule) => !(rule.type === 'domain' && rule.value === domain));
    return { next: { ...current, rules, ...deriveCompatibilityLists(rules) }, result: undefined };
  });
}

export async function addBlockedUrl(url: string): Promise<void> {
  await mutateRules((rules) => rules.some((rule) => rule.type === 'url' && rule.value === url)
    ? rules
    : [...rules, createRule('url', url, 'manual')]);
}

export async function removeBlockedUrl(index: number): Promise<void> {
  await mutateStorage((current) => {
    const url = current.blockedUrls[index];
    if (!url) return { next: current, result: undefined };
    const rules = current.rules.filter((rule) => !(rule.type === 'url' && rule.value === url));
    return { next: { ...current, rules, ...deriveCompatibilityLists(rules) }, result: undefined };
  });
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
    return {
      type: 'selector',
      value: sep >= 0 ? s.slice(sep + 2) : s,
      index,
      ...(sep >= 0 ? { scope: s.slice(0, sep) } : {}),
    };
  });
  return [...domains, ...urlItems, ...selectorItems];
}

export async function addBlockedSelector(selector: string): Promise<void> {
  const { scope, value } = parseSelectorEntry(selector);
  await mutateRules((rules) => rules.some((rule) =>
    rule.type === 'selector' && rule.scope === scope && rule.value === value)
    ? rules
    : [...rules, createRule('selector', value, 'picker', scope)]);
}

export async function removeBlockedSelector(index: number): Promise<void> {
  await mutateStorage((current) => {
    const selector = current.blockedSelectors[index];
    if (!selector) return { next: current, result: undefined };
    const { scope, value } = parseSelectorEntry(selector);
    const rules = current.rules.filter((rule) =>
      !(rule.type === 'selector' && rule.scope === scope && rule.value === value));
    return { next: { ...current, rules, ...deriveCompatibilityLists(rules) }, result: undefined };
  });
}

export async function removeBlockedSelectorEntry(entry: string): Promise<void> {
  const { scope, value } = parseSelectorEntry(entry);
  await mutateRules((rules) => rules.filter((rule) =>
    !(rule.type === 'selector' && rule.scope === scope && rule.value === value),
  ));
}

export async function addCustomEngine(config: SearchEngineConfig): Promise<void> {
  // 禁止添加已在内置列表中的搜索引擎
  if (BUILT_IN_ENGINES.some((e) => e.hostname === normalizeHostname(config.hostname))) {
    return;
  }
  await mutateStorage((current) => {
    const customEngines = [...current.customEngines];
    const existing = customEngines.findIndex((engine) =>
      normalizeHostname(engine.hostname) === normalizeHostname(config.hostname)
        && (engine.pathnamePattern ?? '') === (config.pathnamePattern ?? ''));
    if (existing >= 0) customEngines[existing] = config;
    else customEngines.push(config);
    return { next: { ...current, customEngines }, result: undefined };
  });
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
  await mutateStorage((current) => ({
    next: {
      ...current,
      customEngines: current.customEngines.filter((_, itemIndex) => itemIndex !== index),
    },
    result: undefined,
  }));
}

async function recordBlockNow(type?: BlockRecordType, domain?: string): Promise<void> {
  await mutateStorage((current) => {
    const stats = current.stats.map((item) => ({ ...item }));
    const today = formatLocalDateKey(new Date());
    const existing = stats.find((item) => item.date === today);
    if (existing) existing.count++;
    else stats.push({ date: today, count: 1 });
    stats.sort((a, b) => a.date.localeCompare(b.date));

    const blockedDomainStats = current.blockedDomainStats.map((item) => ({ ...item }));
    if (domain) {
      const existingDomain = blockedDomainStats.find((item) => item.domain === domain);
      if (existingDomain) existingDomain.count++;
      else blockedDomainStats.push({ domain, count: 1 });
      blockedDomainStats.sort((a, b) => b.count - a.count);
    }

    return {
      next: {
        ...current,
        blockCount: current.blockCount + 1,
        adBlockCount: type === 'ad' ? current.adBlockCount + 1 : current.adBlockCount,
        domainBlockCount: type === 'domain'
          ? current.domainBlockCount + 1
          : current.domainBlockCount,
        stats: stats.slice(-STATISTICS_RETENTION_DAYS),
        blockedDomainStats: domain ? blockedDomainStats.slice(0, 10) : blockedDomainStats,
      },
      result: undefined,
    };
  });
}

export function recordBlock(type?: BlockRecordType, domain?: string): Promise<void> {
  return recordBlockNow(type, domain);
}

export async function recordSearch(query: string, engineName: string, engineHostname: string): Promise<void> {
  const normalizedHostname = normalizeHostname(engineHostname);
  await mutateStorage((current) => {
    const record: SearchRecord = {
      query,
      engineName,
      engineHostname: normalizedHostname,
      timestamp: Date.now(),
    };
    const first = current.searchHistory[0];
    const previous = first
      && first.query === query
      && normalizeHostname(first.engineHostname) === normalizedHostname
      ? current.searchHistory.slice(1)
      : current.searchHistory;
    return {
      next: { ...current, searchHistory: [record, ...previous].slice(0, 50) },
      result: undefined,
    };
  });
}

export async function removeSearchRecord(index: number): Promise<void> {
  await mutateStorage((current) => ({
    next: {
      ...current,
      searchHistory: current.searchHistory.filter((_, itemIndex) => itemIndex !== index),
    },
    result: undefined,
  }));
}

export async function clearSearchHistory(): Promise<void> {
  await mutateStorage((current) => ({
    next: { ...current, searchHistory: [] },
    result: undefined,
  }));
}

export async function incrementBlockCount(): Promise<void> {
  await mutateStorage((current) => ({
    next: { ...current, blockCount: current.blockCount + 1 },
    result: undefined,
  }));
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

export async function setRecordSearchHistory(value: boolean): Promise<void> {
  await set({ recordSearchHistory: value });
}

export async function setStoredLocale(locale: string): Promise<void> {
  await set({ locale });
}
