'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VakmanCategorie } from '@/lib/queries'

interface Profile {
  id: string
  full_name: string | null
  naam: string | null
  voornaam: string | null
  achternaam: string | null
  email: string | null
  role: string | null
  subrol: string | null
  avatar_color: string | null
  vakman_categorie_id: string | null
}

interface Props {
  profiles: Profile[]
  vakmanCategorieen: VakmanCategorie[]
}

const ROLES = ['ontwikkelaar', 'medewerker', 'vakman', 'koper']

const ROLE_LABELS: Record<string, string> = {
  ontwikkelaar: 'Ontwikkelaar',
  medewerker: 'Medewerker',
  vakman: 'Vakman',
  koper: 'Koper',
}

const ROLE_COLORS: Record<string, string> = {
  ontwikkelaar: 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]',
  medewerker:   'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]',
  vakman:       'bg-[rgba(255,159,10,0.12)] text-[#a05a00]',
  koper:        'bg-[rgba(191,90,242,0.12)] text-[#7a1fa5]',
}

const ROLE_DOT: Record<string, string> = {
  ontwikkelaar: '#0071e3',
  medewerker:   '#30d158',
  vakman:       '#ff9f0a',
  koper:        '#bf5af2',
}

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('')
}

function displayName(p: Profile) {
  if (p.voornaam) return [p.voornaam, p.achternaam].filter(Boolean).join(' ')
  return p.naam ?? p.full_name ?? p.email ?? 'Onbekend'
}

