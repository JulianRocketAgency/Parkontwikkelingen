'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  user: { id: string; email?: string }
  profile: { id: string; full_name?: string; naam?: string; role?: string; avatar_color?: string } | null
}

const COLORS = ['#0071e3','#30d158','#ff9f0a','#ff3b30','#bf5af2','#32ade6','#ff6961','#5e5ce6']

export function AccountClient({ user, profile }: Props) {
  const [naam, setNaam] = useState(profile?.naam ?? profile?.full_name ?? '')
  const [color, setColor] = useState(profile?.avatar_color ?? '#0071e3')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function initials(name: string) {
    return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('') || '?'
  }

  async function save() {
    setSaving(true)
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        naam,
        full_name: naam,
        avatar_color: color,
      })
      setToast('Opgeslagen ✓')
      setTimeout(() => setToast(''), 2000)
      router.refresh()
    } catch { setToast('Opslaan mislukt') }
    finally { setSaving(false) }
  }

  const roleLabels: Record<string, string> = {
    developer: 'Ontwikkelaar', projectleider: 'Projectleider',
    planner: 'Planner', vakman: 'Vakman', koper: 'Koper',
  }

  return (
    <div className="p-7 max-w-[600px]">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50">{toast}</div>
      )}

      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-[-0.5px]">Mijn account</h1>
        <p className="text-[14px] text-[#6e6e73] mt-0.5">Beheer je profiel en accountgegevens</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Avatar & naam */}
        <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
          <div className="text-[15px] font-semibold mb-4">Profiel</div>
          <div className="flex items-center gap-5 mb-6">
            <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[22px] font-bold text-white flex-shrink-0"
              style={{ background: color }}>
              {initials(naam || user.email || '?')}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#1d1d1f] mb-1">{naam || 'Naam niet ingesteld'}</div>
              <div className="text-[12px] text-[#6e6e73]">{user.email}</div>
              {profile?.role && (
                <span className="mt-1.5 inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e]">
                  {roleLabels[profile.role] ?? profile.role}
                </span>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Naam</label>
            <input value={naam} onChange={e => setNaam(e.target.value)}
              placeholder="Jouw naam"
              className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-medium text-[#6e6e73] mb-2">Avatar kleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: color === c ? '3px solid ' + c : 'none',
                    outlineOffset: '2px',
                    opacity: color === c ? 1 : 0.6,
                  }} />
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="px-5 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-all disabled:opacity-60">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>

        {/* Account info */}
        <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
          <div className="text-[15px] font-semibold mb-4">Accountgegevens</div>
          <div className="flex flex-col gap-0">
            <div className="flex justify-between py-2.5 border-b border-black/[0.05] text-[13px]">
              <span className="text-[#6e6e73]">E-mailadres</span>
              <span className="font-medium text-[#1d1d1f]">{user.email}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-black/[0.05] text-[13px]">
              <span className="text-[#6e6e73]">Gebruiker ID</span>
              <span className="font-mono text-[11px] text-[#6e6e73]">{user.id.slice(0,8)}...</span>
            </div>
            <div className="flex justify-between py-2.5 text-[13px]">
              <span className="text-[#6e6e73]">Rol</span>
              <span className="font-medium text-[#1d1d1f]">{roleLabels[profile?.role ?? ''] ?? 'Niet ingesteld'}</span>
            </div>
          </div>
        </div>

        {/* Wachtwoord */}
        <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
          <div className="text-[15px] font-semibold mb-1">Wachtwoord</div>
          <div className="text-[13px] text-[#6e6e73] mb-4">Stuur een wachtwoord reset link naar je e-mailadres.</div>
          <button onClick={async () => {
            const router = useRouter()
  const supabase = createClient()
            await supabase.auth.resetPasswordForEmail(user.email ?? '')
            setToast('Reset link verstuurd naar ' + user.email)
          }}
            className="px-5 py-2 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10 transition-all">
            Wachtwoord resetten
          </button>
        </div>
      </div>
    </div>
  )
}
