import { storage } from 'wxt/utils/storage';
import type { SearchEngineConfig, SearchRecord } from '@/helpers/search-engines';
import {
  BUILT_IN_ENGINES,
  matchEngineConfig,
  normalizeHostname,
  rankEngineConfigMatch,
} from '@/helpers/search-engines';

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
    blockedDomainStats: [...(merged.blockedDomainStats ?? [])],
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

export async function restoreStorageBackup(value: unknown): Promise<ExtensionStorage> {
  if (!isRecord(value)
    || value.app !== 'SearchKit'
    || value.version !== 1
    || !isRecord(value.data)) {
    throw new Error('Invalid SearchKit backup');
  }

  const normalized = normalizeStorage(value.data as Partial<ExtensionStorage>);
  await blockerItem.setValue(normalized);
  return normalized;
}

async function set(partial: Partial<ExtensionStorage>): Promise<void> {
  const current = await get();
  await blockerItem.setValue({ ...current, ...partial });
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

async function setRules(rules: BlockRule[]): Promise<void> {
  await set({
    rules,
    ...deriveCompatibilityLists(rules),
  });
}

export async function addDomain(domain: string): Promise<void> {
  const { rules } = await get();
  if (!rules.some((rule) => rule.type === 'domain' && rule.value === domain)) {
    await setRules([...rules, createRule('domain', domain, 'manual')]);
  }
}

export async function removeDomain(index: number): Promise<void> {
  const { urls, rules } = await get();
  const domain = urls[index];
  if (!domain) return;
  await setRules(rules.filter((rule) => !(rule.type === 'domain' && rule.value === domain)));
}

export async function addBlockedUrl(url: string): Promise<void> {
  const { rules } = await get();
  if (!rules.some((rule) => rule.type === 'url' && rule.value === url)) {
    await setRules([...rules, createRule('url', url, 'manual')]);
  }
}

export async function removeBlockedUrl(index: number): Promise<void> {
  const { blockedUrls, rules } = await get();
  const url = blockedUrls[index];
  if (!url) return;
  await setRules(rules.filter((rule) => !(rule.type === 'url' && rule.value === url)));
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
  const { scope, value } = parseSelectorEntry(selector);
  const { rules } = await get();
  if (!rules.some((rule) => rule.type === 'selector' && rule.scope === scope && rule.value === value)) {
    await setRules([...rules, createRule('selector', value, 'picker', scope)]);
  }
}

export async function removeBlockedSelector(index: number): Promise<void> {
  const { blockedSelectors, rules } = await get();
  const selector = blockedSelectors[index];
  if (!selector) return;
  const { scope, value } = parseSelectorEntry(selector);
  await setRules(rules.filter((rule) =>
    !(rule.type === 'selector' && rule.scope === scope && rule.value === value),
  ));
}

export async function addCustomEngine(config: SearchEngineConfig): Promise<void> {
  // 禁止添加已在内置列表中的搜索引擎
  if (BUILT_IN_ENGINES.some((e) => e.hostname === normalizeHostname(config.hostname))) {
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

export async function recordSearch(query: string, engineName: string, engineHostname: string): Promise<void> {
  const { searchHistory } = await get();
  const record: SearchRecord = { query, engineName, engineHostname, timestamp: Date.now() };
  const updated = [record, ...(searchHistory ?? [])].slice(0, 50);
  await set({ searchHistory: updated });
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

export async function setRecordSearchHistory(value: boolean): Promise<void> {
  await set({ recordSearchHistory: value });
}

export async function setStoredLocale(locale: string): Promise<void> {
  await set({ locale });
}
