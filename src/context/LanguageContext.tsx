import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getUiDictionaryForLanguage,
  translateFullUiText,
} from '../utils/indicTranslationEngine';

export interface IndianLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  region: string;
}

export const ALL_INDIAN_LANGUAGES: IndianLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin', region: 'Pan-India' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari', region: 'North & Central India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari', region: 'Maharashtra & Goa' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil', region: 'Tamil Nadu & Puducherry' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu', region: 'Andhra Pradesh & Telangana' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada', region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam', region: 'Kerala & Lakshadweep' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali', region: 'West Bengal & Tripura' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati', region: 'Gujarat & DNHDD' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', region: 'Punjab & Chandigarh' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia', region: 'Odisha' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Assamese', region: 'Assam & Northeast' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'Perso-Arabic', region: 'Jammu & Kashmir, Telangana, UP' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'Devanagari', region: 'Classical Pan-India' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', script: 'Devanagari', region: 'Goa & Coastal Karnataka' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', script: 'Devanagari', region: 'Bihar & Jharkhand' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', script: 'Devanagari', region: 'Jammu & Himachal' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर / کٲشُر', script: 'Devanagari / Perso-Arabic', region: 'Kashmir Valley' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্', script: 'Meitei / Bengali', region: 'Manipur' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'Devanagari', region: 'Sikkim & Darjeeling' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'Devanagari', region: 'Bodoland, Assam' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ / संताली', script: 'Ol Chiki / Devanagari', region: 'Jharkhand, Odisha, WB' },
  { code: 'sd', name: 'Sindhi', nativeName: 'सिन्धी / سنڌي', script: 'Devanagari / Perso-Arabic', region: 'Western India' },
];

export interface PythonNlpTranslationResponse {
  languageCode: string;
  languageName: string;
  nativeName: string;
  script: string;
  region: string;
  sourceText: string;
  translatedText: string;
  tokens: string[];
  tokenCount: number;
  uiDictionary: Record<string, string>;
  engine: string;
}

interface LanguageContextType {
  currentLanguage: string;
  currentLanguageMeta: IndianLanguageOption;
  languages: IndianLanguageOption[];
  uiDictionary: Record<string, string>;
  isTranslating: boolean;
  lastNlpResult: PythonNlpTranslationResponse | null;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, fallback: string) => string;
  translateTextViaPythonNlp: (
    text: string,
    targetLang?: string
  ) => Promise<PythonNlpTranslationResponse | null>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_STORAGE_KEY = 'bm_v6_indian_language';

