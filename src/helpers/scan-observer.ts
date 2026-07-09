import type { SearchEngineConfig } from './search-engines';
import { normalizeHostname } from './search-engines';

export interface ScanObserverTargetOptions {
  engine: SearchEngineConfig | null;
  blockedSelectors: string[];
  hostname: string;
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
  if (options.engine) {
    const container = document.querySelector(options.engine.containerSelector);
    if (container) return container;
  }

  if (hasSelectorRuleForHost(options.blockedSelectors, options.hostname)) {
    return document.body;
  }

  return null;
}
