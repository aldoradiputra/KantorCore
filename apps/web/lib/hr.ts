import 'server-only'
import { and, asc, desc, eq, ilike, or } from 'drizzle-orm'
import {
  departments,
  employees,
  type Department,
  type Employee,
  type EmploymentType,
  type EmployeeStatus,
} from '@kantorcore/db'
import { withTenant } from './db'

// ── Departments ───────────────────────────────────────────────────────────────

export async function listDepartments(tenantId: string): Promise<Department[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(departments)
      .where(eq(departments.tenantId, tenantId))
      .orderBy(asc(departments.name)),
  )
}

export async function createDepartment(
  tenantId: string,
  input: { name: string; parentId?: string | null },
): Promise<{ ok: true; department: Department } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Nama departemen wajib diisi.' }
  if (name.length > 255) return { ok: false, error: 'Nama terlalu panjang.' }

  return withTenant(tenantId, async (tx) => {
    const [dept] = await tx
      .insert(departments)
      .values({ tenantId, name, parentId: input.parentId ?? null })
      .returning()
    return { ok: true, department: dept }
  })
}

// ── Employees ─────────────────────────────────────────────────────────────────

export interface EmployeeFilter {
  status?: EmployeeStatus
  departmentId?: string
  search?: string
}

export interface EmployeeWithDept extends Employee {
  departmentName: string | null
}

export async function listEmployees(
  tenantId: string,
  filter: EmployeeFilter = {},
  limit = 100,
): Promise<EmployeeWithDept[]> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [eq(employees.tenantId, tenantId)]
    if (filter.status) conditions.push(eq(employees.status, filter.status))
    if (filter.departmentId) conditions.push(eq(employees.departmentId, filter.departmentId))
    if (filter.search) {
      const q = `%${filter.search}%`
      conditions.push(
        or(
          ilike(employees.name, q),
          ilike(employees.email, q),
          ilike(employees.position, q),
          ilike(employees.employeeCode, q),
        )!,
      )
    }

    const rows = await tx
      .select({
        employee: employees,
        departmentName: departments.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(asc(employees.name))
      .limit(limit)

    return rows.map((r) => ({ ...r.employee, departmentName: r.departmentName ?? null }))
  })
}

export async function getEmployee(
  tenantId: string,
  id: string,
): Promise<EmployeeWithDept | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ employee: employees, departmentName: departments.name })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)))
      .limit(1)
    if (!rows[0]) return null
    return { ...rows[0].employee, departmentName: rows[0].departmentName ?? null }
  })
}

export interface EmployeeInput {
  employeeCode?: string | null
  name: string
  email?: string | null
  phone?: string | null
  nik?: string | null
  npwp?: string | null
  bpjsKetenagakerjaan?: string | null
  bpjsKesehatan?: string | null
  departmentId?: string | null
  position?: string | null
  employmentType?: EmploymentType
  status?: EmployeeStatus
  hireDate?: string | null   // ISO date string YYYY-MM-DD
  terminationDate?: string | null
  notes?: string | null
}

export async function createEmployee(
  tenantId: string,
  input: EmployeeInput,
): Promise<{ ok: true; employee: Employee } | { ok: false; error: string }> {
  const name = input.name?.trim()
  if (!name) return { ok: false, error: 'Nama karyawan wajib diisi.' }

  return withTenant(tenantId, async (tx) => {
    const [emp] = await tx
      .insert(employees)
      .values({
        tenantId,
        name,
        employeeCode: input.employeeCode?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        nik: input.nik?.replace(/\s/g, '') || null,
        npwp: input.npwp?.replace(/\s/g, '') || null,
        bpjsKetenagakerjaan: input.bpjsKetenagakerjaan?.trim() || null,
        bpjsKesehatan: input.bpjsKesehatan?.trim() || null,
        departmentId: input.departmentId || null,
        position: input.position?.trim() || null,
        employmentType: input.employmentType ?? 'full_time',
        status: input.status ?? 'active',
        hireDate: input.hireDate || null,
        terminationDate: input.terminationDate || null,
        notes: input.notes?.trim() || null,
      })
      .returning()
    return { ok: true, employee: emp }
  })
}

export async function updateEmployee(
  tenantId: string,
  id: string,
  patch: Partial<EmployeeInput>,
): Promise<{ ok: true; employee: Employee } | { ok: false; error: string }> {
  if (patch.name !== undefined && !patch.name?.trim()) {
    return { ok: false, error: 'Nama karyawan wajib diisi.' }
  }

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.name !== undefined) values['name'] = patch.name.trim()
  if ('employeeCode' in patch) values['employeeCode'] = patch.employeeCode?.trim() || null
  if ('email' in patch) values['email'] = patch.email?.trim() || null
  if ('phone' in patch) values['phone'] = patch.phone?.trim() || null
  if ('nik' in patch) values['nik'] = patch.nik?.replace(/\s/g, '') || null
  if ('npwp' in patch) values['npwp'] = patch.npwp?.replace(/\s/g, '') || null
  if ('bpjsKetenagakerjaan' in patch) values['bpjsKetenagakerjaan'] = patch.bpjsKetenagakerjaan?.trim() || null
  if ('bpjsKesehatan' in patch) values['bpjsKesehatan'] = patch.bpjsKesehatan?.trim() || null
  if ('departmentId' in patch) values['departmentId'] = patch.departmentId || null
  if ('position' in patch) values['position'] = patch.position?.trim() || null
  if ('employmentType' in patch) values['employmentType'] = patch.employmentType
  if ('status' in patch) values['status'] = patch.status
  if ('hireDate' in patch) values['hireDate'] = patch.hireDate || null
  if ('terminationDate' in patch) values['terminationDate'] = patch.terminationDate || null
  if ('notes' in patch) values['notes'] = patch.notes?.trim() || null

  return withTenant(tenantId, async (tx) => {
    const [emp] = await tx
      .update(employees)
      .set(values as never)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)))
      .returning()
    if (!emp) return { ok: false, error: 'Karyawan tidak ditemukan.' }
    return { ok: true, employee: emp }
  })
}

export async function deleteEmployee(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withTenant(tenantId, async (tx) => {
    const result = await tx
      .delete(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)))
      .returning({ id: employees.id })
    if (!result[0]) return { ok: false, error: 'Karyawan tidak ditemukan.' }
    return { ok: true }
  })
}

// ── Display helpers ───────────────────────────────────────────────────────────

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
