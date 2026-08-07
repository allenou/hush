import enChangelog from '../../../CHANGELOG.en.md?raw';
import zhCNChangelog from '../../../CHANGELOG.zh-CN.md?raw';

import type { Locale } from './i18n';

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

function parseChangelog(source: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let entry: ChangelogEntry | undefined;
  let section: ChangelogSection | undefined;

  for (const line of source.split('\n')) {
    const versionMatch = line.match(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})$/);
    if (versionMatch) {
      const nextEntry = {
        version: `v${versionMatch[1]!}`,
        date: versionMatch[2]!,
        sections: [],
      };
      entry = nextEntry;
      entries.push(nextEntry);
      section = undefined;
      continue;
    }

    const sectionMatch = line.match(/^### (.+)$/);
    if (entry && sectionMatch) {
      const nextSection = { title: sectionMatch[1]!, items: [] };
      section = nextSection;
      entry.sections.push(nextSection);
      continue;
    }

    const itemMatch = line.match(/^- (.+)$/);
    if (section && itemMatch) {
      section.items.push(itemMatch[1]!);
    }
  }

  return entries;
}

const changelogs: Record<Locale, ChangelogEntry[]> = {
  en: parseChangelog(enChangelog),
  'zh-CN': parseChangelog(zhCNChangelog),
};

export function getChangelog(locale: Locale): ChangelogEntry[] {
  return changelogs[locale];
}
