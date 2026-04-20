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
    const updates: Record<string, unknown> = { status }
    if (opmerking_vakman !== undefined) updates.opmerking_vakman = opmerking_vakman
    if (status === 'gereed') updates.gereed_op = new Date().toISOString()

    const { data, error } = await supabase
      .from('taken')
      .update(updates)
      .eq('id', id)
      .select().single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ taak: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fout' }, { status: 400 })
  }
}
