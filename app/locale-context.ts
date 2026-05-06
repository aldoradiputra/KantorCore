'use client'

import { createContext, useContext } from 'react'

export type Locale = 'en' | 'id'
export const LocaleContext = createContext<Locale>('en')
export const useLocale = () => useContext(LocaleContext)

export const STRINGS = {
  en: {
    // TopNav
    tabs: { roadmap: 'Roadmap', docs: 'Docs', learn: 'Learn' },
    searchPlaceholder: { roadmap: 'Search roadmap…', docs: 'Search docs…', learn: 'Search lessons…' },
    askClaude: 'Ask Claude',
    // DocSidebar sections
    phase1Label: 'PHASE 1 — FOUNDATION',
    phase2Label: 'PHASE 2 — EXPANSION',
    phase3Label: 'PHASE 3 — SCALE',
    // Welcome page
    welcomeSuper: 'Documentation',
    welcomeTitle: 'Welcome to Indonesia System',
    welcomeIntro: 'A national corporate operating system for Indonesia — HR, Finance, Procurement, Sales, and Operations in one platform, natively integrated with BPJS, CoreTax DJP, PrivyID, and QRIS.',
    browseByModule: 'Browse by module',
    recentUpdates: 'Recent updates',
    changelogLink: 'Changelog →',
    quickStartCards: [
      { tag: 'NEW HERE',  title: 'Quick start',      sub: 'Get the lay of the land in 5 minutes' },
      { tag: 'USERS',     title: 'Using the system', sub: 'HR, Finance, Procurement, day-to-day ops' },
      { tag: 'TEAM',      title: 'Internal docs',    sub: 'Architecture, Platform Core, ops and deploy' },
    ],
    open: 'Open →',
    phase: 'Phase',
    // ChatPanel
    chatIntro: "Hi! I can answer questions across all docs. Try:",
    chatPlaceholder: 'Ask anything…',
    chatSuggestions: [
      'What is Platform Core?',
      'What modules ship in Phase 1?',
      'How does multi-tenancy work?',
      'What Indonesian integrations are included?',
      'Explain the Tool Registry',
    ],
    // SearchModal
    searchModalPlaceholder: 'Search docs and modules…',
    searchGroupDocs: 'Documentation',
    searchGroupModules: 'Modules & Features',
    searchEmpty: 'No results for',
  },
  id: {
    tabs: { roadmap: 'Peta Jalan', docs: 'Dokumentasi', learn: 'Pelajari' },
    searchPlaceholder: { roadmap: 'Cari peta jalan…', docs: 'Cari dokumentasi…', learn: 'Cari pelajaran…' },
    askClaude: 'Tanya Claude',
    phase1Label: 'FASE 1 — FONDASI',
    phase2Label: 'FASE 2 — EKSPANSI',
    phase3Label: 'FASE 3 — SKALA',
    welcomeSuper: 'Dokumentasi',
    welcomeTitle: 'Selamat Datang di Indonesia System',
    welcomeIntro: 'Sistem operasi korporat nasional untuk Indonesia — HR, Keuangan, Pengadaan, Penjualan, dan Operasional dalam satu platform, terintegrasi langsung dengan BPJS, CoreTax DJP, PrivyID, dan QRIS.',
    browseByModule: 'Jelajahi per modul',
    recentUpdates: 'Pembaruan terkini',
    changelogLink: 'Catatan perubahan →',
    quickStartCards: [
      { tag: 'PEMULA',    title: 'Mulai cepat',      sub: 'Pahami gambaran besar dalam 5 menit' },
      { tag: 'PENGGUNA',  title: 'Menggunakan sistem', sub: 'HR, Keuangan, Pengadaan, operasional harian' },
      { tag: 'TIM',       title: 'Dokumen internal',  sub: 'Arsitektur, Platform Core, ops dan deploy' },
    ],
    open: 'Buka →',
    phase: 'Fase',
    chatIntro: "Halo! Saya bisa menjawab pertanyaan tentang semua dokumentasi. Coba:",
    chatPlaceholder: 'Tanya apa saja…',
    chatSuggestions: [
      'Apa itu Platform Core?',
      'Modul apa saja yang ada di Fase 1?',
      'Bagaimana multi-tenancy bekerja?',
      'Integrasi Indonesia apa yang tersedia?',
      'Jelaskan Tool Registry',
    ],
    searchModalPlaceholder: 'Cari dokumentasi dan modul…',
    searchGroupDocs: 'Dokumentasi',
    searchGroupModules: 'Modul & Fitur',
    searchEmpty: 'Tidak ada hasil untuk',
  },
} satisfies Record<Locale, typeof STRINGS['en']>
