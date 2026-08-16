import type { SearchEngineRule } from './types';
import { YANDEX_SEARCH_ALIASES } from '@/constants/search-hosts';

/** Yandex 搜索结果及广告识别规则。 */
export const yandexSearchEngine: SearchEngineRule = {
  name: 'Yandex',
  hostname: 'yandex.com',
  aliases: YANDEX_SEARCH_ALIASES,
  linkSelector: 'a.OrganicTitle-Link[href], a.Link_theme_normal[href], h2 a[href]',
  queryParameterNames: ['text', 'query'],
  buildSearchUrl: (query) => `https://yandex.com/search/?text=${encodeURIComponent(query)}`,
  resultSelectors: [
    {
      containerSelector: '#search-result',
      itemSelector: '.serp-item',
      linkSelector: 'a.OrganicTitle-Link[href], a.Link_theme_normal[href], h2 a[href]',
    },
    {
      containerSelector: '.serp-list',
      itemSelector: '.serp-item',
      linkSelector: 'a.OrganicTitle-Link[href], a.Link_theme_normal[href], h2 a[href]',
    },
  ],
  adItemSelectors: [
    '[data-fast-name="adv"]',
    '[class*="AdvLabel" i]',
  ],
};
