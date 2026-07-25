/** 页面 Tab 定义 */
export type TabId = 'dashboard' | 'rules' | 'search' | 'method';

export const TABS: TabId[] = ['dashboard', 'rules', 'search', 'method'];

/** 规则筛选类型 */
export type RuleFilter = 'all' | 'domain' | 'url' | 'selector';

export const RULE_FILTERS: RuleFilter[] = ['all', 'domain', 'url', 'selector'];

export const RULE_FILTER_LABEL: Record<RuleFilter, string> = {
  all: 'filterAll',
  domain: 'filterDomain',
  url: 'filterUrl',
  selector: 'filterSelector',
};

/** 搜索引擎选项（用于搜索记录下拉切换） */
export interface EngineOption {
  hostname: string;
  label: string;
  color: string;
}

export const SEARCH_ENGINES: EngineOption[] = [
  { hostname: 'google.com', label: 'Google', color: '#0d8f66' },
  { hostname: 'bing.com', label: 'Bing', color: '#0078d4' },
  { hostname: 'baidu.com', label: '百度', color: '#2932e1' },
  { hostname: 'so.com', label: '360搜索', color: '#f60' },
  { hostname: 'sogou.com', label: '搜狗', color: '#fb6022' },
  { hostname: 'search.yahoo.com', label: 'Yahoo!', color: '#6001d2' },
  { hostname: 'yandex.com', label: 'Yandex', color: '#fc3f1d' },
  { hostname: 'duckduckgo.com', label: 'DuckDuckGo', color: '#de5833' },
];

export const SEARCH_ENGINE_MAP = new Map(SEARCH_ENGINES.map((e) => [e.hostname, e]));

export { formatRelativeTime, MINUTE_MS, HOUR_MS, DAY_MS } from '@/utils/time';
