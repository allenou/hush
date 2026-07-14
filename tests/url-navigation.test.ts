import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeToUrlChanges } from '@/helpers/url-navigation';

describe('subscribeToUrlChanges', () => {
  let unsubscribe: (() => void) | undefined;

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    history.replaceState(null, '', '/');
  });

  it('reports pushState and replaceState URL changes', () => {
    const listener = vi.fn();
    unsubscribe = subscribeToUrlChanges(listener);

    history.pushState(null, '', '/search?q=one');
    history.replaceState(null, '', '/search?q=two');

    expect(listener).toHaveBeenNthCalledWith(1, expect.stringContaining('/search?q=one'));
    expect(listener).toHaveBeenNthCalledWith(2, expect.stringContaining('/search?q=two'));
  });

  it('reports popstate changes and restores patched history methods', () => {
    const originalPushState = history.pushState;
    const listener = vi.fn();
    unsubscribe = subscribeToUrlChanges(listener);

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    unsubscribe = undefined;
    expect(history.pushState).toBe(originalPushState);
  });
});
