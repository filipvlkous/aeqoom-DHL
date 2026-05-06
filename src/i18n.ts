import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation_en.json';
import de from './locales/de/translation_de.json';
import cs from './locales/cs/translation_cs.json';
import fr from './locales/fr/translation_fr.json';
import hu from './locales/hu/translation_hu.json';
import pl from './locales/pl/translation_pl.json';
import sk from './locales/sk/translation_sk.json';
import ua from './locales/ua/translation_ua.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    cs: { translation: cs },
    de: { translation: de },
    fr: { translation: fr },
    hu: { translation: hu },
    pl: { translation: pl },
    sk: { translation: sk },
    ua: { translation: ua },
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
