import { beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

vi.stubGlobal('browser', fakeBrowser);
vi.stubGlobal('chrome', fakeBrowser);

beforeEach(() => {
  fakeBrowser.reset();
});

export function resetMockStorage(): void {
  fakeBrowser.storage.resetState();
}
