import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { WerkliedenClient } from '@/components/WerkliedenClient'
import { redirect } from 'next/navigation'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export default async function WerkliedenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [profilesRes, vakmanCatRes] = await Promise.all([
    service.from('profiles').select('*').eq('park_id', PARK_ID),
    service.from('vakman_categorieen').select('*').eq('park_id', PARK_ID).order('volgorde'),
  ])

  return (
    <WerkliedenClient
      profiles={profilesRes.data ?? []}
      vakmanCategorieen={vakmanCatRes.data ?? []}
    />
  )
}
