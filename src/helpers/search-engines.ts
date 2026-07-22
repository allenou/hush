import { normalizeSearchHostname } from '@/constants/search-hosts';
import { getSearchEngineRule, SEARCH_ENGINE_RULES } from './search-engines/index';
import type { SearchEngineRule } from './search-engines/index';

export interface SearchEngineConfig {
  name: string;
  hostname: string;
  pathnamePattern?: string;
  containerSelector: string;
  itemSelector: string;
  linkSelector: string;
}

export interface SearchRecord {
  query: string;
  engineName: string;
  engineHostname: string;
  timestamp: number;
}

export interface EngineInfo {
  name: string;
  hostname: string;
  linkSelector: string;
}

/** 内置搜索引擎列表，具体规则位于 search-engines/ 下的对应模块。 */
export const BUILT_IN_ENGINES: readonly SearchEngineRule[] = SEARCH_ENGINE_RULES;

export { getSearchEngineRule, SEARCH_ENGINE_RULES } from './search-engines/index';
export type { SearchEngineRule, SearchResultSelectorRule } from './search-engines/index';

export function normalizeHostname(hostname: string): string {
  return normalizeSearchHostname(hostname);
}

export function buildPathnamePattern(pathname: string): string {
  const normalized = pathname.trim() || '/';
  const segments = normalized.split('/').filter(Boolean).map((segment) => {
    if (/^\d+$/.test(segment)) return ':num';
    if (/^[0-9a-f]{8,}$/i.test(segment)) return ':id';
    if (/^[0-9a-z_-]{16,}$/i.test(segment)) return ':token';
    return segment;
  });
  return '/' + segments.join('/');
}

export function matchEngineConfig(
  config: SearchEngineConfig,
  target: { hostname: string; pathname: string },
): boolean {
  if (normalizeHostname(config.hostname) !== normalizeHostname(target.hostname)) return false;
  if (!config.pathnamePattern) return true;
  return config.pathnamePattern === buildPathnamePattern(target.pathname);
}

export function rankEngineConfigMatch(
  config: SearchEngineConfig,
  target: { hostname: string; pathname: string },
): number {
  if (!matchEngineConfig(config, target)) return -1;
  return config.pathnamePattern ? 2 : 1;
}

export function detectSearchEngine(url: string): EngineInfo | null {
  try {
    const hostname = normalizeHostname(new URL(url).hostname);
    return getSearchEngineRule(hostname);
  } catch {
    return null;
  }
}

export function isSearchEngine(url: string): boolean {
  return detectSearchEngine(url) !== null;
}

/** 优先使用所属搜索引擎明确维护的 DOM 规则识别结果列表。 */
export function detectBuiltInSearchResults(
  url: string,
  root: ParentNode = document,
): SearchEngineConfig | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const engine = getSearchEngineRule(parsed.hostname);
  if (!engine) return null;

  for (const rule of engine.resultSelectors) {
    const container = root.querySelector(rule.containerSelector);
    if (!container) continue;
    const itemCount = container.querySelectorAll(rule.itemSelector).length;
    if (itemCount < (rule.minimumItems ?? 2)) continue;
    return {
      name: engine.name,
      hostname: engine.hostname,
      pathnamePattern: buildPathnamePattern(parsed.pathname),
      containerSelector: rule.containerSelector,
      itemSelector: rule.itemSelector,
      linkSelector: rule.linkSelector,
    };
  }

  return null;
}

/** 从 URL 中提取搜索关键词 */
export function extractSearchQuery(url: string): string | null {
  try {
    const u = new URL(url);
    const engine = getSearchEngineRule(u.hostname);
    if (!engine) return null;
    for (const name of engine.queryParameterNames) {
      const query = u.searchParams.get(name);
      if (query) return query;
    }
    return null;
  } catch {
    return null;
  }
}

/** 根据搜索引擎和关键词构建搜索 URL */
export function getSearchUrl(engineHostname: string, query: string): string {
  const engine = getSearchEngineRule(engineHostname) ?? getSearchEngineRule('google.com');
  return engine!.buildSearchUrl(query);
}
