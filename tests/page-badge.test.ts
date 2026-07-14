import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fakeBrowser } from 'wxt/testing';
import background from '@/entrypoints/background';
import { updateCollapseBar } from '@/helpers/ui';
import { clearPageMarkerCount } from '@/utils/page-badge';

interface TriggerableEvent {
  trigger: (...args: unknown[]) => Promise<unknown[]>;
}

beforeEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = '';
});

describe('toolbar page badge', () => {
  it('synchronizes the badge after picker add and undo actions', () => {
    const pickerSource = readFileSync(resolve(process.cwd(), 'src/helpers/picker.ts'), 'utf8');
    expect(pickerSource).toContain("import { updateCollapseBar } from './ui'");
    expect(pickerSource.match(/updateCollapseBar\(\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('does not show the cumulative block count globally', async () => {
    await fakeBrowser.storage.local.set({ blocker: { blockCount: 12 } });

    background.main?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await fakeBrowser.action.getBadgeText({})).toBe('');
  });

  it('sets the marker count only for the reporting tab', async () => {
    background.main?.();
    const onMessage = fakeBrowser.runtime.onMessage as unknown as TriggerableEvent;

    await onMessage.trigger(
      { type: 'srb-page-marker-count', count: 3 },
      { tab: { id: 7 } },
    );

    expect(await fakeBrowser.action.getBadgeText({ tabId: 7 })).toBe('3');
    expect(await fakeBrowser.action.getBadgeText({})).toBe('');
  });

  it('clears a tab badge when the tab starts navigating', async () => {
    await fakeBrowser.action.setBadgeText({ tabId: 7, text: '4' });
    background.main?.();
    const onUpdated = fakeBrowser.tabs.onUpdated as unknown as TriggerableEvent;

    await onUpdated.trigger(7, { status: 'loading' }, { id: 7 });

    expect(await fakeBrowser.action.getBadgeText({ tabId: 7 })).toBe('');
  });

  it('reports blocked and ad markers from the current document', async () => {
    const listener = vi.fn();
    fakeBrowser.runtime.onMessage.addListener(listener);
    document.body.innerHTML = `
      <div id="srb-collapse-bar"></div>
      <div class="srb-blocked-badge"></div>
      <div class="srb-ad-badge"></div>
    `;

    updateCollapseBar();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener).toHaveBeenCalledWith(
      { type: 'srb-page-marker-count', count: 2 },
      expect.anything(),
    );
  });

  it('reports zero when marking is disabled', async () => {
    const listener = vi.fn();
    fakeBrowser.runtime.onMessage.addListener(listener);

    clearPageMarkerCount();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener).toHaveBeenCalledWith(
      { type: 'srb-page-marker-count', count: 0 },
      expect.anything(),
    );
  });
});
