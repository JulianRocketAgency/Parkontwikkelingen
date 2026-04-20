import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { kavel_id, optie_id, gekocht, besteld, gereed, notitie } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (gekocht !== undefined) updates.gekocht = gekocht
    if (besteld !== undefined) updates.besteld = besteld
    if (gereed !== undefined) updates.gereed = gereed
    if (notitie !== undefined) updates.notitie = notitie

    const { error } = await supabase
      .from('kavel_optie_waarden')
      .upsert({ kavel_id, optie_id, ...updates }, { onConflict: 'kavel_id,optie_id' })

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
