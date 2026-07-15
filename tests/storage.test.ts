import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

// ------ Imports ------
import {
  get,
  addDomain, removeDomain,
  addBlockedUrl, removeBlockedUrl,
  addBlockedSelector, removeBlockedSelector, removeBlockedSelectorEntry,
  getAllBlocked, removeBlockedItem,
  addCustomEngine, findMatchingCustomEngine, removeCustomEngine,
  recordBlock, recordSearch, removeSearchRecord, clearSearchHistory, incrementBlockCount,
  setEnabled, setBlockAds, subscribe,
  createStorageBackup, restoreStorageBackup,
} from '@/utils/storage';
import {
  applyBlockedSelectors,
  initBlocker,
  injectBlockButton,
  processItem,
  scanBlockedDomains,
  syncBlockerState,
} from '@/helpers/ad-blocker';
import { formatLocalDateKey } from '@/utils/statistics';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('get / set defaults', () => {
  it('returns default values when storage is empty', async () => {
    const s = await get();
    expect(s.urls).toEqual([]);
    expect(s.blockedUrls).toEqual([]);
    expect(s.rules).toEqual([]);
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
    expect(s.rules).toEqual([
      expect.objectContaining({
        type: 'domain',
        value: 'example.com',
        enabled: true,
        source: 'migration',
        hitCount: 0,
      }),
    ]);
    expect(s.blockCount).toBe(5);
    expect(s.enabled).toBe(false);
  });

  it('removes historical search-engine tracking hosts from domain rankings', async () => {
    await fakeBrowser.storage.local.set({
      blocker: {
        blockedDomainStats: [
          { domain: 'google.com', count: 8 },
          { domain: 'www.baidu.com', count: 5 },
          { domain: 'googleadservices.com', count: 3 },
          { domain: 'merchant.example', count: 2 },
        ],
      },
    });

    expect((await get()).blockedDomainStats).toEqual([
      { domain: 'merchant.example', count: 2 },
    ]);
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

describe('rules compatibility model', () => {
  it('migrates legacy domain, URL, and selector arrays into rules', async () => {
    await fakeBrowser.storage.local.set({
      blocker: {
        urls: ['example.com'],
        blockedUrls: ['https://spam.test/page'],
        blockedSelectors: ['google.com||.ad-result'],
      },
    });

    const s = await get();

    expect(s.rules).toEqual([
      expect.objectContaining({
        id: 'domain:example.com',
        type: 'domain',
        value: 'example.com',
        enabled: true,
        source: 'migration',
        hitCount: 0,
      }),
      expect.objectContaining({
        id: 'url:https%3A%2F%2Fspam.test%2Fpage',
        type: 'url',
        value: 'https://spam.test/page',
        enabled: true,
        source: 'migration',
        hitCount: 0,
      }),
      expect.objectContaining({
        id: 'selector:google.com:.ad-result',
        type: 'selector',
        scope: 'google.com',
        value: '.ad-result',
        enabled: true,
        source: 'migration',
        hitCount: 0,
      }),
    ]);
  });

  it('keeps rules and compatibility arrays in sync when adding items', async () => {
    await addDomain('example.com');
    await addBlockedUrl('https://example.com/page');
    await addBlockedSelector('google.com||.ad-result');

    const s = await get();

    expect(s.urls).toEqual(['example.com']);
    expect(s.blockedUrls).toEqual(['https://example.com/page']);
    expect(s.blockedSelectors).toEqual(['google.com||.ad-result']);
    expect(s.rules).toEqual([
      expect.objectContaining({ type: 'domain', value: 'example.com', source: 'manual' }),
      expect.objectContaining({ type: 'url', value: 'https://example.com/page', source: 'manual' }),
      expect.objectContaining({ type: 'selector', scope: 'google.com', value: '.ad-result', source: 'picker' }),
    ]);
  });

  it('keeps rules and compatibility arrays in sync when removing items', async () => {
    await addDomain('a.com');
    await addDomain('b.com');
    await addBlockedUrl('https://a.com/page');
    await addBlockedSelector('google.com||.ad-result');

    await removeDomain(0);
    await removeBlockedUrl(0);
    await removeBlockedSelector(0);

    const s = await get();

    expect(s.urls).toEqual(['b.com']);
    expect(s.blockedUrls).toEqual([]);
    expect(s.blockedSelectors).toEqual([]);
    expect(s.rules).toEqual([
      expect.objectContaining({ type: 'domain', value: 'b.com' }),
    ]);
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
    await addBlockedSelector('google.com||.ad');
    const items = await getAllBlocked();
    expect(items).toHaveLength(3);
    expect(items.find(i => i.type === 'domain')!.value).toBe('ex.com');
    expect(items.find(i => i.type === 'url')!.value).toBe('https://ex.com/p');
    expect(items.find(i => i.type === 'selector')!.value).toBe('.ad');
    expect(items.find(i => i.type === 'selector')!.scope).toBe('google.com');
  });
});

describe('selector rule recovery', () => {
  it('removes the exact selector rule by its compatibility entry', async () => {
    await addBlockedSelector('google.com||.target');
    await removeBlockedSelectorEntry('google.com||.target');
    expect((await get()).blockedSelectors).toEqual([]);
  });

  it('removes an applied selector rule when its badge is clicked', async () => {
    await addBlockedSelector('google.com||.target');
    document.body.innerHTML = '<div class="target">Target</div>';
    initBlocker({
      getHostname: () => 'google.com',
      extractResultUrl: () => '',
    });
    syncBlockerState({
      blockedDomains: [],
      blockedUrls: [],
      blockedSelectors: ['google.com||.target'],
      isEnabled: true,
      blockAds: false,
      blockSubdomains: true,
    }, null);

    applyBlockedSelectors();
    (document.querySelector('.srb-blocked-badge') as HTMLElement).click();

    await vi.waitFor(async () => {
      expect((await get()).blockedSelectors).toEqual([]);
    });
    expect(document.querySelector('.srb-mask, .srb-blocked-badge')).toBeNull();
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
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('increments blockCount', async () => {
    const before = (await get()).blockCount;
    await recordBlock();
    expect((await get()).blockCount).toBe(before + 1);
  });

  it('adds today stats entry', async () => {
    await recordBlock();
    const today = formatLocalDateKey(new Date());
    const entry = (await get()).stats.find(s => s.date === today);
    expect(entry).toBeDefined();
    expect(entry!.count).toBe(1);
  });

  it('records the local calendar date near midnight instead of the UTC date', async () => {
    vi.useFakeTimers();
    vi.stubEnv('TZ', 'Asia/Shanghai');
    vi.setSystemTime(new Date('2026-03-01T00:30:00+08:00'));

    await recordBlock();

    const stats = (await get()).stats;
    expect(stats).toContainEqual({ date: '2026-03-01', count: 1 });
    expect(stats).not.toContainEqual({ date: '2026-02-28', count: 1 });
  });

  it('accumulates on repeated calls', async () => {
    await recordBlock();
    await recordBlock();
    const today = formatLocalDateKey(new Date());
    const entry = (await get()).stats.find(s => s.date === today);
    expect(entry!.count).toBe(2);
    expect((await get()).blockCount).toBe(2);
  });

  it('serializes concurrent statistic updates', async () => {
    await Promise.all([
      recordBlock('domain', 'one.example'),
      recordBlock('domain', 'two.example'),
    ]);

    const storage = await get();
    expect(storage.blockCount).toBe(2);
    expect(storage.domainBlockCount).toBe(2);
    expect(storage.blockedDomainStats).toEqual(expect.arrayContaining([
      { domain: 'one.example', count: 1 },
      { domain: 'two.example', count: 1 },
    ]));
  });

  it('records daily ad, target-domain, subdomain, and other breakdowns', async () => {
    await recordBlock('ad', 'ads.example');
    await recordBlock('domain', 'example.com', 'target');
    await recordBlock('domain', 'news.example.com', 'subdomain');
    await recordBlock('url', 'example.com');

    const today = formatLocalDateKey(new Date());
    const entry = (await get()).stats.find((item) => item.date === today);
    expect(entry).toMatchObject({
      count: 4,
      adCount: 1,
      targetDomainCount: 1,
      subdomainCount: 1,
      otherCount: 1,
    });
  });

  it('keeps at most 365 days', async () => {
    const past = [];
    for (let i = 0; i < 366; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      past.push({ date: formatLocalDateKey(d), count: 1 });
    }
    await fakeBrowser.storage.local.set({
      blocker: { stats: past, blockCount: 366, urls: [], blockedUrls: [], blockedSelectors: [], customEngines: [], enabled: true, blockAds: true },
    });
    await recordBlock();
    const storage = await get();
    expect(storage.stats.length).toBeLessThanOrEqual(365);
    expect(storage.stats.some((item) => item.date === past.at(-1)?.date)).toBe(false);
  });
});

describe('manual result block statistics', () => {
  async function clickInjectedBlockOption(href: string): Promise<void> {
    initBlocker({
      getHostname: () => 'google.com',
      extractResultUrl: () => href,
    });
    syncBlockerState({
      blockedDomains: [],
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: true,
      blockAds: true,
      blockSubdomains: true,
    }, null);

    const item = document.createElement('div');
    document.body.appendChild(item);
    injectBlockButton(item, href);
    item.querySelector<HTMLButtonElement>('.srb-block-btn')!.click();
    item.querySelector<HTMLButtonElement>('.srb-opt')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('records root-result manual blocks as domain blocks, not ads', async () => {
    await clickInjectedBlockOption('https://example.com/');

    const s = await get();

    expect(s.urls).toEqual(['example.com']);
    expect(s.adBlockCount).toBe(0);
    expect(s.domainBlockCount).toBe(1);
  });

  it('records deep-link manual blocks without incrementing ad count', async () => {
    await clickInjectedBlockOption('https://example.com/page');

    const s = await get();

    expect(s.blockedUrls).toEqual(['https://example.com/page']);
    expect(s.adBlockCount).toBe(0);
    expect(s.domainBlockCount).toBe(0);
    expect(s.blockCount).toBe(1);
  });
});

describe('result domain matching', () => {
  function makeEngine() {
    return {
      name: 'Google',
      hostname: 'google.com',
      containerSelector: '#results',
      itemSelector: '.result',
      linkSelector: 'a[href]',
    };
  }

  function syncForDomains(blockedDomains: string[]): void {
    syncBlockerState({
      blockedDomains,
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: true,
      blockAds: false,
      blockSubdomains: true,
    }, makeEngine());
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    initBlocker({
      getHostname: () => 'google.com',
      extractResultUrl: () => 'https://sub.example.com/page',
    });
  });

  it('upgrades an already processed result when a later domain rule matches it', () => {
    const item = document.createElement('div');
    item.innerHTML = '<a href="https://sub.example.com/page">Example</a>';
    document.body.appendChild(item);

    syncForDomains([]);
    processItem(item);

    expect(item.querySelector('.srb-block-btn')).toBeTruthy();
    expect(item.querySelector('.srb-blocked-badge')).toBeNull();

    syncForDomains(['example.com']);
    processItem(item);

    expect(item.querySelector('.srb-block-btn')).toBeNull();
    expect(item.querySelector('.srb-blocked-badge')).toBeTruthy();
  });

  it('finds a blocked domain in any attribute of any link before locating its content block', () => {
    initBlocker({
      getHostname: () => 'so.com',
      extractResultUrl: () => '',
    });
    syncBlockerState({
      blockedDomains: ['csdn.net'],
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: true,
      blockAds: false,
      blockSubdomains: true,
    }, null);
    document.body.innerHTML = `
      <ul id="results">
        <li class="res-list">
          <h3><a href="https://www.so.com/link?m=opaque" custom-target="https://blog.csdn.net/post/1">CSDN</a></h3>
          <p>一段足够长的搜索结果摘要，用于表示完整的内容块。</p>
          <ul>
            <li id="nested-result">
              <a arbitrary-url="https://download.csdn.net/file/1">嵌套的 CSDN 下载链接</a>
              <span>该子项应由外层结果统一屏蔽。</span>
            </li>
          </ul>
        </li>
        <li class="res-list">
          <h3><a href="https://example.com/">Example</a></h3>
          <p>另一个不应该被域名规则标记的搜索结果。</p>
        </li>
      </ul>
    `;

    scanBlockedDomains();

    const items = document.querySelectorAll('li.res-list');
    expect(items[0].querySelector('.srb-blocked-badge')).toBeTruthy();
    expect(document.getElementById('nested-result')?.hasAttribute('data-srb-domain-blocked')).toBe(false);
    expect(items[1].querySelector('.srb-blocked-badge')).toBeNull();
  });

  it('does not block a search link only because its query text contains a blocked domain', () => {
    initBlocker({
      getHostname: () => 'so.com',
      extractResultUrl: () => '',
    });
    syncBlockerState({
      blockedDomains: ['csdn.net'],
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: true,
      blockAds: false,
      blockSubdomains: true,
    }, null);
    document.body.innerHTML = `
      <li class="suggestion">
        <a href="https://www.so.com/s?q=blog.csdn.net">搜索 blog.csdn.net</a>
        <span>搜索建议</span>
      </li>
    `;

    scanBlockedDomains();

    expect(document.querySelector('.srb-blocked-badge')).toBeNull();
  });

  it('records each newly rendered blocked result once while enabled', async () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.innerHTML = '<a href="https://sub.example.com/page">First</a>';
    second.innerHTML = '<a href="https://sub.example.com/page">Second</a>';
    document.body.append(first, second);

    syncForDomains(['example.com']);
    processItem(first);
    processItem(second);

    await vi.waitFor(async () => {
      expect((await get()).blockCount).toBe(2);
    });

    processItem(first);
    processItem(second);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const storage = await get();
    expect(storage.blockCount).toBe(2);
    expect(storage.domainBlockCount).toBe(2);
    expect(storage.stats.at(-1)?.count).toBe(2);
    expect(storage.blockedDomainStats).toContainEqual({
      domain: 'sub.example.com',
      count: 2,
    });
  });

  it('records an automatically detected ad once while enabled', async () => {
    initBlocker({
      getHostname: () => 'google.com',
      extractResultUrl: () => 'https://advertiser.example/page',
    });
    const item = document.createElement('div');
    item.className = 'ad';
    item.innerHTML = '<a href="https://advertiser.example/page">Ad</a>';
    document.body.appendChild(item);

    syncBlockerState({
      blockedDomains: [],
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: true,
      blockAds: true,
      blockSubdomains: true,
    }, makeEngine());
    processItem(item);

    await vi.waitFor(async () => {
      expect((await get()).adBlockCount).toBe(1);
    });

    processItem(item);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const storage = await get();
    expect(storage.adBlockCount).toBe(1);
    expect(storage.blockedDomainStats).toContainEqual({
      domain: 'advertiser.example',
      count: 1,
    });
  });

  it('does not rank an opaque search-engine tracking domain as an advertiser', async () => {
    initBlocker({
      getHostname: () => 'google.com',
      extractResultUrl: () => 'https://www.google.com/aclk?opaque=1',
    });
    const item = document.createElement('div');
    item.className = 'ad';
    item.innerHTML = '<a href="https://www.google.com/aclk?opaque=1">Ad</a>';
    document.body.appendChild(item);

    syncBlockerState({
      blockedDomains: [],
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: true,
      blockAds: true,
      blockSubdomains: true,
    }, makeEngine());
    processItem(item);

    await vi.waitFor(async () => {
      expect((await get()).adBlockCount).toBe(1);
    });

    expect((await get()).blockedDomainStats).toEqual([]);
  });

  it('does not record blocked results while disabled', async () => {
    const item = document.createElement('div');
    item.innerHTML = '<a href="https://sub.example.com/page">Disabled</a>';
    document.body.appendChild(item);

    syncBlockerState({
      blockedDomains: ['example.com'],
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: false,
      blockAds: true,
      blockSubdomains: true,
    }, makeEngine());
    processItem(item);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((await get()).blockCount).toBe(0);
    expect(item.querySelector('.srb-blocked-badge')).toBeNull();
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

describe('search history mutations', () => {
  it('deduplicates consecutive searches for the same query and engine', async () => {
    await recordSearch('query', 'Google', 'google.com');
    await recordSearch('query', 'Google', 'www.google.com');

    expect((await get()).searchHistory).toHaveLength(1);
  });

  it('removes one record and clears all records', async () => {
    await recordSearch('one', 'Google', 'google.com');
    await recordSearch('two', 'Bing', 'bing.com');

    await removeSearchRecord(0);
    expect((await get()).searchHistory.map((item) => item.query)).toEqual(['one']);

    await clearSearchHistory();
    expect((await get()).searchHistory).toEqual([]);
  });
});

describe('subscribe', () => {
  it('returns an unsubscribe function', () => {
    const unsub = subscribe(() => {});
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('notifies every open content-script subscriber after an options rule change', async () => {
    const firstTab = vi.fn();
    const secondTab = vi.fn();
    const unsubscribeFirst = subscribe(firstTab);
    const unsubscribeSecond = subscribe(secondTab);

    await addDomain('example.com');

    await vi.waitFor(() => {
      expect(firstTab).toHaveBeenCalledWith(expect.objectContaining({ urls: ['example.com'] }));
      expect(secondTab).toHaveBeenCalledWith(expect.objectContaining({ urls: ['example.com'] }));
    });
    unsubscribeFirst();
    unsubscribeSecond();
  });
});

describe('local backup and restore', () => {
  it('creates a versioned backup with normalized storage data', async () => {
    await addDomain('example.com');
    await addBlockedUrl('https://example.com/page');
    await setEnabled(false);

    const backup = await createStorageBackup();

    expect(backup.app).toBe('Hush');
    expect(backup.version).toBe(1);
    expect(new Date(backup.exportedAt).toString()).not.toBe('Invalid Date');
    expect(backup.data.enabled).toBe(false);
    expect(backup.data.urls).toEqual(['example.com']);
    expect(backup.data.blockedUrls).toEqual(['https://example.com/page']);
    expect(backup.data.rules).toEqual([
      expect.objectContaining({ type: 'domain', value: 'example.com' }),
      expect.objectContaining({ type: 'url', value: 'https://example.com/page' }),
    ]);
  });

  it('restores a backup by replacing current local storage', async () => {
    await addDomain('before.com');
    const backup = await createStorageBackup();

    await addDomain('after.com');
    await setEnabled(false);

    const restored = await restoreStorageBackup(backup);

    expect(restored.urls).toEqual(['before.com']);
    expect(restored.enabled).toBe(true);
    expect((await get()).urls).toEqual(['before.com']);
  });

  it('restores legacy SearchKit backups after the Hush rename', async () => {
    const backup = await createStorageBackup();
    const restored = await restoreStorageBackup({ ...backup, app: 'SearchKit' });

    expect(restored).toEqual(backup.data);
  });

  it('rejects invalid backup data', async () => {
    await expect(restoreStorageBackup({ app: 'Other', version: 1, data: {} }))
      .rejects.toThrow('Invalid Hush backup');
  });

  it.each([
    { urls: 'example.com' },
    { searchHistory: {} },
    { stats: '2026-07-13' },
    { rules: [{ type: 'domain', value: 123 }] },
    { customEngines: [{ name: 'Broken', hostname: 'example.com' }] },
  ])('rejects malformed backup data %#', async (data) => {
    await expect(restoreStorageBackup({
      app: 'Hush',
      version: 1,
      data,
    })).rejects.toThrow('Invalid Hush backup');
  });
});

describe('concurrent storage mutations', () => {
  it('retains block, history, and setting changes started together', async () => {
    await Promise.all([
      recordBlock('domain', 'example.com'),
      recordSearch('query', 'Google', 'google.com'),
      setBlockAds(false),
    ]);

    const state = await get();
    expect(state.blockCount).toBe(1);
    expect(state.searchHistory).toHaveLength(1);
    expect(state.blockAds).toBe(false);
  });
});
