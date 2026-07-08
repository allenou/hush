export interface SearchEngineConfig {
  name: string;
  hostname: string;
  pathnamePattern?: string;
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

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
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
    return BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ?? null;
  } catch {
    return null;
  }
}

export function isSearchEngine(url: string): boolean {
  return detectSearchEngine(url) !== null;
}
