'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Dept {
  id: string; name: string; parentId: string | null; managerId: string | null; color: string | null
}
interface Emp {
  id: string; name: string; position: string | null; departmentId: string | null; managerId: string | null
}

function buildDeptTree(depts: Dept[]): (Dept & { children: any[] })[] {
  const map = new Map(depts.map((d) => [d.id, { ...d, children: [] as any[] }]))
  const roots: any[] = []
  for (const d of map.values()) {
    if (d.parentId && map.has(d.parentId)) {
      map.get(d.parentId)!.children.push(d)
    } else {
      roots.push(d)
    }
  }
  return roots
}

function DeptNode({ dept, employees, depth = 0 }: {
  dept: Dept & { children: any[] }
  employees: Emp[]
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const deptEmps = employees.filter((e) => e.departmentId === dept.id)
  const color = dept.color ?? '#6B7280'

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      {/* Connector line */}
      {depth > 0 && (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: -20, top: '50%', width: 16, height: 1, background: 'var(--border)' }} />
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        {/* Department card */}
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            padding: '6px 12px', borderRadius: 'var(--r-md)',
            border: `2px solid ${color}`,
            background: color + '18',
            userSelect: 'none',
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{dept.name}</span>
          <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            {deptEmps.length} orang
          </span>
          {(dept.children.length > 0) && (
            <span style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
              {expanded ? '▾' : '▸'}
            </span>
          )}
        </div>

        {/* Employees in this dept */}
        {expanded && deptEmps.length > 0 && (
          <div style={{ marginLeft: 24, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {deptEmps.map((emp) => (
              <Link key={emp.id} href={`/hr/employees/${emp.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '4px 10px', borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: '700 9px/1 var(--font-sans)', color: 'white', flexShrink: 0,
                  }}>
                    {emp.name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')}
                  </div>
                  <div>
                    <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{emp.name}</div>
                    {emp.position && (
                      <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{emp.position}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Child departments */}
      {expanded && dept.children.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: 20, borderLeft: '1px solid var(--border)', marginLeft: 16 }}>
          {dept.children.map((child) => (
            <DeptNode key={child.id} dept={child} employees={employees} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgChart({ departments, employees }: { departments: Dept[]; employees: Emp[] }) {
  const tree = buildDeptTree(departments)
  const unassigned = employees.filter((e) => !e.departmentId)

  return (
    <div style={{ padding: 'var(--s-6)', overflow: 'auto' }}>
      <div style={{ marginBottom: 'var(--s-5)' }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Struktur Organisasi</h1>
        <p style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
          {departments.length} departemen · {employees.length} karyawan aktif
        </p>
      </div>

      <div style={{ display: 'inline-block', minWidth: '100%' }}>
        {tree.length === 0 ? (
          <div style={{ color: 'var(--fg-3)', font: '13px/1.6 var(--font-sans)' }}>
            Belum ada departemen. Buat departemen di <Link href="/hr/departments" style={{ color: 'var(--indigo)' }}>halaman Departemen</Link>.
          </div>
        ) : (
          tree.map((root) => (
            <DeptNode key={root.id} dept={root} employees={employees} depth={0} />
          ))
        )}

        {unassigned.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Tanpa Departemen ({unassigned.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unassigned.map((emp) => (
                <Link key={emp.id} href={`/hr/employees/${emp.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '4px 10px', borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    font: '12px/1 var(--font-sans)', color: 'var(--fg-2)',
                  }}>
                    {emp.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
