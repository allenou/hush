# Hush website

Astro 7 static website for the Hush product pages and privacy policy.

The site includes English and Simplified Chinese pages, a bilingual changelog,
canonical and alternate-language metadata, structured data, and a generated sitemap.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

The production output is generated in `site/dist/` and is intentionally ignored by Git.

## Deployment

Deploy the site with Cloudflare Pages using these settings:

- Root directory: `site`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: read from `.nvmrc`

Cloudflare provides `CF_PAGES_URL` automatically. The production `*.pages.dev` deployment is indexable, while hash-prefixed preview deployments receive `noindex, nofollow` metadata automatically.

When using a custom domain, add a production-only `SITE_URL` environment variable containing the canonical origin, for example `https://hush.example.com` (without a trailing slash). This keeps canonical and alternate-language URLs stable across deployments. Do not expose `SITE_URL` to preview deployments, otherwise they will publish the production canonical URL and become indexable.

No Astro Cloudflare adapter or Wrangler configuration is required because the site is built as static files.
