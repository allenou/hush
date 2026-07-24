/** 从 URL 中提取域名（不含 www. 前缀） */
export function getHostname(): string {
  return new URL(window.location.href).hostname.replace(/^www\./, '');
}

const HOMEPAGE_TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid', 'msclkid', 'ref', 'referrer',
]);

/** 判断 URL 是否仅指向域名首页；常见追踪参数不视为具体页面。 */
export function isDomainHomepageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.pathname !== '/' || url.hash) return false;
    return Array.from(url.searchParams.keys()).every((key) =>
      key.toLowerCase().startsWith('utm_') || HOMEPAGE_TRACKING_PARAMS.has(key.toLowerCase()),
    );
  } catch {
    return false;
  }
}

/** 从右键事件目标恢复实际链接；注入徽标会通过 data 属性保存原始结果 URL。 */
export function resolveContextTargetUrl(target: Element | null, pageUrl: string): string {
  const linkUrl = target?.closest<HTMLAnchorElement>('a[href]')?.href;
  const storedUrl = target
    ?.closest<HTMLElement>('[data-srb-target-url]')
    ?.dataset.srbTargetUrl;

  for (const candidate of [linkUrl, storedUrl, pageUrl]) {
    if (!candidate) continue;
    const parsed = parseHttpUrl(candidate);
    if (parsed) return parsed.href;
  }
  return pageUrl;
}

/**
 * 遍历链接的全部属性，提取其中可识别的 HTTP(S) 地址。
 * 不依赖 data-url 等特定属性名，以兼容不同站点保存真实地址的方式。
 */
export function extractAnchorAttributeUrls(link: HTMLAnchorElement): string[] {
  const urls = new Set<string>();
  const values = [link.href, ...Array.from(link.attributes, (attribute) => attribute.value)];

  values.forEach((value) => collectUrlsFromAttribute(value, urls));
  return Array.from(urls);
}

/** 仅从链接子 span 的可见文本中提取 HTTP(S) 地址，不读取链接属性。 */
export function extractAnchorSpanUrls(link: HTMLAnchorElement): string[] {
  const urls = new Set<string>();
  link.querySelectorAll('span').forEach((span) => {
    const parsed = parseHttpUrl((span.textContent ?? '').trim());
    if (parsed) urls.add(parsed.href);
  });
  return Array.from(urls);
}

function collectUrlsFromAttribute(rawValue: string, urls: Set<string>, depth = 0): void {
  if (!rawValue || depth > 3) return;
  let value = rawValue.trim().replace(/\\\//g, '/');
  if (!value) return;

  for (let i = 0; i < 3; i++) {
    collectUrlCandidate(value, urls, depth);
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
}

function collectUrlCandidate(value: string, urls: Set<string>, depth: number): void {
  const exactUrl = parseHttpUrl(value);
  if (exactUrl) {
    urls.add(exactUrl.href);
    if (depth < 3) {
      exactUrl.searchParams.forEach((parameter) => {
        collectUrlsFromAttribute(parameter, urls, depth + 1);
      });
    }
  }

  const embeddedUrls = value.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? [];
  embeddedUrls.forEach((candidate) => {
    const parsed = parseHttpUrl(candidate.replace(/[),.;，。]+$/u, ''));
    if (parsed) urls.add(parsed.href);
  });

  // 某些站点仅在属性中保存域名，例如 data-domain="example.com"。
  if (depth === 0 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?$/i.test(value)) {
    const parsed = parseHttpUrl(`https://${value}`);
    if (parsed) urls.add(parsed.href);
  }
}

function parseHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

/** 从搜索结果元素中提取真实 URL（处理搜索引擎跳转链接） */
export function extractResultUrl(item: Element, linkSelector: string): string {
  const currentHost = new URL(window.location.href).hostname.replace(/^www\./, '');
  if (currentHost === 'sogou.com') {
    return extractSogouResultUrl(item, linkSelector);
  }

  const link = item.querySelector<HTMLAnchorElement>(linkSelector);
  const href = link?.href ?? '';
  if (!href) return '';
  if (!isSearchEngineRedirect(href)) return href;

  // 跳转链接 → 遍历所有属性找真实 URL
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

/**
 * 搜狗的跳转地址和属性不作为目标依据，只读取结果链接子 span 中展示的访问地址。
 * 例如：<a class="citeLinkClass"><span>CSDN</span><span>https://www.csdn.net/</span></a>
 */
function extractSogouResultUrl(item: Element, linkSelector: string): string {
  const links = item.querySelectorAll<HTMLAnchorElement>(linkSelector);
  for (const link of links) {
    const [url] = extractAnchorSpanUrls(link);
    if (url) return url;
  }
  return '';
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
