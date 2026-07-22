import type { SearchEngineRule } from './types';

/** Google 搜索结果及广告识别规则。 */
export const googleSearchEngine: SearchEngineRule = {
  name: 'Google',
  hostname: 'google.com',
  linkSelector: 'a[href]',
  queryParameterNames: ['q'],
  buildSearchUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  resultSelectors: [
    { containerSelector: '#search', itemSelector: '.g', linkSelector: 'a[href]' },
    { containerSelector: '#rso', itemSelector: '.MjjYud', linkSelector: 'a[href]' },
  ],
  adItemSelectors: [
    '[aria-label*="ad" i]',
    '[aria-label*="sponsor" i]',
    '[class*="ad-label" i]',
  ],
  adLabelTexts: ['ad', 'sponsored', '广告', '推广'],
};
