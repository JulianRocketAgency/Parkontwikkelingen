import { createClient } from '@/lib/supabase/server'
import { getOwners, getKavels } from '@/lib/queries'
import { EigenarenClient } from '@/components/eigenaren/EigenarenClient'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function EigenarenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [owners, kavels] = await Promise.all([
    getOwners(PARK_ID),
    getKavels(PARK_ID),
  ])

  return <EigenarenClient owners={owners} kavels={kavels} />
}
