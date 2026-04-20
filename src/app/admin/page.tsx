import { createClient } from '@supabase/supabase-js'
import { AdminClient } from '@/components/AdminClient'

export default async function AdminPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [orgsRes, parksRes, profilesRes, adminsRes, pakkettenRes, addonsRes, orgAddonsRes, parkRollenRes, medewerkerTypesRes, vakmanCatRes] = await Promise.all([
    supabase.from('organisaties').select('*').order('created_at', { ascending: false }),
    supabase.from('parks').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*, vakman_categorieen(naam)').order('created_at', { ascending: false }),
    supabase.from('platform_admins').select('*'),
    supabase.from('licentie_pakketten').select('*').eq('actief', true).order('prijs_per_maand'),
    supabase.from('addons').select('*').eq('actief', true).order('prijs_per_maand'),
    supabase.from('organisatie_addons').select('*'),
    supabase.from('park_rollen').select('*'),
    supabase.from('medewerker_types').select('*'),
    supabase.from('vakman_categorieen').select('*'),
  ])

  return (
    <AdminClient
      organisaties={orgsRes.data ?? []}
      parks={parksRes.data ?? []}
      profiles={profilesRes.data ?? []}
      admins={adminsRes.data ?? []}
      pakketten={pakkettenRes.data ?? []}
      addons={addonsRes.data ?? []}
      orgAddons={orgAddonsRes.data ?? []}
      parkRollen={parkRollenRes.data ?? []}
      medewerkerTypes={medewerkerTypesRes.data ?? []}
      vakmanCategorieen={vakmanCatRes.data ?? []}
    />
  )
}
