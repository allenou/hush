# SearchKit Release Readiness and Domain Whitelist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Repository instructions prohibit subagents, worktrees, automatic commits, and pushes, so execution stays inline in the current workspace and omits commit steps.

**Goal:** Restrict SearchKit to four explicitly supported search-engine domains and close the release-blocking lifecycle, rule, history, storage, privacy, and store-listing gaps without removing existing product features.

**Architecture:** A shared search-host module becomes the single source for Manifest match patterns and runtime hostname checks. Content-script marking lifecycle is separated from independent history/navigation listeners, while storage mutations are serialized through one update queue. UI fixes use existing Svelte component boundaries and preserve the user's current per-page toolbar Badge work.

**Tech Stack:** WXT 0.20, Svelte 5, TypeScript strict mode, Chrome Manifest V3, chrome.storage.local, Vitest/jsdom.

---

## File Map

- Create `src/constants/search-hosts.ts`: exact supported hostnames, match patterns, and normalization helpers.
- Create `src/utils/rule-input.ts`: deterministic domain/URL rule parsing and normalization.
- Create `src/helpers/url-navigation.ts`: subscribe to `popstate`, `pushState`, and `replaceState` URL changes.
- Modify `wxt.config.ts`: replace `<all_urls>` with exact search-host patterns and minimize permissions.
- Modify `src/entrypoints/content.ts`: separate persistent history/floating UI setup from marking scanner lifecycle.
- Modify `src/helpers/search-engines.ts`: consume shared supported-host logic and stop treating custom engines as active runtime engines.
- Modify `src/helpers/ui.ts`: keep the floating button while marking is disabled and provide an enable action.
- Modify `src/helpers/ad-blocker.ts`: complete marker cleanup, selector undo, and Badge synchronization.
- Modify `src/helpers/picker.ts`: make newly created selector markers reversible.
- Modify `src/utils/storage.ts`: serialize writes, validate backups, normalize rule input consumers, and add history deletion APIs.
- Modify Popup and Options Svelte files: fix rule search, current-site state, history controls, selector scope, and document language.
- Modify `PRIVACY.md`, `STORE_DESCRIPTION.md`, `README.md`: align public claims with local data processing and exact engine support.
- Modify `package.json` and `package-lock.json`: remove unused `@google/design.md`.

## Task 1: Exact Search-Engine Host Whitelist

**Files:**
- Create: `src/constants/search-hosts.ts`
- Modify: `src/helpers/search-engines.ts`
- Modify: `wxt.config.ts`
- Modify: `src/entrypoints/content.ts`
- Test: `tests/search-engines.test.ts`
- Test: `tests/manifest.test.ts`

- [ ] **Step 1: Write failing hostname tests**

Add tests asserting the desired public API:

```ts
import {
  SEARCH_ENGINE_MATCH_PATTERNS,
  isSupportedSearchHostname,
  normalizeSearchHostname,
} from '@/constants/search-hosts';

it('treats www and the root host as the same supported engine', () => {
  expect(normalizeSearchHostname('www.google.com')).toBe('google.com');
  expect(isSupportedSearchHostname('google.com')).toBe(true);
  expect(isSupportedSearchHostname('www.google.com')).toBe(true);
});

it.each(['m.baidu.com', 'cn.bing.com', 'google.com.hk', 'example.com'])(
  'rejects non-enumerated hostname %s',
  (hostname) => expect(isSupportedSearchHostname(hostname)).toBe(false),
);

it('exports eight exact Manifest match patterns', () => {
  expect(SEARCH_ENGINE_MATCH_PATTERNS).toEqual([
    '*://google.com/*', '*://www.google.com/*',
    '*://baidu.com/*', '*://www.baidu.com/*',
    '*://bing.com/*', '*://www.bing.com/*',
    '*://so.com/*', '*://www.so.com/*',
  ]);
});
```

- [ ] **Step 2: Run the hostname tests and verify RED**

Run: `npm test -- tests/search-engines.test.ts tests/manifest.test.ts`

Expected: FAIL because `src/constants/search-hosts.ts` and the exact Manifest assertions do not exist.

- [ ] **Step 3: Implement the shared whitelist**

Create the module with this interface:

```ts
export const SEARCH_ENGINE_HOSTS = ['google.com', 'baidu.com', 'bing.com', 'so.com'] as const;

export const SEARCH_ENGINE_MATCH_PATTERNS = SEARCH_ENGINE_HOSTS.flatMap((hostname) => [
  `*://${hostname}/*`,
  `*://www.${hostname}/*`,
]);

