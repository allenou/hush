import type { SearchEngineRule } from './types';

/** 百度搜索结果及广告识别规则。 */
export const baiduSearchEngine: SearchEngineRule = {
  name: 'Baidu',
  hostname: 'baidu.com',
  linkSelector: 'a[href]',
  queryParameterNames: ['wd', 'word'],
  buildSearchUrl: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
  resultSelectors: [
    { containerSelector: '#content_left', itemSelector: '.result, .result-op', linkSelector: 'a[href]' },
  ],
  adItemSelectors: [
    '.ec-tuiguang',
    '[class*="tuiguang" i]',
  ],
  findAdContainers(root) {
    const markers = root.querySelectorAll<HTMLElement>(
      '.ec-tuiguang, [class*="tuiguang" i]',
    );
    return Array.from(markers).map((marker) =>
      marker.closest<HTMLElement>('.result, .result-op') ?? marker,
    );
  },
};
