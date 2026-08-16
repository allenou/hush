# Hush website

Astro 7 static website for the Hush product pages and privacy policy.

The site includes English and Simplified Chinese product and privacy pages,
canonical and alternate-language metadata, structured data, and a generated sitemap.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

The production output is generated in `web/dist/` and is intentionally ignored by Git.

## Monitoring

The site reports errors and page-load performance transactions to a monitoring service. This
provides lightweight traffic, page, browser, region, and Web Vitals views, so Google Analytics is
not required. Set the required public monitoring DSN in the deployment environment to enable it;
requests, query parameters, cookies, and user data are removed before events are sent.

## Deployment

Deploy the site with Cloudflare Pages using these settings:

- Root directory: `web`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: read from `.nvmrc`

Canonical and sitemap URLs default to `https://hush.toyou.xyz`. Set `SITE_URL` only when intentionally deploying the same site under a different canonical origin.

No Astro Cloudflare adapter or Wrangler configuration is required because the site is built as static files.
