import { storage } from 'wxt/utils/storage';
import type { ExtensionStorage } from '@/utils/storage';

export type TemporaryBlockTarget = 'domain' | 'url' | 'ad' | 'selector';

export type TemporaryBlockingOverrides = Partial<Record<TemporaryBlockTarget, boolean>>;

const temporaryBlockingItem = storage.defineItem<TemporaryBlockingOverrides>(
  'local:temporaryBlocker',
  { fallback: {} },
);

function normalizeTemporaryBlocking(
  value: TemporaryBlockingOverrides | null | undefined,
): TemporaryBlockingOverrides {
  const normalized: TemporaryBlockingOverrides = {};
  for (const target of ['domain', 'url', 'ad', 'selector'] as const) {
    if (typeof value?.[target] === 'boolean') normalized[target] = value[target];
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
  const current = await getTemporaryBlocking();
  const next = { ...current, [target]: enabled };
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
  if (typeof temporary[target] === 'boolean') return temporary[target];
  if (target === 'ad') return persistent.blockAds;
  if (target === 'domain') return persistent.blockDomains;
  if (target === 'url') return persistent.blockUrls;
  return persistent.blockSelectors;
}
