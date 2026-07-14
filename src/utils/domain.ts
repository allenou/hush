/**
 * 从 URL 中提取域名（不含 www. 前缀）
 * 使用标准 URL API 替代简陋的正则匹配
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function matchesBlockedDomain(
  hostname: string,
  blockedDomains: string[],
  includeSubdomains: boolean,
): boolean {
  const current = hostname.toLowerCase().replace(/^www\./, '');
  return blockedDomains.some((domain) => {
    const rule = domain.toLowerCase().replace(/^www\./, '');
    return current === rule || (includeSubdomains && current.endsWith(`.${rule}`));
  });
}
