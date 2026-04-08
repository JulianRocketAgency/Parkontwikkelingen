import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: admin } = await service
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!admin) redirect('/dashboard')

  return (
    <html lang="nl">
      <body className="bg-[#f5f5f7] min-h-screen">
        {children}
      </body>
    </html>
  )
}
