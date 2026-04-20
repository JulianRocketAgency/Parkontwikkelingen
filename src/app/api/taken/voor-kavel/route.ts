import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const kavelId = searchParams.get('kavel_id')
    if (!kavelId) return NextResponse.json({ taken: [] })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data } = await supabase
      .from('taken')
      .select('id, optie_key, status, kavel_id, opmerking_vakman, gestart_op, gereed_op, geblokkeerd, blokkeer_reden')
      .eq('kavel_id', kavelId)

    return NextResponse.json({ taken: data ?? [] })
  } catch (e: unknown) {
    return NextResponse.json({ taken: [] })
  }
}
