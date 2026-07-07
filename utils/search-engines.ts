export interface SearchEngineConfig {
  name: string;
  hostname: string;
  containerSelector: string;
  itemSelector: string;
  linkSelector: string;
}

export interface EngineInfo {
  name: string;
  hostname: string;
  linkSelector: string;
}

/** 内置搜索引擎列表：仅用于识别和提取链接，DOM 结构由自动检测生成 */
export const BUILT_IN_ENGINES: EngineInfo[] = [
  { name: 'Google', hostname: 'google.com', linkSelector: 'a[href]' },
  { name: 'Baidu', hostname: 'baidu.com', linkSelector: 'a[href]' },
  { name: 'Bing', hostname: 'bing.com', linkSelector: 'a[href]' },
  { name: '360搜索', hostname: 'so.com', linkSelector: 'a[href]' },
];

export function detectSearchEngine(url: string): EngineInfo | null {
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