export function normalizeSearchHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

export function isSupportedSearchHostname(hostname: string): boolean {
  const normalized = normalizeSearchHostname(hostname);
  return SEARCH_ENGINE_HOSTS.some((candidate) => candidate === normalized)
    && (hostname.toLowerCase() === normalized || hostname.toLowerCase() === `www.${normalized}`);
}
```

Use `SEARCH_ENGINE_MATCH_PATTERNS` in both WXT Manifest `host_permissions` and Content Script `matches`. Remove `<all_urls>` and `activeTab`, leaving only `storage`. Re-export or delegate the existing `normalizeHostname` helper so existing callers retain their API.

Remove `addCustomEngine` and `findMatchingCustomEngine` from `content.ts`; retain `customEngines` only in storage/backup compatibility code. Add a runtime early return when `isSupportedSearchHostname(getHostname())` is false.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/search-engines.test.ts tests/manifest.test.ts`

Expected: PASS with eight exact patterns and rejected subdomains.

## Task 2: Marking Lifecycle Versus Independent History

**Files:**
- Create: `src/helpers/url-navigation.ts`
- Modify: `src/entrypoints/content.ts`
- Modify: `src/helpers/ui.ts`
- Modify: `src/helpers/ad-blocker.ts`
- Test: `tests/content-lifecycle.test.ts`
- Test: `tests/url-navigation.test.ts`
- Test: `tests/page-badge.test.ts`

- [ ] **Step 1: Write failing navigation and disabled-state tests**

Test `subscribeToUrlChanges` with real `history.pushState`, `replaceState`, and dispatched `popstate`. Add content lifecycle assertions through exported pure lifecycle helpers or injected dependencies:

```ts
it('keeps history recording active while marking is disabled', async () => {
  await setEnabled(false);
  await setRecordSearchHistory(true);
  await recordSupportedSearchFromUrl('https://www.google.com/search?q=local');
  expect((await get()).searchHistory[0]?.query).toBe('local');
});

it('clears result markers and the page badge when marking is disabled', () => {
  document.body.innerHTML = `
    <div id="srb-collapse-bar"></div>
    <div class="srb-blocked-badge"></div>
    <div class="srb-ad-badge"></div>
  `;
  clearAllMarkers();
  expect(document.querySelector('.srb-blocked-badge, .srb-ad-badge')).toBeNull();
  expect(document.getElementById('srb-collapse-bar')).toBeNull();
});
```

Verify the floating UI renders an enable-only action when `enabled` is false, and that scanning observers are not created until marking becomes enabled.

- [ ] **Step 2: Run lifecycle tests and verify RED**

Run: `npm test -- tests/content-lifecycle.test.ts tests/url-navigation.test.ts tests/page-badge.test.ts`

Expected: FAIL because history navigation interception, complete cleanup, and disabled floating-button state are missing.

- [ ] **Step 3: Implement separated lifecycle functions**

In `content.ts`, structure startup around these responsibilities:

```ts
async function initializePersistentFeatures(storage: ExtensionStorage): Promise<void>;
function startMarking(): void;
function stopMarking(): void;
function handleStorageChange(storage: ExtensionStorage): void;
```

`initializePersistentFeatures` initializes locale, floating UI, storage subscription, and URL-change history recording regardless of `enabled`.

`startMarking` injects styles, resets engine detection, scans results, applies selectors, creates the observer, and reports Badge count.

`stopMarking` disconnects observer/timers, deactivates Picker, clears result UI and scan attributes, removes the collapse bar, clears Badge count, and updates the floating UI to an enable action. It does not unsubscribe history or storage listeners.

In `ui.ts`, expose:

```ts
export function setFloatingMarkingEnabled(enabled: boolean): void;
```

When false, the popup contains one localized `enableMarkingAction` button that calls `setEnabled(true)`. Existing domain, URL, and Picker actions are rendered only when true.

In `url-navigation.ts`, return an unsubscribe function that restores the original `history.pushState` and `history.replaceState` methods and removes the `popstate` listener.

- [ ] **Step 4: Run lifecycle tests and verify GREEN**

Run: `npm test -- tests/content-lifecycle.test.ts tests/url-navigation.test.ts tests/page-badge.test.ts`

Expected: PASS; disabled marking retains history and re-enable UI while scan resources are absent.

## Task 3: Rule Search and Rule Input Normalization

