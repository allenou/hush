# Local Backup Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repository forbids automatic commits, so commit steps are intentionally omitted.

**Goal:** Add local JSON export/import for SearchKit data.

**Architecture:** Storage backup helpers live in `src/utils/storage.ts` so all backup data uses the same normalization path as runtime storage. The Settings page owns browser file download/read UI and calls those helpers.

**Tech Stack:** TypeScript, Svelte 5, WXT, Vitest.

---

### Task 1: Storage Backup Helpers

**Files:**
- Modify: `tests/storage.test.ts`
- Modify: `src/utils/storage.ts`

- [ ] **Step 1: Write failing tests**

Add tests for `createStorageBackup()` shape, `restoreStorageBackup()` replacing current data, and invalid backup rejection.

- [ ] **Step 2: Run targeted test**

Run: `npm test -- tests/storage.test.ts`

Expected: FAIL because backup helpers do not exist.

- [ ] **Step 3: Implement helpers**

Add `StorageBackup`, `createStorageBackup()`, and `restoreStorageBackup(value)`.

- [ ] **Step 4: Re-run targeted test**

Run: `npm test -- tests/storage.test.ts`

Expected: PASS.

### Task 2: Settings UI

**Files:**
- Modify: `src/entrypoints/options/App.svelte`
- Modify: `src/entrypoints/options/components/SettingsTab.svelte`
- Modify: `public/_locales/en/messages.json`
- Modify: `public/_locales/zh_CN/messages.json`

- [ ] **Step 1: Wire backup handlers in App**

Add export/download and import/file-read handlers. Confirm before replacing data.

- [ ] **Step 2: Add Settings controls**

Add a compact "Data backup" card with export/import buttons and status text.

- [ ] **Step 3: Add locale messages**

Add English and Chinese labels/status strings.

### Task 3: Verification

**Files:**
- No additional edits expected.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: WXT build succeeds.

- [ ] **Step 3: Review status**

Run: `git status --short` and `git diff --stat`

Expected: only planned files are changed.
