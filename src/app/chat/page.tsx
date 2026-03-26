import { createClient } from '@/lib/supabase/server'
import { ChatClient } from '@/components/ChatClient'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [berichtenRes, ownersRes, profileRes] = await Promise.all([
    supabase.from('berichten').select('*').eq('park_id', PARK_ID).order('created_at', { ascending: true }),
    supabase.from('owners').select('*').eq('park_id', PARK_ID),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  return (
    <ChatClient
      berichten={berichtenRes.data ?? []}
      owners={ownersRes.data ?? []}
      currentUserId={user.id}
      currentUserName={profileRes.data?.full_name ?? user.email ?? 'Gebruiker'}
    />
  )
}
