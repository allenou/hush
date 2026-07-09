# Rule Model V2 P0 Design

## Scope

This P0 change upgrades SearchKit's blocking storage from scattered arrays toward a single rule-oriented model while preserving backward compatibility with the existing extension state.

The work is intentionally narrow:

- Add a `rules` field to storage with stable metadata for domain, URL, and selector rules.
- Keep existing `urls`, `blockedUrls`, and `blockedSelectors` arrays as compatibility fields for current UI and content-script consumers.
- Normalize old storage into both compatibility arrays and `rules`.
- Route new add/remove helpers through `rules` and derived arrays.
- Fix manual result blocking statistics so domain and URL actions are not counted as ads.
- Add tests for migration, rule metadata, compatibility arrays, and the statistics fix.

## Data Model

`BlockRule` represents one user-facing rule:

```ts
interface BlockRule {
  id: string;
  type: 'domain' | 'url' | 'selector';
  value: string;
  scope?: string;
  enabled: boolean;
  source: 'manual' | 'picker' | 'migration';
  createdAt: number;
  hitCount: number;
}
```

For selector rules, `value` stores the selector and `scope` stores the host. Legacy selector strings still use `host||selector` externally until the UI/content code is migrated further.

## Compatibility

The existing arrays remain available in `ExtensionStorage`:

- `urls`
- `blockedUrls`
- `blockedSelectors`

During `get()`, storage normalization derives missing `rules` from those arrays. During rule writes, the helper writes both `rules` and the compatibility arrays. This keeps current Svelte screens and content-script matching stable.

## Error Handling

Malformed or incomplete rule-like records are ignored during normalization. Legacy arrays are still trusted as the recovery source. Duplicate rules are deduped by `type + scope + value`.

## Testing

Tests should verify:

- Empty storage gets an empty `rules` array.
- Legacy domain, URL, and selector arrays migrate into `rules`.
- Adding/removing domain, URL, and selector rules updates both `rules` and compatibility arrays.
- Manual result blocking records `domain` or `url`, not `ad`.
- Existing search-engine and URL tests continue passing.

## Out Of Scope

- UI redesign for rule metadata.
- Remote subscriptions.
- Chrome sync.
- Performance observer refactor.
- Detector confidence UI.
