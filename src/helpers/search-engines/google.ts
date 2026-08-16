import type { SearchEngineRule } from './types';
import { GOOGLE_SEARCH_ALIASES } from '@/constants/search-hosts';

/** Google 搜索结果及广告识别规则。 */
export const googleSearchEngine: SearchEngineRule = {
  name: 'Google',
  hostname: 'google.com',
  aliases: GOOGLE_SEARCH_ALIASES,
  linkSelector: 'a[href]',
  queryParameterNames: ['q'],
  buildSearchUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  resultSelectors: [
    { containerSelector: '#search', itemSelector: '.g', linkSelector: 'a[href]' },
    { containerSelector: '#rso', itemSelector: '.MjjYud', linkSelector: 'a[href]' },
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
