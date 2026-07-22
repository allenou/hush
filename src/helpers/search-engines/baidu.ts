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
  adLabelTexts: ['广告', '推广'],
  findAdContainers(root) {
    const candidates = root.querySelectorAll<HTMLElement>(
      'div[style*="display:block"][style*="visibility:visible"], ' +
      'li[style*="display:block"][style*="visibility:visible"], ' +
      'section[style*="display:block"][style*="visibility:visible"], ' +
      'table[style*="display:block"][style*="visibility:visible"]',
    );

    return Array.from(candidates).filter((element) =>
      Boolean(element.querySelector('.ec-tuiguang'))
      || element.textContent?.includes('广告')
      || element.textContent?.includes('推广'),
    );
  },
};
