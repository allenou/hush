import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  clearTemporaryBlocking,
  getTemporaryBlocking,
  isBlockTargetEnabled,
  setTemporaryBlockEnabled,
} from '@/utils/temporary-blocking';

describe('temporary blocking controls', () => {
  beforeEach(() => {
    fakeBrowser.storage.resetState();
  });

  it('stores per-category overrides without changing persistent preferences', async () => {
    expect(await getTemporaryBlocking()).toEqual({});

    await setTemporaryBlockEnabled('url', false);
    await setTemporaryBlockEnabled('ad', true);

    expect(await getTemporaryBlocking()).toEqual({ url: false, ad: true });

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
    expect(isBlockTargetEnabled('ad', persistent, { ad: true })).toBe(true);
    expect(isBlockTargetEnabled('domain', persistent, { domain: false })).toBe(false);
  });
});
