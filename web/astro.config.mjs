import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';

const site = process.env.SITE_URL ?? 'https://hush.toyou.xyz';
const shouldUploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default defineConfig({
  site,
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          zh: 'zh-CN',
        },
      },
    }),
    sentry({
      ...(shouldUploadSourceMaps ? {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      } : {}),
      sourcemaps: {
        disable: !shouldUploadSourceMaps,
      },
      telemetry: false,
    }),
  ],
  output: 'static',
  build: {
    format: 'directory',
  },
});
