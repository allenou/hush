import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';

export type Locale = 'en' | 'zh-CN';
export type Translations = typeof en;

const translations: Record<Locale, Translations> = {
  en,
  'zh-CN': zhCN,
};

export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}
