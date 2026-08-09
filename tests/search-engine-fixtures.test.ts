import { beforeEach, describe, expect, it } from 'vitest';
import {
  detectBuiltInSearchResults,
  type SearchEngineConfig,
} from '@/helpers/search-engines';
import {
  initBlocker,
  scanResults,
  syncBlockerState,
} from '@/helpers/ad-blocker';
import { extractResultUrl } from '@/utils/url';

interface EngineFixture {
  name: string;
  engineName?: string;
  url: string;
  html: string;
}

const fixtures: EngineFixture[] = [
  {
    name: 'Google',
    url: 'https://www.google.com/search?q=hush',
    html: '<div id="search"><div class="g"><a href="https://blocked.example/a">A</a></div><div class="g"><a href="https://blocked.example/b">B</a></div></div>',
  },
  {
    name: 'Google Hong Kong alias',
    engineName: 'Google',
    url: 'https://www.google.com.hk/search?q=hush',
    html: '<div id="search"><div class="g"><a href="https://blocked.example/a">A</a></div><div class="g"><a href="https://blocked.example/b">B</a></div></div>',
  },
  {
    name: 'Baidu',
    url: 'https://www.baidu.com/s?wd=hush',
    html: '<div id="content_left"><div class="result"><a href="https://blocked.example/a">A</a></div><div class="result-op"><a href="https://blocked.example/b">B</a></div></div>',
  },
  {
    name: 'Bing',
    url: 'https://www.bing.com/search?q=hush',
    html: '<ol id="b_results"><li class="b_algo"><a href="https://blocked.example/a">A</a></li><li class="b_algo"><a href="https://blocked.example/b">B</a></li></ol>',
  },
  {
    name: 'Bing China alias',
    engineName: 'Bing',
    url: 'https://cn.bing.com/search?q=hush',
    html: '<ol id="b_results"><li class="b_algo"><a href="https://blocked.example/a">A</a></li><li class="b_algo"><a href="https://blocked.example/b">B</a></li></ol>',
  },
  {
    name: '360搜索',
    url: 'https://www.so.com/s?q=hush',
    html: '<main id="main"><div class="res-list"><a href="https://blocked.example/a">A</a></div><div class="res-list"><a href="https://blocked.example/b">B</a></div></main>',
  },
  {
    name: '搜狗搜索',
    url: 'https://www.sogou.com/web?query=hush',
    html: '<main id="main"><div class="vrwrap"><a href="https://blocked.example/a">A</a></div><div class="vrwrap"><a href="https://blocked.example/b">B</a></div></main>',
  },
  {
    name: 'Yahoo!',
    url: 'https://search.yahoo.com/search?p=hush',
    html: '<div id="web"><div class="algo-sr"><h3><a href="https://blocked.example/a">A</a></h3></div><div class="algo"><h3><a href="https://blocked.example/b">B</a></h3></div></div>',
  },
  {
    name: 'Yahoo Canada alias',
    engineName: 'Yahoo!',
    url: 'https://ca.search.yahoo.com/search?p=hush',
    html: '<div id="web"><div class="algo-sr"><h3><a href="https://blocked.example/a">A</a></h3></div><div class="algo"><h3><a href="https://blocked.example/b">B</a></h3></div></div>',
  },
  {
    name: 'Yandex',
    url: 'https://yandex.com/search/?text=hush',
    html: '<ol id="search-result"><li class="serp-item"><h2><a href="https://blocked.example/a">A</a></h2></li><li class="serp-item"><h2><a href="https://blocked.example/b">B</a></h2></li></ol>',
  },
  {
    name: 'Yandex Kazakhstan alias',
    engineName: 'Yandex',
    url: 'https://yandex.kz/search/?text=hush',
    html: '<ol id="search-result"><li class="serp-item"><h2><a href="https://blocked.example/a">A</a></h2></li><li class="serp-item"><h2><a href="https://blocked.example/b">B</a></h2></li></ol>',
  },
  {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=hush',
    html: '<section data-testid="mainline"><article data-testid="result"><h2><a data-testid="result-title-a" href="https://blocked.example/a">A</a></h2></article><article data-testid="result"><h2><a data-testid="result-title-a" href="https://blocked.example/b">B</a></h2></article></section>',
  },
  {
    name: 'DuckDuckGo start alias',
    engineName: 'DuckDuckGo',
    url: 'https://start.duckduckgo.com/?q=hush',
    html: '<section data-testid="mainline"><article data-testid="result"><h2><a data-testid="result-title-a" href="https://blocked.example/a">A</a></h2></article><article data-testid="result"><h2><a data-testid="result-title-a" href="https://blocked.example/b">B</a></h2></article></section>',
  },
];

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('search-engine DOM fixtures', () => {
  it.each(fixtures)('$name detects and marks representative results', ({ name, engineName = name, url, html }) => {
    document.body.innerHTML = html;
    const engine = detectBuiltInSearchResults(url);

    expect(engine).toEqual(expect.objectContaining({ name: engineName }));
    const detected = engine as SearchEngineConfig;
    expect(document.querySelectorAll(
      `${detected.containerSelector} ${detected.itemSelector}`,
    )).toHaveLength(2);

    initBlocker({
      getHostname: () => new URL(url).hostname,
      extractResultUrl,
    });
    syncBlockerState({
      blockedDomains: ['blocked.example'],
      blockedUrls: [],
      blockedSelectors: [],
      isEnabled: true,
      blockAds: false,
      blockSubdomains: true,
    }, detected);
    scanResults(detected);

    expect(document.querySelectorAll('.srb-blocked-badge')).toHaveLength(2);
    expect(document.querySelectorAll('[data-srb-target-url]')).toHaveLength(2);
  });
});
