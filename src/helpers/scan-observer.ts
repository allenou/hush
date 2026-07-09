import type { SearchEngineConfig } from './search-engines';
import { normalizeHostname } from './search-engines';

export interface ScanObserverTargetOptions {
  engine: SearchEngineConfig | null;
  blockedSelectors: string[];
  hostname: string;
  searchEngineHosts?: string[];
}

export function hasSelectorRuleForHost(blockedSelectors: string[], hostname: string): boolean {
  const currentHost = normalizeHostname(hostname);
  return blockedSelectors.some((entry) => {
    const sep = entry.indexOf('||');
    if (sep === -1) return false;
    return normalizeHostname(entry.slice(0, sep)) === currentHost;
  });
}

export function getScanObserverTarget(options: ScanObserverTargetOptions): Element | null {
  if (options.engine) return document.body;

  if (options.searchEngineHosts?.some((host) =>
    normalizeHostname(host) === normalizeHostname(options.hostname),
  )) {
    return document.body;
  }

  if (hasSelectorRuleForHost(options.blockedSelectors, options.hostname)) {
    return document.body;
  }

  return null;
}
