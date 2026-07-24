export const SEARCH_ENGINE_HOSTS = [
  'google.com',
  'baidu.com',
  'bing.com',
  'so.com',
  'sogou.com',
] as const;

export const SEARCH_ENGINE_MATCH_PATTERNS = SEARCH_ENGINE_HOSTS.flatMap((hostname) => [
  `*://${hostname}/*`,
  `*://www.${hostname}/*`,
]);

export function normalizeSearchHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

export function isSupportedSearchHostname(hostname: string): boolean {
  const raw = hostname.trim().toLowerCase();
  const normalized = normalizeSearchHostname(raw);
  return SEARCH_ENGINE_HOSTS.some((candidate) => candidate === normalized)
    && (raw === normalized || raw === `www.${normalized}`);
}
