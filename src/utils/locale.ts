/**
 * 核心国际化模块
 *
 * 支持运行时切换语言，不依赖 chrome.i18n 的浏览器语言限定。
 * 加载 locales/{locale}/messages.json 实现自定义消息查找。
 */

type MessageMap = Record<string, string>;

// 哨兵对象：用于区分"未初始化"和"已加载但某 key 不存在"
const UNINIT = {};

let _locale = 'zh_CN';
let _messages: MessageMap = UNINIT as MessageMap;
let _listeners = new Set<() => void>();

/** 获取翻译文本（同步，适合 content script） */
export function t(key: string, ...subs: string[]): string {
  let msg = _messages === UNINIT ? undefined : _messages[key];
  if (!msg) {
    const result = getChromeMessage(key, subs);
    if (result) return result;
    return key;
  }
  if (subs.length > 0) {
    subs.forEach((sub, i) => {
      msg = msg!.replace(`$${i + 1}`, sub);
    });
  }
  return msg;
}

function getChromeMessage(key: string, subs: string[]): string {
  try {
    return chrome.i18n.getMessage(
      key,
      subs.length > 0 ? (subs.length === 1 ? subs[0] : subs) : undefined,
    );
  } catch {
    return '';
  }
}

/** 获取当前语言代码 */
export function getLocale(): string {
  return _locale;
}

/** 同步扩展页面的 HTML 语言属性；Content Script 不应调用。 */
export function setDocumentLocale(locale: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale.startsWith('zh') ? 'zh-CN' : 'en';
}

/** 切换语言并通知所有监听器 */
export async function setLocale(locale: string): Promise<void> {
  _locale = locale;
  _messages = await loadMessages(locale);
  _listeners.forEach((fn) => fn());
}

/** 订阅语言变更 */
export function subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** 加载指定语言的消息 */
async function loadMessages(locale: string): Promise<MessageMap> {
  const dir = locale.startsWith('zh') ? 'zh_CN' : 'en';
  try {
    const url = chrome.runtime.getURL(`_locales/${dir}/messages.json`);
    const res = await fetch(url);
    const data = (await res.json()) as Record<string, { message: string }>;
    const map: MessageMap = {};
    for (const [key, { message }] of Object.entries(data)) {
      map[key] = message;
    }
    return map;
  } catch {
    return {};
  }
}

/** 初始化语言（从存储中读取偏好，如无则用浏览器语言） */
export async function initLocale(storedLocale?: string): Promise<void> {
  const ui = chrome.i18n.getUILanguage();
  const fallback = ui.startsWith('zh') ? 'zh_CN' : 'en';
  _locale = storedLocale && (storedLocale === 'zh_CN' || storedLocale === 'en') ? storedLocale : fallback;
  _messages = await loadMessages(_locale);
  _listeners.forEach((fn) => fn());
}

/** 格式化日期（按当前语言） */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString(_locale === 'zh_CN' ? 'zh-CN' : 'en-US', options);
}
