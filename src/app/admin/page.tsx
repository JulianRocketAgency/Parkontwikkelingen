import { createClient } from '@/lib/supabase/server'
import { AdminClient } from '@/components/AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const [orgsRes, parksRes, profilesRes, adminsRes] = await Promise.all([
    supabase.from('organisaties').select('*').order('created_at', { ascending: false }),
    supabase.from('parks').select('*, organisaties(naam)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('platform_admins').select('*'),
  ])

  return (
    <AdminClient
      organisaties={orgsRes.data ?? []}
      parks={parksRes.data ?? []}
      profiles={profilesRes.data ?? []}
      admins={adminsRes.data ?? []}
    />
  )
}
