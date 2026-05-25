import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../../../../../../lib/db'
import { salesOrders } from '@kantorcore/db'
import { randomBytes } from 'node:crypto'
import { requireAuthedContext } from '../../../../../../lib/requireSession'

/** Generate signature token (admin) — locks SO to require signing before confirm. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const token = randomBytes(24).toString('hex')
  const db = getDb()
  const [updated] = await db
    .update(salesOrders)
    .set({ requiresSignature: true, signatureToken: token, updatedAt: new Date() })
    .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, ctx.tenant.id)))
    .returning({ id: salesOrders.id, signatureToken: salesOrders.signatureToken })

  if (!updated) return NextResponse.json({ error: 'SO tidak ditemukan.' }, { status: 404 })

  return NextResponse.json({
    token: updated.signatureToken,
    portalUrl: `/portal/quote/${updated.signatureToken}`,
  })
}

/** Public sign — customer submits name; no auth, validates token via DB lookup. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const body = await req.json().catch(() => null)
  const token = body?.token as string | undefined
  const name = body?.name as string | undefined
  if (!token || !name?.trim()) {
    return NextResponse.json({ error: 'Token dan nama wajib diisi.' }, { status: 400 })
  }

  const db = getDb()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const [signed] = await db
    .update(salesOrders)
    .set({
      signedAt:     new Date(),
      signedByName: name.trim(),
      signedByIp:   ip,
      status:       'confirmed',
      confirmedAt:  new Date(),
      updatedAt:    new Date(),
    })
    .where(and(eq(salesOrders.id, id), eq(salesOrders.signatureToken, token)))
    .returning({ id: salesOrders.id, soNumber: salesOrders.soNumber })

  if (!signed) return NextResponse.json({ error: 'Token tidak valid atau sudah ditandatangani.' }, { status: 400 })

  return NextResponse.json({ ok: true, soNumber: signed.soNumber })
}
