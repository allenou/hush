import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Search Result Blocker',
    description: 'Block unwanted search results by domain',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: '/popup.html',
      default_title: 'Search Result Blocker',
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
