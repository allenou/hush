import { isSupportedSearchHostname } from '@/constants/search-hosts';

export const LOCAL_PAGE_MATCH_PATTERNS = [
  '*://localhost/*',
  '*://*.localhost/*',
  '*://127.0.0.1/*',
] as const;

export const WEB_PAGE_MATCH_PATTERNS = ['http://*/*', 'https://*/*'] as const;

export function isRestrictedContextMenuUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isLocal = hostname === 'localhost'
      || hostname.endsWith('.localhost')
      || hostname === '127.0.0.1';
    return isLocal || isSupportedSearchHostname(hostname);
  } catch {
    return false;
  }
}
