import type { SearchEngineRule } from './types';
import { BING_SEARCH_ALIASES } from '@/constants/search-hosts';

/** Bing 搜索结果及广告识别规则。 */
export const bingSearchEngine: SearchEngineRule = {
  name: 'Bing',
  hostname: 'bing.com',
  aliases: BING_SEARCH_ALIASES,
  linkSelector: 'a[href]',
  queryParameterNames: ['q'],
  buildSearchUrl: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  resultSelectors: [
    { containerSelector: '#b_results', itemSelector: '.b_algo', linkSelector: 'a[href]' },
  ],
  adItemSelectors: [
    '[aria-label="ad" i]',
    '[aria-label="ads" i]',
    '[aria-label="advertisement" i]',
    '[aria-label="sponsored" i]',
    '[aria-label="广告"]',
    '[aria-label="推广"]',
    '[class*="ad-label" i]',
  ],
};
