import type { SearchEngineRule } from './types';

/** Bing 搜索结果及广告识别规则。 */
export const bingSearchEngine: SearchEngineRule = {
  name: 'Bing',
  hostname: 'bing.com',
  linkSelector: 'a[href]',
  queryParameterNames: ['q'],
  buildSearchUrl: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  resultSelectors: [
    { containerSelector: '#b_results', itemSelector: '.b_algo', linkSelector: 'a[href]' },
  ],
  adItemSelectors: [
    '[aria-label*="ad" i]',
    '[aria-label*="sponsor" i]',
    '[class*="ad-label" i]',
  ],
  adLabelTexts: ['ad', 'sponsored', '广告', '推广'],
};
