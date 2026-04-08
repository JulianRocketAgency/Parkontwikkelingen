import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { id, naam, prijs_per_maand, max_parken, max_gebruikers, max_kavels, features } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await supabase
      .from('licentie_pakketten')
      .update({ naam, prijs_per_maand, max_parken, max_gebruikers, max_kavels, features })
      .eq('id', id)
      .select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ pakket: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
