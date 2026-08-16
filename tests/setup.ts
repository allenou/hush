import { beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

vi.stubGlobal('browser', fakeBrowser);
vi.stubGlobal('chrome', fakeBrowser);

beforeEach(() => {
  fakeBrowser.reset();
});

export function resetMockStorage(): void {
  fakeBrowser.storage.resetState();
}
