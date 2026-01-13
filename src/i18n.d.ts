import 'i18next';
import en from './locales/en/translation.json';
import cs from './locales/cs/translation.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    returnEmptyString: false;
    defaultNS: 'translation';
    resources: {
      en: typeof en;
      cs: typeof cs;
    };
  }
}
