'use client'
import { useState, useMemo } from 'react'
import type { Owner, Kavel } from '@/types'
import { isOpgeleverd, isActief, getKavelPct } from '@/types'
import { useRouter } from 'next/navigation'

interface Props { owners: Owner[]; kavels: Kavel[] }

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0, 2).map((x: string) => x[0].toUpperCase()).join('')
}

export function EigenarenClient({ owners, kavels }: Props) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = useMemo(() => {
    if (!search) return owners
    const q = search.toLowerCase()
    return owners.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      kavels.filter(k => k.owner_id === o.id).some(k => String(k.number).includes(q))
    )
  }, [owners, kavels, search])

  const selected = owners.find(o => o.id === selectedId) ?? null
  const selectedKavels = selected ? kavels.filter(k => k.owner_id === selected.id) : []

  return (
    <div className="p-7 max-w-[1280px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">Eigenaren</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">Kopersoverzicht & kavels</p>
        </div>
        <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all shadow-[0_1px_4px_rgba(0,113,227,0.3)]">
          + Eigenaar
        </button>
      </div>
      <div className="grid grid-cols-[1fr_360px] gap-4 items-start">
        <div>
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2]">⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Zoek op naam, e-mail of kavel…"
              className="w-full bg-white border border-black/[0.05] rounded-full py-2.5 pl-9 pr-4 text-[14px] text-[#1d1d1f] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] focus:border-[#0071e3] transition-all" />
          </div>
          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>{['', 'Naam', 'Kavels', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] text-left border-b border-black/[0.05] bg-[#f5f5f7]">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const kv = kavels.filter(k => k.owner_id === o.id)
                  const kNums = kv.map(k => '#' + k.number).join(', ') || '—'
                  const allDone = kv.length > 0 && kv.every(isOpgeleverd)
                  const anyActive = kv.some(isActief)
                  const sel = selectedId === o.id
                  return (
                    <tr key={o.id} onClick={() => setSelectedId(o.id)}
                      className={`cursor-pointer transition-all ${sel ? '[&>td]:bg-[rgba(0,113,227,0.08)]' : 'hover:[&>td]:bg-black/[0.02]'}
                        ${i < filtered.length - 1 ? '[&>td]:border-b [&>td]:border-black/[0.05]' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                          style={{ background: o.color }}>{initials(o.name)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-[#1d1d1f]">{o.name}</div>
                        <div className="text-[12px] text-[#6e6e73]">{o.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6e6e73]">{kNums}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${allDone ? 'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]' : anyActive ? 'bg-[rgba(255,159,10,0.12)] text-[#a05a00]' : 'bg-black/[0.06] text-[#6e6e73]'}`}>
                          {allDone ? 'Opgeleverd' : anyActive ? 'In uitvoering' : 'Gepland'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] text-[#aeaeb2]">→</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          {selected ? (
            <div className="bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-black/[0.05] overflow-hidden">
              <div className="p-5 border-b border-black/[0.05]">
                <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[20px] font-semibold text-white mb-3"
                  style={{ background: selected.color }}>{initials(selected.name)}</div>
                <div className="text-[17px] font-bold tracking-[-0.2px]">{selected.name}</div>
                <div className="text-[13px] text-[#6e6e73] mt-0.5">{selected.contact}</div>
              </div>
              <div className="p-5">
                <ST>Contactgegevens</ST>
                <IR label="E-mail"><a href={`mailto:${selected.email}`} className="text-[#0071e3]">{selected.email}</a></IR>
                <IR label="Telefoon">{selected.phone}</IR>
                <IR label="Adres">{selected.address}</IR>
                <ST className="mt-4">Kavels</ST>
                {selectedKavels.length ? selectedKavels.map(k => {
                  const col = isOpgeleverd(k) ? '#30d158' : isActief(k) ? '#ff9f0a' : '#aeaeb2'
                  return (
                    <div key={k.id} onClick={() => router.push('/dashboard')}
                      className="flex items-center gap-2.5 p-3 bg-[#f5f5f7] rounded-[10px] cursor-pointer hover:bg-[rgba(0,113,227,0.08)] border border-black/[0.05] mb-1.5 transition-all">
                      <div className="w-2 h-2 rounded-full" style={{ background: col }} />
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-[#aeaeb2]">Kavel #{k.number}</div>
                        <div className="text-[13px] font-medium">{k.type} · {getKavelPct(k.status)}% gereed</div>
                      </div>
                      <span className="text-[#aeaeb2] text-[12px]">→</span>
                    </div>
                  )
                }) : <p className="text-[12px] text-[#6e6e73] py-2">Geen kavels gekoppeld</p>}
                {selected.notes && <><ST className="mt-4">Notities</ST><p className="text-[13px] text-[#3a3a3c] leading-relaxed">{selected.notes}</p></>}
                <div className="flex gap-2 mt-5">
                  <button className="flex-1 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium">Bewerken</button>
                  <button className="px-4 py-2 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium">Bericht</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-10 text-center">
              <div className="text-[32px] opacity-20 mb-2">◎</div>
              <div className="text-[13px] text-[#6e6e73]">Selecteer een eigenaar</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ST({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-2 pb-1.5 border-b border-black/[0.05] ${className}`}>{children}</div>
}
function IR({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between items-start py-1.5 text-[13px]"><span className="text-[#6e6e73]">{label}</span><span className="text-[#1d1d1f] font-medium text-right max-w-[60%]">{children}</span></div>
}
