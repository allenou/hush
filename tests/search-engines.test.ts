import { describe, it, expect } from 'vitest';
import {
  buildPathnamePattern,
  BUILT_IN_ENGINES,
  detectBuiltInSearchResults,
  detectSearchEngine,
  extractSearchQuery,
  getSearchEngineRule,
  getSearchUrl,
  isSearchEngine,
  matchEngineConfig,
} from '@/helpers/search-engines';
import {
  BING_SEARCH_ALIASES,
  DUCKDUCKGO_SEARCH_ALIASES,
  GOOGLE_SEARCH_ALIASES,
  SEARCH_ENGINE_HOSTS,
  SEARCH_ENGINE_MATCH_PATTERNS,
  YAHOO_SEARCH_ALIASES,
  YANDEX_SEARCH_ALIASES,
  isSupportedSearchHostname,
  normalizeSearchHostname,
} from '@/constants/search-hosts';

const SEARCH_ENGINE_ALIAS_CASES = [
  ...GOOGLE_SEARCH_ALIASES.map((alias) => [alias, 'google.com', 'q'] as const),
  ...BING_SEARCH_ALIASES.map((alias) => [alias, 'bing.com', 'q'] as const),
  ...YAHOO_SEARCH_ALIASES.map((alias) => [alias, 'search.yahoo.com', 'p'] as const),
  ...YANDEX_SEARCH_ALIASES.map((alias) => [alias, 'yandex.com', 'text'] as const),
  ...DUCKDUCKGO_SEARCH_ALIASES.map((alias) => [alias, 'duckduckgo.com', 'q'] as const),
];

describe('supported search hostnames', () => {
  it('treats www and the root host as the same supported engine', () => {
    expect(normalizeSearchHostname('www.google.com')).toBe('google.com');
    expect(isSupportedSearchHostname('google.com')).toBe(true);
    expect(isSupportedSearchHostname('www.google.com')).toBe(true);
    expect(isSupportedSearchHostname('sogou.com')).toBe(true);
    expect(isSupportedSearchHostname('www.sogou.com')).toBe(true);
    expect(isSupportedSearchHostname('search.yahoo.com')).toBe(true);
    expect(isSupportedSearchHostname('www.yandex.ru')).toBe(true);
    expect(isSupportedSearchHostname('duckduckgo.com')).toBe(true);
  });

  it.each(SEARCH_ENGINE_ALIAS_CASES)(
    'supports desktop alias %s as %s',
    (alias) => expect(isSupportedSearchHostname(alias)).toBe(true),
  );

  it.each([
    'm.baidu.com',
    'www.cn.bing.com',
    'wap.sogou.com',
    'www.search.yahoo.com',
    'www.ca.search.yahoo.com',
    'sub.duckduckgo.com',
    'html.duckduckgo.com',
    'lite.duckduckgo.com',
    'search.yahoo.co.jp',
    'example.com',
  ])(
    'rejects non-enumerated hostname %s',
    (hostname) => expect(isSupportedSearchHostname(hostname)).toBe(false),
  );

  it('exports exact Manifest match patterns for every supported desktop host', () => {
    for (const hostname of SEARCH_ENGINE_HOSTS) {
      expect(SEARCH_ENGINE_MATCH_PATTERNS).toContain(`*://${hostname}/*`);
    }
    expect(new Set(SEARCH_ENGINE_MATCH_PATTERNS).size).toBe(SEARCH_ENGINE_MATCH_PATTERNS.length);
    expect(SEARCH_ENGINE_MATCH_PATTERNS).toContain('*://www.google.com.hk/*');
    expect(SEARCH_ENGINE_MATCH_PATTERNS).toContain('*://www.yandex.kz/*');
    expect(SEARCH_ENGINE_MATCH_PATTERNS).not.toContain('*://www.cn.bing.com/*');
    expect(SEARCH_ENGINE_MATCH_PATTERNS).not.toContain('*://www.ca.search.yahoo.com/*');
    expect(SEARCH_ENGINE_MATCH_PATTERNS).not.toContain('*://www.start.duckduckgo.com/*');
  });
});

