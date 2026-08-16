import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import background from '@/entrypoints/background';
import {
  clearPageMarkerCount,
  countPageMarkerSummary,
  reportPageMarkerCount,
} from '@/utils/page-badge';
import { get } from '@/utils/storage';

interface TriggerableEvent {
  trigger: (...args: unknown[]) => Promise<unknown[]>;
}

interface DynamicContextMenus {
  onShown: {
    addListener(listener: ContextMenuShownListener): void;
  };
  refresh(): Promise<void>;
}

type ContextMenuClickListener = (info: {
  menuItemId: string;
  editable: boolean;
  linkUrl?: string;
  pageUrl?: string;
}, tab?: { id?: number }) => void;
type ContextMenuShownListener = (info: { linkUrl?: string; pageUrl?: string }, tab?: { id?: number }) => void;

let contextMenuClickListener: ContextMenuClickListener | undefined;
let contextMenuShownListener: ContextMenuShownListener | undefined;

const dynamicContextMenus = fakeBrowser.contextMenus as unknown as DynamicContextMenus;

async function getStoredBlocker(): Promise<{ urls: string[]; blockedUrls: string[] }> {
  const stored = await fakeBrowser.storage.local.get('blocker') as {
    blocker: { urls: string[]; blockedUrls: string[] };
  };
  return stored.blocker;
}

beforeEach(() => {
  vi.restoreAllMocks();
  fakeBrowser.reset();
  contextMenuClickListener = undefined;
  contextMenuShownListener = undefined;
  vi.spyOn(fakeBrowser.contextMenus, 'removeAll').mockResolvedValue();
  vi.spyOn(fakeBrowser.contextMenus, 'create').mockImplementation(() => 'hush-test-menu');
  vi.spyOn(fakeBrowser.contextMenus.onClicked, 'addListener').mockImplementation((listener) => {
    contextMenuClickListener = listener as unknown as ContextMenuClickListener;
  });
  dynamicContextMenus.onShown = {
    addListener: vi.fn((listener) => {
      contextMenuShownListener = listener;
    }),
  };
  dynamicContextMenus.refresh = vi.fn(async () => {});
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => key);
  document.body.innerHTML = '';
});

