import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  activatePicker,
  deactivatePicker,
  isPickerActive,
} from '@/helpers/picker';
import { get } from '@/utils/storage';

function mountPickableResult(): { article: HTMLElement; target: HTMLElement } {
  document.body.innerHTML = `
    <main id="results">
      <article class="result-card" style="display:block;margin:8px 0">
        <h2><a href="https://example.com/article"><span id="click-target">Result title</span></a></h2>
        <p>Representative search result description.</p>
      </article>
    </main>
  `;

  const article = document.querySelector<HTMLElement>('.result-card')!;
  const target = document.querySelector<HTMLElement>('#click-target')!;
  const results = document.querySelector<HTMLElement>('#results')!;

  vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
    x: 100,
    y: 160,
    top: 160,
    left: 100,
    right: 740,
    bottom: 340,
    width: 640,
    height: 180,
    toJSON: () => ({}),
  });
  Object.defineProperty(results, 'clientWidth', { configurable: true, value: 700 });
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(() => target),
  });

  return { article, target };
}

beforeEach(() => {
  deactivatePicker();
  document.body.innerHTML = '';
  vi.stubGlobal('CSS', {
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&'),
  });
});

describe('element picker', () => {
  it('activates the visual picker and exits cleanly with Escape', () => {
    mountPickableResult();
    activatePicker(() => 'google.com');

    expect(isPickerActive()).toBe(true);
    expect(document.body.classList.contains('srb-picker-active')).toBe(true);
    expect(document.querySelector('.srb-picker-tooltip')).not.toBeNull();
    expect(document.querySelector('.srb-picker-highlight')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(isPickerActive()).toBe(false);
    expect(document.body.classList.contains('srb-picker-active')).toBe(false);
    expect(document.querySelector('.srb-picker-tooltip, .srb-picker-highlight')).toBeNull();
  });

  it('highlights a result block and opens a confirmation with a stable selector', () => {
    mountPickableResult();
    activatePicker(() => 'google.com');

    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 180,
      clientY: 200,
      bubbles: true,
    }));

    const highlight = document.querySelector<HTMLElement>('.srb-picker-highlight')!;
    expect(highlight.style.display).toBe('block');
    expect(highlight.style.left).toBe('100px');
    expect(highlight.style.width).toBe('640px');

    document.dispatchEvent(new MouseEvent('click', {
      clientX: 180,
      clientY: 200,
      bubbles: true,
      cancelable: true,
    }));

    expect(isPickerActive()).toBe(false);
    expect(document.querySelector('.srb-picker-confirm-overlay')).not.toBeNull();
    expect(document.querySelector('.srb-picker-confirm-code')?.textContent).toBe('google.com');
    expect(document.querySelectorAll('.srb-picker-confirm-code')[1]?.textContent)
      .toBe('article.result-card');
  });

  it('cancels without storing a selector rule', async () => {
    mountPickableResult();
    activatePicker(() => 'google.com');
    document.dispatchEvent(new MouseEvent('click', {
      clientX: 180,
      clientY: 200,
      bubbles: true,
      cancelable: true,
    }));

    document.querySelector<HTMLButtonElement>('.srb-picker-cancel')?.click();

    expect(document.querySelector('.srb-picker-confirm-overlay')).toBeNull();
    expect((await get()).blockedSelectors).toEqual([]);
  });

  it('stores, applies, reports, and removes a confirmed selector rule', async () => {
    const { article } = mountPickableResult();
    const sendMessage = vi.spyOn(fakeBrowser.runtime, 'sendMessage');
    activatePicker(() => 'google.com');
    document.dispatchEvent(new MouseEvent('click', {
      clientX: 180,
      clientY: 200,
      bubbles: true,
      cancelable: true,
    }));

    document.querySelector<HTMLButtonElement>('.srb-picker-ok')?.click();

    await vi.waitFor(async () => {
      const storage = await get();
      expect(storage.blockedSelectors).toContain('google.com||article.result-card');
      expect(storage.selectorBlockCount).toBe(1);
      expect(article.querySelector('.srb-mask')).not.toBeNull();
      expect(article.querySelector('.srb-blocked-badge')).not.toBeNull();
    });
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'srb-page-marker-count',
      selectorCount: 1,
    }));

    article.querySelector<HTMLElement>('.srb-blocked-badge')?.click();

    await vi.waitFor(async () => {
      expect((await get()).blockedSelectors).toEqual([]);
      expect(article.querySelector('.srb-mask, .srb-blocked-badge')).toBeNull();
    });
  });
});
