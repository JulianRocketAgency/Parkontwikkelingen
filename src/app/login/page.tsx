'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="text-[28px] font-bold tracking-tight mb-1">
            Park<span className="text-[#0071e3]">Bouw</span>
          </div>
          <div className="text-[14px] text-[#6e6e73]">Log in om verder te gaan</div>
        </div>

        <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-black/[0.05]">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">E-mailadres</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="naam@voorbeeld.nl"
                className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">Wachtwoord</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
            </div>
            {error && <p className="text-[13px] text-[#ff3b30]">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-all disabled:opacity-60 shadow-[0_1px_4px_rgba(0,113,227,0.3)]">
              {loading ? 'Bezig…' : 'Inloggen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
