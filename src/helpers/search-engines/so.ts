import type { SearchEngineRule } from './types';

function hasAdLabel(element: Element): boolean {
  return Array.from(element.querySelectorAll('*')).some((child) => {
    const text = (child.textContent ?? '').trim();
    return text.length <= 20 && text.includes('广告');
  });
}

/** 360 搜索结果及广告识别规则。 */
export const soSearchEngine: SearchEngineRule = {
  name: '360搜索',
  hostname: 'so.com',
  linkSelector: 'a[href]',
  queryParameterNames: ['q'],
  buildSearchUrl: (query) => `https://www.so.com/s?q=${encodeURIComponent(query)}`,
  resultSelectors: [
    { containerSelector: '#main', itemSelector: '.res-list', linkSelector: 'a[href]' },
  ],
  adLabelTexts: ['广告', '推广'],
  isAdItem(item) {
    const candidates = item.matches('.e-pc-li-131-1')
      ? [item]
      : Array.from(item.querySelectorAll('.e-pc-li-131-1'));
    return candidates.some(hasAdLabel);
  },
  findAdContainers(root) {
    return Array.from(root.querySelectorAll<HTMLElement>('.e-pc-li-131-1'))
      .filter(hasAdLabel);
  },
};
