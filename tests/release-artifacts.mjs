import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifestPath = resolve(root, '.output/chrome-mv3/manifest.json');
const zipPath = resolve(root, `.output/hush-search-${packageJson.version}-chrome.zip`);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, packageJson.version);
assert.deepEqual(manifest.permissions, ['storage', 'contextMenus']);
assert.equal(manifest.content_scripts.length, 1);
assert.deepEqual(manifest.content_scripts[0].js, ['content-scripts/content.js']);

const serializedManifest = JSON.stringify(manifest);
for (const forbidden of ['<all_urls>', 'localhost', '127.0.0.1', 'context-menu-guard']) {
  assert.equal(serializedManifest.includes(forbidden), false, `Manifest contains ${forbidden}`);
}

assert.ok(statSync(zipPath).size > 100_000, 'Release ZIP is unexpectedly small');
const zipEntries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
  .trim()
  .split('\n');

for (const required of [
  'manifest.json',
  'background.js',
  'options.html',
  'popup.html',
  'content-scripts/content.js',
]) {
  assert.ok(zipEntries.includes(required), `Release ZIP is missing ${required}`);
}
assert.equal(zipEntries.some((entry) => entry.includes('context-menu-guard')), false);
assert.equal(zipEntries.some((entry) => entry.endsWith('.map')), false);

console.log(`Release artifact checks passed (${zipEntries.length} files, ${statSync(zipPath).size} bytes)`);
