import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { id, status, opmerking_vakman } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const updates: Record<string, unknown> = {}

    if (status !== undefined) {
      updates.status = status
      if (status === 'gereed') updates.gereed_op = new Date().toISOString()
      if (status === 'in_uitvoering') updates.gestart_op = new Date().toISOString()
    }

    if (opmerking_vakman !== undefined) {
      updates.opmerking_vakman = opmerking_vakman
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { data: taak } = await supabase
      .from('taken').select('optie_key, kavel_id').eq('id', id).single()

    const { error } = await supabase.from('taken').update(updates).eq('id', id)
    if (error) throw new Error(error.message)

    // Als gereed: zet ook _gereed op kavel_opties
    if (status === 'gereed' && taak?.optie_key && taak?.kavel_id) {
      await supabase
        .from('kavel_opties')
        .update({ [taak.optie_key + '_gereed']: true })
        .eq('kavel_id', taak.kavel_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
