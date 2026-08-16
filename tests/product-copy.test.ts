import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const removedKeys = [
  'dashboardSubtitle',
  'blockTrendDesc',
  'breakdownDesc',
  'topDomainsDesc',
  'rulesDesc',
  'searchHistoryDesc',
  'matchingDesc',
  'searchRecordDesc',
  'languageDesc',
  'addRuleDesc',
];

const keptKeys = [
  'noRulesYetDesc',
  'noMatchDesc',
  'noHistoryDesc',
  'subdomainDesc',
  'recordSearchDesc',
  'backupImportConfirm',
  'clearAllDataDesc',
  'clearAllDataConfirm',
  'resetPageHandlingDesc',
  'resetPageHandlingConfirm',
  'hintDomainUrl',
  'errorDuplicateUrl',
  'errorDuplicateDomain',
  'errorInvalidInput',
  'chartTrendAria',
  'openSettings',
];

function collectSourcePaths(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) return collectSourcePaths(path);
    return /\.(svelte|ts)$/.test(name) ? [path] : [];
  });
}

const sourcePaths = collectSourcePaths(resolve(process.cwd(), 'src'));

describe('product copy', () => {
  it('keeps local data-processing claims explicit', () => {
    const privacyCopy = readFileSync(resolve(process.cwd(), 'web/src/locales/en.json'), 'utf8');

    expect(privacyCopy).toContain('search queries');
    expect(privacyCopy).toContain('inside your browser');
    expect(privacyCopy).toContain('DOM');
    expect(privacyCopy).toContain('contextMenus');
    expect(privacyCopy).toContain('tsdino@outlook.com');
    expect(privacyCopy).not.toContain('supported-engine detection settings');
    expect(privacyCopy.toLowerCase()).not.toContain('backup');
  });

  it('keeps the website release notes within the shipped feature set', () => {
    const englishSiteCopy = readFileSync(resolve(process.cwd(), 'web/src/locales/en.json'), 'utf8');
    const chineseSiteCopy = readFileSync(resolve(process.cwd(), 'web/src/locales/zh-CN.json'), 'utf8');

    expect(englishSiteCopy).not.toContain('save configurations for custom search engines');
    expect(chineseSiteCopy).not.toContain('保存自定义搜索引擎配置');
    expect(englishSiteCopy).toContain('"getHush": "Get it for Edge"');
    expect(chineseSiteCopy).toContain('"getHush": "在 Edge 上获取"');
    expect(englishSiteCopy).toContain('"viewSource": "View source"');
    expect(chineseSiteCopy).toContain('"viewSource": "查看源代码"');
    expect(englishSiteCopy).toContain('supported search page');
    expect(chineseSiteCopy).toContain('支持的搜索页面');
    expect(readFileSync(resolve(process.cwd(), 'web/src/components/HomePage.astro'), 'utf8'))
      .toContain('https://microsoftedge.microsoft.com/addons/detail/hchngjlgnmfncglllbjpdgnhaglajemn');
    expect(englishSiteCopy.toLowerCase()).not.toContain('backup');
    expect(chineseSiteCopy).not.toContain('备份');
  });

  it('does not ship changelog pages in the product website', () => {
    expect(existsSync(resolve(process.cwd(), 'web/src/components/ChangelogPage.astro'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'web/src/utils/changelog.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'web/src/pages/changelog/index.astro'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'web/src/pages/zh/changelog/index.astro'))).toBe(false);

    const englishSiteCopy = readFileSync(resolve(process.cwd(), 'web/src/locales/en.json'), 'utf8');
    const chineseSiteCopy = readFileSync(resolve(process.cwd(), 'web/src/locales/zh-CN.json'), 'utf8');
    expect(englishSiteCopy.toLowerCase()).not.toContain('changelog');
    expect(chineseSiteCopy).not.toContain('更新日志');
  });

  it('keeps decorative website demos out of keyboard focus', () => {
    const searchDemoSource = readFileSync(
      resolve(process.cwd(), 'web/src/components/SearchDemo.astro'),
      'utf8',
    );
    const homePageSource = readFileSync(
      resolve(process.cwd(), 'web/src/components/HomePage.astro'),
      'utf8',
    );

    expect(searchDemoSource).toContain('<div class="search-demo" aria-hidden="true">');
    expect(searchDemoSource).not.toContain('<button');
    expect(homePageSource).toContain('<span class="feature-context-control">');
    expect(homePageSource).toContain('<span class="journey-context-control">');
    expect(homePageSource).toContain('<span class="journey-show-control">');
    expect(homePageSource).not.toMatch(/<button[^>]+class="(?:feature-context-control|journey-context-control|journey-show-control)"/);
  });

  it('removes copy already expressed by the interface', () => {
    const sources = sourcePaths
      .map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'))
      .join('\n');

    for (const key of removedKeys) {
      expect(sources).not.toMatch(new RegExp(`t\\(['\"]${key}['\"]`));
    }
    for (const key of keptKeys) {
      expect(sources).toMatch(new RegExp(`t\\(['\"]${key}['\"]`));
    }
  });

  it.each(['zh_CN', 'en'])('removes unused %s locale keys', (locale) => {
    const messages = JSON.parse(readFileSync(
      resolve(process.cwd(), `public/_locales/${locale}/messages.json`),
      'utf8',
    )) as Record<string, { message: string }>;

    for (const key of removedKeys) {
      expect(messages).not.toHaveProperty(key);
    }
    for (const key of keptKeys) {
      expect(messages).toHaveProperty(key);
    }
    expect(messages).toHaveProperty('perDayUnit');
  });
});
