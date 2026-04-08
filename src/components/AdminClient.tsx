'use client'
import { useState } from 'react'
import { Building2, Users, Map, Plus, ChevronRight, X, Check, Package, Settings, LogOut } from 'lucide-react'

interface LicentiePakket {
  id: string
  naam: string
  slug: string
  prijs_per_maand: number
  max_parken: number
  max_gebruikers: number
  max_kavels: number | null
  features: string[]
  actief: boolean
}

interface Organisatie {
  id: string
  naam: string
  slug: string
  email: string | null
  telefoon: string | null
  adres: string | null
  status: string
  licentie_type: string
  licentie_pakket_id: string | null
  licentie_start: string | null
  licentie_tot: string | null
  max_parken: number
  max_gebruikers: number
  extra_gebruikers: number
  extra_parken: number
  notities: string | null
  created_at: string
}

interface Park {
  id: string
  name: string
  status: string | null
  organisatie_id: string | null
}

interface Profile {
  id: string
  naam: string | null
  full_name: string | null
  email: string | null
  role: string | null
  park_id: string | null
  avatar_color: string | null
  created_at: string
}

interface Props {
  organisaties: Organisatie[]
  parks: Park[]
  profiles: Profile[]
  admins: { id: string; email: string; naam: string | null }[]
  pakketten: LicentiePakket[]
}

const STATUS_COLORS: Record<string, string> = {
  actief: 'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]',
  inactief: 'bg-[rgba(174,174,178,0.18)] text-[#6e6e73]',
  proef: 'bg-[rgba(255,159,10,0.13)] text-[#a05a00]',
}

const PAKKET_COLORS: Record<string, string> = {
  starter: 'bg-[rgba(174,174,178,0.18)] text-[#6e6e73]',
  professional: 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]',
  enterprise: 'bg-[rgba(191,90,242,0.12)] text-[#7a1fa5]',
}

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('')
}

function Avatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.33, background: color ?? '#1d1d1f' }}>
      {initials(name)}
    </div>
  )
}

