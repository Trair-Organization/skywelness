import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import tr from './locales/tr';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    supportedLngs: ['tr', 'en'],
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'rezidans_admin_lang',
    },
    compatibilityJSON: 'v4',
  });

export function setAdminLanguage(lng: 'tr' | 'en'): void {
  void i18n.changeLanguage(lng);
}

export default i18n;
