import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import cs from './locales/cs/translation.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    cs: { translation: cs },
  },
  lng: 'en',
  fallbackLng: 'en',
  returnNull: false,
  returnEmptyString: false,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
