import { readFileSync, readdirSync, statSync } from 'node:fs';
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
  'adBlockDesc',
  'subdomainDesc',
  'recordSearchDesc',
  'backupDesc',
  'backupImportConfirm',
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
