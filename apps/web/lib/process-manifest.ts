import type { ProcessMode, StepKind } from '@kantorcore/db'

/**
 * Process Library — canonical seed manifest.
 *
 * This file is the single source of truth for system-seeded process templates.
 * Bump MANIFEST_VERSION whenever any template here changes; the seeder will
 * upgrade existing tenants on next call.
 *
 * Each template documents a real cross-record workflow in KantorCore. The same
 * data structure that powers the read-only docs view (now) will power IS-FLOW's
 * execution engine (later) — process_templates is forward-compatible with
 * process_instances + process_runs that will join via the same id.
 */

export const MANIFEST_VERSION = 1

export interface ProcessStepSeed {
  sequence: number
  kind: StepKind
  mode: ProcessMode
  name: string
  description: string
  trigger?: string
  producesRecordType?: string
  requiredRole?: string
  reversible: boolean
  auditEvent?: string
}

export interface ProcessTemplateSeed {
  slug: string
  name: string
  module: string
  mode: ProcessMode
  description: string
  steps: ProcessStepSeed[]
}

export const PROCESS_MANIFEST: ProcessTemplateSeed[] = [
  // ── Sales: SO → DO → Invoice ────────────────────────────────────────────────
  {
    slug: 'sales-order-to-invoice',
    name: 'Pesanan Penjualan → Surat Jalan → Faktur',
    module: 'sales',
    mode: 'deterministic',
    description:
      'Saat pesanan penjualan dikonfirmasi, sistem otomatis membuat surat jalan di modul gudang. Faktur dibuat sesuai kebijakan tagihan (saat pesanan atau saat pengiriman) dan memerlukan rekonsiliasi 3-arah (PO ↔ surat jalan ↔ faktur).',
    steps: [
      {
        sequence: 1,
        kind: 'human',
        mode: 'deterministic',
        name: 'Buat draf pesanan penjualan',
        description: 'Sales menyiapkan SO dengan baris produk, harga, syarat pembayaran.',
        requiredRole: 'sales',
        reversible: true,
        auditEvent: 'sales.order_draft',
      },
      {
        sequence: 2,
        kind: 'trigger',
        mode: 'deterministic',
        name: 'Konfirmasi pesanan',
        description: 'Status SO berubah dari draft → confirmed. Stok direservasi otomatis.',
        trigger: 'SO.status → confirmed',
        requiredRole: 'sales_manager',
        reversible: true,
        auditEvent: 'sales.order_confirm',
      },
      {
        sequence: 3,
        kind: 'action',
        mode: 'deterministic',
        name: 'Buat surat jalan',
        description: 'Sistem membuat DO di modul Gudang dengan baris yang sama. Tidak ada intervensi manusia.',
        producesRecordType: 'inv.delivery_order',
        reversible: false,
        auditEvent: 'inv.delivery_order_create',
      },
      {
        sequence: 4,
        kind: 'human',
        mode: 'deterministic',
        name: 'Validasi pengiriman',
        description: 'Gudang menandai DO sebagai terkirim. Stok keluar dicatat di buku stok.',
        requiredRole: 'warehouse',
        reversible: false,
        auditEvent: 'inv.delivery_validate',
      },
      {
        sequence: 5,
        kind: 'action',
        mode: 'deterministic',
        name: 'Buat faktur',
        description:
          'Sistem membuat faktur sesuai kebijakan: "ordered" → segera setelah SO dikonfirmasi; "delivered" → setelah DO divalidasi. Faktur menunggu rekonsiliasi 3-arah sebelum diposting.',
        producesRecordType: 'fin.invoice',
        reversible: true,
        auditEvent: 'fin.invoice_create',
      },
      {
        sequence: 6,
        kind: 'human',
        mode: 'deterministic',
        name: 'Catat pembayaran',
        description: 'Finance mencocokkan pembayaran masuk dengan faktur. Saldo piutang berkurang.',
        producesRecordType: 'fin.payment',
        requiredRole: 'finance',
        reversible: true,
        auditEvent: 'fin.payment_register',
      },
    ],
  },

  // ── Finance: Vendor Bill → Asset ────────────────────────────────────────────
  {
    slug: 'vendor-bill-to-asset',
    name: 'Tagihan Vendor → Aset Tetap',
    module: 'fin',
    mode: 'deterministic',
    description:
      'Saat tagihan vendor mengandung baris dengan kategori produk "aset", sistem otomatis membuat catatan aset tetap saat tagihan dikonfirmasi. Jadwal penyusutan dihitung dari metode dan masa manfaat di kategori aset.',
    steps: [
      {
        sequence: 1,
        kind: 'human',
        mode: 'deterministic',
        name: 'Catat tagihan vendor',
        description: 'AP staff input tagihan vendor: nomor, tanggal, baris produk, PPN.',
        requiredRole: 'finance',
        reversible: true,
        auditEvent: 'fin.bill_draft',
      },
      {
        sequence: 2,
        kind: 'decision',
        mode: 'deterministic',
        name: 'Tandai baris sebagai aset',
        description:
          'Sistem mendeteksi otomatis jika kategori produk = "aset". Pengguna juga dapat menandai manual via tombol pintar "Catat sebagai Aset".',
        reversible: true,
      },
      {
        sequence: 3,
        kind: 'trigger',
        mode: 'deterministic',
        name: 'Konfirmasi tagihan',
        description: 'Status tagihan: draft → posted. Jurnal akuntansi tercatat.',
        trigger: 'Bill.status → posted',
        requiredRole: 'finance_manager',
        reversible: false,
        auditEvent: 'fin.bill_post',
      },
      {
        sequence: 4,
        kind: 'action',
        mode: 'deterministic',
        name: 'Buat catatan aset tetap',
        description:
          'Sistem membuat record aset di modul Aset Tetap untuk tiap baris bertanda aset. Nilai perolehan = harga baris. Tombol pintar di tagihan menampilkan jumlah aset terkait.',
        producesRecordType: 'fin.fixed_asset',
        reversible: false,
        auditEvent: 'fin.fixed_asset_create',
      },
      {
        sequence: 5,
        kind: 'action',
        mode: 'deterministic',
        name: 'Hitung jadwal penyusutan',
        description:
          'Sistem menghasilkan jadwal penyusutan bulanan dari metode (garis lurus / saldo menurun) dan masa manfaat kategori. Tidak ada intervensi manusia.',
        producesRecordType: 'fin.depreciation_schedule',
        reversible: true,
        auditEvent: 'fin.depreciation_schedule_create',
      },
    ],
  },

  // ── HR: Employee Onboarding ─────────────────────────────────────────────────
  {
    slug: 'employee-onboarding',
    name: 'Onboarding Karyawan',
    module: 'hr',
    mode: 'hybrid',
    description:
      'Alur penerimaan karyawan baru: catatan HR + akun sistem dibuat secara deterministik, sementara penyusunan paket sambutan dan asignmen mentor diserahkan ke Agent berdasarkan jabatan, departemen, dan kebijakan perusahaan.',
    steps: [
      {
        sequence: 1,
        kind: 'human',
        mode: 'deterministic',
        name: 'Buat catatan karyawan',
        description: 'HR memasukkan data dasar: nama, NIK, NPWP, BPJS, jabatan, departemen, tanggal mulai.',
        requiredRole: 'hr',
        producesRecordType: 'hr.employee',
        reversible: true,
        auditEvent: 'hr.employee_create',
      },
      {
        sequence: 2,
        kind: 'action',
        mode: 'deterministic',
        name: 'Provisi akun sistem',
        description:
          'Sistem otomatis membuat user account, email kantor, dan menambahkan ke kanal chat default sesuai departemen.',
        producesRecordType: 'platform.user',
        reversible: false,
        auditEvent: 'platform.user_provision',
      },
      {
        sequence: 3,
        kind: 'agent',
        mode: 'probabilistic',
        name: 'Susun paket sambutan',
        description:
          'Agent menyusun email selamat datang, daftar bacaan onboarding, dan jadwal perkenalan minggu pertama berdasarkan jabatan + kebijakan perusahaan. Hasil ditinjau HR sebelum dikirim.',
        requiredRole: 'agent',
        reversible: true,
        auditEvent: 'agent.run',
      },
      {
        sequence: 4,
        kind: 'agent',
        mode: 'probabilistic',
        name: 'Sarankan mentor',
        description:
          'Agent memilih mentor dari karyawan aktif dengan kriteria: departemen sama, masa kerja > 1 tahun, beban mentoring < 2. HR menyetujui atau mengganti.',
        requiredRole: 'agent',
        reversible: true,
        auditEvent: 'agent.run',
      },
      {
        sequence: 5,
        kind: 'human',
        mode: 'deterministic',
        name: 'Check-in minggu pertama',
        description: 'HR atau atasan langsung mengadakan sesi check-in, mencatat umpan balik di profil karyawan.',
        requiredRole: 'hr',
        reversible: true,
        auditEvent: 'hr.checkin_log',
      },
    ],
  },

  // ── Rent: Asset Reservation Lifecycle ──────────────────────────────────────
  {
    slug: 'rent-asset-lifecycle',
    name: 'Siklus Reservasi Aset Sewa',
    module: 'rent',
    mode: 'deterministic',
    description:
      'Alur reservasi aset sewa dari draf sampai pengembalian deposit. Setiap transisi status reservasi otomatis memperbarui status aset (available → reserved → rented → available) untuk mencegah double-booking.',
    steps: [
      {
        sequence: 1,
        kind: 'human',
        mode: 'deterministic',
        name: 'Buat reservasi',
        description: 'Petugas membuat reservasi dengan pelanggan, aset, tanggal mulai/selesai, tarif. Sistem mengecek konflik jadwal.',
        requiredRole: 'rent_clerk',
        producesRecordType: 'rent.reservation',
        reversible: true,
        auditEvent: 'rent.reservation_create',
      },
      {
        sequence: 2,
        kind: 'trigger',
        mode: 'deterministic',
        name: 'Konfirmasi reservasi',
        description: 'Status: draft → confirmed. Aset otomatis ditandai "reserved" agar tidak bisa dibooking ulang untuk periode yang sama.',
        trigger: 'Reservation.status → confirmed',
        requiredRole: 'rent_clerk',
        reversible: true,
        auditEvent: 'rent.reservation_confirm',
      },
      {
        sequence: 3,
        kind: 'trigger',
        mode: 'deterministic',
        name: 'Aktifkan penyewaan',
        description: 'Saat pelanggan mengambil aset, status: confirmed → active. Aset otomatis ditandai "rented".',
        trigger: 'Reservation.status → active',
        requiredRole: 'rent_clerk',
        reversible: false,
        auditEvent: 'rent.reservation_activate',
      },
      {
        sequence: 4,
        kind: 'action',
        mode: 'deterministic',
        name: 'Selesaikan dan kembalikan',
        description:
          'Saat aset dikembalikan, status: active → completed. Aset otomatis ditandai "available" dan tersedia untuk reservasi berikutnya.',
        trigger: 'Reservation.status → completed',
        reversible: false,
        auditEvent: 'rent.reservation_complete',
      },
      {
        sequence: 5,
        kind: 'human',
        mode: 'deterministic',
        name: 'Proses pengembalian deposit',
        description: 'Petugas memeriksa kondisi aset, menetapkan potongan jika ada, lalu menandai deposit dikembalikan.',
        requiredRole: 'rent_clerk',
        reversible: true,
        auditEvent: 'rent.deposit_return',
      },
    ],
  },
]
