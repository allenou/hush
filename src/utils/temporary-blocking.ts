import { storage } from 'wxt/utils/storage';
import type { ExtensionStorage } from '@/utils/storage';

export type TemporaryBlockTarget = 'domain' | 'url' | 'ad' | 'selector';
export type TemporaryHandlingMode = 'mark' | 'hide' | 'off';

export type TemporaryBlockingOverrides = Partial<
  Record<TemporaryBlockTarget, TemporaryHandlingMode>
>;

type StoredTemporaryBlockingOverrides = Partial<
  Record<TemporaryBlockTarget, TemporaryHandlingMode | boolean>
>;

const temporaryBlockingItem = storage.defineItem<StoredTemporaryBlockingOverrides>(
  'local:temporaryBlocker',
  { fallback: {} },
);

function normalizeTemporaryBlocking(
  value: StoredTemporaryBlockingOverrides | null | undefined,
): TemporaryBlockingOverrides {
  const normalized: TemporaryBlockingOverrides = {};
  for (const target of ['domain', 'url', 'ad', 'selector'] as const) {
    const mode = value?.[target];
    if (mode === 'mark' || mode === 'hide' || mode === 'off') {
      normalized[target] = mode;
    } else if (typeof mode === 'boolean') {
      // 兼容旧版本写入的临时开关值。
      normalized[target] = mode ? 'mark' : 'off';
    }
  }
  return normalized;
}

export async function getTemporaryBlocking(): Promise<TemporaryBlockingOverrides> {
  try {
    return normalizeTemporaryBlocking(await temporaryBlockingItem.getValue());
  } catch {
    return {};
  }
}

export async function setTemporaryBlockEnabled(
  target: TemporaryBlockTarget,
  enabled: boolean,
): Promise<TemporaryBlockingOverrides> {
  return setTemporaryHandlingMode(target, enabled ? 'mark' : 'off');
}

export async function setTemporaryHandlingMode(
  target: TemporaryBlockTarget,
  mode: TemporaryHandlingMode,
): Promise<TemporaryBlockingOverrides> {
  const current = await getTemporaryBlocking();
  const next = { ...current, [target]: mode };
  await temporaryBlockingItem.setValue(next);
  return next;
}

export async function clearTemporaryBlocking(): Promise<void> {
  await temporaryBlockingItem.removeValue();
}

export function subscribeTemporaryBlocking(
  listener: (value: TemporaryBlockingOverrides) => void,
): () => void {
  return temporaryBlockingItem.watch((value) => {
    listener(normalizeTemporaryBlocking(value));
  });
}

export function isBlockTargetEnabled(
  target: TemporaryBlockTarget,
  persistent: Pick<
    ExtensionStorage,
    'blockAds' | 'blockDomains' | 'blockUrls' | 'blockSelectors'
  >,
  temporary: TemporaryBlockingOverrides,
): boolean {
  if (temporary[target]) return temporary[target] !== 'off';
  if (target === 'ad') return persistent.blockAds;
  if (target === 'domain') return persistent.blockDomains;
  if (target === 'url') return persistent.blockUrls;
  return persistent.blockSelectors;
}

type PersistentHandlingSettings = Pick<
  ExtensionStorage,
  | 'blockAds'
  | 'blockDomains'
  | 'blockUrls'
  | 'blockSelectors'
  | 'adDisplayMode'
  | 'domainDisplayMode'
  | 'urlDisplayMode'
  | 'selectorDisplayMode'
>;

export function getEffectiveHandlingMode(
  target: TemporaryBlockTarget,
  persistent: PersistentHandlingSettings,
  temporary: TemporaryBlockingOverrides,
): TemporaryHandlingMode {
  const temporaryMode = temporary[target];
  if (temporaryMode) return temporaryMode;
  if (!isBlockTargetEnabled(target, persistent, temporary)) return 'off';
  if (target === 'ad') return persistent.adDisplayMode;
  if (target === 'domain') return persistent.domainDisplayMode;
  if (target === 'url') return persistent.urlDisplayMode;
  return persistent.selectorDisplayMode;
}
