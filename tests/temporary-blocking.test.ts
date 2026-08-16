import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  clearTemporaryBlocking,
  getEffectiveHandlingMode,
  getTemporaryBlocking,
  isBlockTargetEnabled,
  setTemporaryBlockEnabled,
  setTemporaryHandlingMode,
} from '@/utils/temporary-blocking';

describe('temporary blocking controls', () => {
  beforeEach(() => {
    fakeBrowser.storage.resetState();
  });

  it('stores per-category overrides without changing persistent preferences', async () => {
    expect(await getTemporaryBlocking()).toEqual({});

    await setTemporaryBlockEnabled('url', false);
    await setTemporaryHandlingMode('ad', 'hide');

    expect(await getTemporaryBlocking()).toEqual({ url: 'off', ad: 'hide' });

    await clearTemporaryBlocking();
    expect(await getTemporaryBlocking()).toEqual({});
  });

  it('uses a temporary override before the persistent preference', () => {
    const persistent = {
      blockAds: false,
      blockDomains: true,
      blockUrls: true,
      blockSelectors: false,
    };

    expect(isBlockTargetEnabled('ad', persistent, {})).toBe(false);
    expect(isBlockTargetEnabled('domain', persistent, {})).toBe(true);
    expect(isBlockTargetEnabled('ad', persistent, { ad: 'mark' })).toBe(true);
    expect(isBlockTargetEnabled('domain', persistent, { domain: 'off' })).toBe(false);
  });

  it('resolves temporary handling modes before persistent display settings', () => {
    const persistent = {
      blockAds: false,
      blockDomains: true,
      blockUrls: true,
      blockSelectors: false,
      adDisplayMode: 'mark' as const,
      domainDisplayMode: 'hide' as const,
      urlDisplayMode: 'mark' as const,
      selectorDisplayMode: 'hide' as const,
    };

    expect(getEffectiveHandlingMode('domain', persistent, {})).toBe('hide');
    expect(getEffectiveHandlingMode('ad', persistent, {})).toBe('off');
    expect(getEffectiveHandlingMode('domain', persistent, { domain: 'mark' })).toBe('mark');
    expect(getEffectiveHandlingMode('url', persistent, { url: 'off' })).toBe('off');
  });
});
