import { createClient } from '@/lib/supabase/server'
import { getPark, getKavels, getParkMaps, getFaseStatussen, getTermijnConfig, getBetalingen } from '@/lib/queries'
import { DashboardClient } from '@/components/kavels/DashboardClient'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [park, kavels, parkMaps, faseStatussen, termijnConfig, betalingen] = await Promise.all([
    getPark(PARK_ID),
    getKavels(PARK_ID),
    getParkMaps(PARK_ID),
    getFaseStatussen(PARK_ID),
    getTermijnConfig(PARK_ID),
    getBetalingen(PARK_ID),
  ])

  return (
    <DashboardClient
      park={park}
      kavels={kavels}
      parkMaps={parkMaps}
      faseStatussen={faseStatussen}
      termijnConfig={termijnConfig}
      betalingen={betalingen}
    />
  )
}
