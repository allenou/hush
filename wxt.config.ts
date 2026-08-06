import { defineConfig } from 'wxt';
import packageJson from './package.json' with { type: 'json' };
import { SEARCH_ENGINE_MATCH_PATTERNS } from './src/constants/search-hosts';

export default defineConfig({
  srcDir: 'src',
  // Edge 与 Chrome 共用 Chromium MV3 构建；Firefox 也使用 MV3，避免维护两套入口实现。
  targetBrowsers: ['chrome', 'edge', 'firefox'],
  manifestVersion: 3,
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
  manifest: (env) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version: packageJson.version,
    default_locale: 'en',
    // Firefox Add-ons 对新扩展要求明确声明数据收集情况。Hush 不上传用户数据；
    // Firefox 构建也不会启用可选的 Sentry 诊断上报（见 initSentry）。
    ...(env.browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          data_collection_permissions: {
            required: ['none'],
          },
        },
      },
    } : {}),
    permissions: ['storage', 'contextMenus'],
    host_permissions: [
      ...SEARCH_ENGINE_MATCH_PATTERNS,
      ...(env.browser === 'firefox' ? [] : [
        'https://*.ingest.sentry.io/*',
        'https://*.ingest.us.sentry.io/*',
        'https://*.ingest.de.sentry.io/*',
      ]),
    ],
    action: {
      default_popup: '/popup.html',
      default_title: '__MSG_extName__',
    },

    icons: {
      '16': '/icons/icon-16.png',
      '32': '/icons/icon-32.png',
      '48': '/icons/icon-48.png',
      '128': '/icons/icon-128.png',
      '180': '/icons/icon-180.png',
    },
    web_accessible_resources: [
      {
        resources: ['icons/*', '_locales/*/messages.json'],
        matches: SEARCH_ENGINE_MATCH_PATTERNS,
      },
    ],
  }),
});
