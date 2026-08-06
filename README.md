# Hush

Hush is a local-first Chromium (Chrome and Microsoft Edge) and Firefox extension for visually marking unwanted search results, advertising results, URLs, domains, and selected page elements.

Hush supports Google, Baidu, Bing, 360 Search, Sogou, Yahoo!, Yandex, and DuckDuckGo on their explicitly declared search domains. Rules, optional search history, statistics, and preferences remain on the user's device.

The Firefox build does not include diagnostic telemetry.

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

See [PRIVACY.md](./PRIVACY.md) for local data-processing details and [STORE_DESCRIPTION.md](./STORE_DESCRIPTION.md) for store listing copy.
