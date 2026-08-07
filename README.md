# Hush

![Microsoft Edge available](https://img.shields.io/badge/Microsoft%20Edge-Available-0078D7?logo=microsoftedge&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-4F5F9F.svg)](./LICENSE)

Hush helps you make search results quieter and easier to manage. Mark unwanted results, ads, domains, URLs, or page elements while keeping the original page available whenever you want to restore it.

## Features

- Mark a whole domain or one specific URL from the browser context menu.
- Select and save unwanted page elements with the element picker.
- Identify and mark sponsored and advertising results.
- Restore a marked result or remove a rule at any time.
- Manage rules, settings, and marking statistics from the options page.
- Optionally save and revisit searches from supported search engines.

Supported search engines: Google, Baidu, Bing, 360 Search, Sogou, Yahoo!, Yandex, and DuckDuckGo.

See the [Privacy Policy](https://hush.toyou.xyz/privacy/) for local data-processing details.

## Development

```bash
npm test
npm run build
npm run zip
```

Build or package a browser-specific release when needed:

```bash
# Microsoft Edge (Chromium MV3)
npm run build:edge
npm run zip:edge

# Firefox (MV3)
npm run build:firefox
npm run zip:firefox
```

## License

This project is licensed under the [MIT License](./LICENSE).

## Changelog

- [简体中文](./CHANGELOG.zh-CN.md)
- [English](./CHANGELOG.en.md)
