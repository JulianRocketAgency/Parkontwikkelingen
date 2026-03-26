'use client'
import { useState } from 'react'

interface Profile {
  id: string
  full_name: string | null
  naam: string | null
  email: string | null
  role: string | null
  avatar_color: string | null
}

interface Props { profiles: Profile[] }

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

export function WerkliedenClient({ profiles }: Props) {
  const [toast, setToast] = useState('')
  const grouped = ROLES.reduce((acc, role) => {
    acc[role] = profiles.filter(p => (p.role ?? 'vakman') === role)
    return acc
  }, {} as Record<string, Profile[]>)

  return (
    <div className="p-7 max-w-[900px]">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50">{toast}</div>
      )}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">Werklieden</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">Actieve accounts en roltoewijzing</p>
        </div>
        <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all">+ Uitnodigen</button>
      </div>
      <div className="flex flex-col gap-4">
        {ROLES.map(role => {
          const members = grouped[role] ?? []
          return (
            <div key={role} className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-black/[0.05]">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
                <span className="text-[12px] text-[#aeaeb2]">{members.length} accounts</span>
              </div>
              {members.length === 0 ? (
                <div className="px-5 py-4 text-[13px] text-[#aeaeb2]">Geen accounts met deze rol</div>
              ) : (
                <div className="divide-y divide-black/[0.05]">
                  {members.map(p => {
                    const name = p.naam ?? p.full_name ?? p.email ?? 'Onbekend'
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-all">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
                          style={{ background: p.avatar_color ?? '#0071e3' }}>{initials(name)}</div>
                        <div className="flex-1">
                          <div className="text-[13px] font-medium text-[#1d1d1f]">{name}</div>
                          <div className="text-[11px] text-[#6e6e73]">{p.email ?? ''}</div>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[p.role ?? 'vakman']}`}>
                          {ROLE_LABELS[p.role ?? 'vakman']}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
