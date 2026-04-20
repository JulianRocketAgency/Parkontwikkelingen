import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const kavelId = searchParams.get('kavel_id')
  if (!kavelId) return NextResponse.json({ waarden: [] })
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await supabase
    .from('kavel_optie_waarden')
    .select('*')
    .eq('kavel_id', kavelId)
  return NextResponse.json({ waarden: data ?? [] })
}
