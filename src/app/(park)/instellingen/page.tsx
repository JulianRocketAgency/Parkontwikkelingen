import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getPark, getKavels, getParkMaps, getOptieCategorieen, getVakmanCategorieen, getOptieVakmanKoppelingen } from '@/lib/queries'
import { InstellingenClient } from '@/components/InstellingenClient'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function InstellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const [park, kavels, parkMaps, allParks, optieCategorieen, vakmanCategorieen, koppelingen, parkOptiesRes] = await Promise.all([
    getPark(PARK_ID),
    getKavels(PARK_ID),
    getParkMaps(PARK_ID),
    supabase.from('parks').select('id, name').then(r => r.data ?? []),
    getOptieCategorieen(PARK_ID),
    getVakmanCategorieen(PARK_ID),
    getOptieVakmanKoppelingen(PARK_ID),
    service.from('park_opties').select('*').eq('park_id', PARK_ID).eq('actief', true).order('volgorde'),
  ])

  return (
    <InstellingenClient
      park={park}
      kavels={kavels}
      parkMaps={parkMaps}
      allParks={allParks}
      optieCategorieen={optieCategorieen}
      vakmanCategorieen={vakmanCategorieen}
      initialKoppelingen={Object.fromEntries(koppelingen.map(k => [k.optie_key, k.vakman_categorie_id]))}
      parkOpties={parkOptiesRes.data ?? []}
    />
  )
}
