import { describe, it, expect, beforeEach } from 'vitest';
import type { SearchEngineConfig } from '@/helpers/search-engines';
import {
  getScanObserverTarget,
  hasSelectorRuleForHost,
} from '@/helpers/scan-observer';

function makeEngine(containerSelector: string): SearchEngineConfig {
  return {
    name: 'Test',
    hostname: 'example.com',
    containerSelector,
    itemSelector: '.result',
    linkSelector: 'a[href]',
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('hasSelectorRuleForHost', () => {
  it('matches selector rules scoped to the current host', () => {
    expect(hasSelectorRuleForHost(['example.com||.ad'], 'example.com')).toBe(true);
  });

  it('does not match selector rules scoped to other hosts', () => {
    expect(hasSelectorRuleForHost(['other.com||.ad'], 'example.com')).toBe(false);
  });
});

describe('getScanObserverTarget', () => {
  it('returns null for ordinary pages with no engine or host selector rules', () => {
    expect(getScanObserverTarget({
      engine: null,
      blockedSelectors: [],
      hostname: 'example.com',
    })).toBeNull();
  });

  it('uses document.body for active search engines so first-page rerenders are observed', () => {
    const container = document.createElement('main');
    container.id = 'results';
    document.body.appendChild(container);

    expect(getScanObserverTarget({
      engine: makeEngine('#results'),
      blockedSelectors: ['example.com||.ad'],
      hostname: 'example.com',
    })).toBe(document.body);
  });

  it('uses document.body on built-in search hosts before engine detection succeeds', () => {
    expect(getScanObserverTarget({
      engine: null,
      blockedSelectors: [],
      hostname: 'google.com',
      searchEngineHosts: ['google.com'],
    })).toBe(document.body);
  });

  it('falls back to document.body for current-host selector rules', () => {
    expect(getScanObserverTarget({
      engine: null,
      blockedSelectors: ['example.com||.ad'],
      hostname: 'example.com',
    })).toBe(document.body);
  });

  it('returns null when only other-host selector rules exist', () => {
    expect(getScanObserverTarget({
      engine: null,
      blockedSelectors: ['other.com||.ad'],
      hostname: 'example.com',
    })).toBeNull();
  });
});
