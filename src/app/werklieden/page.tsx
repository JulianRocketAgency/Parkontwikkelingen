import { createClient } from '@/lib/supabase/server'
import { WerkliedenClient } from '@/components/WerkliedenClient'
import { getVakmanCategorieen } from '@/lib/queries'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function WerkliedenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profiles } = await supabase.from('profiles').select('*')
  const vakmanCategorieen = await getVakmanCategorieen(PARK_ID)
  return <WerkliedenClient profiles={profiles ?? []} vakmanCategorieen={vakmanCategorieen} />
}
