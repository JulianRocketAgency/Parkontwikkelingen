import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { name, email, phone, address, park_id } = await req.json()
    if (!name?.trim()) throw new Error('Naam is verplicht')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('owners')
      .insert({ name: name.trim(), email: email || null, phone: phone || null, address: address || null, park_id })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ owner: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
