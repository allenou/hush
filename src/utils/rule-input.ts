export type ParsedRuleInput =
  | { type: 'domain'; value: string }
  | { type: 'url'; value: string };

function normalizeDomain(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

export function parseRuleInput(input: string): ParsedRuleInput {
  const value = input.trim();
  if (!value) throw new Error('Invalid rule input');

  if (!/^https?:\/\//i.test(value)) {
    if (/[/?#]/.test(value)) throw new Error('Domain rules cannot contain a path');
    const url = new URL(`https://${value}`);
    if (!url.hostname || url.username || url.password || url.port) {
      throw new Error('Invalid domain rule');
    }
    return { type: 'domain', value: normalizeDomain(url.hostname) };
  }

  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol');
  }

  const isRootDomain = url.pathname === '/'
    && url.search === ''
    && url.hash === ''
    && url.port === '';

  if (isRootDomain) {
    return { type: 'domain', value: normalizeDomain(url.hostname) };
  }

  return { type: 'url', value: url.href };
}
