import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import tr from './locales/tr';

const STORAGE_KEY = 'rezidans_lang';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'tr',
  fallbackLng: ['tr', 'en'],
  supportedLngs: ['tr', 'en'],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function loadStoredLanguage(): Promise<void> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'tr') {
      await i18n.changeLanguage(v);
    }
  } catch {
    // ignore
  }
}

export async function persistLanguage(lng: 'tr' | 'en'): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

export { STORAGE_KEY };
export default i18n;
