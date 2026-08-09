export const GOOGLE_SEARCH_ALIASES = [
  'google.com.hk',
] as const;

export const BING_SEARCH_ALIASES = [
  'cn.bing.com',
] as const;

export const YAHOO_SEARCH_ALIASES = [
  'espanol.search.yahoo.com',
  'be.search.yahoo.com',
  'fr.search.yahoo.com',
  'br.search.yahoo.com',
  'ca.search.yahoo.com',
  'de.search.yahoo.com',
  'es.search.yahoo.com',
  'in.search.yahoo.com',
  'id.search.yahoo.com',
  'ie.search.yahoo.com',
  'it.search.yahoo.com',
  'malaysia.search.yahoo.com',
  'nl.search.yahoo.com',
  'no.search.yahoo.com',
  'at.search.yahoo.com',
  'ph.search.yahoo.com',
  'pl.search.yahoo.com',
  'qc.search.yahoo.com',
  'ro.search.yahoo.com',
  'ch.search.yahoo.com',
  'sg.search.yahoo.com',
  'za.search.yahoo.com',
  'fi.search.yahoo.com',
  'se.search.yahoo.com',
  'tr.search.yahoo.com',
  'uk.search.yahoo.com',
  'vn.search.yahoo.com',
  'gr.search.yahoo.com',
  'ru.search.yahoo.com',
  'ua.search.yahoo.com',
  'il.search.yahoo.com',
  'hk.search.yahoo.com',
  'tw.search.yahoo.com',
] as const;

export const YANDEX_SEARCH_ALIASES = [
  'yandex.ru',
  'yandex.by',
  'yandex.kz',
  'yandex.uz',
  'yandex.com.tr',
] as const;

export const DUCKDUCKGO_SEARCH_ALIASES = [
  'start.duckduckgo.com',
] as const;

export const SEARCH_ENGINE_HOSTS = [
  'google.com',
  ...GOOGLE_SEARCH_ALIASES,
  'baidu.com',
  'bing.com',
  ...BING_SEARCH_ALIASES,
  'so.com',
  'sogou.com',
  'search.yahoo.com',
  ...YAHOO_SEARCH_ALIASES,
  'yandex.com',
  ...YANDEX_SEARCH_ALIASES,
  'duckduckgo.com',
  ...DUCKDUCKGO_SEARCH_ALIASES,
] as const;

const SEARCH_ENGINE_WWW_HOSTS = new Set<string>([
  'google.com',
  ...GOOGLE_SEARCH_ALIASES,
  'baidu.com',
  'bing.com',
  'so.com',
  'sogou.com',
  'yandex.com',
  ...YANDEX_SEARCH_ALIASES,
  'duckduckgo.com',
]);

export const SEARCH_ENGINE_MATCH_PATTERNS = SEARCH_ENGINE_HOSTS.flatMap((hostname) => [
  `*://${hostname}/*`,
  ...(SEARCH_ENGINE_WWW_HOSTS.has(hostname) ? [`*://www.${hostname}/*`] : []),
]);

export function normalizeSearchHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

export function isSupportedSearchHostname(hostname: string): boolean {
  const raw = hostname.trim().toLowerCase();
  const normalized = normalizeSearchHostname(raw);
  return SEARCH_ENGINE_HOSTS.some((candidate) => candidate === normalized)
    && (
      raw === normalized
      || (SEARCH_ENGINE_WWW_HOSTS.has(normalized) && raw === `www.${normalized}`)
    );
}