describe('detectSearchEngine', () => {
  it('detects Google from www URL', () => {
    const result = detectSearchEngine('https://www.google.com/search?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Google');
    expect(result!.hostname).toBe('google.com');
  });

  it('detects Google without www', () => {
    const result = detectSearchEngine('https://google.com/search?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Google');
  });

  it('detects Baidu', () => {
    const result = detectSearchEngine('https://www.baidu.com/s?wd=你好');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Baidu');
    expect(result!.hostname).toBe('baidu.com');
  });

  it('detects Bing', () => {
    const result = detectSearchEngine('https://www.bing.com/search?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Bing');
  });

  it.each(SEARCH_ENGINE_ALIAS_CASES)(
    'detects desktop alias %s as canonical engine %s',
    (alias, canonical, queryParameter) => {
      const result = detectSearchEngine(`https://${alias}/search?${queryParameter}=test`);
      expect(result).not.toBeNull();
      expect(result!.hostname).toBe(canonical);
      expect(extractSearchQuery(`https://${alias}/search?${queryParameter}=你好`)).toBe('你好');
    },
  );

  it('detects 360搜索 (so.com)', () => {
    const result = detectSearchEngine('https://www.so.com/s?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('360搜索');
  });

  it('detects 搜狗搜索 (sogou.com)', () => {
    const result = detectSearchEngine('https://www.sogou.com/web?query=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('搜狗搜索');
    expect(result!.hostname).toBe('sogou.com');
  });

  it('detects Yahoo!', () => {
    const result = detectSearchEngine('https://search.yahoo.com/search?p=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Yahoo!');
    expect(result!.hostname).toBe('search.yahoo.com');
  });

  it('detects Yandex on its canonical domain', () => {
    expect(detectSearchEngine('https://yandex.com/search/?text=test')?.name).toBe('Yandex');
  });

  it('detects DuckDuckGo', () => {
    const result = detectSearchEngine('https://duckduckgo.com/?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('DuckDuckGo');
    expect(result!.hostname).toBe('duckduckgo.com');
  });

  it('returns null for unknown search engine', () => {
    const result = detectSearchEngine('https://www.example.com');
    expect(result).toBeNull();
  });

  it('returns null for a non-search URL', () => {
    const result = detectSearchEngine('https://github.com/owner/repo');
    expect(result).toBeNull();
  });

  it('handles URL with path and query', () => {
    const result = detectSearchEngine('https://www.baidu.com/link?url=xxx');
    expect(result).not.toBeNull();
    expect(result!.hostname).toBe('baidu.com');
  });

  it('handles subdomain of known engine', () => {
    // Manifest 仅支持 DuckDuckGo 根域名及 www，不接受任意子域名。
    const result = detectSearchEngine('https://sub.duckduckgo.com/');
    expect(result).toBeNull();
  });

  it('returns null for invalid URL', () => {
    const result = detectSearchEngine('not-a-url');
    expect(result).toBeNull();
  });

  it('is case-insensitive for hostname', () => {
    const result = detectSearchEngine('https://WWW.GOOGLE.COM/search');
    expect(result).not.toBeNull();
    expect(result!.hostname).toBe('google.com');
  });
});

describe('isSearchEngine', () => {
  it('returns true for Google', () => {
    expect(isSearchEngine('https://www.google.com/')).toBe(true);
  });

  it('returns true for Baidu', () => {
    expect(isSearchEngine('https://www.baidu.com/')).toBe(true);
  });

  it('returns true for Sogou', () => {
    expect(isSearchEngine('https://www.sogou.com/web?query=test')).toBe(true);
  });

  it('returns false for unknown site', () => {
    expect(isSearchEngine('https://www.example.com/')).toBe(false);
  });

  it('returns false for invalid URL', () => {
    expect(isSearchEngine('invalid')).toBe(false);
  });

  it('handles www prefix correctly', () => {
    expect(isSearchEngine('https://google.com/')).toBe(true);
  });
});

describe('BUILT_IN_ENGINES', () => {
  it('contains expected engines', () => {
    const hostnames = BUILT_IN_ENGINES.map((e) => e.hostname);
    expect(hostnames).toContain('google.com');
    expect(hostnames).toContain('baidu.com');
    expect(hostnames).toContain('bing.com');
    expect(hostnames).toContain('so.com');
    expect(hostnames).toContain('sogou.com');
    expect(hostnames).toContain('search.yahoo.com');
    expect(hostnames).toContain('yandex.com');
    expect(hostnames).toContain('duckduckgo.com');
  });

  it('has no duplicate hostnames', () => {
    const hostnames = BUILT_IN_ENGINES.map((e) => e.hostname);
    expect(new Set(hostnames).size).toBe(hostnames.length);
  });

  it('has no duplicate names', () => {
    const names = BUILT_IN_ENGINES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all engines have required fields', () => {
    for (const engine of BUILT_IN_ENGINES) {
      expect(engine.name).toBeTruthy();
      expect(engine.hostname).toBeTruthy();
      expect(engine.linkSelector).toContain('a');
    }
  });
});

describe('engine-specific rules', () => {
  it('keeps each engine result selector in its own registry entry', () => {
    expect(getSearchEngineRule('google.com')?.resultSelectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ containerSelector: '#search', itemSelector: '.g' }),
      ]),
    );
    expect(getSearchEngineRule('baidu.com')?.resultSelectors).toEqual([
      expect.objectContaining({ containerSelector: '#content_left' }),
    ]);
    expect(getSearchEngineRule('bing.com')?.resultSelectors).toEqual([
      expect.objectContaining({ containerSelector: '#b_results', itemSelector: '.b_algo' }),
    ]);
    for (const [alias, canonical] of SEARCH_ENGINE_ALIAS_CASES) {
      expect(getSearchEngineRule(alias)?.hostname).toBe(canonical);
    }
    expect(getSearchEngineRule('so.com')?.resultSelectors).toEqual([
      expect.objectContaining({ containerSelector: '#main', itemSelector: '.res-list' }),
    ]);
    expect(getSearchEngineRule('sogou.com')?.resultSelectors).toEqual([
      expect.objectContaining({ containerSelector: '#main', itemSelector: '.vrwrap', linkSelector: 'a' }),
      expect.objectContaining({ containerSelector: '#main', itemSelector: '.rb', linkSelector: 'a' }),
    ]);
    expect(getSearchEngineRule('sogou.com')?.adItemSelectors).toContain('.ad-results');
    expect(getSearchEngineRule('search.yahoo.com')?.resultSelectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ containerSelector: '#web', itemSelector: '.algo-sr, .algo' }),
      ]),
    );
    expect(getSearchEngineRule('yandex.ru')?.resultSelectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ containerSelector: '#search-result', itemSelector: '.serp-item' }),
      ]),
    );
    expect(getSearchEngineRule('duckduckgo.com')?.resultSelectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          containerSelector: 'section[data-testid="mainline"]',
          itemSelector: 'article[data-testid="result"]',
        }),
      ]),
    );
  });

  it('does not use another engine result selector', () => {
    document.body.innerHTML = `
      <ol id="b_results">
        <li class="b_algo"><a href="https://a.example">A</a></li>
        <li class="b_algo"><a href="https://b.example">B</a></li>
      </ol>
    `;

    expect(detectBuiltInSearchResults('https://www.google.com/search?q=test')).toBeNull();
    expect(detectBuiltInSearchResults('https://www.bing.com/search?q=test')).toEqual(
      expect.objectContaining({
        name: 'Bing',
        containerSelector: '#b_results',
        itemSelector: '.b_algo',
      }),
    );
  });

  it('uses only the current engine query parameters', () => {
    expect(extractSearchQuery('https://www.baidu.com/s?q=wrong&wd=正确')).toBe('正确');
    expect(extractSearchQuery('https://www.google.com/search?wd=wrong')).toBeNull();
    expect(extractSearchQuery('https://www.sogou.com/web?query=搜狗')).toBe('搜狗');
    expect(extractSearchQuery('https://search.yahoo.com/search?p=雅虎')).toBe('雅虎');
    expect(extractSearchQuery('https://www.yandex.ru/search/?text=яндекс')).toBe('яндекс');
    expect(extractSearchQuery('https://duckduckgo.com/?q=privacy')).toBe('privacy');
  });

  it('delegates search URL creation to the current engine', () => {
    expect(getSearchUrl('baidu.com', '中文 搜索')).toBe(
      'https://www.baidu.com/s?wd=%E4%B8%AD%E6%96%87%20%E6%90%9C%E7%B4%A2',
    );
    expect(getSearchUrl('bing.com', 'test')).toBe('https://www.bing.com/search?q=test');
    expect(getSearchUrl('sogou.com', '中文 搜索')).toBe(
      'https://www.sogou.com/web?query=%E4%B8%AD%E6%96%87%20%E6%90%9C%E7%B4%A2',
    );
    expect(getSearchUrl('search.yahoo.com', 'test')).toBe(
      'https://search.yahoo.com/search?p=test',
    );
    expect(getSearchUrl('yandex.ru', 'test')).toBe(
      'https://yandex.com/search/?text=test',
    );
    expect(getSearchUrl('duckduckgo.com', 'private search')).toBe(
      'https://duckduckgo.com/?q=private%20search',
    );
  });

  it('detects result containers for the three added engines', () => {
    document.body.innerHTML = `
      <div id="web">
        <div class="algo-sr"><h3><a href="https://a.example">A</a></h3></div>
        <div class="algo-sr"><h3><a href="https://b.example">B</a></h3></div>
      </div>
    `;
    expect(detectBuiltInSearchResults('https://search.yahoo.com/search?p=test')).toEqual(
      expect.objectContaining({ name: 'Yahoo!', containerSelector: '#web' }),
    );

    document.body.innerHTML = `
      <ol id="search-result">
        <li class="serp-item"><h2><a href="https://a.example">A</a></h2></li>
        <li class="serp-item"><h2><a href="https://b.example">B</a></h2></li>
      </ol>
    `;
    expect(detectBuiltInSearchResults('https://yandex.ru/search/?text=test')).toEqual(
      expect.objectContaining({ name: 'Yandex', containerSelector: '#search-result' }),
    );

    document.body.innerHTML = `
      <div data-testid="mainline"></div>
      <section data-testid="mainline">
        <article data-testid="result"><h2><a href="https://a.example">A</a></h2></article>
        <article data-testid="result"><h2><a href="https://b.example">B</a></h2></article>
      </section>
    `;
    expect(detectBuiltInSearchResults('https://duckduckgo.com/?q=test')).toEqual(
      expect.objectContaining({
        name: 'DuckDuckGo',
        containerSelector: 'section[data-testid="mainline"]',
        itemSelector: 'article[data-testid="result"]',
      }),
    );
  });

  it('detects Sogou result containers', () => {
    document.body.innerHTML = `
      <main id="main">
        <div class="vrwrap"><h3><a href="https://a.example">A</a></h3></div>
        <div class="vrwrap"><h3><a href="https://b.example">B</a></h3></div>
      </main>
    `;

    expect(detectBuiltInSearchResults('https://www.sogou.com/web?query=test')).toEqual(
      expect.objectContaining({
        name: '搜狗搜索',
        containerSelector: '#main',
        itemSelector: '.vrwrap',
      }),
    );
  });

  it('requires a child ad label for 360 ad candidate containers', () => {
    document.body.innerHTML = `
      <div id="ordinary" class="e-pc-li-131-1"><span>普通搜索结果</span></div>
      <div id="query-highlight" class="e-pc-li-131-1"><em>广告</em><a href="https://example.com">广告相关内容</a></div>
      <div id="advertisement" class="e-pc-li-131-1"><span>广告</span></div>
    `;

    const rule = getSearchEngineRule('so.com')!;
    expect(rule.isAdItem?.(document.querySelector('#ordinary')!)).toBe(false);
    expect(rule.isAdItem?.(document.querySelector('#query-highlight')!)).toBe(false);
    expect(rule.isAdItem?.(document.querySelector('#advertisement')!)).toBe(true);
    expect(rule.findAdContainers?.(document).map((element) => element.id)).toEqual([
      'advertisement',
    ]);
  });

  it('recognizes 360 image ads by their data-log marker', () => {
    document.body.innerHTML = `
      <div id="ordinary" class="inner_left single"><div class="item"><a href="https://example.com">普通结果</a></div></div>
      <div id="image-ad" class="inner_left single">
        <div class="item item_1"><a data-log="img-ad" href="https://www.so.com/s?src=lm">图片广告</a></div>
      </div>
    `;

    const rule = getSearchEngineRule('so.com')!;
    expect(rule.isAdItem?.(document.querySelector('#ordinary')!)).toBe(false);
    expect(rule.isAdItem?.(document.querySelector('#image-ad')!)).toBe(true);
    expect(rule.findAdContainers?.(document).map((element) => element.id)).toEqual(['image-ad']);
  });

  it('finds standalone Sogou ad containers', () => {
    document.body.innerHTML = `
      <div id="ordinary" class="vrwrap">普通搜索结果</div>
      <div id="advertisement" class="ad-results">搜狗广告结果</div>
    `;

    const rule = getSearchEngineRule('sogou.com')!;
    expect(rule.findAdContainers?.(document).map((element) => element.id)).toEqual([
      'advertisement',
    ]);
  });
});

describe('buildPathnamePattern', () => {
  it('normalizes numeric and long token segments', () => {
    expect(buildPathnamePattern('/search/123456/abcdefabcdefabcdef')).toBe('/search/:num/:id');
  });
});

describe('matchEngineConfig', () => {
  it('matches hostname-only config', () => {
    expect(matchEngineConfig({
      name: 'Any',
      hostname: 'example.com',
      containerSelector: '#r',
      itemSelector: '.i',
      linkSelector: 'a[href]',
    }, {
      hostname: 'www.example.com',
      pathname: '/anything',
    })).toBe(true);
  });

  it('matches pathname-specific config after normalization', () => {
    expect(matchEngineConfig({
      name: 'Search',
      hostname: 'example.com',
      pathnamePattern: '/search/:num',
      containerSelector: '#r',
      itemSelector: '.i',
      linkSelector: 'a[href]',
    }, {
      hostname: 'example.com',
      pathname: '/search/42',
    })).toBe(true);
  });
});
