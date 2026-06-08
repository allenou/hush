/** 从 URL 中提取域名（不含 www. 前缀） */
export function getHostname(): string {
  return new URL(window.location.href).hostname.replace(/^www\./, '');
}

/** 从结果元素中提取真实 URL（处理百度跳转链接） */
export function extractResultUrl(item: Element, linkSelector: string): string {
  let url = '';
  const link = item.querySelector<HTMLAnchorElement>(linkSelector);
  url = link?.href ?? '';

  // 百度会把真实 URL 放在 mu 属性上
  if (!url || url.includes('baidu.com/link?')) {
    const mu = item.getAttribute('mu');
    if (mu) url = mu;
  }

  // 如果还是跳转链接，尝试 cite 元素
  if (!url || url.includes('baidu.com/link?')) {
    const cite = item.querySelector('cite');
    if (cite?.textContent) url = cite.textContent.trim();
  }
  return url;
}
