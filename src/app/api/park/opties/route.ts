import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parkId = searchParams.get('park_id')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await supabase
    .from('park_opties')
    .select('*')
    .eq('park_id', parkId)
    .eq('actief', true)
    .order('volgorde')
  return NextResponse.json({ opties: data ?? [] })
}
