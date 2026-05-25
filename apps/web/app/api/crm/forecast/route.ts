import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { getForecast, getSalespersonReport, presetPeriod } from '../../../../lib/crm-forecast'

export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId') ?? null
  const preset = searchParams.get('preset') ?? 'this_month'
  const startParam = searchParams.get('start')
  const endParam   = searchParams.get('end')
  const mode = searchParams.get('mode') ?? 'forecast'

  const period = startParam && endParam
    ? { start: new Date(startParam), end: new Date(endParam), label: 'Custom' }
    : presetPeriod(preset)

  if (mode === 'report') {
    const report = await getSalespersonReport(ctx.tenant.id, { teamId, period })
    return NextResponse.json({ report, period })
  }

  const forecast = await getForecast(ctx.tenant.id, { teamId, period })
  return NextResponse.json({ forecast, period })
}
