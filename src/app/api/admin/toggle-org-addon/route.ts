import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { organisatie_id, addon_id, aantal, actief } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (!actief || aantal <= 0) {
      // Verwijder of zet op 0
      await supabase.from('organisatie_addons')
        .delete()
        .eq('organisatie_id', organisatie_id)
        .eq('addon_id', addon_id)
      return NextResponse.json({ removed: true })
    }

    const { data, error } = await supabase.from('organisatie_addons')
      .upsert(
        { organisatie_id, addon_id, aantal, actief: true, gestart_op: new Date().toISOString().split('T')[0] },
        { onConflict: 'organisatie_id,addon_id' }
      )
      .select().single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ org_addon: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