const originalTextNodeMap = new WeakMap<Text, string>();
const lastTranslatedNodeMap = new WeakMap<Text, { lang: string; value: string }>();
const originalPlaceholderMap = new WeakMap<Element, string>();

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });
  const [uiDictionary, setUiDictionary] = useState<Record<string, string>>(() =>
    getUiDictionaryForLanguage(currentLanguage)
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastNlpResult, setLastNlpResult] = useState<PythonNlpTranslationResponse | null>(null);
  const isApplyingDomTranslation = useRef(false);

  const currentLanguageMeta =
    ALL_INDIAN_LANGUAGES.find((l) => l.code === currentLanguage) || ALL_INDIAN_LANGUAGES[0];

  const applyWholeDomTranslation = useCallback((langCode: string) => {
    if (typeof document === 'undefined' || !document.body || isApplyingDomTranslation.current) {
      return;
    }
    isApplyingDomTranslation.current = true;
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest('[data-no-translate="true"]')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let currentNode = walker.nextNode() as Text | null;
      while (currentNode) {
        const currentVal = currentNode.nodeValue || '';
        const prevRecord = lastTranslatedNodeMap.get(currentNode);

        // If React updated the text node underneath us, refresh the stored English source
        if (!originalTextNodeMap.has(currentNode)) {
          originalTextNodeMap.set(currentNode, currentVal);
        } else if (prevRecord && prevRecord.value !== currentVal) {
          originalTextNodeMap.set(currentNode, currentVal);
        }

        const sourceText = originalTextNodeMap.get(currentNode) || '';
        if (sourceText.trim().length > 0) {
          const targetVal =
            langCode === 'en' ? sourceText : translateFullUiText(sourceText, langCode);
          if (currentNode.nodeValue !== targetVal) {
            currentNode.nodeValue = targetVal;
          }
          lastTranslatedNodeMap.set(currentNode, { lang: langCode, value: targetVal });
        }

        currentNode = walker.nextNode() as Text | null;
      }

      // Also translate input/textarea placeholders across all modules
      const inputs = document.body.querySelectorAll('input[placeholder], textarea[placeholder]');
      inputs.forEach((el) => {
        if (!originalPlaceholderMap.has(el)) {
          originalPlaceholderMap.set(el, el.getAttribute('placeholder') || '');
        }
        const sourcePlaceholder = originalPlaceholderMap.get(el) || '';
        if (sourcePlaceholder) {
          const nextPlaceholder =
            langCode === 'en'
              ? sourcePlaceholder
              : translateFullUiText(sourcePlaceholder, langCode);
          if (el.getAttribute('placeholder') !== nextPlaceholder) {
            el.setAttribute('placeholder', nextPlaceholder);
          }
        }
      });
    } finally {
      isApplyingDomTranslation.current = false;
    }
  }, []);

  const translateTextViaPythonNlp = useCallback(
    async (
      text: string,
      targetLang?: string
    ): Promise<PythonNlpTranslationResponse | null> => {
      const code = targetLang || currentLanguage;
      setIsTranslating(true);
      try {
        const res = await fetch('/api/nlp/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: code, text }),
        });
        if (res.ok) {
          const data: PythonNlpTranslationResponse = await res.json();
          setLastNlpResult(data);
          if (data.uiDictionary) {
            setUiDictionary({
              ...getUiDictionaryForLanguage(code),
              ...data.uiDictionary,
            });
          }
          return data;
        }
      } catch {
        // Fallback to local dictionary if offline
      } finally {
        setIsTranslating(false);
      }
      setUiDictionary(getUiDictionaryForLanguage(code));
      return null;
    },
    [currentLanguage]
  );

  const setLanguage = useCallback(
    async (code: string) => {
      setCurrentLanguageState(code);
      setUiDictionary(getUiDictionaryForLanguage(code));
      try {
        localStorage.setItem(LANG_STORAGE_KEY, code);
      } catch {
        // Ignore storage error
      }
      applyWholeDomTranslation(code);
      await translateTextViaPythonNlp(
        'Welcome to BuildMate Dashboard, Daily Attendance, My Salary, and Used Material Entry',
        code
      );
    },
    [applyWholeDomTranslation, translateTextViaPythonNlp]
  );

  useEffect(() => {
    setUiDictionary(getUiDictionaryForLanguage(currentLanguage));
    applyWholeDomTranslation(currentLanguage);
    translateTextViaPythonNlp(
      'Welcome to BuildMate Dashboard, Daily Attendance, My Salary, and Used Material Entry',
      currentLanguage
    );
  }, [currentLanguage, applyWholeDomTranslation, translateTextViaPythonNlp]);

  // Observe DOM mutations (module navigation, modals, table updates) and translate immediately
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    applyWholeDomTranslation(currentLanguage);

    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (isApplyingDomTranslation.current) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyWholeDomTranslation(currentLanguage);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [currentLanguage, applyWholeDomTranslation]);

  const t = useCallback(
    (key: string, fallback: string) => {
      if (currentLanguage === 'en') return fallback;
      const translated = uiDictionary[key];
      if (translated) {
        return translated;
      }
      return translateFullUiText(fallback, currentLanguage);
    },
    [currentLanguage, uiDictionary]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        currentLanguageMeta,
        languages: ALL_INDIAN_LANGUAGES,
        uiDictionary,
        isTranslating,
        lastNlpResult,
        setLanguage,
        t,
        translateTextViaPythonNlp,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
