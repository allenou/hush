/**
 * 从 URL 中提取域名（不含 www. 前缀）
 * 使用标准 URL API 替代简陋的正则匹配
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
