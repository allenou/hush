export interface SearchEngine {
  name: string;
  hostname: string;
  selector: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { name: 'Google', hostname: 'www.google.com', selector: '#search .g' },
  { name: 'Baidu', hostname: 'www.baidu.com', selector: '#content_left .result' },
  { name: 'Bing', hostname: 'www.bing.com', selector: '#b_results .b_algo' },
  { name: 'DuckDuckGo', hostname: 'duckduckgo.com', selector: '.result' },
];

/**
 * 匹配 URL 对应的搜索引擎
 */
export function detectSearchEngine(url: string): SearchEngine | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return SEARCH_ENGINES.find((e) => e.hostname === hostname) ?? null;
  } catch {
    return null;
  }
}

/**
 * 检查是否为搜索引擎页面
 */
export function isSearchEngine(url: string): boolean {
  return detectSearchEngine(url) !== null;
}
