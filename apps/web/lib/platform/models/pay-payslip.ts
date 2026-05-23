import type { ModelMeta } from './types'

export const payPayslipModel: ModelMeta = {
  entity: 'pay.payslip',
  module: 'IS-PAY',
  label:       { id: 'Slip Gaji', en: 'Payslip' },
  pluralLabel: { id: 'Slip Gaji', en: 'Payslips' },
  displayField: 'employeeName',
  help:
    'Slip gaji per karyawan untuk satu pay run (periode). Memiliki banyak payslipLines (earning + deduction). ' +
    'Total bruto, total potongan, dan gaji bersih disimpan sebagai bigint IDR. ' +
    'PPh 21 dan BPJS rates tidak dihitung otomatis — operator mengisi line components manual. ' +
    'Saat pay run di-confirm, semua payslip-nya terkunci dan ikut posting journal entry.',

  fields: {
    payRunId: {
      name: 'payRunId',
      label: { id: 'Pay Run', en: 'Pay Run' },
      type: 'many2one',
      target: 'pay.pay_run',
      required: true,
      help: 'Periode pay run induk. Payslip tidak dapat diubah setelah pay run posted.',
    },
    employeeId: {
      name: 'employeeId',
      label: { id: 'Karyawan', en: 'Employee' },
      type: 'many2one',
      target: 'hr.employee',
      required: true,
    },
    employeeName: {
      name: 'employeeName',
      label: { id: 'Nama Karyawan', en: 'Employee Name' },
      type: 'text',
      required: true,
      searchable: true,
      help: 'Snapshot nama karyawan pada saat payslip dibuat (untuk audit pasca-rename).',
    },
    position: {
      name: 'position',
      label: { id: 'Jabatan', en: 'Position' },
      type: 'text',
      help: 'Snapshot jabatan saat payslip dibuat.',
    },
    grossTotal: {
      name: 'grossTotal',
      label: { id: 'Total Bruto', en: 'Gross Total' },
      type: 'monetary',
      currency: 'IDR',
      default: 0,
      readonly: true,
      help: 'Jumlah semua line kind=earning. Dihitung otomatis dari payslipLines.',
    },
    deductionTotal: {
      name: 'deductionTotal',
      label: { id: 'Total Potongan', en: 'Deduction Total' },
      type: 'monetary',
      currency: 'IDR',
      default: 0,
      readonly: true,
      help: 'Jumlah semua line kind=deduction (PPh 21, BPJS, dll).',
    },
    netTotal: {
      name: 'netTotal',
      label: { id: 'Gaji Bersih', en: 'Net Total' },
      type: 'monetary',
      currency: 'IDR',
      default: 0,
      readonly: true,
      help: 'grossTotal - deductionTotal. Dibayarkan ke karyawan.',
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
      columns: ['employeeName', 'position', 'grossTotal', 'deductionTotal', 'netTotal'],
      defaultSort: { field: 'employeeName', direction: 'asc' },
      filters: ['payRunId', 'employeeId'],
    },
    form: {
      rows: [
        ['payRunId', 'employeeId'],
        ['employeeName', 'position'],
      ],
      tabs: [
        {
          id: 'totals',
          label: { id: 'Total', en: 'Totals' },
          rows: [
            ['grossTotal', 'deductionTotal'],
            'netTotal',
          ],
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
    read:   ['admin', 'agent', 'owner'],
    update: ['admin', 'agent'],
    delete: ['admin'],
  },

  chatter: false,
}
