import * as Sentry from '@sentry/astro';

function stripUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value;
  }
}

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  // 完整采集页面加载事务，用于 Sentry 的访问量、页面与 Web Vitals 概览。
  tracesSampleRate: 1,
  integrations(defaultIntegrations) {
    return [
      ...defaultIntegrations.filter((integration) => integration.name !== 'Breadcrumbs'),
      Sentry.browserTracingIntegration({
        // 静态站点的每次跳转都是新文档，使用 sessionStorage 保持一次访问内的关联。
        linkPreviousTrace: 'session-storage',
      }),
    ];
  },
  beforeSend(event) {
    const {
      user: _user,
      request,
      breadcrumbs: _breadcrumbs,
      contexts: _contexts,
      extra: _extra,
      logentry: _logentry,
      ...safeEvent
    } = event;
    const safeRequest = request ? sanitizeRequest(request) : undefined;
    return {
      ...safeEvent,
      ...(safeRequest ? { request: safeRequest } : {}),
    };
  },
  beforeSendTransaction(transaction) {
    const { request, transaction: name, ...safeTransaction } = transaction;
    return {
      ...safeTransaction,
      ...(name ? { transaction: stripUrl(name) } : {}),
      ...(request ? { request: sanitizeRequest(request) } : {}),
    };
  },
});

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
