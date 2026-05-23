import type { ModelMeta } from './types'

export const hrEmployeeModel: ModelMeta = {
  entity: 'hr.employee',
  module: 'IS-HR',
  label:       { id: 'Karyawan', en: 'Employee' },
  pluralLabel: { id: 'Karyawan', en: 'Employees' },
  displayField: 'name',
  help:
    'Catatan karyawan tenant. Menyimpan identitas Indonesia (NIK, NPWP, BPJS Ketenagakerjaan, BPJS Kesehatan). ' +
    'Terhubung opsional ke crm.contact untuk golden record dan ke hr.department untuk struktur organisasi. ' +
    'Dasar untuk pay.payslip (payroll) dan hr.timesheet_entry (timesheet).',

  fields: {
    contactId: {
      name: 'contactId',
      label: { id: 'Kontak Terkait', en: 'Linked Contact' },
      type: 'many2one',
      target: 'crm.contact',
      help: 'Opsional FK ke platform.contacts (golden record). Nullable untuk back-compat.',
    },
    employeeCode: {
      name: 'employeeCode',
      label: { id: 'Kode Karyawan', en: 'Employee Code' },
      type: 'text',
      searchable: true,
      tooltip: 'NIP atau kode internal karyawan.',
    },
    name: {
      name: 'name',
      label: { id: 'Nama', en: 'Name' },
      type: 'text',
      required: true,
      searchable: true,
    },
    email: {
      name: 'email',
      label: { id: 'Email', en: 'Email' },
      type: 'email',
      searchable: true,
    },
    phone: {
      name: 'phone',
      label: { id: 'Telepon', en: 'Phone' },
      type: 'phone',
    },
    nik: {
      name: 'nik',
      label: { id: 'NIK', en: 'NIK' },
      type: 'text',
      searchable: true,
      help: 'Nomor Induk Kependudukan — 16 digit identitas KTP. Validasi format di application layer.',
      tooltip: 'Nomor KTP.',
    },
    npwp: {
      name: 'npwp',
      label: { id: 'NPWP', en: 'NPWP' },
      type: 'text',
      searchable: true,
      help: 'Nomor Pokok Wajib Pajak. Digunakan untuk perhitungan PPh 21 payroll.',
    },
    bpjsKetenagakerjaan: {
      name: 'bpjsKetenagakerjaan',
      label: { id: 'BPJS Ketenagakerjaan', en: 'BPJS Ketenagakerjaan' },
      type: 'text',
      tooltip: 'Nomor BPJS Ketenagakerjaan (Jamsostek).',
    },
    bpjsKesehatan: {
      name: 'bpjsKesehatan',
      label: { id: 'BPJS Kesehatan', en: 'BPJS Kesehatan' },
      type: 'text',
      tooltip: 'Nomor BPJS Kesehatan.',
    },
    departmentId: {
      name: 'departmentId',
      label: { id: 'Departemen', en: 'Department' },
      type: 'many2one',
      target: 'hr.department',
    },
    position: {
      name: 'position',
      label: { id: 'Jabatan', en: 'Position' },
      type: 'text',
      searchable: true,
    },
    employmentType: {
      name: 'employmentType',
      label: { id: 'Tipe Kerja', en: 'Employment Type' },
      type: 'enum',
      required: true,
      default: 'full_time',
      options: [
        { value: 'full_time', label: { id: 'Tetap',     en: 'Full Time' } },
        { value: 'part_time', label: { id: 'Paruh Waktu', en: 'Part Time' } },
        { value: 'contract',  label: { id: 'Kontrak',   en: 'Contract' } },
        { value: 'intern',    label: { id: 'Magang',    en: 'Intern' } },
      ],
    },
    status: {
      name: 'status',
      label: { id: 'Status', en: 'Status' },
      type: 'enum',
      required: true,
      default: 'active',
      widget: 'badge',
      options: [
        { value: 'active',     label: { id: 'Aktif',         en: 'Active' } },
        { value: 'inactive',   label: { id: 'Tidak Aktif',   en: 'Inactive' } },
        { value: 'terminated', label: { id: 'Berhenti',      en: 'Terminated' } },
      ],
    },
    hireDate: {
      name: 'hireDate',
      label: { id: 'Tanggal Masuk', en: 'Hire Date' },
      type: 'date',
    },
    terminationDate: {
      name: 'terminationDate',
      label: { id: 'Tanggal Berhenti', en: 'Termination Date' },
      type: 'date',
    },
    notes: {
      name: 'notes',
      label: { id: 'Catatan', en: 'Notes' },
      type: 'longtext',
      widget: 'textarea',
    },
    createdAt: {
      name: 'createdAt',
      label: { id: 'Dibuat Pada', en: 'Created At' },
      type: 'datetime',
      readonly: true,
    },
    updatedAt: {
      name: 'updatedAt',
      label: { id: 'Diperbarui Pada', en: 'Updated At' },
      type: 'datetime',
      readonly: true,
    },
  },

  views: {
    list: {
      columns: ['employeeCode', 'name', 'position', 'departmentId', 'employmentType', 'status'],
      defaultSort: { field: 'name', direction: 'asc' },
      filters: ['status', 'departmentId', 'employmentType'],
    },
    form: {
      rows: [
        'name',
        ['employeeCode', 'status'],
        ['email', 'phone'],
      ],
      tabs: [
        {
          id: 'job',
          label: { id: 'Pekerjaan', en: 'Job' },
          rows: [
            ['departmentId', 'position'],
            ['employmentType', 'hireDate'],
            'terminationDate',
          ],
        },
        {
          id: 'legal',
          label: { id: 'Identitas Indonesia', en: 'Indonesian Identifiers' },
          rows: [
            ['nik', 'npwp'],
            ['bpjsKetenagakerjaan', 'bpjsKesehatan'],
          ],
        },
        {
          id: 'links',
          label: { id: 'Tautan', en: 'Links' },
          rows: ['contactId'],
        },
        {
          id: 'notes',
          label: { id: 'Catatan', en: 'Notes' },
          rows: ['notes'],
        },
      ],
    },
  },

  perms: {
    create: ['admin', 'agent'],
    read:   ['admin', 'member', 'agent'],
    update: ['admin', 'agent'],
    delete: ['admin'],
  },

  chatter: true,
  activities: true,
}