describe('toolbar page badge', () => {
  it('starts when the browser does not provide dynamic context-menu APIs', () => {
    const dynamicMenus = dynamicContextMenus as {
      onShown?: unknown;
      refresh?: unknown;
    };
    const onShown = dynamicMenus.onShown;
    const refresh = dynamicMenus.refresh;
    try {
      dynamicMenus.onShown = undefined;
      dynamicMenus.refresh = undefined;

      expect(() => background.main?.()).not.toThrow();
    } finally {
      dynamicMenus.onShown = onShown;
      dynamicMenus.refresh = refresh;
    }
  });

  it('shows only the picker when opening the menu on search-page background', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    contextMenuShownListener?.({
      pageUrl: 'https://www.google.com/search?q=hush',
    }, { id: 7 });

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('hush-picker', { visible: true });
      expect(update).toHaveBeenCalledWith('hush-block-domain', {
        title: 'blockDomain',
        visible: false,
      });
      expect(update).toHaveBeenCalledWith('hush-block-url', {
        title: 'blockUrl',
        visible: false,
      });
    });
  });

  it('shows rule actions for a search-result link and reflects stored state', async () => {
    await fakeBrowser.storage.local.set({
      blocker: {
        urls: ['example.com'],
        blockedUrls: ['https://example.com/article'],
      },
    });
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    contextMenuShownListener?.({
      pageUrl: 'https://www.google.com/search?q=hush',
      linkUrl: 'https://example.com/article',
    }, { id: 7 });

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('hush-picker', { visible: true });
      expect(update).toHaveBeenCalledWith('hush-block-domain', {
        title: 'unblockDomain',
        visible: true,
      });
      expect(update).toHaveBeenCalledWith('hush-block-url', {
        title: 'unblockUrl',
        visible: true,
      });
    });
  });

  it('shows only the domain action for a homepage target', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    contextMenuShownListener?.({
      pageUrl: 'https://example.com/',
    }, { id: 7 });

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('hush-picker', { visible: false });
      expect(update).toHaveBeenCalledWith('hush-block-domain', {
        title: 'blockDomain',
        visible: true,
      });
      expect(update).toHaveBeenCalledWith('hush-block-url', {
        title: 'blockUrl',
        visible: false,
      });
    });
  });

  it('shows independent domain and URL actions on an ordinary article page', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    contextMenuShownListener?.({
      pageUrl: 'https://example.com/article',
    }, { id: 7 });

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('hush-picker', { visible: false });
      expect(update).toHaveBeenCalledWith('hush-block-domain', {
        title: 'blockDomain',
        visible: true,
      });
      expect(update).toHaveBeenCalledWith('hush-block-url', {
        title: 'blockUrl',
        visible: true,
      });
    });
  });

  it('treats localhost as an ordinary page without a guard content script', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    contextMenuShownListener?.({
      pageUrl: 'http://localhost:3000/article',
    }, { id: 7 });

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('hush-picker', { visible: false });
      expect(update).toHaveBeenCalledWith('hush-block-domain', {
        title: 'blockDomain',
        visible: true,
      });
      expect(update).toHaveBeenCalledWith('hush-block-url', {
        title: 'blockUrl',
        visible: true,
      });
    });
  });

  it('hides every dynamic action for a non-web target and refreshes the menu', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    const refresh = vi.mocked(dynamicContextMenus.refresh);
    background.main?.();
    contextMenuShownListener?.({ pageUrl: 'chrome://extensions/' }, { id: 7 });

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('hush-picker', { visible: false });
      expect(update).toHaveBeenCalledWith('hush-block-domain', {
        title: 'blockDomain',
        visible: false,
      });
      expect(update).toHaveBeenCalledWith('hush-block-url', {
        title: 'blockUrl',
        visible: false,
      });
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the unblock action the next time the menu opens after blocking a domain', async () => {
    const update = vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
    background.main?.();
    contextMenuClickListener?.({
      menuItemId: 'hush-block-domain',
      editable: false,
      pageUrl: 'https://example.com/article',
    }, { id: 7 });

    await vi.waitFor(async () => {
      expect((await getStoredBlocker()).urls).toEqual(['example.com']);
      expect((await get()).blockCount).toBe(0);
    });

    contextMenuShownListener?.({
      pageUrl: 'https://example.com/article',
    }, { id: 7 });

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('hush-block-domain', {
        title: 'unblockDomain',
        visible: true,
      });
      expect(update).toHaveBeenCalledWith('hush-block-url', {
        title: 'blockUrl',
        visible: true,
      });
    });
  });

  it('starts the element picker from the search-page menu', () => {
    const sendMessage = vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockResolvedValue(undefined);
    background.main?.();

    contextMenuClickListener?.({
      menuItemId: 'hush-picker',
      editable: false,
      pageUrl: 'https://www.google.com/search?q=test',
    }, { id: 7 });

    expect(sendMessage).toHaveBeenCalledWith(7, { type: 'hush-start-picker' });
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
      menuItemId: 'hush-block-domain',
      editable: false,
      linkUrl: 'https://sub.example.com/article',
      pageUrl: 'https://www.google.com/search?q=test',
    }, { id: 7 });

    await vi.waitFor(async () => {
      expect((await getStoredBlocker()).urls).toEqual([]);
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
      menuItemId: 'hush-block-url',
      editable: false,
      linkUrl: 'https://example.com/article',
      pageUrl: 'https://www.google.com/search?q=test',
    }, { id: 7 });

    await vi.waitFor(async () => {
      expect((await getStoredBlocker()).blockedUrls).toEqual([]);
    });
  });

  it('synchronizes the badge after picker add and undo actions', () => {
    const pickerSource = readFileSync(resolve(process.cwd(), 'src/helpers/picker.ts'), 'utf8');
    expect(pickerSource).toContain("import { reportPageMarkerCount } from '@/utils/page-badge'");
    expect(pickerSource.match(/reportPageMarkerCount\(\)/g)?.length).toBeGreaterThanOrEqual(2);
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
      { type: 'hush-page-marker-count', count: 3 },
      { tab: { id: 7 } },
    );

    expect(await fakeBrowser.action.getBadgeText({ tabId: 7 })).toBe('3');
    expect(await fakeBrowser.action.getBadgeText({})).toBe('');
  });

  it('uses one content report for both the popup summary and toolbar badge', async () => {
    background.main?.();
    const onMessage = fakeBrowser.runtime.onMessage as unknown as TriggerableEvent;
    const sendMessage = vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockImplementation(
      async (tabId, message) => {
        queueMicrotask(() => {
          void onMessage.trigger({
            type: 'hush-page-marker-count',
            count: 6,
            adCount: 2,
            domainCount: 3,
            urlCount: 1,
            selectorCount: 0,
          }, { tab: { id: tabId } });
        });
        return undefined;
      },
    );

    const summary = await fakeBrowser.runtime.sendMessage({
      type: 'hush-get-page-marker-summary',
      tabId: 7,
    });

    expect(sendMessage).toHaveBeenCalledWith(7, {
      type: 'hush-report-page-marker-summary',
    });
    expect(summary).toEqual({
      count: 6,
      adCount: 2,
      domainCount: 3,
      urlCount: 1,
      selectorCount: 0,
    });
    expect(await fakeBrowser.action.getBadgeText({ tabId: 7 })).toBe('6');
  });

  it('returns the last reported summary when the content script is temporarily unavailable', async () => {
    background.main?.();
    const onMessage = fakeBrowser.runtime.onMessage as unknown as TriggerableEvent;
    await onMessage.trigger({
      type: 'hush-page-marker-count',
      count: 4,
      adCount: 1,
      domainCount: 2,
      urlCount: 1,
      selectorCount: 0,
    }, { tab: { id: 7 } });
    vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockRejectedValue(new Error('No receiver'));

    await expect(fakeBrowser.runtime.sendMessage({
      type: 'hush-get-page-marker-summary',
      tabId: 7,
    })).resolves.toEqual({
      count: 4,
      adCount: 1,
      domainCount: 2,
      urlCount: 1,
      selectorCount: 0,
    });
    expect(await fakeBrowser.action.getBadgeText({ tabId: 7 })).toBe('4');
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
      <div class="hush-blocked-badge" data-rule-type="domain"></div>
      <div class="hush-blocked-badge" data-rule-type="url"></div>
      <div class="hush-blocked-badge"></div>
      <div data-hush-ad-hidden></div>
    `;

    reportPageMarkerCount();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener).toHaveBeenCalledWith(
      {
        type: 'hush-page-marker-count',
        count: 4,
        adCount: 1,
        domainCount: 1,
        urlCount: 1,
        selectorCount: 1,
      },
      expect.anything(),
      expect.any(Function),
    );
  });

  it('ignores hidden marker nodes but keeps deliberately hidden results in the summary', () => {
    document.body.innerHTML = `
      <div class="hush-blocked-badge" data-rule-type="domain"></div>
      <div style="display: none">
        <div class="hush-ad-badge"></div>
      </div>
      <div class="hush-blocked-badge" data-rule-type="url" style="visibility: hidden"></div>
      <div data-hush-rule-hidden data-hush-rule-type="domain"></div>
      <div data-hush-rule-hidden data-hush-rule-type="url"></div>
      <div data-hush-rule-hidden data-hush-rule-type="selector"></div>
      <div data-hush-ad-hidden></div>
    `;

    expect(countPageMarkerSummary()).toEqual({
      count: 5,
      adCount: 1,
      domainCount: 2,
      urlCount: 1,
      selectorCount: 1,
    });
  });

  it('does not count zero-size marker nodes in a real layout environment', () => {
    document.body.innerHTML = `
      <div class="hush-blocked-badge" data-rule-type="domain"></div>
      <div class="hush-ad-badge"></div>
    `;
    const blockedBadge = document.querySelector<HTMLElement>('.hush-blocked-badge')!;
    const adBadge = document.querySelector<HTMLElement>('.hush-ad-badge')!;
    vi.spyOn(document.documentElement, 'getBoundingClientRect')
      .mockReturnValue(DOMRect.fromRect({ width: 1200, height: 800 }));
    vi.spyOn(blockedBadge, 'getBoundingClientRect')
      .mockReturnValue(DOMRect.fromRect({ width: 80, height: 20 }));
    vi.spyOn(adBadge, 'getBoundingClientRect')
      .mockReturnValue(DOMRect.fromRect({ width: 0, height: 0 }));

    expect(countPageMarkerSummary()).toEqual({
      count: 1,
      adCount: 0,
      domainCount: 1,
      urlCount: 0,
      selectorCount: 0,
    });
  });

  it('reports zero when marking is disabled', async () => {
    const listener = vi.fn();
    fakeBrowser.runtime.onMessage.addListener(listener);

    clearPageMarkerCount();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener).toHaveBeenCalledWith(
      {
        type: 'hush-page-marker-count',
        count: 0,
        adCount: 0,
        domainCount: 0,
        urlCount: 0,
        selectorCount: 0,
      },
      expect.anything(),
      expect.any(Function),
    );
  });
});
