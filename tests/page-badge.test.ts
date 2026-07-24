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

let contextMenuClickListener:
  ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void) | undefined;

beforeEach(() => {
  vi.restoreAllMocks();
  fakeBrowser.reset();
  contextMenuClickListener = undefined;
  vi.spyOn(fakeBrowser.contextMenus, 'removeAll').mockImplementation((callback) => {
    callback?.();
    return Promise.resolve();
  });
  vi.spyOn(fakeBrowser.contextMenus, 'create').mockImplementation(() => 'srb-test-menu');
  vi.spyOn(fakeBrowser.contextMenus.onClicked, 'addListener').mockImplementation((listener) => {
    contextMenuClickListener = listener;
  });
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => key);
  document.body.innerHTML = '';
});

describe('toolbar page badge', () => {
  it('shows only the domain action for a blocked homepage target', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    const onMessage = fakeBrowser.runtime.onMessage as unknown as TriggerableEvent;

    await onMessage.trigger(
      {
        type: 'srb-context-domain-state',
        domainBlocked: true,
        urlBlocked: false,
        domainOnly: true,
      },
      { tab: { id: 7 } },
    );

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('srb-block-domain', { title: 'unblockDomain' });
      expect(update).toHaveBeenCalledWith('srb-block-url', {
        title: 'blockUrl',
        visible: false,
      });
    });
  });

  it('hides the entire context menu on guarded pages', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    const onMessage = fakeBrowser.runtime.onMessage as unknown as TriggerableEvent;

    await onMessage.trigger(
      { type: 'srb-context-menu-availability', available: false },
      { tab: { id: 7 } },
    );

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('srb-root', { visible: false });
    });
  });

  it('ignores availability messages from inactive guarded tabs', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    const onMessage = fakeBrowser.runtime.onMessage as unknown as TriggerableEvent;

    await onMessage.trigger(
      { type: 'srb-context-menu-availability', available: false },
      { tab: { id: 7, active: false } },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(update).not.toHaveBeenCalledWith('srb-root', { visible: false });
  });

  it('updates availability before opening a menu after switching tabs', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    const localTab = await fakeBrowser.tabs.create({ url: 'http://localhost:3000/' });
    const externalTab = await fakeBrowser.tabs.create({ url: 'https://example.com/article' });
    background.main?.();
    const onActivated = fakeBrowser.tabs.onActivated as unknown as TriggerableEvent;

    await onActivated.trigger({ tabId: localTab.id, windowId: localTab.windowId });
    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('srb-root', { visible: false });
    });

    await onActivated.trigger({ tabId: externalTab.id, windowId: externalTab.windowId });
    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('srb-root', { visible: true });
    });
  });

  it('shows independent domain and URL actions for a deep link', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    const onMessage = fakeBrowser.runtime.onMessage as unknown as TriggerableEvent;

    await onMessage.trigger(
      {
        type: 'srb-context-domain-state',
        domainBlocked: false,
        urlBlocked: true,
        domainOnly: false,
      },
      { tab: { id: 7 } },
    );

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('srb-block-domain', { title: 'blockDomain' });
      expect(update).toHaveBeenCalledWith('srb-block-url', {
        title: 'unblockUrl',
        visible: true,
      });
    });
  });

  it('updates the same-page menu to unblock immediately after blocking a domain', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    contextMenuClickListener?.({
      menuItemId: 'srb-block-domain',
      editable: false,
      pageUrl: 'https://example.com/article',
    }, { id: 7 });

    await vi.waitFor(async () => {
      const stored = await fakeBrowser.storage.local.get('blocker');
      expect(stored.blocker.urls).toEqual(['example.com']);
      expect(update).toHaveBeenCalledWith('srb-block-domain', { title: 'unblockDomain' });
      expect(update).toHaveBeenCalledWith('srb-block-url', {
        title: 'blockUrl',
        visible: true,
      });
    });
  });

  it('unblocks the matched parent-domain rule from the context menu', async () => {
    await fakeBrowser.storage.local.set({
      blocker: {
        urls: ['example.com'],
        blockSubdomains: true,
      },
    });
    background.main?.();
    contextMenuClickListener?.({
      menuItemId: 'srb-block-domain',
      editable: false,
      linkUrl: 'https://sub.example.com/article',
      pageUrl: 'https://www.google.com/search?q=test',
    }, { id: 7 });

    await vi.waitFor(async () => {
      const stored = await fakeBrowser.storage.local.get('blocker');
      expect(stored.blocker.urls).toEqual([]);
    });
  });

  it('unblocks an exact URL rule from the context menu', async () => {
    await fakeBrowser.storage.local.set({
      blocker: {
        blockedUrls: ['https://example.com/article'],
      },
    });
    background.main?.();
    contextMenuClickListener?.({
      menuItemId: 'srb-block-url',
      editable: false,
      linkUrl: 'https://example.com/article',
      pageUrl: 'https://www.google.com/search?q=test',
    }, { id: 7 });

    await vi.waitFor(async () => {
      const stored = await fakeBrowser.storage.local.get('blocker');
      expect(stored.blocker.blockedUrls).toEqual([]);
    });
  });

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
