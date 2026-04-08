import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
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

  // Check of Tessi actief is voor dit park
  let tessiActief = false
  if (user) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profile } = await service.from('profiles').select('park_id').eq('id', user.id).single()
    if (profile?.park_id) {
      const { data: park } = await service.from('parks').select('organisatie_id').eq('id', profile.park_id).single()
      if (park?.organisatie_id) {
        const { data: addon } = await service
          .from('organisatie_addons')
          .select('id')
          .eq('organisatie_id', park.organisatie_id)
          .eq('addon_id', '3401c303-59b1-40f9-a8f6-ea325fb5957e')
          .eq('actief', true)
          .single()
        tessiActief = !!addon
      }
    }
  }

  return <Sidebar userName={userName} userRole={userRole} tessiActief={tessiActief} />
}
