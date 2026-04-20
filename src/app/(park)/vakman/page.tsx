import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { VakmanClient } from '@/components/VakmanClient'

export default async function VakmanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await service
    .from('profiles')
    .select('*, vakman_categorieen(naam)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'vakman') redirect('/dashboard')

  const { data: taken } = await service
    .from('taken')
    .select('*, kavels(number, type, uitvoering, fase), vakman_categorieen(naam)')
    .eq('park_id', profile.park_id)
    .eq('vakman_categorie_id', profile.vakman_categorie_id)
    .order('prioriteit', { ascending: false })
    .order('created_at', { ascending: true })

  const { data: park } = await service
    .from('parks')
    .select('name')
    .eq('id', profile.park_id)
    .single()

  return (
    <VakmanClient
      profile={profile}
      taken={taken ?? []}
      parkNaam={park?.name ?? 'Park'}
    />
  )
}
