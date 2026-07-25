export const SEARCH_ENGINE_HOSTS = [
  'google.com',
  'baidu.com',
  'bing.com',
  'so.com',
  'sogou.com',
  'search.yahoo.com',
  'yandex.com',
  'yandex.ru',
  'duckduckgo.com',
] as const;

export const SEARCH_ENGINE_MATCH_PATTERNS = SEARCH_ENGINE_HOSTS.flatMap((hostname) => [
  `*://${hostname}/*`,
  ...(hostname === 'search.yahoo.com' ? [] : [`*://www.${hostname}/*`]),
]);

export function normalizeSearchHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

export function isSupportedSearchHostname(hostname: string): boolean {
  const raw = hostname.trim().toLowerCase();
  const normalized = normalizeSearchHostname(raw);
  return SEARCH_ENGINE_HOSTS.some((candidate) => candidate === normalized)
    && (raw === normalized || (normalized !== 'search.yahoo.com' && raw === `www.${normalized}`));
}
