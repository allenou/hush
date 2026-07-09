# Local Backup Restore P2 Design

## Scope

This P2 change adds local JSON backup and restore for SearchKit data. It is the first step toward subscriptions or sync, but does not use network access.

The work is intentionally narrow:

- Export normalized extension storage to a versioned JSON backup object.
- Import a versioned backup object and replace current local storage after validation.
- Add Settings page controls for export and import.
- Add localized copy for the new controls and status messages.
- Add tests for backup shape, restore behavior, and invalid input rejection.

## Backup Format

```ts
interface StorageBackup {
  app: 'SearchKit';
  version: 1;
  exportedAt: string;
  data: ExtensionStorage;
}
```

`data` is the normalized storage returned by `get()`, including rules, compatibility arrays, settings, stats, custom engines, search history, and locale.

## Import Behavior

Import is replace-only for P2. The options page confirms before importing. The storage helper validates:

- object shape
- `app === 'SearchKit'`
- `version === 1`
- `data` is an object

After validation, import passes `data` through storage normalization and writes the normalized value. This keeps legacy backup data compatible as long as it is inside the backup envelope.

## UI Design

Settings gets a new compact card named "Data backup". It has:

- Export button: downloads a JSON file named `searchkit-backup-YYYY-MM-DD.json`.
- Import button: opens a hidden file input and reads JSON.
- Short status text for success or failure.

The UI follows existing Settings card styling, with a quiet utility layout and no modal.

## Testing

Tests should verify:

- `createStorageBackup()` returns a versioned backup with normalized data.
- `restoreStorageBackup()` replaces current storage.
- Invalid backup envelopes are rejected.
- Existing storage tests continue passing.

## Out Of Scope

- Remote subscriptions.
- Chrome sync.
- Merge mode.
- Per-rule conflict handling.
- Encryption or password-protected backups.
