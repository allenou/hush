# Scoped Observer and Detector Confidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repository forbids automatic commits, so commit steps are intentionally omitted.

**Goal:** Reduce unnecessary content-script rescans and prevent weak auto-detected engines from being saved.

**Architecture:** Add small helper boundaries for observer target selection and detector persistence confidence. Keep `content.ts` responsible for wiring state and scan callbacks, but move the decision logic into tested helpers.

**Tech Stack:** TypeScript, WXT, Vitest, jsdom.

---

### Task 1: Scoped Observer Target Helper

**Files:**
- Create: `src/helpers/scan-observer.ts`
- Create: `tests/scan-observer.test.ts`
- Modify: `src/entrypoints/content.ts`

- [ ] **Step 1: Write failing tests**

Add tests for:

- ordinary page with no engine and no host selector rules returns `null`
- known engine with a matching container returns that container
- current-host selector rule falls back to `document.body`
- other-host selector rule returns `null`

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/scan-observer.test.ts`

Expected: FAIL because `src/helpers/scan-observer.ts` does not exist.

- [ ] **Step 3: Implement helper**

Create `getScanObserverTarget(options)` and `hasSelectorRuleForHost(blockedSelectors, hostname)`.

- [ ] **Step 4: Run targeted tests**

Run: `npm test -- tests/scan-observer.test.ts`

Expected: PASS.

### Task 2: Detector Confidence Gate

**Files:**
- Modify: `src/helpers/detector.ts`
- Create: `tests/detector.test.ts`
- Modify: `src/entrypoints/content.ts`

- [ ] **Step 1: Write failing tests**

Add tests for `shouldPersistAutoDetectedEngine()`:

- confidence below `85` returns false
- confidence equal to `85` returns true
- confidence above `85` returns true

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/detector.test.ts`

Expected: FAIL because `shouldPersistAutoDetectedEngine` does not exist.

- [ ] **Step 3: Implement detector metadata**

Add `DetectedSearchEngineConfig`, `AUTO_DETECT_PERSISTENCE_CONFIDENCE`, `shouldPersistAutoDetectedEngine()`, and attach `confidence` / `itemCount` to successful detections.

- [ ] **Step 4: Run targeted tests**

Run: `npm test -- tests/detector.test.ts`

Expected: PASS.

### Task 3: Content Script Wiring

**Files:**
- Modify: `src/entrypoints/content.ts`

- [ ] **Step 1: Replace global observer wiring**

Remove the always-on `globalObserver.observe(document.body, ...)` block. Add a single scoped `scanObserver` that calls `getScanObserverTarget()`, disconnects when no target is needed, and debounces the existing scan sequence.

- [ ] **Step 2: Gate custom engine persistence**

In `tryAutoDetect()`, persist non-built-in detections only when `shouldPersistAutoDetectedEngine(detected)` returns true.

- [ ] **Step 3: Re-run related tests**

Run: `npm test -- tests/scan-observer.test.ts tests/detector.test.ts tests/storage.test.ts`

Expected: PASS.

### Task 4: Full Verification

**Files:**
- No additional edits expected.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: WXT build succeeds.

- [ ] **Step 3: Review diff**

Run: `git status --short` and `git diff --stat`

Expected: only planned files are changed.
