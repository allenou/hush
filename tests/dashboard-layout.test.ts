import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/Dashboard.svelte'),
  'utf8',
);
const rulesSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/RulesTab.svelte'),
  'utf8',
);
const searchHistorySource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/SearchHistoryTab.svelte'),
  'utf8',
);
const desktopStyles = dashboardSource.slice(
  dashboardSource.indexOf('<style>'),
  dashboardSource.indexOf('@media'),
);
const mobileStyles = dashboardSource.slice(
  dashboardSource.indexOf('@media (max-width: 700px)'),
);

describe('Dashboard layout', () => {
  it('keeps the total-blocked and trend cards on standalone rows', () => {
    expect(desktopStyles).toMatch(
      /\.dash-overview-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(desktopStyles).toMatch(
      /\.detail-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s,
    );
    expect(desktopStyles).toMatch(
      /\.trend-card\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s,
    );
    expect(desktopStyles).toMatch(
      /\.dash-kpis\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s,
    );
    expect(mobileStyles).toMatch(
      /\.dash-kpis,\s*\.detail-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
  });

  it('uses neutral statistic cards and a white total-blocked data hub', () => {
    expect(desktopStyles).not.toMatch(/\.kpi-card\.(lime|teal|lavender)/);
    expect(desktopStyles).not.toMatch(/\.kpi-card[^}]*border-top:/s);
    expect(desktopStyles).toMatch(
      /\.dash-hero\s*\{[^}]*background:\s*var\(--srb-surface\);/s,
    );
    expect(desktopStyles).toMatch(/\.dash-hero-metrics\s*\{/);
    expect(desktopStyles).toMatch(/\.dash-hero-watermark\s*\{/);
  });

  it('uses one DOM legend for the block breakdown', () => {
    const breakdownConfigSource = dashboardSource.slice(
      dashboardSource.indexOf('let breakdownConfiguration'),
      dashboardSource.indexOf('let domainsConfiguration'),
    );

    expect(breakdownConfigSource).toMatch(/legend:\s*\{\s*display:\s*false\s*\}/s);
    expect((dashboardSource.match(/class="breakdown-list"/g) ?? [])).toHaveLength(1);
  });

  it('keeps all empty states on transparent backgrounds', () => {
    expect(dashboardSource).not.toContain('background: var(--srb-empty-bg);');
    expect(dashboardSource).not.toMatch(/\.chart-empty-overlay\s*\{[^}]*background:/s);
    expect(rulesSource).not.toContain('background: var(--srb-empty-bg);');
    expect(searchHistorySource).not.toContain('background: var(--srb-empty-bg);');
  });
});
