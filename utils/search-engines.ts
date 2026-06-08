export interface SearchEngineConfig {
  name: string;
  hostname: string;
  containerSelector: string;
  itemSelector: string;
  linkSelector: string;
}

export const BUILT_IN_ENGINES: SearchEngineConfig[] = [
  {
    name: 'Google',
    hostname: 'www.google.com',
    containerSelector: '#search',
    itemSelector: '.g',
    linkSelector: 'a[href]',
  },
  {
    name: 'Baidu',
    hostname: 'www.baidu.com',
    containerSelector: '#content_left',
    itemSelector: '.result',
    linkSelector: 'a[href]',
  },
  {
    name: 'Bing',
    hostname: 'www.bing.com',
    containerSelector: '#b_results',
    itemSelector: '.b_algo',
    linkSelector: 'a[href]',
  },
  {
    name: 'DuckDuckGo',
    hostname: 'duckduckgo.com',
    containerSelector: '.results',
    itemSelector: '.result',
    linkSelector: 'a[href]',
  },
  {
    name: '360搜索',
    hostname: 'www.so.com',
    containerSelector: 'ul.result',
    itemSelector: 'li.res-list',
    linkSelector: 'a[href]',
  },
];

export function detectSearchEngine(url: string): SearchEngineConfig | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ?? null;
  } catch {
    return null;
  }
}

export function isSearchEngine(url: string): boolean {
  return detectSearchEngine(url) !== null;
}
