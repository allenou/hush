import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Search Result Blocker',
    description: 'Block unwanted search results by domain',
    version: '0.2.0',
    permissions: ['contextMenus', 'storage', 'scripting', 'tabs', 'activeTab'],
    host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_popup: '/popup.html',
    },
    icons: {
      '16': '/icons/icon-16.png',
      '32': '/icons/icon-32.png',
      '180': '/icons/icon-180.png',
    },
  },
});
