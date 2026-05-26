import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../../lib/tenants'
import { getPayRun } from '../../../../../../lib/payroll'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'djp'

  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const data = await getPayRun(ctx.tenant.id, id)
  if (!data) return NextResponse.json({ error: 'Pay run tidak ditemukan.' }, { status: 404 })

  if (type === 'djp') {
    // DJP Coretax / e-Bupot PPh 21 JSON format
    const payload = {
      tahunPajak: new Date(data.run.periodStart).getFullYear(),
      masaPajak: new Date(data.run.periodStart).getMonth() + 1,
      buktiPotong: data.payslips.map((p) => {
        const pph21Line = p.lines.find(
          (l) => l.name.toLowerCase().includes('pph 21') || l.name.toLowerCase().includes('pph21'),
        )
        const gross = p.grossTotal
        const tax = pph21Line?.amount ?? 0
        return {
          nik: '', // populated from employee record
          npwp: '', // populated from employee record
          nama: p.employeeName,
          jabatan: p.position ?? '',
          penghasilanBruto: gross,
          pphDipotong: tax,
          kodeObjekPajak: '21-100-01',
        }
      }),
    }
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="djp-pph21-${data.run.code}.json"`,
      },
    })
  }

  if (type === 'bpjs-ket') {
    // SIPP Online CSV for BPJS Ketenagakerjaan
    const rows = ['NIK,Nama,Upah JHT,JHT Perusahaan,JHT Karyawan,JKK,JKM']
    for (const p of data.payslips) {
      const jhtEmpLine = p.lines.find((l) => l.name.includes('JHT 3.7%'))
      const jhtEmpeeLine = p.lines.find((l) => l.name.includes('JHT 2%'))
      const jkkLine = p.lines.find((l) => l.name.includes('JKK'))
      const jkmLine = p.lines.find((l) => l.name.includes('JKM'))
      rows.push(
        [
          '', // NIK from employee
          p.employeeName,
          p.grossTotal,
          jhtEmpLine?.amount ?? 0,
          jhtEmpeeLine?.amount ?? 0,
          jkkLine?.amount ?? 0,
          jkmLine?.amount ?? 0,
        ].join(','),
      )
    }
    return new NextResponse(rows.join('\n'), {
      headers: {
        'content-type': 'text/csv',
        'content-disposition': `attachment; filename="sipp-bpjsket-${data.run.code}.csv"`,
      },
    })
  }

  if (type === 'bpjs-kes') {
    // EDABU CSV for BPJS Kesehatan
    const rows = ['NIK,Nama,Upah BPJS Kes,Premi Perusahaan,Premi Karyawan']
    for (const p of data.payslips) {
      const empLine = p.lines.find((l) => l.name.includes('Kesehatan 4%'))
      const empeeLine = p.lines.find(
        (l) => l.name.includes('Kesehatan 1%') && l.kind === 'deduction',
      )
      rows.push(
        ['', p.employeeName, p.grossTotal, empLine?.amount ?? 0, empeeLine?.amount ?? 0].join(','),
      )
    }
    return new NextResponse(rows.join('\n'), {
      headers: {
        'content-type': 'text/csv',
        'content-disposition': `attachment; filename="edabu-bpjskes-${data.run.code}.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Tipe export tidak dikenal.' }, { status: 400 })
}
