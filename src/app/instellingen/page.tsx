import { createClient } from '@/lib/supabase/server'
import { getPark, getKavels } from '@/lib/queries'
import { InstellingenClient } from '@/components/InstellingenClient'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function InstellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [park, kavels] = await Promise.all([
    getPark(PARK_ID),
    getKavels(PARK_ID),
  ])

  return <InstellingenClient park={park} kavels={kavels} />
}
