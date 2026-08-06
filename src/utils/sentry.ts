import * as Sentry from '@sentry/browser';
import { browser } from 'wxt/browser';

type RuntimeArea = 'background' | 'content' | 'options' | 'popup';

const SENSITIVE_KEY = /authorization|cookie|email|password|query|search|token|url|href/i;
const URL_PATTERN = /\bhttps?:\/\/[^\s"']+/gi;

function stripUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.replace(URL_PATTERN, (url) => stripUrl(url));
  }
}

function sanitizeData(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (typeof value === 'string') return stripUrl(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeData(item, depth + 1));
  if (typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => (
      SENSITIVE_KEY.test(key) ? [] : [[key, sanitizeData(item, depth + 1)]]
    )),
  );
}

/** 初始化扩展错误监控；DSN 未配置时 SDK 不会发送事件。 */
export function initSentry(area: RuntimeArea): void {
  const dsn = import.meta.env.WXT_PUBLIC_SENTRY_DSN;
  // 开发热更新期间不采集，避免测试操作污染生产项目。
  // Firefox 发布清单声明不收集数据，因此该平台不初始化诊断上报。
  if (!import.meta.env.PROD || !dsn || import.meta.env.BROWSER === 'firefox') return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `extension@${browser.runtime.getManifest().version}`,
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    initialScope: {
      tags: {
        runtime_area: area,
      },
    },
    beforeBreadcrumb(breadcrumb) {
      return {
        ...breadcrumb,
        data: sanitizeData(breadcrumb.data) as typeof breadcrumb.data,
      };
    },
    beforeSend(event) {
      const {
        user: _user,
        request,
        breadcrumbs,
        ...safeEvent
      } = event;

      return {
        ...safeEvent,
        ...(request ? {
          request: sanitizeRequest(request),
        } : {}),
        ...(breadcrumbs ? {
          breadcrumbs: breadcrumbs.map((breadcrumb) => ({
            ...breadcrumb,
            data: sanitizeData(breadcrumb.data) as typeof breadcrumb.data,
          })),
        } : {}),
      };
    },
  });
}

function sanitizeRequest(
  request: NonNullable<Sentry.ErrorEvent['request']>,
): NonNullable<Sentry.ErrorEvent['request']> {
  const {
    data: _data,
    cookies: _cookies,
    headers: _headers,
    query_string: _queryString,
    url,
    ...safeRequest
  } = request;
  return {
    ...safeRequest,
    ...(url ? { url: stripUrl(url) } : {}),
  };
}
