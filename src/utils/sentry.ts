import * as Sentry from '@sentry/browser';
import { browser } from 'wxt/browser';

type RuntimeArea = 'background' | 'content' | 'options' | 'popup';

const SENSITIVE_KEY = /authorization|cookie|email|password|query|search|token|url|href/i;
const URL_PATTERN = /\bhttps?:\/\/[^\s"']+/gi;

function sanitizeText(value: string): string {
  return value.replace(URL_PATTERN, '[redacted-url]');
}

function sanitizeData(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeText(value);
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
    // 扩展只上报错误诊断，不采集搜索页性能事务或 Web Vitals DOM 信息。
    tracesSampleRate: 0,
    integrations(defaultIntegrations) {
      // DOM/console breadcrumb 可能包含搜索结果元素属性或页面文本，扩展端全部禁用。
      return defaultIntegrations.filter((integration) => integration.name !== 'Breadcrumbs');
    },
    initialScope: {
      tags: {
        runtime_area: area,
      },
    },
    beforeSend(event) {
      const {
        user: _user,
        request: _request,
        breadcrumbs: _breadcrumbs,
        contexts: _contexts,
        extra: _extra,
        logentry: _logentry,
        ...safeEvent
      } = event;

      return {
        ...safeEvent,
        ...(event.message ? { message: sanitizeText(event.message) } : {}),
        ...(event.transaction ? { transaction: sanitizeText(event.transaction) } : {}),
        ...(event.exception ? {
          exception: sanitizeData(event.exception) as typeof event.exception,
        } : {}),
        ...(event.tags ? { tags: sanitizeData(event.tags) as typeof event.tags } : {}),
      };
    },
  });
}
