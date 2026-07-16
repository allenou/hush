# Privacy Policy for Hush

**Last updated: July 2026**

Hush processes extension data locally on your device. It does not upload, sell, share, or transmit this data to Hush or any third party.

## Data processed locally

Hush may store the following data in `chrome.storage.local`:

- Domains, full URLs, and CSS selectors that you choose to mark.
- Search queries, search engine names, and timestamps when search history is enabled.
- Marking statistics, preferences, language selection, ad-marking settings, and subdomain-matching settings.
- The same local data when you explicitly export a Hush backup file.

Search history can be disabled at any time and existing history can be deleted from the extension settings.

## Search page processing

On the explicitly supported Google, Baidu, Bing, and 360 Search domains, Hush reads DOM structure, visible advertising labels, and result links to identify and mark search results. This processing happens entirely inside your browser. Page content and search queries are not transmitted.

Hush does not inject or scan pages outside the exact supported search-engine domains declared in the extension Manifest.

## Permissions

- `storage`: Saves rules, search history, statistics, backups, and preferences locally.
- `contextMenus`: Adds actions to block domains, block links, and pick page elements to the browser context menu.
- Supported search-engine host access: Runs the result-marking Content Script only on the declared Google, Baidu, Bing, and 360 Search root and `www` domains.

## Changes

Updates to this policy will be reflected on this page with a revised date.

## Contact

For privacy or support questions, contact `jskindler@outlook.com`.
