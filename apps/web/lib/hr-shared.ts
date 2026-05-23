import type { Employee, EmploymentType, EmployeeStatus } from '@kantorcore/db'

export type { EmploymentType, EmployeeStatus }

export interface EmployeeWithDept extends Employee {
  departmentName: string | null
}

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: 'Penuh Waktu',
  part_time: 'Paruh Waktu',
  contract: 'Kontrak',
  intern: 'Magang',
}

export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  terminated: 'Diberhentikan',
}
