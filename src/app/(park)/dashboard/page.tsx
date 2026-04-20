import { createClient } from '@/lib/supabase/server'
import { getPark, getKavels, getParkMaps, getFaseStatussen, getTermijnConfig, getBetalingen, getVakmanCategorieen, getOptieVakmanKoppelingen } from '@/lib/queries'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { DashboardClient } from '@/components/kavels/DashboardClient'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const [park, kavels, parkMaps, faseStatussen, termijnConfig, betalingen, vakmanCategorieen, koppelingen, takenRes] = await Promise.all([
    getPark(PARK_ID),
    getKavels(PARK_ID),
    getParkMaps(PARK_ID),
    getFaseStatussen(PARK_ID),
    getTermijnConfig(PARK_ID),
    getBetalingen(PARK_ID),
    getVakmanCategorieen(PARK_ID),
    getOptieVakmanKoppelingen(PARK_ID),
    service.from('taken').select('id, optie_key, status, kavel_id, opmerking_vakman, gestart_op, gereed_op').eq('park_id', PARK_ID),
  ])

  return (
    <DashboardClient
      park={park}
      kavels={kavels}
      parkMaps={parkMaps}
      faseStatussen={faseStatussen}
      termijnConfig={termijnConfig}
      betalingen={betalingen}
      vakmanCategorieen={vakmanCategorieen}
      optieKoppelingen={Object.fromEntries(koppelingen.map(k => [k.optie_key, k.vakman_categorie_id]))}
      taken={takenRes.data ?? []}
    />
  )
}
