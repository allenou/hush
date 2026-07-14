import { describe, expect, it } from 'vitest';
import { parseRuleInput } from '@/utils/rule-input';

describe('parseRuleInput', () => {
  it('normalizes plain and root URL domains', () => {
    expect(parseRuleInput('Example.COM')).toEqual({ type: 'domain', value: 'example.com' });
    expect(parseRuleInput('https://www.example.com/')).toEqual({ type: 'domain', value: 'example.com' });
  });

  it('preserves full URLs with query, hash, path, or explicit port', () => {
    expect(parseRuleInput('https://example.com/?q=1')).toEqual({
      type: 'url',
      value: 'https://example.com/?q=1',
    });
    expect(parseRuleInput('https://example.com/#part').type).toBe('url');
    expect(parseRuleInput('https://example.com/page').type).toBe('url');
    expect(parseRuleInput('https://example.com:8443/').type).toBe('url');
  });

  it('rejects protocol-less paths and unsupported protocols', () => {
    expect(() => parseRuleInput('example.com/path')).toThrow();
    expect(() => parseRuleInput('ftp://example.com/file')).toThrow();
  });
});
