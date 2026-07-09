import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

// ------ Imports ------
import {
  get,
  addDomain, removeDomain,
  addBlockedUrl, removeBlockedUrl,
  addBlockedSelector, removeBlockedSelector,
  getAllBlocked, removeBlockedItem,
  addCustomEngine, findMatchingCustomEngine, removeCustomEngine,
  recordBlock, incrementBlockCount,
  setEnabled, subscribe,
} from '@/utils/storage';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('get / set defaults', () => {
  it('returns default values when storage is empty', async () => {
    const s = await get();
    expect(s.urls).toEqual([]);
    expect(s.blockedUrls).toEqual([]);
    expect(s.blockCount).toBe(0);
    expect(s.enabled).toBe(true);
    expect(s.blockAds).toBe(true);
    expect(s.customEngines).toEqual([]);
    expect(s.blockedSelectors).toEqual([]);
    expect(s.stats).toEqual([]);
  });

  it('persists and retrieves values', async () => {
    await fakeBrowser.storage.local.set({ blocker: { urls: ['example.com'], blockCount: 5, enabled: false } });
    const s = await get();
    expect(s.urls).toEqual(['example.com']);
    expect(s.blockCount).toBe(5);
    expect(s.enabled).toBe(false);
  });

  it('notifies subscribers through the WXT storage item watcher', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    await setEnabled(false);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].enabled).toBe(false);
    unsubscribe();
  });
});

describe('addDomain / removeDomain', () => {
  it('adds a domain', async () => {
    await addDomain('example.com');
    expect((await get()).urls).toContain('example.com');
  });

  it('does not duplicate a domain', async () => {
    await addDomain('example.com');
    await addDomain('example.com');
    expect((await get()).urls.filter(d => d === 'example.com')).toHaveLength(1);
  });

  it('adds multiple domains', async () => {
    await addDomain('a.com');
    await addDomain('b.com');
    expect((await get()).urls).toEqual(['a.com', 'b.com']);
  });

  it('removes a domain by index', async () => {
    await addDomain('a.com');
    await addDomain('b.com');
    await removeDomain(0);
    expect((await get()).urls).toEqual(['b.com']);
  });

  it('handles remove on empty list', async () => {
    await removeDomain(0);
    expect((await get()).urls).toEqual([]);
  });
});

describe('addBlockedUrl / removeBlockedUrl', () => {
  it('adds a URL', async () => {
    await addBlockedUrl('https://example.com/page');
    expect((await get()).blockedUrls).toContain('https://example.com/page');
  });

  it('does not duplicate URLs', async () => {
    await addBlockedUrl('https://a.com');
    await addBlockedUrl('https://a.com');
    expect((await get()).blockedUrls).toHaveLength(1);
  });
});

describe('addBlockedSelector', () => {
  it('adds a selector with hostname prefix', async () => {
    await addBlockedSelector('google.com||.ad');
    expect((await get()).blockedSelectors).toContain('google.com||.ad');
  });

  it('does not duplicate selectors', async () => {
    await addBlockedSelector('h||.x');
    await addBlockedSelector('h||.x');
    expect((await get()).blockedSelectors).toHaveLength(1);
  });
});

describe('getAllBlocked', () => {
  it('returns empty when nothing is blocked', async () => {
    expect(await getAllBlocked()).toEqual([]);
  });

  it('returns mixed types with correct values', async () => {
    await addDomain('ex.com');
    await addBlockedUrl('https://ex.com/p');
    await addBlockedSelector('g||.ad');
    const items = await getAllBlocked();
    expect(items).toHaveLength(3);
    expect(items.find(i => i.type === 'domain')!.value).toBe('ex.com');
    expect(items.find(i => i.type === 'url')!.value).toBe('https://ex.com/p');
    expect(items.find(i => i.type === 'selector')!.value).toBe('.ad');
  });
});

describe('removeBlockedItem', () => {
  it('removes domain by type', async () => {
    await addDomain('a.com');
    await addDomain('b.com');
    await removeBlockedItem('domain', 0);
    expect((await get()).urls).toEqual(['b.com']);
  });

  it('removes url by type', async () => {
    await addBlockedUrl('https://a.com');
    await removeBlockedItem('url', 0);
    expect((await get()).blockedUrls).toEqual([]);
  });

  it('removes selector by type', async () => {
    await addBlockedSelector('h||.s');
    await removeBlockedItem('selector', 0);
    expect((await get()).blockedSelectors).toEqual([]);
  });
});

