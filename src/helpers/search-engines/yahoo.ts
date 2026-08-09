import type { SearchEngineRule } from './types';
import { YAHOO_SEARCH_ALIASES } from '@/constants/search-hosts';

/** Yahoo 搜索结果及广告识别规则。 */
export const yahooSearchEngine: SearchEngineRule = {
  name: 'Yahoo!',
  hostname: 'search.yahoo.com',
  aliases: YAHOO_SEARCH_ALIASES,
  linkSelector: 'h3 a[href], a[href][data-matarget="algo"]',
  queryParameterNames: ['p'],
  buildSearchUrl: (query) => `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
  resultSelectors: [
    {
      containerSelector: '#web',
      itemSelector: '.algo-sr, .algo',
      linkSelector: 'h3 a[href], a[href][data-matarget="algo"]',
    },
    {
      containerSelector: '#results',
      itemSelector: '.algo-sr, .algo',
      linkSelector: 'h3 a[href], a[href][data-matarget="algo"]',
    },
  ],
  adItemSelectors: [
    '[data-advertisement]',
    '[class*="sponsored" i]',
  ],
  adLabelTexts: ['ad', 'ads', 'sponsored', '广告', '廣告', '広告'],
};
