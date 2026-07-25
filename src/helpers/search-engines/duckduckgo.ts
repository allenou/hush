import type { SearchEngineRule } from './types';

/** DuckDuckGo 搜索结果及广告识别规则。 */
export const duckDuckGoSearchEngine: SearchEngineRule = {
  name: 'DuckDuckGo',
  hostname: 'duckduckgo.com',
  linkSelector: 'a[data-testid="result-title-a"][href], .result__a[href], h2 a[href]',
  queryParameterNames: ['q'],
  buildSearchUrl: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  resultSelectors: [
    {
      containerSelector: 'section[data-testid="mainline"]',
      itemSelector: 'article[data-testid="result"]',
      linkSelector: 'a[data-testid="result-title-a"][href], h2 a[href]',
    },
    {
      containerSelector: '#links',
      itemSelector: '.result',
      linkSelector: '.result__a[href], h2 a[href]',
    },
  ],
  adItemSelectors: [
    '[data-testid="ad"]',
    '[class*="result--ad" i]',
  ],
  adLabelTexts: ['ad', 'ads', 'sponsored', '广告', '廣告'],
};
