import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  webExt: {
    disabled: true,
  },
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
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version: '1.0.0',
    default_locale: 'en',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: '/popup.html',
      default_title: '__MSG_extName__',
    },

    icons: {
      '16': '/icons/icon-16.png',
      '32': '/icons/icon-32.png',
      '128': '/icons/icon-128.png',
      '180': '/icons/icon-180.png',
    },
    web_accessible_resources: [
      {
        resources: ['icons/*', '_locales/*/messages.json'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
