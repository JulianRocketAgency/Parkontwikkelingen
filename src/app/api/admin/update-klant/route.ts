import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { id, naam, email, telefoon, adres, status, licentie_type, licentie_tot, max_parken, max_gebruikers, extra_parken, extra_gebruikers, notities } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await supabase
      .from('organisaties')
      .update({ naam, email, telefoon, adres, status, licentie_type, licentie_tot, max_parken, max_gebruikers, extra_parken, extra_gebruikers, notities })
      .eq('id', id)
      .select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ org: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
