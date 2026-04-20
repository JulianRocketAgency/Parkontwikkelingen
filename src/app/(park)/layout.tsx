import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { SidebarWrapper } from '@/components/layout/SidebarWrapper'

export default async function ParkLayout({ children }: { children: React.ReactNode }) {
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
    .select('role')
    .eq('id', user.id)
    .single()

  // Vakman krijgt eigen interface
  if (profile?.role === 'vakman') redirect('/vakman')

  // Koper krijgt eigen interface (later)
  if (profile?.role === 'koper') redirect('/koper')

  return (
    <div className="flex min-h-screen">
      <SidebarWrapper />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
