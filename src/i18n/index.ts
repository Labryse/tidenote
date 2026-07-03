import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import tr from './locales/tr.json';
import en from './locales/en.json';

import { syncAuthLanguage } from '../lib/firebase';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en }
    },
    fallbackLng: 'tr',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'tidenote-language'
    },
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

i18n.on('languageChanged', (lng) => {
  syncAuthLanguage(lng);
});

// Initial synchronization
syncAuthLanguage(i18n.language || 'tr');

export default i18n;
