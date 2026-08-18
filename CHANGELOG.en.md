# Hush Changelog

This file records notable user-facing changes in each Hush release. For Simplified Chinese, see [CHANGELOG.zh-CN.md](./CHANGELOG.zh-CN.md).

## [1.1.0] - 2026-08-18

### New and improved

- Added session controls in the popup. Independently mark, hide, or pause domain, URL, ad, and element rules for the current session without changing saved settings.
- Improved page-handling settings, rule management, search history, and statistics, including a reset action for page-handling preferences.
- Added search-engine hostname aliases for better compatibility across regional domains and entry points.
- Hush is now available in the Microsoft Edge Add-ons store.

### Fixed

- Improved marking and tab-badge statistics across dynamic results and page navigation.
- Fixed Sogou link-target detection and reduced false positives when identifying advertising and sponsored results.

## [1.0.0] - 2026-08-07

### Initial release

- Mark an entire domain or one specific URL, then restore results directly from the page.
- Select page elements visually and create CSS selector rules scoped to a site.
- Choose whether domain rules also apply to subdomains.
- Detect and mark advertising and sponsored results with an independent setting.
- Support Google, Baidu, Bing, 360 Search, Sogou, Yahoo!, Yandex, and DuckDuckGo out of the box.
- Adapt to search-page layout changes and keep marking active across dynamically loaded results and page navigation.
- Quickly block domains, full links, or selected page elements from the browser's native context menu.
- Provide optional search history, marking statistics, and current-page tab badge counts.
- Keep rules, search history, statistics, and preferences on the user's device.
- Provide English and Simplified Chinese interfaces with runtime language switching.