export function WerkliedenClient({ profiles: initial, vakmanCategorieen }: Props) {
  const [profiles, setProfiles] = useState(initial)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ voornaam: '', achternaam: '', email: '', wachtwoord: '', role: 'medewerker', subrol: '', vakman_categorie_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const grouped = ROLES.reduce((acc, role) => {
    acc[role] = profiles.filter(p => (p.role ?? 'medewerker') === role)
    return acc
  }, {} as Record<string, Profile[]>)

  async function handleCreate() {
    if (!form.voornaam || !form.email || !form.wachtwoord) {
      setError('Vul voornaam, email en wachtwoord in'); return
    }
    setSaving(true); setError('')
    try {
      const naam = [form.voornaam, form.achternaam].filter(Boolean).join(' ')
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam,
          voornaam: form.voornaam,
          achternaam: form.achternaam,
          email: form.email,
          wachtwoord: form.wachtwoord,
          role: form.role,
          subrol: form.subrol || null,
          vakman_categorie_id: form.vakman_categorie_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fout bij aanmaken')
      if (data.user) {
        setProfiles(prev => [...prev, data.user])
        setToast('Account aangemaakt')
        setTimeout(() => setToast(''), 3000)
      }
      setShowModal(false)
      setForm({ voornaam: '', achternaam: '', email: '', wachtwoord: '', role: 'medewerker', subrol: '', vakman_categorie_id: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout')
    } finally { setSaving(false) }
  }

  async function handleRolChange(profileId: string, newRole: string) {
    const { error } = await supabase.from('profiles').update({ role: newRole as 'ontwikkelaar' | 'medewerker' | 'vakman' | 'koper' }).eq('id', profileId)
    if (!error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p))
      setToast('Rol bijgewerkt')
      setTimeout(() => setToast(''), 3000)
    }
  }

  async function handleVakmanTypeChange(profileId: string, vakmanCategorieId: string) {
    const { error } = await supabase.from('profiles').update({ vakman_categorie_id: vakmanCategorieId || null }).eq('id', profileId)
    if (!error) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, vakman_categorie_id: vakmanCategorieId } : p))
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">Werklieden</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">Accounts, rollen en vakman types</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-[#0071e3] text-white text-[14px] font-medium rounded-full hover:bg-[#0077ed] transition-all">
          + Toevoegen
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {ROLES.map(role => {
          const roleProfiles = grouped[role] ?? []
          const isCollapsed = collapsed[role]
          return (
            <div key={role} className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
              <button onClick={() => setCollapsed(p => ({ ...p, [role]: !p[role] }))}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f9f9f9] transition-all">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: ROLE_DOT[role]}} />
                <span className={"text-[12px] font-bold px-2.5 py-1 rounded-full " + (ROLE_COLORS[role] ?? '')}>
                  {ROLE_LABELS[role]}
                </span>
                <span className="text-[13px] text-[#6e6e73]">{roleProfiles.length} accounts</span>
                <span className="ml-auto text-[#aeaeb2] text-[18px]">{isCollapsed ? '▸' : '▾'}</span>
              </button>

              {!isCollapsed && (
                <div className="border-t border-black/[0.05]">
                  {roleProfiles.length === 0 ? (
                    <p className="px-5 py-4 text-[13px] text-[#aeaeb2]">Geen accounts met deze rol</p>
                  ) : (
                    roleProfiles.map((profile, i) => {
                      const name = displayName(profile)
                      const vakmanCat = vakmanCategorieen.find(v => v.id === profile.vakman_categorie_id)
                      return (
                        <div key={profile.id}
                          className={"flex items-center gap-4 px-5 py-3.5 " + (i < roleProfiles.length - 1 ? 'border-b border-black/[0.04]' : '')}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                            style={{background: profile.avatar_color ?? ROLE_DOT[role] ?? '#6e6e73'}}>
                            {initials(name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-medium text-[#1d1d1f] truncate">{name}</div>
                            <div className="text-[12px] text-[#6e6e73] truncate">{profile.email}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={"text-[11px] font-semibold px-2 py-0.5 rounded-full " + (ROLE_COLORS[role] ?? '')}>
                              {ROLE_LABELS[role] ?? role}
                            </span>
                            {role === 'vakman' && (
                              <select
                                value={profile.vakman_categorie_id ?? ''}
                                onChange={e => handleVakmanTypeChange(profile.id, e.target.value)}
                                className="text-[12px] border border-black/[0.1] rounded-full px-3 py-1 bg-white outline-none cursor-pointer hover:border-[#0071e3] transition-all">
                                <option value="">Type vakman...</option>
                                {vakmanCategorieen.map(v => (
                                  <option key={v.id} value={v.id}>{v.naam}</option>
                                ))}
                              </select>
                            )}
                            {role === 'medewerker' && profile.subrol && (
                              <span className="text-[11px] text-[#6e6e73] px-2 py-0.5 rounded-full bg-[#f5f5f7]">{profile.subrol}</span>
                            )}
                            <select
                              value={profile.role ?? ''}
                              onChange={e => handleRolChange(profile.id, e.target.value)}
                              className="text-[12px] border border-black/[0.1] rounded-full px-3 py-1 bg-white outline-none cursor-pointer hover:border-[#0071e3] transition-all">
                              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1d1d1f] text-white text-[13px] font-medium px-5 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/[0.3] backdrop-blur-[4px] z-[100]" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] w-[460px] p-6">
            <div className="text-[18px] font-bold mb-1">Nieuw account</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">Maak een nieuw account aan voor dit park</div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Voornaam *</label>
                  <input value={form.voornaam} onChange={e => setForm(p => ({...p, voornaam: e.target.value}))}
                    placeholder="Jan"
                    className="w-full bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Achternaam</label>
                  <input value={form.achternaam} onChange={e => setForm(p => ({...p, achternaam: e.target.value}))}
                    placeholder="de Vries"
                    className="w-full bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                  placeholder="jan@bedrijf.nl"
                  className="w-full bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Wachtwoord *</label>
                <input type="password" value={form.wachtwoord} onChange={e => setForm(p => ({...p, wachtwoord: e.target.value}))}
                  placeholder="Minimaal 8 tekens"
                  className="w-full bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Rol</label>
                  <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value, subrol: '', vakman_categorie_id: ''}))}
                    className="w-full bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all">
                    <option value="ontwikkelaar">Ontwikkelaar</option>
                    <option value="medewerker">Medewerker</option>
                    <option value="vakman">Vakman</option>
                    <option value="koper">Koper</option>
                  </select>
                </div>
                {form.role === 'vakman' && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Type vakman</label>
                    <select value={form.vakman_categorie_id} onChange={e => setForm(p => ({...p, vakman_categorie_id: e.target.value}))}
                      className="w-full bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all">
                      <option value="">Selecteer type</option>
                      {vakmanCategorieen.map(v => <option key={v.id} value={v.id}>{v.naam}</option>)}
                    </select>
                  </div>
                )}
                {form.role === 'medewerker' && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Type medewerker</label>
                    <input value={form.subrol} onChange={e => setForm(p => ({...p, subrol: e.target.value}))}
                      placeholder="bijv. Uitvoerder"
                      className="w-full bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all" />
                  </div>
                )}
              </div>
              {error && (
                <div className="text-[12px] text-[#ff3b30] bg-[rgba(255,59,48,0.08)] rounded-[10px] px-3 py-2">{error}</div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowModal(false); setError('') }}
                className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[13px] font-medium hover:bg-black/10 transition-all">
                Annuleren
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50 transition-all">
                {saving ? 'Aanmaken...' : 'Account aanmaken'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