export function AdminClient({ organisaties: initialOrgs, parks, profiles, admins, pakketten }: Props) {
  const [nav, setNav] = useState<'dashboard' | 'klanten' | 'licenties' | 'gebruikers' | 'instellingen'>('dashboard')
  const [selectedOrg, setSelectedOrg] = useState<Organisatie | null>(null)
  const [organisaties, setOrganisaties] = useState(initialOrgs)
  const [showNieuw, setShowNieuw] = useState(false)
  const [form, setForm] = useState({ naam: '', email: '', telefoon: '', licentie_type: 'starter', max_parken: 1, max_gebruikers: 5, park_naam: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!form.naam || !form.email) { setError('Vul naam en email in'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/create-klant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrganisaties(prev => [data.org, ...prev])
      setShowNieuw(false)
      setForm({ naam: '', email: '', telefoon: '', licentie_type: 'starter', max_parken: 1, max_gebruikers: 5, park_naam: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout opgetreden')
    } finally { setSaving(false) }
  }

  const totalMRR = organisaties
    .filter(o => o.status === 'actief')
    .reduce((sum, o) => {
      const pakket = pakketten.find(p => p.slug === o.licentie_type)
      return sum + (pakket?.prijs_per_maand ?? 0)
    }, 0)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 bg-[#1c1c1e] flex flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-white/[0.08]">
          <div className="text-[16px] font-bold text-white tracking-tight">
            Park<span className="text-[#0071e3]">Bouw</span>
            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[rgba(0,113,227,0.3)] text-[#60a8f0]">ADMIN</span>
          </div>
          <div className="text-[11px] text-white/40 mt-0.5">Platform beheer</div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: Building2 },
            { key: 'klanten', label: 'Klanten', icon: Users },
            { key: 'licenties', label: 'Licenties', icon: Package },
            { key: 'gebruikers', label: 'Gebruikers', icon: Users },
            { key: 'instellingen', label: 'Instellingen', icon: Settings },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setNav(key as typeof nav)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all text-left w-full
                ${nav === key ? 'bg-[rgba(0,113,227,0.25)] text-[#60a8f0]' : 'text-white/60 hover:bg-white/[0.07] hover:text-white'}`}>
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.08]">
          <a href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] text-white/50 hover:bg-white/[0.07] hover:text-white transition-all">
            <LogOut size={14} />
            Naar park
          </a>
          {admins[0] && (
            <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
              <Avatar name={admins[0].naam ?? admins[0].email} color="#0071e3" size={28} />
              <div>
                <div className="text-[12px] font-medium text-white">{admins[0].naam ?? admins[0].email}</div>
                <div className="text-[10px] text-white/40">Platform admin</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 overflow-auto">
        {/* Dashboard */}
        {nav === 'dashboard' && (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Dashboard</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">Platform overzicht</p>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Klanten', value: organisaties.length, sub: organisaties.filter(o=>o.status==='actief').length + ' actief' },
                { label: 'Parken', value: parks.length, sub: 'totaal' },
                { label: 'Gebruikers', value: profiles.length, sub: 'accounts' },
                { label: 'MRR', value: '€' + totalMRR, sub: 'per maand' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white rounded-[16px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05]">
                  <div className="text-[12px] text-[#6e6e73] font-medium mb-1">{label}</div>
                  <div className="text-[28px] font-bold tracking-[-0.5px] leading-none">{value}</div>
                  <div className="text-[11px] text-[#aeaeb2] mt-1">{sub}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                  <div className="text-[14px] font-semibold">Recente klanten</div>
                  <button onClick={() => setNav('klanten')} className="text-[12px] text-[#0071e3] hover:underline">Alle klanten</button>
                </div>
                {organisaties.slice(0,5).map((org, i) => (
                  <div key={org.id} onClick={() => { setSelectedOrg(org); setNav('klanten') }}
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02] cursor-pointer transition-all ${i < 4 ? 'border-b border-black/[0.05]' : ''}`}>
                    <Avatar name={org.naam} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{org.naam}</div>
                      <div className="text-[11px] text-[#6e6e73]">{org.email ?? '-'}</div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAKKET_COLORS[org.licentie_type] ?? ''}`}>{org.licentie_type}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.05]">
                  <div className="text-[14px] font-semibold">Licentie verdeling</div>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  {pakketten.map(p => {
                    const count = organisaties.filter(o => o.licentie_type === p.slug).length
                    const pct = organisaties.length ? Math.round(count / organisaties.length * 100) : 0
                    return (
                      <div key={p.id}>
                        <div className="flex justify-between text-[13px] mb-1">
                          <span className="font-medium">{p.naam}</span>
                          <span className="text-[#6e6e73]">{count} klanten · €{p.prijs_per_maand}/mnd</span>
                        </div>
                        <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0071e3] rounded-full transition-all" style={{width: pct + '%'}} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Klanten */}
        {nav === 'klanten' && (
          <div className="flex h-full">
            <div className="flex-1 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-[26px] font-bold tracking-[-0.5px]">Klanten</h1>
                  <p className="text-[14px] text-[#6e6e73] mt-0.5">{organisaties.length} klanten totaal</p>
                </div>
                <button onClick={() => setShowNieuw(true)}
                  className="px-4 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-all flex items-center gap-1.5">
                  <Plus size={13} /> Nieuwe klant
                </button>
              </div>
              <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/[0.05] bg-[#f5f5f7]">
                      {['Klant','Parken','Gebruikers','Pakket','Status','Lid sinds',''].map(h => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {organisaties.map((org, i) => {
                      const orgParks = parks.filter(p => p.organisatie_id === org.id)
                      const orgUsers = profiles.filter(p => orgParks.some(pk => pk.id === p.park_id))
                      return (
                        <tr key={org.id} onClick={() => setSelectedOrg(org === selectedOrg ? null : org)}
                          className={`cursor-pointer transition-all ${org === selectedOrg ? '[&>td]:bg-[rgba(0,113,227,0.05)]' : 'hover:[&>td]:bg-black/[0.02]'} ${i < organisaties.length-1 ? '[&>td]:border-b [&>td]:border-black/[0.05]' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={org.naam} size={30} />
                              <div>
                                <div className="text-[13px] font-medium">{org.naam}</div>
                                <div className="text-[11px] text-[#6e6e73]">{org.email ?? '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px]">{orgParks.length}/{org.max_parken + org.extra_parken}</td>
                          <td className="px-4 py-3 text-[13px]">{orgUsers.length}/{org.max_gebruikers + org.extra_gebruikers}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAKKET_COLORS[org.licentie_type] ?? ''}`}>{org.licentie_type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[org.status] ?? ''}`}>{org.status}</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{new Date(org.created_at).toLocaleDateString('nl-NL')}</td>
                          <td className="px-4 py-3 text-[#aeaeb2]"><ChevronRight size={14} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail panel */}
            {selectedOrg && (
              <div className="w-[340px] flex-shrink-0 bg-white border-l border-black/[0.08] h-screen sticky top-0 overflow-y-auto">
                <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                  <div className="text-[14px] font-semibold">{selectedOrg.naam}</div>
                  <button onClick={() => setSelectedOrg(null)} className="w-6 h-6 rounded-full bg-black/[0.06] flex items-center justify-center hover:bg-black/10 transition-all">
                    <X size={11} />
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <Avatar name={selectedOrg.naam} size={44} />
                    <div>
                      <div className="text-[15px] font-bold">{selectedOrg.naam}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[selectedOrg.status]}`}>{selectedOrg.status}</span>
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2">Contactgegevens</div>
                  {[['Email', selectedOrg.email ?? '—'], ['Telefoon', selectedOrg.telefoon ?? '—'], ['Adres', selectedOrg.adres ?? '—']].map(([l,v]) => (
                    <div key={l} className="flex justify-between py-2 border-b border-black/[0.05] text-[13px]">
                      <span className="text-[#6e6e73]">{l}</span><span className="font-medium">{v}</span>
                    </div>
                  ))}

                  <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2 mt-4">Licentie</div>
                  {[
                    ['Pakket', selectedOrg.licentie_type],
                    ['Geldig tot', selectedOrg.licentie_tot ? new Date(selectedOrg.licentie_tot).toLocaleDateString('nl-NL') : 'Onbeperkt'],
                    ['Max parken', String(selectedOrg.max_parken + selectedOrg.extra_parken)],
                    ['Max gebruikers', String(selectedOrg.max_gebruikers + selectedOrg.extra_gebruikers)],
                    ['Extra parken', String(selectedOrg.extra_parken)],
                    ['Extra gebruikers', String(selectedOrg.extra_gebruikers)],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between py-2 border-b border-black/[0.05] text-[13px]">
                      <span className="text-[#6e6e73]">{l}</span><span className="font-medium capitalize">{v}</span>
                    </div>
                  ))}

                  <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2 mt-4">Parken</div>
                  {parks.filter(p => p.organisatie_id === selectedOrg.id).map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f7] rounded-[10px] mb-1.5">
                      <Map size={12} className="text-[#6e6e73]" />
                      <span className="text-[12px] font-medium flex-1">{p.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status ?? 'actief']}`}>{p.status ?? 'actief'}</span>
                    </div>
                  ))}

                  <div className="flex gap-2 mt-5">
                    <button className="flex-1 py-2 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[12px] font-medium hover:bg-black/10 transition-all">Bewerken</button>
                    <button className="flex-1 py-2 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-all">Inloggen als</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Licenties */}
        {nav === 'licenties' && (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Licentie pakketten</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">Beheer de beschikbare pakketten</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {pakketten.map(p => {
                const count = organisaties.filter(o => o.licentie_type === p.slug).length
                return (
                  <div key={p.id} className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${PAKKET_COLORS[p.slug]}`}>{p.naam}</span>
                      <span className="text-[12px] text-[#6e6e73]">{count} klanten</span>
                    </div>
                    <div className="text-[32px] font-bold tracking-[-1px] mb-0.5">€{p.prijs_per_maand}</div>
                    <div className="text-[12px] text-[#6e6e73] mb-4">per maand</div>
                    <div className="flex flex-col gap-2 mb-5">
                      {p.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-[12px]">
                          <Check size={12} className="text-[#30d158] flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-black/[0.05]">
                      <div className="text-center">
                        <div className="text-[10px] text-[#6e6e73]">Max parken</div>
                        <div className="text-[14px] font-bold">{p.max_parken >= 99 ? '∞' : p.max_parken}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-[#6e6e73]">Max gebruikers</div>
                        <div className="text-[14px] font-bold">{p.max_gebruikers >= 99 ? '∞' : p.max_gebruikers}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05]">
                <div className="text-[14px] font-semibold">Add-ons (extra licenties)</div>
                <div className="text-[12px] text-[#6e6e73] mt-0.5">Bovenop het basispakket bij te kopen</div>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {[
                  { naam: 'Extra park', prijs: 29, beschrijving: 'Voeg een extra park toe aan het account' },
                  { naam: 'Extra gebruiker', prijs: 9, beschrijving: 'Voeg 5 extra gebruikers toe' },
                  { naam: 'Tessi AI', prijs: 19, beschrijving: 'AI assistent voor het park' },
                ].map(addon => (
                  <div key={addon.naam} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">{addon.naam}</div>
                      <div className="text-[11px] text-[#6e6e73]">{addon.beschrijving}</div>
                    </div>
                    <div className="text-[14px] font-bold">€{addon.prijs}<span className="text-[11px] font-normal text-[#6e6e73]">/mnd</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gebruikers */}
        {nav === 'gebruikers' && (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Gebruikers</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">{profiles.length} accounts totaal</p>
            </div>
            <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.05] bg-[#f5f5f7]">
                    {['Gebruiker','Email','Rol','Park / Klant','Aangemaakt'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p, i) => {
                    const park = parks.find(pk => pk.id === p.park_id)
                    const org = park ? organisaties.find(o => o.id === park.organisatie_id) : null
                    const name = p.naam ?? p.full_name ?? p.email ?? 'Onbekend'
                    return (
                      <tr key={p.id} className={`hover:bg-black/[0.02] transition-all ${i < profiles.length-1 ? 'border-b border-black/[0.05]' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} color={p.avatar_color ?? '#0071e3'} size={28} />
                            <span className="text-[13px] font-medium">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{p.email ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.06] capitalize">{p.role ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px]">
                          <div className="text-[#3a3a3c]">{park?.name ?? '—'}</div>
                          {org && <div className="text-[11px] text-[#6e6e73]">{org.naam}</div>}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{p.created_at ? new Date(p.created_at).toLocaleDateString('nl-NL') : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instellingen */}
        {nav === 'instellingen' && (
          <div className="p-8 max-w-[600px]">
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Instellingen</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">Platform configuratie</p>
            </div>
            <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6 mb-4">
              <div className="text-[14px] font-semibold mb-4">Platform admins</div>
              {admins.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-black/[0.05] last:border-0">
                  <Avatar name={a.naam ?? a.email} color="#0071e3" size={32} />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{a.naam ?? '—'}</div>
                    <div className="text-[11px] text-[#6e6e73]">{a.email}</div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(191,90,242,0.12)] text-[#7a1fa5]">Admin</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nieuwe klant modal */}
      {showNieuw && (
        <>
          <div className="fixed inset-0 bg-black/[0.4] backdrop-blur-[4px] z-[200]" onClick={() => setShowNieuw(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.2)] w-[480px] p-6">
            <div className="text-[18px] font-bold mb-1">Nieuwe klant</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">Er wordt automatisch een eerste park aangemaakt.</div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Bedrijfsnaam *</label>
                  <input value={form.naam} onChange={e => setForm(p => ({...p, naam: e.target.value}))} placeholder="bijv. Heideplas BV"
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="info@klant.nl"
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Telefoon</label>
                  <input value={form.telefoon} onChange={e => setForm(p => ({...p, telefoon: e.target.value}))} placeholder="06-12345678"
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Naam eerste park</label>
                  <input value={form.park_naam} onChange={e => setForm(p => ({...p, park_naam: e.target.value}))} placeholder="Zelfde als bedrijfsnaam"
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Licentie pakket</label>
                <select value={form.licentie_type} onChange={e => setForm(p => ({...p, licentie_type: e.target.value}))}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                  {pakketten.map(p => <option key={p.id} value={p.slug}>{p.naam} — €{p.prijs_per_maand}/mnd</option>)}
                </select>
              </div>
              {error && <div className="text-[12px] text-[#ff3b30] bg-[rgba(255,59,48,0.08)] rounded-[8px] px-3 py-2">{error}</div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowNieuw(false); setError('') }} className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[13px] font-medium hover:bg-black/10">Annuleren</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {saving ? 'Aanmaken...' : 'Klant aanmaken'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
