import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  imports: {
    dirsScanOptions: {
      fileFilter(file) {
        const normalized = file.replaceAll('\\', '/');
        return ![
          'utils/i18n.ts',
          'utils/locale.ts',
          'utils/locale-store.svelte.ts',
        ].some((path) => normalized.endsWith(path));
      },
    },
  },
  manifest: {
    name: 'SearchKit',
    description: 'Search result management — block, mark ads, track search history',
    version: '1.0.0',
    default_locale: 'en',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: '/popup.html',
      default_title: 'SearchKit',
    },

    icons: {
      '16': '/icons/icon-16.png',
      '32': '/icons/icon-32.png',
      '128': '/icons/icon-128.png',
      '180': '/icons/icon-180.png',
    },
    web_accessible_resources: [
      {
        resources: ['icons/*'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