**Files:**
- Create: `src/utils/rule-input.ts`
- Modify: `src/entrypoints/options/App.svelte`
- Modify: `src/entrypoints/options/components/RulesTab.svelte`
- Test: `tests/rule-input.test.ts`
- Test: `tests/options-ui.test.ts`

- [ ] **Step 1: Write failing parser and UI tests**

Define the desired parser contract:

```ts
export type ParsedRuleInput =
  | { type: 'domain'; value: string }
  | { type: 'url'; value: string };

expect(parseRuleInput('Example.COM')).toEqual({ type: 'domain', value: 'example.com' });
expect(parseRuleInput('https://www.example.com/')).toEqual({ type: 'domain', value: 'example.com' });
expect(parseRuleInput('https://example.com/?q=1')).toEqual({
  type: 'url',
  value: 'https://example.com/?q=1',
});
expect(() => parseRuleInput('example.com/path')).toThrow();
```

Mount `App`, seed two rules, type into `.search-box`, and assert only the matching row remains.

- [ ] **Step 2: Run parser/UI tests and verify RED**

Run: `npm test -- tests/rule-input.test.ts tests/options-ui.test.ts`

Expected: FAIL because parsing is embedded in `App.svelte` and rule search does not update parent state.

- [ ] **Step 3: Implement parser and controlled search input**

Implement `parseRuleInput` using `URL`, lowercase hostname normalization, `www` removal, and explicit rejection of protocol-less paths. Treat a URL as a domain only when pathname is `/`, query and hash are empty, and port is empty or the scheme default.

Add `onSearchQueryChange?: (value: string) => void` to `RulesTab` and replace `bind:value={searchQuery}` with an input handler that updates local display state and calls the parent callback. Parent `App.svelte` assigns `searchQuery` and uses the parser result to call `addDomain` or `addBlockedUrl`.

- [ ] **Step 4: Run parser/UI tests and verify GREEN**

Run: `npm test -- tests/rule-input.test.ts tests/options-ui.test.ts`

Expected: PASS for normalization, invalid input, duplicate normalized input, and live filtering.

## Task 4: Search History Completion

**Files:**
- Modify: `src/utils/storage.ts`
- Modify: `src/entrypoints/content.ts`
- Modify: `src/entrypoints/options/App.svelte`
- Modify: `src/entrypoints/options/components/SearchHistoryTab.svelte`
- Modify: `public/_locales/en/messages.json`
- Modify: `public/_locales/zh_CN/messages.json`
- Test: `tests/storage.test.ts`
- Test: `tests/options-ui.test.ts`
- Test: `tests/url-navigation.test.ts`

- [ ] **Step 1: Write failing history tests**

Add storage tests for consecutive dedupe, index deletion, and clearing:

```ts
await recordSearch('query', 'Google', 'google.com');
await recordSearch('query', 'Google', 'google.com');
expect((await get()).searchHistory).toHaveLength(1);

await removeSearchRecord(0);
expect((await get()).searchHistory).toEqual([]);

await recordSearch('one', 'Google', 'google.com');
await clearSearchHistory();
expect((await get()).searchHistory).toEqual([]);
```

Add UI tests that click one delete action and the clear-all action, accepting the confirmation dialog, then verify rows disappear.

- [ ] **Step 2: Run history tests and verify RED**

Run: `npm test -- tests/storage.test.ts tests/options-ui.test.ts tests/url-navigation.test.ts`

Expected: FAIL because dedupe, deletion, clear APIs, and controls are missing.

- [ ] **Step 3: Implement history APIs and UI**

Change `recordSearch` so the first record with identical `query` and normalized `engineHostname` is replaced with a fresh timestamp instead of prepending a duplicate. Export:

```ts
export async function removeSearchRecord(index: number): Promise<void>;
export async function clearSearchHistory(): Promise<void>;
```

Add localized `deleteHistory`, `clearHistory`, and `clearHistoryConfirm` messages. Pass delete/clear callbacks from Options `App` to `SearchHistoryTab`. Keep history recording independent from `enabled` and gated only by `recordSearchHistory`.

- [ ] **Step 4: Run history tests and verify GREEN**

Run: `npm test -- tests/storage.test.ts tests/options-ui.test.ts tests/url-navigation.test.ts`

Expected: PASS with maximum 50 records, consecutive dedupe, single deletion, and confirmed clear-all.

## Task 5: Popup Domain Status and Selector Rule Recovery

