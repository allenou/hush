/**
 * 响应式 i18n 模块（Svelte 5）
 *
 * 使用 $state 驱动，Svelte 组件中直接调用 t() 即可获得响应式更新。
 * Content scripts 不要引用此文件。
 */

import { subscribe, t as tBase, getLocale, setLocale, initLocale } from './locale';

let _v = $state(0);
subscribe(() => _v++);

/** 翻译函数（响应式：语言切换时所有组件自动重渲染） */
export function t(key: string, ...subs: string[]): string {
  _v;
  return tBase(key, ...subs);
}

const SEARCH_ENGINE_NAME_KEYS: Record<string, string> = {
  'google.com': 'searchEngineGoogle',
  'baidu.com': 'searchEngineBaidu',
  'bing.com': 'searchEngineBing',
  'so.com': 'searchEngineSo',
  'sogou.com': 'searchEngineSogou',
  'search.yahoo.com': 'searchEngineYahoo',
  'yandex.com': 'searchEngineYandex',
  'yandex.ru': 'searchEngineYandex',
  'duckduckgo.com': 'searchEngineDuckDuckGo',
};

/** 根据 hostname 获取本地化搜索引擎名称，未知引擎保留原名称。 */
export function getSearchEngineDisplayName(hostname: string, fallback: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/^www\./, '');
  const key = SEARCH_ENGINE_NAME_KEYS[normalized];
  if (!key) return fallback;
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export { getLocale, setLocale, initLocale };
