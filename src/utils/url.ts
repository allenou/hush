/** 从 URL 中提取域名（不含 www. 前缀） */
export function getHostname(): string {
  return new URL(window.location.href).hostname.replace(/^www\./, '');
}

/** 从搜索结果元素中提取真实 URL（处理搜索引擎跳转链接） */
export function extractResultUrl(item: Element, linkSelector: string): string {
  const link = item.querySelector<HTMLAnchorElement>(linkSelector);
  const href = link?.href ?? '';
  if (!href) return '';
  if (!isSearchEngineRedirect(href)) return href;

  // 跳转链接 → 遍历所有属性找真实 URL
  const currentHost = new URL(window.location.href).hostname.replace(/^www\./, '');
  const redirectTarget = extractRedirectTargetUrl(href, currentHost);
  if (redirectTarget) return redirectTarget;

  // 扫 link 元素的所有属性
  if (link) {
    for (let i = 0; i < link.attributes.length; i++) {
      const val = link.attributes[i].value;
      if (isExternalHttpUrl(val, currentHost)) return val;
    }
  }
  // 扫 item 元素的所有属性
  for (let i = 0; i < item.attributes.length; i++) {
    const val = item.attributes[i].value;
    if (isExternalHttpUrl(val, currentHost)) return val;
  }
  // 扫 cite 文本
  const cite = item.querySelector('cite');
  const citeUrl = normalizeCiteUrl(cite?.textContent ?? '');
  if (citeUrl) return citeUrl;

  return href;
}

/** 判断 URL 是否为搜索引擎内部跳转链接 */
export function isSearchEngineRedirect(url: string): boolean {
  if (!url) return false;
  try {
    const current = new URL(window.location.href).hostname.replace(/^www\./, '');
    const target = new URL(url).hostname.replace(/^www\./, '');
    // 如果链接指向当前搜索引擎自身 → 是跳转链接
    if (target === current) return true;
  } catch {
    // URL 解析失败
  }
  // 常见跳转路径特征
  const redirectPaths = ['/url?', '/link?', '/ck/', '/l/', '/goto/', '/redirect', '/aclk'];
  return redirectPaths.some((p) => url.includes(p));
}

function extractRedirectTargetUrl(href: string, currentHost: string): string | null {
  try {
    const redirectUrl = new URL(href, window.location.href);
    const params = [
      'adurl', 'url', 'u', 'q', 'target', 'to',
      'dest', 'destination', 'redirect', 'redirect_url', 'rurl',
    ];
    for (const name of params) {
      const raw = redirectUrl.searchParams.get(name);
      const target = normalizeRedirectTarget(raw);
      if (target && isExternalHttpUrl(target, currentHost)) return target;
    }
  } catch {
    // ignore invalid redirect URLs
  }
  return null;
}

function normalizeRedirectTarget(value: string | null): string | null {
  if (!value) return null;
  let candidate = value.trim();

  for (let i = 0; i < 3; i++) {
    if (/^https?:\/\//i.test(candidate)) return candidate;
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) break;
      candidate = decoded;
    } catch {
      break;
    }
  }

  return null;
}

function isExternalHttpUrl(value: string, currentHost: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const targetHost = new URL(value).hostname.replace(/^www\./, '');
    return targetHost !== currentHost;
  } catch {
    return false;
  }
}

function normalizeCiteUrl(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const match = normalized.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s›>]+)?/i);
  if (!match) return null;

  const value = match[0].replace(/[),.;，。]+$/u, '');
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
