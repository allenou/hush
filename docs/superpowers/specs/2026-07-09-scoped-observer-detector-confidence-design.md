# Scoped Observer and Detector Confidence P1 Design

## Scope

This P1 change reduces content-script work on ordinary pages and prevents weak automatic detections from being persisted as custom search engines.

The work is intentionally narrow:

- Replace the always-on full-document mutation observer with a scoped observer target decision.
- Prefer observing the active search result container when an engine is known.
- Fall back to observing `document.body` only when the current host has saved selector rules.
- Add confidence metadata to automatic detector output.
- Persist auto-detected custom engines only when confidence reaches the persistence threshold.

## Observer Design

The content script still runs on all pages because the floating picker is global. The expensive dynamic rescanning no longer watches the whole body by default.

Observer target selection:

1. If `currentEngine.containerSelector` exists in the page, observe that container.
2. Else, if `blockedSelectors` contains at least one rule scoped to the current host, observe `document.body`.
3. Else, do not create a mutation observer.

The observer callback remains debounced and runs the same scan sequence:

- `pushState()`
- `scanForAds()`
- `scanResults(currentEngine)` when an engine exists
- `applyBlockedSelectors()`

## Detector Confidence Design

`autoDetectSearchResults()` returns a config with metadata:

```ts
interface DetectedSearchEngineConfig extends SearchEngineConfig {
  confidence: number;
  itemCount: number;
}
```

Confidence is a normalized score from 0 to 100 based on the existing candidate score and validation item count. Built-in engines may use detected configs immediately, but non-built-in hosts are saved as custom engines only when `confidence >= 85`.

## Compatibility

`DetectedSearchEngineConfig` extends `SearchEngineConfig`, so existing scan functions can keep accepting detected configs. Saved custom engine records still use the existing `SearchEngineConfig` shape.

## Testing

Tests should verify:

- Observer target selection returns no target for ordinary pages.
- Observer target selection prefers the search container.
- Observer target selection falls back to body only for current-host selector rules.
- Detector persistence gate rejects confidence below threshold and accepts threshold-or-higher confidence.
- Existing storage and search tests continue passing.

## Out Of Scope

- User-facing confirmation UI.
- Full detector algorithm rewrite.
- Content script match pattern changes.
- Replacing all `console.log` detector diagnostics.
