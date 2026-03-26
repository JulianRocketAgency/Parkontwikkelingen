import { createClient } from '@/lib/supabase/server'
import { AccountClient } from '@/components/AccountClient'
import { redirect } from 'next/navigation'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return <AccountClient user={user} profile={profile} />
}