describe('addCustomEngine', () => {
  it('adds a custom engine', async () => {
    await addCustomEngine({ name: 'My', hostname: 'my.com', containerSelector: '#r', itemSelector: '.i', linkSelector: 'a[href]' });
    expect((await get()).customEngines).toHaveLength(1);
  });

  it('rejects built-in hostname', async () => {
    await addCustomEngine({ name: 'G', hostname: 'google.com', containerSelector: '#r', itemSelector: '.i', linkSelector: 'a[href]' });
    expect((await get()).customEngines).toEqual([]);
  });

  it('updates existing engine with same hostname', async () => {
    await addCustomEngine({ name: 'M', hostname: 'm.com', containerSelector: '#a', itemSelector: '.a', linkSelector: 'a[href]' });
    await addCustomEngine({ name: 'M', hostname: 'm.com', containerSelector: '#b', itemSelector: '.b', linkSelector: 'a[href]' });
    expect((await get()).customEngines[0].containerSelector).toBe('#b');
  });

  it('keeps multiple templates for same hostname', async () => {
    await addCustomEngine({ name: 'M', hostname: 'm.com', pathnamePattern: '/search', containerSelector: '#a', itemSelector: '.a', linkSelector: 'a[href]' });
    await addCustomEngine({ name: 'M', hostname: 'm.com', pathnamePattern: '/news', containerSelector: '#b', itemSelector: '.b', linkSelector: 'a[href]' });
    expect((await get()).customEngines).toHaveLength(2);
  });

  it('removes by index', async () => {
    await addCustomEngine({ name: 'E', hostname: 'e.com', containerSelector: '#r', itemSelector: '.i', linkSelector: 'a[href]' });
    await removeCustomEngine(0);
    expect((await get()).customEngines).toEqual([]);
  });
});

describe('findMatchingCustomEngine', () => {
  it('prefers pathname-specific config over hostname fallback', () => {
    const exact = {
      name: 'M',
      hostname: 'm.com',
      pathnamePattern: '/search',
      containerSelector: '#search',
      itemSelector: '.item',
      linkSelector: 'a[href]',
    };
    const fallback = {
      name: 'M',
      hostname: 'm.com',
      containerSelector: '#fallback',
      itemSelector: '.fallback',
      linkSelector: 'a[href]',
    };
    const found = findMatchingCustomEngine([fallback, exact], {
      hostname: 'www.m.com',
      pathname: '/search',
    });
    expect(found).toEqual(exact);
  });
});

describe('recordBlock', () => {
  it('increments blockCount', async () => {
    const before = (await get()).blockCount;
    await recordBlock();
    expect((await get()).blockCount).toBe(before + 1);
  });

  it('adds today stats entry', async () => {
    await recordBlock();
    const today = new Date().toISOString().slice(0, 10);
    const entry = (await get()).stats.find(s => s.date === today);
    expect(entry).toBeDefined();
    expect(entry!.count).toBe(1);
  });

  it('accumulates on repeated calls', async () => {
    await recordBlock();
    await recordBlock();
    const today = new Date().toISOString().slice(0, 10);
    const entry = (await get()).stats.find(s => s.date === today);
    expect(entry!.count).toBe(2);
    expect((await get()).blockCount).toBe(2);
  });

  it('keeps at most 30 days', async () => {
    const past = [];
    for (let i = 0; i < 31; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      past.push({ date: d.toISOString().slice(0, 10), count: 1 });
    }
    await fakeBrowser.storage.local.set({
      blocker: { stats: past, blockCount: 31, urls: [], blockedUrls: [], blockedSelectors: [], customEngines: [], enabled: true, blockAds: true },
    });
    await recordBlock();
    expect((await get()).stats.length).toBeLessThanOrEqual(30);
  });
});

describe('incrementBlockCount', () => {
  it('increments without adding stats', async () => {
    const before = (await get()).blockCount;
    await incrementBlockCount();
    expect((await get()).blockCount).toBe(before + 1);
  });
});

describe('toggle settings', () => {
  it('setEnabled', async () => {
    await setEnabled(false);
    expect((await get()).enabled).toBe(false);
    await setEnabled(true);
    expect((await get()).enabled).toBe(true);
  });
});

describe('subscribe', () => {
  it('returns an unsubscribe function', () => {
    const unsub = subscribe(() => {});
    expect(typeof unsub).toBe('function');
    unsub();
  });
});
