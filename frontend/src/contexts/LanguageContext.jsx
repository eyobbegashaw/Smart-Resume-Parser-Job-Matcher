import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from '../i18n/translations';

const LanguageContext = createContext(null);
const LANG_STORAGE_KEY = 'tp_language';

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'am' || saved === 'en') return saved;
  } catch {
    // Ignore storage failures
  }
  return 'en';
};

const persistLanguage = (lang) => {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage failures
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLang, { persist = true } = {}) => {
    if (nextLang === 'en' || nextLang === 'am') {
      setLanguageState(nextLang);
      if (persist) persistLanguage(nextLang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'am' : 'en';
      persistLanguage(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key, vars, fallbackValue) => translate(language, key, vars, fallbackValue),
    [language]
  );

  const tEnum = useCallback(
    (group, value) => translate(language, `enums.${group}.${value}`, {}, value || '—'),
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t, tEnum }),
    [language, setLanguage, toggleLanguage, t, tEnum]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
