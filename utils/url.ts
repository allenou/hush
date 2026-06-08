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

  // 扫 link 元素的所有属性
  if (link) {
    for (let i = 0; i < link.attributes.length; i++) {
      const val = link.attributes[i].value;
      if (/^https?:\/\//.test(val) && !val.includes(currentHost)) return val;
    }
  }
  // 扫 item 元素的所有属性
  for (let i = 0; i < item.attributes.length; i++) {
    const val = item.attributes[i].value;
    if (/^https?:\/\//.test(val) && !val.includes(currentHost)) return val;
  }
  // 扫 cite 文本
  const cite = item.querySelector('cite');
  if (cite?.textContent) return cite.textContent.trim();

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
