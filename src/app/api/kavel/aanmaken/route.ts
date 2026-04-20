import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { park_id, number, fase, type, uitvoering } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Maak kavel aan
    const { data: kavel, error } = await supabase
      .from('kavels')
      .insert({ park_id, number, fase, type, uitvoering })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    // Maak kavel_status aan
    await supabase.from('kavel_status').insert({ kavel_id: kavel.id })

    // Maak kavel_opties aan (legacy)
    await supabase.from('kavel_opties').insert({ kavel_id: kavel.id })

    // Maak kavel_optie_waarden aan voor alle park opties
    const { data: parkOpties } = await supabase
      .from('park_opties')
      .select('id')
      .eq('park_id', park_id)
      .eq('actief', true)

    if (parkOpties?.length) {
      await supabase.from('kavel_optie_waarden').insert(
        parkOpties.map(o => ({ kavel_id: kavel.id, optie_id: o.id }))
      )
    }

    return NextResponse.json({ kavel })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
