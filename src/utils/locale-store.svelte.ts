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

export { getLocale, setLocale, initLocale };
