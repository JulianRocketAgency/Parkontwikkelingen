import { createClient } from '@supabase/supabase-js'
import { RechtenClient } from '@/components/RechtenClient'

export default async function RechtenPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [parksRes, parkRollenRes, medewerkerTypesRes, vakmanCatRes] = await Promise.all([
    supabase.from('parks').select('*, organisaties(naam)'),
    supabase.from('park_rollen').select('*'),
    supabase.from('medewerker_types').select('*'),
    supabase.from('vakman_categorieen').select('*'),
  ])

  return (
    <RechtenClient
      parks={parksRes.data ?? []}
      parkRollen={parkRollenRes.data ?? []}
      medewerkerTypes={medewerkerTypesRes.data ?? []}
      vakmanCategorieen={vakmanCatRes.data ?? []}
    />
  )
}
