/** 从 URL 中提取域名（不含 www. 前缀） */
export function getHostname(): string {
  return new URL(window.location.href).hostname.replace(/^www\./, '');
}

/** 从搜索结果元素中提取真实 URL（处理搜索引擎跳转链接） */
export function extractResultUrl(item: Element, linkSelector: string): string {
  const link = item.querySelector<HTMLAnchorElement>(linkSelector);
  const href = link?.href ?? '';

  // 如果 href 是当前搜索引擎域名的内部链接 → 跳转链接，需从属性取真实 URL
  if (isSearchEngineRedirect(href)) {
    // 1. mu 属性（百度放在结果容器上）
    const mu = item.getAttribute('mu');
    if (mu) return mu;

    // 2. data-mdurl（360 搜索放在 a 标签上）
    const mdurl = link?.getAttribute('data-mdurl');
    if (mdurl) return mdurl;

    // 3. cite 元素文本（Google/Bing 显示真实 URL）
    const cite = item.querySelector('cite');
    if (cite?.textContent) return cite.textContent.trim();

    // 4. data-url / data-href 等常见属性
    const dataUrl = item.getAttribute('data-url') || item.getAttribute('data-href');
    if (dataUrl) return dataUrl;
  }

  return href;
}

/** 判断 URL 是否为搜索引擎内部跳转链接 */
function isSearchEngineRedirect(url: string): boolean {
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
  const redirectPaths = ['/url?', '/link?', '/ck/', '/l/', '/goto/', '/redirect'];
  return redirectPaths.some((p) => url.includes(p));
}
