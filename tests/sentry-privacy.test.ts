import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('diagnostics privacy boundaries', () => {
  it('does not collect content-page performance or DOM breadcrumbs', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/utils/sentry.ts'), 'utf8');

    expect(source).toContain('tracesSampleRate: 0');
    expect(source).toContain("integration.name !== 'Breadcrumbs'");
    expect(source).toContain('request: _request');
    expect(source).toContain('breadcrumbs: _breadcrumbs');
    expect(source).toContain('contexts: _contexts');
    expect(source).toContain("'[redacted-url]'");
  });

  it('disables website DOM breadcrumbs while retaining page performance measurement', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'web/sentry.client.config.ts'),
      'utf8',
    );

    expect(source).toContain("integration.name !== 'Breadcrumbs'");
    expect(source).toContain('Sentry.browserTracingIntegration');
    expect(source).toContain('query_string: _queryString');
  });
});
