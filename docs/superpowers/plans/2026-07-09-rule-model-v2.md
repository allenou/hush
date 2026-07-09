# Rule Model V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repository forbids automatic commits, so commit steps are intentionally omitted.

**Goal:** Add a backward-compatible rule model for blocking rules and fix manual block statistics.

**Architecture:** `src/utils/storage.ts` remains the storage boundary. It gains `BlockRule` normalization helpers that derive compatibility arrays from rules and migrate legacy arrays into rules. Existing content-script and UI consumers keep reading `urls`, `blockedUrls`, and `blockedSelectors`.

**Tech Stack:** TypeScript, WXT storage utilities, Vitest, fakeBrowser from `wxt/testing`.

---

### Task 1: Storage Rule Model Tests

**Files:**
- Modify: `tests/storage.test.ts`
- Modify: `src/utils/storage.ts`

- [ ] **Step 1: Write failing tests**

Add tests that assert empty storage includes `rules`, legacy arrays migrate to rules, and add/remove helpers keep rules and compatibility arrays in sync.

- [ ] **Step 2: Run targeted tests**

Run: `npm test -- tests/storage.test.ts`

Expected: failing tests because `rules` does not exist yet.

- [ ] **Step 3: Implement minimal storage rule model**

Add `BlockRule`, normalize existing storage into valid rules, derive compatibility arrays from enabled rules, and update add/remove helpers to write both shapes.

- [ ] **Step 4: Re-run targeted tests**

Run: `npm test -- tests/storage.test.ts`

Expected: all storage tests pass.

### Task 2: Manual Block Statistics Fix

**Files:**
- Modify: `tests/storage.test.ts`
- Modify: `src/helpers/ad-blocker.ts`

- [ ] **Step 1: Write failing test**

Add a test for the statistics helper that proves manual domain and URL block actions increment the correct counters and do not increment `adBlockCount`.

- [ ] **Step 2: Run targeted tests**

Run: `npm test -- tests/storage.test.ts`

Expected: failing test because one content path records manual result blocking as `ad`.

- [ ] **Step 3: Fix manual result recording**

In `injectBlockButton`, call `recordBlock('domain', domain)` for domain actions and `recordBlock('url', domain)` for URL actions.

- [ ] **Step 4: Re-run targeted tests**

Run: `npm test -- tests/storage.test.ts`

Expected: all storage tests pass.

### Task 3: Full Verification

**Files:**
- No production edits expected.

- [ ] **Step 1: Run full suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Review diff**

Run: `git diff -- src/utils/storage.ts src/helpers/ad-blocker.ts tests/storage.test.ts docs/superpowers/specs/2026-07-09-rule-model-v2-design.md docs/superpowers/plans/2026-07-09-rule-model-v2.md`

Expected: only planned storage, stats, test, and docs changes are present.
