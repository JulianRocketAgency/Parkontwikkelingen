import { createClient } from '@/lib/supabase/server'
import { TessiClient } from '@/components/TessiClient'
import { redirect } from 'next/navigation'

export default async function TessiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('naam, full_name').eq('id', user.id).single()
  const userName = profile?.naam ?? profile?.full_name ?? 'je'
  return <TessiClient userName={userName} />
}
