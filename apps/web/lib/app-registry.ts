/**
 * App registry — single source of truth for the in-product app/module
 * inventory. Consumed by the sidebar (AppShell.tsx) for rendering and
 * by the command palette (KeyboardChrome.tsx) for ⌘K navigation.
 *
 * Pure data; icons are attached at render time in AppShell to avoid
 * coupling palette code to React component imports.
 */

export type AppGroupId = 'workspace' | 'apps' | 'platform'

export type AppId =
  | 'home'
  | 'chat'
  | 'proj'
  | 'time'
  | 'doc'
  | 'proses'
  | 'crm'
  | 'sales'
  | 'proc'
  | 'inv'
  | 'fin'
  | 'hr'
  | 'pay'
  | 'rent'
  | 'aip'
  | 'agent'
  | 'trig'
  | 'mig'

export interface AppEntry {
  id: AppId
  label: string
  href: string
  hotkey: string
  group: AppGroupId
  /** Extra search aliases (English synonyms, module codes, etc.) */
  keywords?: string[]
}

export const APP_GROUPS: { id: AppGroupId; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'apps',      label: 'Apps' },
  { id: 'platform',  label: 'Platform' },
]

export const APP_REGISTRY: AppEntry[] = [
  // Workspace
  { id: 'home',   label: 'Beranda',    href: '/',              hotkey: 'G H', group: 'workspace', keywords: ['home', 'dashboard'] },
  { id: 'chat',   label: 'Chat',       href: '/chat',          hotkey: 'G C', group: 'workspace', keywords: ['messages', 'pesan'] },
  { id: 'proj',   label: 'Proyek',     href: '/proj',          hotkey: 'G P', group: 'workspace', keywords: ['projects', 'tasks', 'tugas'] },
  { id: 'time',   label: 'Waktu',      href: '/time',          hotkey: 'G W', group: 'workspace', keywords: ['timesheets', 'jam'] },
  { id: 'doc',    label: 'Dokumen',    href: '/doc/documents', hotkey: 'G D', group: 'workspace', keywords: ['documents', 'files', 'berkas'] },
  { id: 'proses', label: 'Proses',     href: '/proses',        hotkey: 'G O', group: 'workspace', keywords: ['process', 'workflow', 'alur'] },

  // Apps
  { id: 'crm',   label: 'CRM',        href: '/crm/deals',    hotkey: 'G M', group: 'apps', keywords: ['customers', 'leads', 'deals', 'pelanggan'] },
  { id: 'sales', label: 'Penjualan',  href: '/sales/orders', hotkey: 'G L', group: 'apps', keywords: ['sales', 'orders', 'invoice'] },
  { id: 'proc',  label: 'Pembelian',  href: '/proc/orders',  hotkey: 'G B', group: 'apps', keywords: ['procurement', 'purchasing', 'po'] },
  { id: 'inv',   label: 'Inventori',  href: '/inv/products', hotkey: 'G I', group: 'apps', keywords: ['inventory', 'stock', 'produk'] },
  { id: 'fin',   label: 'Keuangan',   href: '/fin',          hotkey: 'G F', group: 'apps', keywords: ['finance', 'accounting', 'akuntansi'] },
  { id: 'hr',    label: 'SDM',        href: '/hr',           hotkey: 'G R', group: 'apps', keywords: ['hr', 'employees', 'karyawan'] },
  { id: 'pay',   label: 'Penggajian', href: '/pay',          hotkey: 'G Y', group: 'apps', keywords: ['payroll', 'gaji'] },
  { id: 'rent',  label: 'Sewa',       href: '/rent',         hotkey: 'G S', group: 'apps', keywords: ['rent', 'rental', 'leasing'] },

  // Platform
  { id: 'aip',   label: 'AI Search', href: '/aip/search', hotkey: 'G K', group: 'platform', keywords: ['ai', 'search', 'cari'] },
  { id: 'agent', label: 'Agent',     href: '/agent',      hotkey: 'G A', group: 'platform', keywords: ['agents', 'bot'] },
  { id: 'trig',  label: 'Triggers',  href: '/trig/rules', hotkey: 'G T', group: 'platform', keywords: ['triggers', 'rules', 'automation'] },
  { id: 'mig',   label: 'Import',    href: '/mig/import', hotkey: 'G N', group: 'platform', keywords: ['migration', 'import', 'csv'] },
]

const REGISTRY_BY_ID = new Map(APP_REGISTRY.map((a) => [a.id, a]))

export function getApp(id: AppId): AppEntry | undefined {
  return REGISTRY_BY_ID.get(id)
}

/**
 * Substring match across label, id, and keywords. Returns the registry
 * order so the most prominent apps stay on top of the palette.
 */
export function searchApps(query: string, limit = 8): AppEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: AppEntry[] = []
  for (const app of APP_REGISTRY) {
    if (hits.length >= limit) break
    if (
      app.label.toLowerCase().includes(q) ||
      app.id.includes(q) ||
      app.keywords?.some((k) => k.toLowerCase().includes(q))
    ) {
      hits.push(app)
    }
  }
  return hits
}
