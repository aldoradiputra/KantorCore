'use client'

import { createContext, useContext } from 'react'

export type Locale = 'en' | 'id'
export const LocaleContext = createContext<Locale>('en')
export const useLocale = () => useContext(LocaleContext)

export const STRINGS = {
  en: {
    roadmap: 'Roadmap',
    searchPlaceholder: 'Search roadmap…',
    // SearchModal
    searchModalPlaceholder: 'Search modules and features…',
    searchGroupModules: 'Modules & Features',
    searchEmpty: 'No results for',
  },
  id: {
    roadmap: 'Peta Jalan',
    searchPlaceholder: 'Cari peta jalan…',
    searchModalPlaceholder: 'Cari modul dan fitur…',
    searchGroupModules: 'Modul & Fitur',
    searchEmpty: 'Tidak ada hasil untuk',
  },
} satisfies Record<Locale, typeof STRINGS['en']>
