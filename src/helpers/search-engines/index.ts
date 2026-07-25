import { normalizeSearchHostname } from '@/constants/search-hosts';
import { baiduSearchEngine } from './baidu';
import { bingSearchEngine } from './bing';
import { duckDuckGoSearchEngine } from './duckduckgo';
import { googleSearchEngine } from './google';
import { soSearchEngine } from './so';
import { sogouSearchEngine } from './sogou';
import { yahooSearchEngine } from './yahoo';
import { yandexSearchEngine } from './yandex';
import type { SearchEngineRule } from './types';

/**
 * 内置搜索引擎注册表。
 * 每个引擎的结果、搜索词和广告判断规则均保留在各自模块中。
 */
export const SEARCH_ENGINE_RULES: readonly SearchEngineRule[] = [
  googleSearchEngine,
  baiduSearchEngine,
  bingSearchEngine,
  soSearchEngine,
  sogouSearchEngine,
  yahooSearchEngine,
  yandexSearchEngine,
  duckDuckGoSearchEngine,
];

export function getSearchEngineRule(hostname: string): SearchEngineRule | null {
  const normalized = normalizeSearchHostname(hostname);
  return SEARCH_ENGINE_RULES.find((engine) =>
    engine.hostname === normalized || engine.aliases?.includes(normalized),
  ) ?? null;
}

export type { SearchEngineRule, SearchResultSelectorRule } from './types';
