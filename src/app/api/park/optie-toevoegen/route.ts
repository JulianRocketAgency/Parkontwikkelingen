import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { park_id, label } = await req.json()
    if (!label?.trim()) throw new Error('Label is verplicht')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    const slug = label.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

    // Bepaal volgorde
    const { count } = await supabase
      .from('park_opties')
      .select('*', { count: 'exact', head: true })
      .eq('park_id', park_id)

    const { data, error } = await supabase
      .from('park_opties')
      .insert({ park_id, slug, label: label.trim(), volgorde: (count ?? 0) + 1 })
      .select().single()

    if (error) throw new Error(error.message)

    // Maak kavel_optie_waarden rijen aan voor alle kavels in dit park
    const { data: kavels } = await supabase
      .from('kavels')
      .select('id')
      .eq('park_id', park_id)

    if (kavels?.length && data) {
      await supabase.from('kavel_optie_waarden').insert(
        kavels.map(k => ({ kavel_id: k.id, optie_id: data.id }))
      )
    }

    return NextResponse.json({ optie: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
