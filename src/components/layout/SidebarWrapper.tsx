import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './Sidebar'

export async function SidebarWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let userName = 'Gebruiker'
  let userRole = 'Uitloggen'
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, naam, role')
      .eq('id', user.id)
      .single()
    userName = profile?.naam ?? profile?.full_name ?? user.email ?? 'Gebruiker'
    userRole = profile?.role ?? 'gebruiker'
  }

  return <Sidebar userName={userName} userRole={userRole} />
}