**Files:**
- Modify: `src/utils/domain.ts`
- Modify: `src/entrypoints/popup/App.svelte`
- Modify: `src/utils/storage.ts`
- Modify: `src/helpers/ad-blocker.ts`
- Modify: `src/helpers/picker.ts`
- Modify: `src/entrypoints/options/components/RulesTab.svelte`
- Test: `tests/domain.test.ts`
- Test: `tests/popup.test.ts`
- Test: `tests/storage.test.ts`

- [ ] **Step 1: Write failing status and selector tests**

Add a pure status helper contract:

```ts
expect(matchesBlockedDomain('sub.example.com', ['example.com'], true)).toBe(true);
expect(matchesBlockedDomain('sub.example.com', ['example.com'], false)).toBe(false);
expect(getPageDomain('chrome://extensions')).toBeNull();
```

Add tests asserting `getAllBlocked()` includes `scope: 'google.com'` for selector rules and that clicking an applied selector badge removes the exact `host||selector` rule.

- [ ] **Step 2: Run status/selector tests and verify RED**

Run: `npm test -- tests/domain.test.ts tests/popup.test.ts tests/storage.test.ts`

Expected: FAIL because Popup uses exact `includes`, selector scope is omitted, and applied selector badges have no removal handler.

- [ ] **Step 3: Implement shared matching and exact selector removal**

Export from `domain.ts`:

```ts
export function matchesBlockedDomain(
  hostname: string,
  blockedDomains: string[],
  includeSubdomains: boolean,
): boolean;
```

Use it in Popup and ad-blocker domain matching. Add `scope?: string` to `BlockItem`, populate it in `getAllBlocked`, and display scope beside selector values.

Export `removeBlockedSelectorEntry(entry: string)` from storage so page badges remove the exact selector rule without stale indexes. Attach this handler in both `applyBlockedSelectors` and the Picker confirmation result.

- [ ] **Step 4: Run status/selector tests and verify GREEN**

Run: `npm test -- tests/domain.test.ts tests/popup.test.ts tests/storage.test.ts`

Expected: PASS for subdomain settings, non-web pages, selector scope, and in-page undo.

## Task 6: Serialized Storage Writes and Backup Validation

**Files:**
- Modify: `src/utils/storage.ts`
- Test: `tests/storage.test.ts`

- [ ] **Step 1: Write failing concurrency and malformed-backup tests**

Add a test that starts `recordBlock`, `recordSearch`, and `setBlockAds(false)` concurrently, then asserts all three changes are present. Add invalid backup cases where `urls`, `searchHistory`, or `stats` are strings or objects instead of arrays.

```ts
await Promise.all([
  recordBlock('domain', 'example.com'),
  recordSearch('query', 'Google', 'google.com'),
  setBlockAds(false),
]);
const state = await get();
expect(state.blockCount).toBe(1);
expect(state.searchHistory).toHaveLength(1);
expect(state.blockAds).toBe(false);
```

- [ ] **Step 2: Run storage tests and verify RED**

Run: `npm test -- tests/storage.test.ts`

Expected: FAIL under controlled delayed storage operations or malformed backup input.

- [ ] **Step 3: Implement one mutation queue**

Replace the separate block-record queue and read-then-`set` helpers with:

```ts
let mutationQueue: Promise<void> = Promise.resolve();

function mutateStorage<T>(
  updater: (current: ExtensionStorage) => { next: ExtensionStorage; result: T },
): Promise<T>;
```

Each public mutation schedules one operation that reads the latest normalized value, produces the complete next value, writes once, and returns its result. Reset the queue after rejection so later writes continue. Do not call one queued mutation API from another queued mutation API.

Validate every backup array and primitive before normalization. Retain backup version `1` and reject malformed types with `Invalid SearchKit backup`.

- [ ] **Step 4: Run storage tests and verify GREEN**

Run: `npm test -- tests/storage.test.ts`

Expected: PASS with all concurrent mutations retained and malformed backups rejected.

## Task 7: Badge and Marker Cleanup Integration

**Files:**
- Preserve/modify: `src/utils/page-badge.ts`
- Preserve/modify: `tests/page-badge.test.ts`
- Preserve/modify: `src/entrypoints/background.ts`
- Modify: `src/helpers/ui.ts`
- Modify: `src/helpers/ad-blocker.ts`
- Test: `tests/page-badge.test.ts`

- [ ] **Step 1: Add failing cleanup tests to the existing user changes**

