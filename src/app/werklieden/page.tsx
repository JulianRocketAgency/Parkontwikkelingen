import { createClient } from '@/lib/supabase/server'
import { WerkliedenClient } from '@/components/WerkliedenClient'
import { redirect } from 'next/navigation'

export default async function WerkliedenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profiles } = await supabase.from('profiles').select('*')
  return <WerkliedenClient profiles={profiles ?? []} />
}
