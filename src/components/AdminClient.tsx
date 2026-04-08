'use client'
import { useState } from 'react'
import { Building2, Users, Map, Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface Organisatie {
  id: string
  naam: string
  slug: string
  email: string | null
  telefoon: string | null
  status: string
  licentie_type: string
  licentie_tot: string | null
  max_parken: number
  max_gebruikers: number
  created_at: string
}

interface Park {
  id: string
  name: string
  slug: string | null
  status: string | null
  organisatie_id: string | null
  organisaties: { naam: string } | null
}

interface Profile {
  id: string
  naam: string | null
  full_name: string | null
  email: string | null
  role: string | null
  is_admin: boolean | null
  park_id: string | null
  avatar_color: string | null
  created_at: string
}

interface Props {
  organisaties: Organisatie[]
  parks: Park[]
  profiles: Profile[]
}

const STATUS_COLORS: Record<string, string> = {
  actief: 'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]',
  inactief: 'bg-[rgba(174,174,178,0.15)] text-[#6e6e73]',
  proef: 'bg-[rgba(255,159,10,0.12)] text-[#a05a00]',
}

const LICENTIE_COLORS: Record<string, string> = {
  starter: 'bg-[rgba(174,174,178,0.15)] text-[#6e6e73]',
  professional: 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]',
  enterprise: 'bg-[rgba(191,90,242,0.12)] text-[#7a1fa5]',
}

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('')
}

