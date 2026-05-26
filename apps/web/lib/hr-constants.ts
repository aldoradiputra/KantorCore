// Client-safe HR constants — no server-only imports
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern'
export type EmployeeStatus = 'active' | 'inactive' | 'terminated'

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

import type { Employee } from '@kantorcore/db'
export interface EmployeeWithDept extends Employee {
  departmentName: string | null
}
