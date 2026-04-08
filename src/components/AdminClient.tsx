'use client'
import { useState } from 'react'
import { Building2, Users, Map, Plus, ChevronRight, X, Check, Package, Settings } from 'lucide-react'

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

interface Addon {
  id: string
  slug: string
  naam: string
  beschrijving: string | null
  prijs_per_maand: number
  eenheid: string
  actief: boolean
  heeft_aantal: boolean
}

interface OrgAddon {
  id: string
  organisatie_id: string
  addon_id: string
  aantal: number
  actief: boolean
  gestart_op: string
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
  addons: Addon[]
  orgAddons: OrgAddon[]
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all" />
    </div>
  )
}

export function AdminClient({ organisaties: initialOrgs, parks, profiles, admins, pakketten: initialPakketten, addons: initialAddons, orgAddons: initialOrgAddons }: Props) {
  const [nav, setNav] = useState<'dashboard' | 'klanten' | 'licenties' | 'addons' | 'gebruikers' | 'instellingen'>('dashboard')
  const [selectedOrg, setSelectedOrg] = useState<Organisatie | null>(null)
  const [organisaties, setOrganisaties] = useState(initialOrgs)
  const [pakketten, setPakketten] = useState(initialPakketten)
  const [addons, setAddons] = useState(initialAddons)
  const [orgAddons, setOrgAddons] = useState(initialOrgAddons)
  const [editAddon, setEditAddon] = useState<Addon | null>(null)
  const [editAddonForm, setEditAddonForm] = useState<Partial<Addon>>({})
  const [showNieuw, setShowNieuw] = useState(false)
  const [editOrg, setEditOrg] = useState<Organisatie | null>(null)
  const [editOrgForm, setEditOrgForm] = useState<Partial<Organisatie>>({})
  const [editPakket, setEditPakket] = useState<LicentiePakket | null>(null)
  const [editPakketForm, setEditPakketForm] = useState<Partial<LicentiePakket>>({})
  const [form, setForm] = useState({ naam: '', email: '', telefoon: '', licentie_type: 'starter', max_parken: 1, max_gebruikers: 5, park_naam: '' })
  const [saving, setSaving] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
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
      setError(e instanceof Error ? e.message : 'Fout')
    } finally { setSaving(false) }
  }

  async function handleSaveOrg() {
    if (!editOrg) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/admin/update-klant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editOrg.id, ...editOrgForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrganisaties(prev => prev.map(o => o.id === editOrg.id ? { ...o, ...data.org } : o))
      if (selectedOrg?.id === editOrg.id) setSelectedOrg({ ...selectedOrg, ...data.org })
      setEditOrg(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Fout')
    } finally { setSavingEdit(false) }
  }

  async function handleSavePakket() {
    if (!editPakket) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/admin/update-pakket', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editPakket.id, ...editPakketForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPakketten(prev => prev.map(p => p.id === editPakket.id ? { ...p, ...data.pakket } : p))
      setEditPakket(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Fout')
    } finally { setSavingEdit(false) }
  }

  async function handleSaveAddon() {
    if (!editAddon) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/admin/update-addon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editAddon.id, ...editAddonForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAddons(prev => prev.map(a => a.id === editAddon.id ? { ...a, ...data.addon } : a))
      setEditAddon(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Fout')
    } finally { setSavingEdit(false) }
  }

  async function toggleOrgAddon(orgId: string, addonId: string, aantal: number, actief: boolean) {
    try {
      const res = await fetch('/api/admin/toggle-org-addon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisatie_id: orgId, addon_id: addonId, aantal, actief }),
      })
      if (!res.ok) throw new Error('Fout')
      if (actief) {
        setOrgAddons(prev => {
          const filtered = prev.filter(o => !(o.organisatie_id === orgId && o.addon_id === addonId))
          return [...filtered, { id: Date.now().toString(), organisatie_id: orgId, addon_id: addonId, aantal, actief: true, gestart_op: new Date().toISOString().split('T')[0] }]
        })
      } else {
        setOrgAddons(prev => prev.filter(o => !(o.organisatie_id === orgId && o.addon_id === addonId)))
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Fout')
    }
  }

  function openEditOrg(org: Organisatie) {
    setEditOrg(org)
    setEditOrgForm({ naam: org.naam, email: org.email ?? '', telefoon: org.telefoon ?? '', adres: org.adres ?? '', status: org.status, licentie_type: org.licentie_type, licentie_tot: org.licentie_tot ?? '', max_parken: org.max_parken, max_gebruikers: org.max_gebruikers, extra_parken: org.extra_parken, extra_gebruikers: org.extra_gebruikers, notities: org.notities ?? '' })
  }

  function openEditPakket(p: LicentiePakket) {
    setEditPakket(p)
    setEditPakketForm({ naam: p.naam, prijs_per_maand: p.prijs_per_maand, max_parken: p.max_parken, max_gebruikers: p.max_gebruikers, max_kavels: p.max_kavels ?? 0, features: [...p.features] })
  }

  const totalMRR = organisaties.filter(o => o.status === 'actief').reduce((sum, o) => {
    const p = pakketten.find(p => p.slug === o.licentie_type)
    const addonMRR = orgAddons
      .filter(oa => oa.organisatie_id === o.id && oa.actief)
      .reduce((s, oa) => {
        const a = addons.find(a => a.id === oa.addon_id)
        return s + (a?.prijs_per_maand ?? 0) * oa.aantal
      }, 0)
    const realAddonMRR = orgAddons
      .filter(oa => oa.organisatie_id === o.id && oa.aantal > 0)
      .reduce((s, oa) => {
        const a = addons.find(a => a.id === oa.addon_id)
        return s + (a?.prijs_per_maand ?? 0) * oa.aantal
      }, 0)
    return sum + (p?.prijs_per_maand ?? 0) + realAddonMRR
  }, 0)

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: Building2 },
    { key: 'klanten', label: 'Klanten', icon: Users },
    { key: 'licenties', label: 'Licenties', icon: Package },
    { key: 'gebruikers', label: 'Gebruikers', icon: Users },
    { key: 'addons', label: 'Add-ons', icon: Package },
    { key: 'instellingen', label: 'Instellingen', icon: Settings },
  ]

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
          {navItems.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setNav(key as typeof nav)}
              className={"flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all text-left w-full " + (nav === key ? 'bg-[rgba(0,113,227,0.25)] text-[#60a8f0]' : 'text-white/60 hover:bg-white/[0.07] hover:text-white')}>
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/[0.08]">
          {admins[0] && (
            <div className="flex items-center gap-2.5 px-3 py-2">
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
                { label: 'Klanten', value: String(organisaties.length), sub: organisaties.filter(o=>o.status==='actief').length + ' actief' },
                { label: 'Parken', value: String(parks.length), sub: 'totaal' },
                { label: 'Gebruikers', value: String(profiles.length), sub: 'accounts' },
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
                  <button onClick={() => setNav('klanten')} className="text-[12px] text-[#0071e3]">Alle klanten</button>
                </div>
                {organisaties.slice(0,5).map((org, i) => (
                  <div key={org.id} onClick={() => { setSelectedOrg(org); setNav('klanten') }}
                    className={"flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02] cursor-pointer transition-all " + (i < 4 ? 'border-b border-black/[0.05]' : '')}>
                    <Avatar name={org.naam} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{org.naam}</div>
                      <div className="text-[11px] text-[#6e6e73]">{org.email ?? '-'}</div>
                    </div>
                    <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize " + (PAKKET_COLORS[org.licentie_type] ?? '')}>{org.licentie_type}</span>
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
                          <div className="h-full bg-[#0071e3] rounded-full" style={{width: pct + '%'}} />
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
                  <p className="text-[14px] text-[#6e6e73] mt-0.5">{organisaties.length} klanten</p>
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
                      const isSelected = selectedOrg?.id === org.id
                      return (
                        <tr key={org.id} onClick={() => setSelectedOrg(isSelected ? null : org)}
                          className={"cursor-pointer transition-all " + (isSelected ? '[&>td]:bg-[rgba(0,113,227,0.05)]' : 'hover:[&>td]:bg-black/[0.02]') + (i < organisaties.length-1 ? ' [&>td]:border-b [&>td]:border-black/[0.05]' : '')}>
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
                            <span className={"text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize " + (PAKKET_COLORS[org.licentie_type] ?? '')}>{org.licentie_type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={"text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize " + (STATUS_COLORS[org.status] ?? '')}>{org.status}</span>
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

            {selectedOrg && (
              <div className="w-[320px] flex-shrink-0 bg-white border-l border-black/[0.08] h-screen sticky top-0 overflow-y-auto">
                <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                  <div className="text-[14px] font-semibold truncate">{selectedOrg.naam}</div>
                  <button onClick={() => setSelectedOrg(null)} className="w-6 h-6 rounded-full bg-black/[0.06] flex items-center justify-center hover:bg-black/10 flex-shrink-0">
                    <X size={11} />
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={selectedOrg.naam} size={40} />
                    <div>
                      <div className="text-[14px] font-bold">{selectedOrg.naam}</div>
                      <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize " + STATUS_COLORS[selectedOrg.status]}>{selectedOrg.status}</span>
                    </div>
                  </div>
                  {[['Email', selectedOrg.email ?? '-'], ['Telefoon', selectedOrg.telefoon ?? '-'], ['Pakket', selectedOrg.licentie_type], ['Geldig tot', selectedOrg.licentie_tot ? new Date(selectedOrg.licentie_tot).toLocaleDateString('nl-NL') : 'Onbeperkt'], ['Max parken', String(selectedOrg.max_parken + selectedOrg.extra_parken)], ['Max gebruikers', String(selectedOrg.max_gebruikers + selectedOrg.extra_gebruikers)]].map(([l,v]) => (
                    <div key={l} className="flex justify-between py-2 border-b border-black/[0.05] text-[13px]">
                      <span className="text-[#6e6e73]">{l}</span><span className="font-medium capitalize">{v}</span>
                    </div>
                  ))}
                  <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2 mt-4">Parken</div>
                  {parks.filter(p => p.organisatie_id === selectedOrg.id).map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f7] rounded-[10px] mb-1.5">
                      <Map size={12} className="text-[#6e6e73]" />
                      <span className="text-[12px] font-medium flex-1">{p.name}</span>
                    </div>
                  ))}
                  {selectedOrg.notities && (
                    <div className="mt-4 p-3 bg-[rgba(255,159,10,0.08)] rounded-[10px] text-[12px] text-[#a05a00]">{selectedOrg.notities}</div>
                  )}
                  <button onClick={() => openEditOrg(selectedOrg)}
                    className="w-full mt-4 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-all">
                    Bewerken
                  </button>
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
              <p className="text-[14px] text-[#6e6e73] mt-0.5">Beheer prijzen en limieten</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {pakketten.map(p => {
                const count = organisaties.filter(o => o.licentie_type === p.slug).length
                return (
                  <div key={p.id} className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className={"text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize " + (PAKKET_COLORS[p.slug] ?? '')}>{p.naam}</span>
                      <span className="text-[12px] text-[#6e6e73]">{count} klanten</span>
                    </div>
                    <div className="text-[32px] font-bold tracking-[-1px] mb-0.5">€{p.prijs_per_maand}</div>
                    <div className="text-[12px] text-[#6e6e73] mb-4">per maand</div>
                    <div className="flex flex-col gap-2 mb-4">
                      {p.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-[12px]">
                          <Check size={12} className="text-[#30d158] flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 py-3 border-t border-black/[0.05]">
                      <div className="text-center">
                        <div className="text-[10px] text-[#6e6e73]">Max parken</div>
                        <div className="text-[14px] font-bold">{p.max_parken >= 99 ? 'onbep.' : p.max_parken}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-[#6e6e73]">Max gebruikers</div>
                        <div className="text-[14px] font-bold">{p.max_gebruikers >= 99 ? 'onbep.' : p.max_gebruikers}</div>
                      </div>
                    </div>
                    <button onClick={() => openEditPakket(p)}
                      className="w-full mt-3 py-2 rounded-full bg-black/[0.06] text-[13px] font-medium hover:bg-black/10 transition-all">
                      Bewerken
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Gebruikers */}
        {nav === 'gebruikers' && (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Gebruikers</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">{profiles.length} accounts</p>
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
                      <tr key={p.id} className={"hover:bg-black/[0.02] transition-all " + (i < profiles.length-1 ? 'border-b border-black/[0.05]' : '')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} color={p.avatar_color ?? '#0071e3'} size={28} />
                            <span className="text-[13px] font-medium">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{p.email ?? '-'}</td>
                        <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.06] capitalize">{p.role ?? '-'}</span></td>
                        <td className="px-4 py-3 text-[12px]">
                          <div>{park?.name ?? '-'}</div>
                          {org && <div className="text-[11px] text-[#6e6e73]">{org.naam}</div>}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{p.created_at ? new Date(p.created_at).toLocaleDateString('nl-NL') : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add-ons */}
        {nav === 'addons' && (
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Add-ons</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">Beheer prijzen en toewijzing per klant</p>
            </div>

            {/* Add-on prijzen */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {addons.map(addon => (
                <div key={addon.id} className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[14px] font-semibold">{addon.naam}</div>
                    <div className="text-[20px] font-bold">€{addon.prijs_per_maand}<span className="text-[11px] font-normal text-[#6e6e73] ml-1">{addon.eenheid}</span></div>
                  </div>
                  <div className="text-[12px] text-[#6e6e73] mb-3">{addon.beschrijving}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#aeaeb2]">{orgAddons.filter(o => o.addon_id === addon.id && o.actief).length} klanten actief</span>
                    <button onClick={() => { setEditAddon(addon); setEditAddonForm({ naam: addon.naam, beschrijving: addon.beschrijving ?? '', prijs_per_maand: addon.prijs_per_maand, eenheid: addon.eenheid }) }}
                      className="px-3 py-1.5 rounded-full bg-black/[0.06] text-[12px] font-medium hover:bg-black/10 transition-all">
                      Bewerken
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add-ons per klant */}
            <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05]">
                <div className="text-[14px] font-semibold">Add-ons per klant</div>
                <div className="text-[12px] text-[#6e6e73] mt-0.5">Gebruik en limieten per klant — schakel add-ons in of uit</div>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {organisaties.map(org => {
                  const orgParks = parks.filter(p => p.organisatie_id === org.id)
                  const orgUsers = profiles.filter(p => orgParks.some(pk => pk.id === p.park_id))
                  const orgKavels = 0 // kavels tellen via server side
                  const pakket = pakketten.find(p => p.slug === org.licentie_type)
                  const maxUsers = (pakket?.max_gebruikers ?? org.max_gebruikers) + org.extra_gebruikers
                  const maxParken = (pakket?.max_parken ?? org.max_parken) + org.extra_parken
                  const addonMRR = orgAddons.filter(oa => oa.organisatie_id === org.id && oa.actief).reduce((s, oa) => {
                    const a = addons.find(a => a.id === oa.addon_id)
                    return s + (a?.prijs_per_maand ?? 0) * oa.aantal
                  }, 0)

                  return (
                    <div key={org.id} className="px-5 py-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar name={org.naam} size={30} />
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold">{org.naam}</div>
                          <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize " + (PAKKET_COLORS[org.licentie_type] ?? '')}>{org.licentie_type}</span>
                        </div>

                      </div>

                      {/* Gebruik overzicht */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-[#f5f5f7] rounded-[10px] px-3 py-2">
                          <div className="text-[10px] text-[#6e6e73] mb-1">Gebruikers</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#e8e8ed] rounded-full overflow-hidden">
                              <div className={"h-full rounded-full " + (orgUsers.length >= maxUsers ? 'bg-[#ff3b30]' : 'bg-[#0071e3]')}
                                style={{width: Math.min(100, Math.round(orgUsers.length/Math.max(maxUsers,1)*100)) + '%'}} />
                            </div>
                            <span className={"text-[11px] font-semibold " + (orgUsers.length >= maxUsers ? 'text-[#ff3b30]' : 'text-[#3a3a3c]')}>
                              {orgUsers.length}/{maxUsers}
                            </span>
                          </div>
                        </div>
                        <div className="bg-[#f5f5f7] rounded-[10px] px-3 py-2">
                          <div className="text-[10px] text-[#6e6e73] mb-1">Parken</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#e8e8ed] rounded-full overflow-hidden">
                              <div className={"h-full rounded-full " + (orgParks.length >= maxParken ? 'bg-[#ff3b30]' : 'bg-[#30d158]')}
                                style={{width: Math.min(100, Math.round(orgParks.length/Math.max(maxParken,1)*100)) + '%'}} />
                            </div>
                            <span className={"text-[11px] font-semibold " + (orgParks.length >= maxParken ? 'text-[#ff3b30]' : 'text-[#3a3a3c]')}>
                              {orgParks.length}/{maxParken}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Add-on controls */}
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {addons.map(addon => {
                          const orgAddon = orgAddons.find(oa => oa.organisatie_id === org.id && oa.addon_id === addon.id)
                          const aantal = orgAddon?.aantal ?? 0
                          const isOn = aantal > 0
                          const maandprijs = addon.prijs_per_maand * (addon.heeft_aantal ? aantal : 1)

                          if (!addon.heeft_aantal) {
                            return (
                              <button key={addon.id} onClick={() => toggleOrgAddon(org.id, addon.id, isOn ? 0 : 1, !isOn)}
                                className={"flex items-center gap-2 px-3 py-2 rounded-[10px] border text-[12px] font-medium transition-all " + (isOn ? 'bg-[rgba(0,113,227,0.05)] border-[rgba(0,113,227,0.2)] text-[#004f9e]' : 'bg-[#f5f5f7] border-black/[0.05] text-[#6e6e73] hover:bg-[#e8e8ed]')}>
                                <div className={"w-3 h-3 rounded-full " + (isOn ? 'bg-[#0071e3]' : 'bg-[#d1d1d6]')} />
                                <span className="flex-1 text-left">{addon.naam}</span>
                                {isOn && <span className="text-[10px] text-[#0071e3]">€{addon.prijs_per_maand}/mnd</span>}
                              </button>
                            )
                          }

                          return (
                            <div key={addon.id} className={"flex items-center gap-2 px-3 py-2 rounded-[10px] border transition-all " + (isOn ? 'bg-[rgba(0,113,227,0.05)] border-[rgba(0,113,227,0.2)]' : 'bg-[#f5f5f7] border-black/[0.05]')}>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-medium text-[#3a3a3c]">{addon.naam}</div>
                                {isOn && <div className="text-[10px] text-[#0071e3]">{aantal}x €{addon.prijs_per_maand} = €{maandprijs}/mnd</div>}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => toggleOrgAddon(org.id, addon.id, Math.max(0, aantal - 1), aantal > 1)}
                                  disabled={aantal === 0}
                                  className="w-6 h-6 rounded-full bg-white border border-black/[0.1] text-[14px] font-bold flex items-center justify-center hover:bg-[#f5f5f7] disabled:opacity-30 transition-all">-</button>
                                <span className={"text-[13px] font-semibold w-5 text-center " + (isOn ? 'text-[#0071e3]' : 'text-[#aeaeb2]')}>{aantal}</span>
                                <button onClick={() => toggleOrgAddon(org.id, addon.id, aantal + 1, true)}
                                  className="w-6 h-6 rounded-full bg-[#0071e3] text-white text-[14px] font-bold flex items-center justify-center hover:bg-[#0077ed] transition-all">+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {(() => {
                        const addonMRR = orgAddons.filter(oa => oa.organisatie_id === org.id && oa.aantal > 0).reduce((s, oa) => {
                          const a = addons.find(a => a.id === oa.addon_id)
                          return s + (a?.prijs_per_maand ?? 0) * oa.aantal
                        }, 0)
                        return addonMRR > 0 ? <div className="mt-2 text-right text-[12px] font-semibold text-[#0071e3]">Add-ons: €{addonMRR}/mnd</div> : null
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Instellingen */}
        {nav === 'instellingen' && (
          <div className="p-8 max-w-[600px]">
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Instellingen</h1>
            </div>
            <div className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6">
              <div className="text-[14px] font-semibold mb-4">Platform admins</div>
              {admins.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-black/[0.05] last:border-0">
                  <Avatar name={a.naam ?? a.email} color="#0071e3" size={32} />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{a.naam ?? '-'}</div>
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
                <Field label="Bedrijfsnaam *" value={form.naam} onChange={v => setForm(p => ({...p, naam: v}))} />
                <Field label="Email *" value={form.email} onChange={v => setForm(p => ({...p, email: v}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefoon" value={form.telefoon} onChange={v => setForm(p => ({...p, telefoon: v}))} />
                <Field label="Naam eerste park" value={form.park_naam} onChange={v => setForm(p => ({...p, park_naam: v}))} />
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

      {/* Edit addon modal */}
      {editAddon && (
        <>
          <div className="fixed inset-0 bg-black/[0.4] backdrop-blur-[4px] z-[200]" onClick={() => setEditAddon(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.2)] w-[440px] p-6">
            <div className="text-[18px] font-bold mb-1">Add-on bewerken</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">{editAddon.naam}</div>
            <div className="flex flex-col gap-3">
              <Field label="Naam" value={String(editAddonForm.naam ?? '')} onChange={v => setEditAddonForm(p => ({...p, naam: v}))} />
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Beschrijving</label>
                <textarea value={String(editAddonForm.beschrijving ?? '')} onChange={e => setEditAddonForm(p => ({...p, beschrijving: e.target.value}))} rows={2}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Prijs per maand (€)" value={Number(editAddonForm.prijs_per_maand ?? 0)} onChange={v => setEditAddonForm(p => ({...p, prijs_per_maand: v}))} />
                <Field label="Eenheid" value={String(editAddonForm.eenheid ?? '')} onChange={v => setEditAddonForm(p => ({...p, eenheid: v}))} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditAddon(null)} className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[13px] font-medium hover:bg-black/10">Annuleren</button>
              <button onClick={handleSaveAddon} disabled={savingEdit} className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {savingEdit ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit klant modal */}
      {editOrg && (
        <>
          <div className="fixed inset-0 bg-black/[0.4] backdrop-blur-[4px] z-[200]" onClick={() => setEditOrg(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.2)] w-[520px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-[18px] font-bold mb-1">Klant bewerken</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">{editOrg.naam}</div>
            <div className="flex flex-col gap-3">
              <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em]">Contactgegevens</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bedrijfsnaam" value={String(editOrgForm.naam ?? '')} onChange={v => setEditOrgForm(p => ({...p, naam: v}))} />
                <Field label="Email" value={String(editOrgForm.email ?? '')} onChange={v => setEditOrgForm(p => ({...p, email: v}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefoon" value={String(editOrgForm.telefoon ?? '')} onChange={v => setEditOrgForm(p => ({...p, telefoon: v}))} />
                <Field label="Adres" value={String(editOrgForm.adres ?? '')} onChange={v => setEditOrgForm(p => ({...p, adres: v}))} />
              </div>
              <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mt-1">Licentie</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Pakket</label>
                  <select value={String(editOrgForm.licentie_type ?? '')} onChange={e => setEditOrgForm(p => ({...p, licentie_type: e.target.value}))}
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                    {pakketten.map(p => <option key={p.id} value={p.slug}>{p.naam}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Status</label>
                  <select value={String(editOrgForm.status ?? '')} onChange={e => setEditOrgForm(p => ({...p, status: e.target.value}))}
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                    <option value="actief">Actief</option>
                    <option value="inactief">Inactief</option>
                    <option value="proef">Proef</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Geldig tot" value={String(editOrgForm.licentie_tot ?? '')} onChange={v => setEditOrgForm(p => ({...p, licentie_tot: v}))} />
                <NumField label="Extra parken" value={Number(editOrgForm.extra_parken ?? 0)} onChange={v => setEditOrgForm(p => ({...p, extra_parken: v}))} />
                <NumField label="Extra gebruikers" value={Number(editOrgForm.extra_gebruikers ?? 0)} onChange={v => setEditOrgForm(p => ({...p, extra_gebruikers: v}))} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Notities</label>
                <textarea value={String(editOrgForm.notities ?? '')} onChange={e => setEditOrgForm(p => ({...p, notities: e.target.value}))} rows={3}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditOrg(null)} className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[13px] font-medium hover:bg-black/10">Annuleren</button>
              <button onClick={handleSaveOrg} disabled={savingEdit} className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {savingEdit ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit pakket modal */}
      {editPakket && (
        <>
          <div className="fixed inset-0 bg-black/[0.4] backdrop-blur-[4px] z-[200]" onClick={() => setEditPakket(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.2)] w-[480px] p-6">
            <div className="text-[18px] font-bold mb-1">Pakket bewerken</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">{editPakket.naam}</div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Naam" value={String(editPakketForm.naam ?? '')} onChange={v => setEditPakketForm(p => ({...p, naam: v}))} />
                <NumField label="Prijs per maand (€)" value={Number(editPakketForm.prijs_per_maand ?? 0)} onChange={v => setEditPakketForm(p => ({...p, prijs_per_maand: v}))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <NumField label="Max parken" value={Number(editPakketForm.max_parken ?? 0)} onChange={v => setEditPakketForm(p => ({...p, max_parken: v}))} />
                <NumField label="Max gebruikers" value={Number(editPakketForm.max_gebruikers ?? 0)} onChange={v => setEditPakketForm(p => ({...p, max_gebruikers: v}))} />
                <NumField label="Max kavels" value={Number(editPakketForm.max_kavels ?? 0)} onChange={v => setEditPakketForm(p => ({...p, max_kavels: v}))} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Features (één per regel)</label>
                <textarea value={(editPakketForm.features ?? []).join(String.fromCharCode(10))} onChange={e => setEditPakketForm(p => ({...p, features: e.target.value.split(String.fromCharCode(10))}))} onKeyDown={e => e.key === 'Enter' && e.stopPropagation()}
                  rows={5} className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#0071e3] focus:bg-white transition-all resize-none font-mono" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditPakket(null)} className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[13px] font-medium hover:bg-black/10">Annuleren</button>
              <button onClick={handleSavePakket} disabled={savingEdit} className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {savingEdit ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
