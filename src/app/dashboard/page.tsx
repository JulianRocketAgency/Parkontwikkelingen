'use server'
import { createClient } from '@/lib/supabase/server'
import { getKavels, getPark } from '@/lib/queries'
import { DashboardClient } from '@/components/kavels/DashboardClient'
import { redirect } from 'next/navigation'

// Default park ID — in production this comes from user profile
const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [park, kavels] = await Promise.all([
    getPark(PARK_ID),
    getKavels(PARK_ID),
  ])

  return <DashboardClient park={park} kavels={kavels} />
}
