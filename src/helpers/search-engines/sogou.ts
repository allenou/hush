import type { SearchEngineRule } from './types';

/** 搜狗搜索结果及广告识别规则。 */
export const sogouSearchEngine: SearchEngineRule = {
  name: '搜狗搜索',
  hostname: 'sogou.com',
  linkSelector: 'a',
  queryParameterNames: ['query'],
  buildSearchUrl: (query) => `https://www.sogou.com/web?query=${encodeURIComponent(query)}`,
  resultSelectors: [
    { containerSelector: '#main', itemSelector: '.vrwrap', linkSelector: 'a' },
    { containerSelector: '#main', itemSelector: '.rb', linkSelector: 'a' },
  ],
  adItemSelectors: ['.ad-results'],
  adLabelTexts: ['广告', '推广'],
  findAdContainers(root) {
    return Array.from(root.querySelectorAll<HTMLElement>('.ad-results'));
  },
};