export function AdminClient({ organisaties, parks, profiles }: Props) {
  const [tab, setTab] = useState<'overzicht' | 'organisaties' | 'gebruikers'>('overzicht')
  const [selectedOrg, setSelectedOrg] = useState<Organisatie | null>(null)

  const totalUsers = profiles.length
  const totalParks = parks.length
  const activeOrgs = organisaties.filter(o => o.status === 'actief').length

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Admin header */}
      <div className="bg-white border-b border-black/[0.06] px-8 py-4 flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-[#1d1d1f] flex items-center justify-center flex-shrink-0">
          <Building2 size={15} className="text-white" />
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-tight">ParkBouw Admin</div>
          <div className="text-[11px] text-[#6e6e73]">Platform beheer</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a href="/dashboard" className="px-3 py-1.5 rounded-full text-[12px] text-[#6e6e73] hover:bg-black/[0.05] transition-all">
            Terug naar dashboard
          </a>
          <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all flex items-center gap-1.5">
            <Plus size={13} /> Nieuwe klant
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px]">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Organisaties', value: organisaties.length, sub: activeOrgs + ' actief', icon: Building2, color: '#0071e3' },
            { label: 'Parken', value: totalParks, sub: 'totaal', icon: Map, color: '#30d158' },
            { label: 'Gebruikers', value: totalUsers, sub: 'accounts', icon: Users, color: '#bf5af2' },
            { label: 'Licenties actief', value: activeOrgs, sub: organisaties.filter(o=>o.licentie_type==='enterprise').length + ' enterprise', icon: CheckCircle, color: '#ff9f0a' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-[20px] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: color + '20'}}>
                  <Icon size={14} style={{color}} />
                </div>
                <span className="text-[12px] text-[#6e6e73] font-medium">{label}</span>
              </div>
              <div className="text-[28px] font-bold tracking-[-0.5px] leading-none">{value}</div>
              <div className="text-[11px] text-[#aeaeb2] mt-1">{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white rounded-full p-1 w-fit shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05]">
          {[['overzicht','Overzicht'],['organisaties','Organisaties'],['gebruikers','Gebruikers']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${tab === key ? 'bg-[#1d1d1f] text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Overzicht */}
        {tab === 'overzicht' && (
          <div className="grid grid-cols-[1fr_340px] gap-4">
            <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                <div className="text-[14px] font-semibold">Organisaties</div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.05] bg-[#f5f5f7]">
                    {['Naam','Parken','Gebruikers','Licentie','Status',''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {organisaties.map((org, i) => {
                    const orgParks = parks.filter(p => p.organisatie_id === org.id)
                    const orgUsers = profiles.filter(p => orgParks.some(pk => pk.id === p.park_id))
                    return (
                      <tr key={org.id} onClick={() => setSelectedOrg(org)}
                        className={`cursor-pointer hover:bg-black/[0.02] transition-all ${i < organisaties.length-1 ? 'border-b border-black/[0.05]' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-medium text-[#1d1d1f]">{org.naam}</div>
                          <div className="text-[11px] text-[#6e6e73]">{org.email ?? org.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#3a3a3c]">{orgParks.length}/{org.max_parken}</td>
                        <td className="px-4 py-3 text-[13px] text-[#3a3a3c]">{orgUsers.length}/{org.max_gebruikers}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${LICENTIE_COLORS[org.licentie_type] ?? ''}`}>
                            {org.licentie_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[org.status] ?? ''}`}>
                            {org.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#aeaeb2] text-right">→</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Detail panel */}
            <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-5">
              {!selectedOrg ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[13px] text-[#aeaeb2] gap-2">
                  <Building2 size={28} className="opacity-30" />
                  Selecteer een organisatie
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1d1d1f] flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0">
                      {initials(selectedOrg.naam)}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold">{selectedOrg.naam}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[selectedOrg.status]}`}>
                        {selectedOrg.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0 mb-4">
                    {[
                      ['Licentie', selectedOrg.licentie_type],
                      ['Geldig tot', selectedOrg.licentie_tot ? new Date(selectedOrg.licentie_tot).toLocaleDateString('nl-NL') : 'Onbeperkt'],
                      ['Email', selectedOrg.email ?? '—'],
                      ['Telefoon', selectedOrg.telefoon ?? '—'],
                      ['Aangemaakt', new Date(selectedOrg.created_at).toLocaleDateString('nl-NL')],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between py-2 border-b border-black/[0.05] text-[13px]">
                        <span className="text-[#6e6e73]">{label}</span>
                        <span className="font-medium capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2">Parken</div>
                  {parks.filter(p => p.organisatie_id === selectedOrg.id).map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f7] rounded-[10px] mb-1.5">
                      <Map size={12} className="text-[#6e6e73]" />
                      <span className="text-[12px] font-medium text-[#3a3a3c] flex-1">{p.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status ?? 'actief']}`}>{p.status ?? 'actief'}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 py-2 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[12px] font-medium hover:bg-black/10 transition-all">
                      Bewerken
                    </button>
                    <button className="flex-1 py-2 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-all">
                      Inloggen als
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Organisaties tab */}
        {tab === 'organisaties' && (
          <div className="grid grid-cols-2 gap-3">
            {organisaties.map(org => {
              const orgParks = parks.filter(p => p.organisatie_id === org.id)
              return (
                <div key={org.id} className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1d1d1f] flex items-center justify-center text-[13px] font-bold text-white">
                      {initials(org.naam)}
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-bold">{org.naam}</div>
                      <div className="text-[11px] text-[#6e6e73]">{org.email ?? org.slug}</div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${LICENTIE_COLORS[org.licentie_type]}`}>
                      {org.licentie_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      ['Parken', orgParks.length + '/' + org.max_parken],
                      ['Status', org.status],
                      ['Geldig tot', org.licentie_tot ? new Date(org.licentie_tot).toLocaleDateString('nl-NL') : '∞'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#f5f5f7] rounded-[10px] px-3 py-2 text-center">
                        <div className="text-[10px] text-[#6e6e73] mb-0.5">{label}</div>
                        <div className="text-[12px] font-semibold capitalize">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {orgParks.map(p => (
                      <span key={p.id} className="text-[11px] px-2 py-1 bg-[rgba(0,113,227,0.08)] text-[#004f9e] rounded-full">{p.name}</span>
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="border-2 border-dashed border-[#d1d1d6] rounded-[20px] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#0071e3] hover:bg-[rgba(0,113,227,0.02)] transition-all">
              <div className="w-10 h-10 rounded-full bg-[rgba(0,113,227,0.08)] flex items-center justify-center">
                <Plus size={18} className="text-[#0071e3]" />
              </div>
              <div className="text-[13px] font-medium text-[#0071e3]">Nieuwe organisatie</div>
            </div>
          </div>
        )}

        {/* Gebruikers tab */}
        {tab === 'gebruikers' && (
          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[0.05] bg-[#f5f5f7]">
                  {['Gebruiker','Email','Rol','Park','Admin','Aangemaakt'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => {
                  const park = parks.find(pk => pk.id === p.park_id)
                  const name = p.naam ?? p.full_name ?? p.email ?? 'Onbekend'
                  return (
                    <tr key={p.id} className={`hover:bg-black/[0.02] transition-all ${i < profiles.length-1 ? 'border-b border-black/[0.05]' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                            style={{background: p.avatar_color ?? '#0071e3'}}>{initials(name)}</div>
                          <span className="text-[13px] font-medium">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{p.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.06] text-[#3a3a3c] capitalize">{p.role ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{park?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p.is_admin && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(191,90,242,0.12)] text-[#7a1fa5]">Admin</span>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6e6e73]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('nl-NL') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
