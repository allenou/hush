/**
 * i18n 导出入口（供 content scripts 等非 Svelte 环境使用）
 *
 * Svelte 组件请使用 utils/locale-store.svelte.ts 获得响应式 t()。
 */

export { t, getLocale, formatDate, initLocale, setLocale } from './locale';
