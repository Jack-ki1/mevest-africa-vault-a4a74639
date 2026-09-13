import React, { createContext, useContext, useState } from 'react';

type Lang = 'en' | 'sw';
const dict: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard', portfolio: 'My Portfolio', analytics: 'Analytics', markets: 'Markets',
    screener: 'Screener', calendar: 'Calendar', news: 'News Feed', community: 'Community', learn: 'Learn', settings: 'Settings',
    tagline: 'AI research layer for African + global investors',
  },
  sw: {
    dashboard: 'Dashibodi', portfolio: 'Portfoliyo Yangu', analytics: 'Uchambuzi', markets: 'Masoko',
    screener: 'Kichujio', calendar: 'Kalenda', news: 'Habari', community: 'Jamii', learn: 'Jifunze', settings: 'Mipangilio',
    tagline: 'Msaidizi wa AI kwa wawekezaji wa Afrika na kimataifa',
  },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string } | null>(null);
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('mevest_lang') as Lang) || 'en');
  const t = (k: string) => dict[lang][k] ?? dict.en[k] ?? k;
  const set = (l: Lang) => { localStorage.setItem('mevest_lang', l); setLang(l); };
  return <Ctx.Provider value={{ lang, setLang: set, t }}>{children}</Ctx.Provider>;
}
export function useLanguage() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLanguage outside provider');
  return c;
}
