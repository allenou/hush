import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? process.env.CF_PAGES_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  integrations: [sitemap({
    i18n: {
      defaultLocale: 'en',
      locales: {
        en: 'en',
        zh: 'zh-CN',
      },
    },
  })],
  output: 'static',
  build: {
    format: 'directory',
  },
});
