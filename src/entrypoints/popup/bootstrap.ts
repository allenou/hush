import { mount } from 'svelte';
import { get } from '@/utils/storage';
import { getLocale, setDocumentLocale } from '@/utils/locale';
import { initLocale } from '@/utils/locale-store.svelte';
import App from './App.svelte';

/** 在挂载 popup 前完成语言初始化，避免首屏短暂显示浏览器默认语言。 */
export async function mountPopup(target: HTMLElement): Promise<ReturnType<typeof mount>> {
  const storage = await get();
  await initLocale(storage.locale);
  setDocumentLocale(getLocale());
  return mount(App, { target });
}
