'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VakmanCategorie } from '@/lib/queries'

interface Profile {
  id: string
  full_name: string | null
  naam: string | null
  email: string | null
  role: string | null
  avatar_color: string | null
  vakman_categorie_id: string | null
}

interface Props {
  profiles: Profile[]
  vakmanCategorieen: VakmanCategorie[]
}

const ROLES = ['developer', 'projectleider', 'planner', 'vakman', 'koper']
const ROLE_LABELS: Record<string, string> = {
  developer: 'Ontwikkelaar', projectleider: 'Projectleider',
  planner: 'Planner', vakman: 'Vakman', koper: 'Koper',
}
const ROLE_COLORS: Record<string, string> = {
  developer: 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]',
  projectleider: 'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]',
  planner: 'bg-[rgba(191,90,242,0.12)] text-[#7a1fa5]',
  vakman: 'bg-[rgba(255,159,10,0.12)] text-[#a05a00]',
  koper: 'bg-[rgba(174,174,178,0.15)] text-[#6e6e73]',
}

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('')
}

export function WerkliedenClient({ profiles: initial, vakmanCategorieen }: Props) {
  const [profiles, setProfiles] = useState(initial)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ naam: '', email: '', wachtwoord: '', role: 'vakman', vakman_categorie_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const grouped = ROLES.reduce((acc, role) => {
    acc[role] = profiles.filter(p => (p.role ?? 'vakman') === role)
    return acc
  }, {} as Record<string, Profile[]>)

  async function handleCreate() {
    if (!form.naam || !form.email || !form.wachtwoord) { setError('Vul alle velden in'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Aanmaken mislukt')
      setProfiles(prev => [...prev, data.profile])
      setShowModal(false)
      setForm({ naam: '', email: '', wachtwoord: '', role: 'vakman', vakman_categorie_id: '' })
      setToast('Gebruiker aangemaakt ✓')
      setTimeout(() => setToast(''), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout opgetreden')
    } finally { setSaving(false) }
  }

  async function handleUpdate(profileId: string, updates: Partial<Profile>) {
    await supabase.from('profiles').update(updates).eq('id', profileId)
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p))
    setToast('Bijgewerkt ✓')
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div className="p-7 max-w-[900px]">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50">{toast}</div>
      )}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">Werklieden</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">Accounts, rollen en vakman types</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all">
          + Toevoegen
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {ROLES.map(role => {
          const members = grouped[role] ?? []
          return (
            <div key={role} className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-black/[0.05] cursor-pointer hover:bg-black/[0.02] transition-all select-none"
                onClick={() => setCollapsed(prev => ({...prev, [role]: !prev[role]}))}>
                <span className="text-[11px] text-[#aeaeb2] transition-transform" style={{display:'inline-block', transform: collapsed[role] ? 'rotate(-90deg)' : 'rotate(0deg)'}}>▼</span>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
                <span className="text-[12px] text-[#aeaeb2]">{members.length} accounts</span>
              </div>
              {!collapsed[role] && (members.length === 0 ? (
                <div className="px-5 py-4 text-[13px] text-[#aeaeb2]">Geen accounts met deze rol</div>
              ) : (
                <div className="divide-y divide-black/[0.05]">
                  {members.map(p => {
                    const name = p.naam ?? p.full_name ?? p.email ?? 'Onbekend'
                    const vakmanCat = vakmanCategorieen.find(c => c.id === p.vakman_categorie_id)
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-all">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
                          style={{ background: p.avatar_color ?? '#0071e3' }}>{initials(name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[#1d1d1f]">{name}</div>
                          <div className="text-[11px] text-[#6e6e73]">{p.email ?? ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Rol badge */}
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[p.role ?? 'vakman']}`}>
                            {ROLE_LABELS[p.role ?? 'vakman']}
                          </span>
                          {/* Vakman type — alleen tonen/instellen bij vakman rol */}
                          {p.role === 'vakman' && (
                            <select
                              value={p.vakman_categorie_id ?? ''}
                              onChange={e => handleUpdate(p.id, { vakman_categorie_id: e.target.value || null })}
                              className="bg-[rgba(255,159,10,0.08)] border border-[rgba(255,159,10,0.2)] rounded-full px-2.5 py-1 text-[11px] font-medium text-[#a05a00] outline-none focus:border-[#ff9f0a] transition-all">
                              <option value="">Type vakman...</option>
                              {vakmanCategorieen.map(c => <option key={c.id} value={c.id}>{c.naam}</option>)}
                            </select>
                          )}
                          {vakmanCat && p.role !== 'vakman' && (
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[rgba(255,159,10,0.08)] text-[#a05a00] border border-[rgba(255,159,10,0.2)]">
                              {vakmanCat.naam}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-black/[0.05] w-[420px] p-6">
            <div className="text-[16px] font-bold mb-1">Gebruiker toevoegen</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">Maak een nieuw account aan en wijs een rol toe.</div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Naam</label>
                <input value={form.naam} onChange={e => setForm(p => ({...p, naam: e.target.value}))}
                  placeholder="Voor- en achternaam"
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">E-mailadres</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                  placeholder="naam@voorbeeld.nl"
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Tijdelijk wachtwoord</label>
                <input type="password" value={form.wachtwoord} onChange={e => setForm(p => ({...p, wachtwoord: e.target.value}))}
                  placeholder="Minimaal 6 tekens"
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Rol</label>
                <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value, vakman_categorie_id: ''}))}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              {form.role === 'vakman' && vakmanCategorieen.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Type vakman</label>
                  <select value={form.vakman_categorie_id} onChange={e => setForm(p => ({...p, vakman_categorie_id: e.target.value}))}
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                    <option value="">Selecteer type...</option>
                    {vakmanCategorieen.map(c => <option key={c.id} value={c.id}>{c.naam}</option>)}
                  </select>
                </div>
              )}
              {error && <div className="text-[12px] text-[#ff3b30] bg-[rgba(255,59,48,0.08)] rounded-[8px] px-3 py-2">{error}</div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowModal(false); setError('') }}
                className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10">
                Annuleren
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {saving ? 'Aanmaken...' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