Add cases asserting a disabled marking state reports zero, a removed ad badge updates the count, and `clearAllMarkers` removes `data-srb-ad-badge` in addition to `data-srb-processed` and `data-srb-ad-scanned`.

- [ ] **Step 2: Run Badge tests and verify RED**

Run: `npm test -- tests/page-badge.test.ts`

Expected: FAIL for disable clearing or stale ad scan attributes while the existing per-tab Badge tests remain green.

- [ ] **Step 3: Complete Badge integration without overwriting user work**

Keep `PAGE_MARKER_COUNT_MESSAGE`, sender-tab validation, per-tab Badge text, and navigation clearing. Ensure every marker add/remove path calls `reportPageMarkerCount`, and add an explicit `clearPageMarkerCount()` function that sends a zero count during disable cleanup.

Remove the collapse bar element during full marker cleanup and reset `_lastCollapseCount` / `_lastCollapseDisplay` so re-enable renders correctly.

- [ ] **Step 4: Run Badge tests and verify GREEN**

Run: `npm test -- tests/page-badge.test.ts`

Expected: PASS for current-tab counts, navigation, removal, and marking disable.

## Task 8: Privacy, Store Copy, Locale Metadata, and Dependency Cleanup

**Files:**
- Modify: `PRIVACY.md`
- Modify: `STORE_DESCRIPTION.md`
- Modify: `README.md`
- Modify: `public/_locales/en/messages.json`
- Modify: `public/_locales/zh_CN/messages.json`
- Modify: `src/entrypoints/options/App.svelte`
- Modify: `src/entrypoints/popup/App.svelte`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/product-copy.test.ts`
- Test: `tests/locale.test.ts`

- [ ] **Step 1: Write failing copy and document-language tests**

Assert that store copy does not contain `any search engine`, `Hide all results`, or `immediately hidden`; privacy copy includes local search keyword storage and DOM processing on four supported engines. Add locale tests asserting `document.documentElement.lang` becomes `zh-CN` or `en` in extension pages.

- [ ] **Step 2: Run copy/locale tests and verify RED**

Run: `npm test -- tests/product-copy.test.ts tests/locale.test.ts`

Expected: FAIL against current privacy/store text and hard-coded HTML language.

- [ ] **Step 3: Update public documents and remove the unused dependency**

Rewrite privacy wording around local processing rather than claiming no personal data is handled. List the four exact engines and explain that queries, engine names, timestamps, rules, selectors, statistics, settings, and backups remain local and are not transmitted or shared.

Describe results as marked or visually covered, not removed from layout. State that history can be disabled and cleared.

Set document language after locale initialization in Popup/Options only; do not mutate the host search page's `<html lang>` from the Content Script.

Run `npm uninstall @google/design.md` to update `package.json` and `package-lock.json` without changing Chart.js.

- [ ] **Step 4: Run copy/locale tests and verify GREEN**

Run: `npm test -- tests/product-copy.test.ts tests/locale.test.ts`

Expected: PASS with consistent public claims and extension-page language metadata.

## Task 9: Full Verification and Release Artifact Audit

**Files:**
- Verify all changed files; do not commit or push.

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all test files and tests pass with exit code `0` and no unhandled warnings.

- [ ] **Step 2: Build the production extension**

Run: `npm run build`

Expected: WXT builds `chrome-mv3` successfully with exact host patterns and no `<all_urls>`.

- [ ] **Step 3: Create and inspect the store ZIP**

Run: `npm run zip`

Run: `unzip -l .output/search-kit-1.0.0-chrome.zip`

Expected: ZIP contains only Manifest, bundled extension code/styles, locales, and icons.

- [ ] **Step 4: Audit production dependencies**

Run: `npm audit --omit=dev --json`

Expected: zero production vulnerabilities, or report exact remaining advisories without claiming release readiness.

- [ ] **Step 5: Inspect final Manifest and diff**

Run: `sed -n '1,220p' .output/chrome-mv3/manifest.json`

Run: `git diff --check`

Run: `git status --short --branch`

Expected: Manifest contains only eight search-host match patterns; diff has no whitespace errors; existing user Badge work is preserved; no commit or push has occurred.

- [ ] **Step 6: Hand off manual Chrome verification**

Provide a checklist for loading `.output/chrome-mv3` as an unpacked extension and testing Google, Baidu, Bing, and 360 root/`www` search pages. Explicitly list unsupported subdomains and confirm ordinary websites receive no Content Script.
