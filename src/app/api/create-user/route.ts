import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { naam, email, wachtwoord, role, vakman_categorie_id } = await req.json()

    // Use service role to create users
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: wachtwoord,
      email_confirm: true,
    })

    if (authError) throw new Error(authError.message)

    // Create/update profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        naam,
        full_name: naam,
        email,
        role,
        avatar_color: '#0071e3',
        vakman_categorie_id: vakman_categorie_id || null,
      })
      .select()
      .single()

    if (profileError) throw new Error(profileError.message)

    return NextResponse.json({ profile })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Onbekende fout' },
      { status: 400 }
    )
  }
}
