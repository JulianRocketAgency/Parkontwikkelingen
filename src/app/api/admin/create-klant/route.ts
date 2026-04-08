import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { naam, email, telefoon, licentie_type, max_parken, max_gebruikers, park_naam } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const slug = naam.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

    const { data: org, error: orgError } = await supabase
      .from('organisaties')
      .insert({ naam, slug, email, telefoon, licentie_type, max_parken, max_gebruikers, status: 'actief' })
      .select().single()

    if (orgError) throw new Error(orgError.message)

    const parkNaam = park_naam || naam
    const { data: park, error: parkError } = await supabase
      .from('parks')
      .insert({ name: parkNaam, slug: slug + '-park1', organisatie_id: org.id, status: 'actief' })
      .select().single()

    if (parkError) throw new Error(parkError.message)

    return NextResponse.json({ org, park })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Fout opgetreden' },
      { status: 400 }
    )
  }
}
