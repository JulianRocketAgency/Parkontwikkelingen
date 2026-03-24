'use client'
import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import type { Owner, Kavel } from '@/types'
import { isOpgeleverd, isActief, getKavelPct } from '@/types'
import { useRouter } from 'next/navigation'
import {
  getBetalingen, updateBetaling, deleteBetaling,
  type Betalingstermijn
} from '@/lib/queries'

interface Props { owners: Owner[]; kavels: Kavel[] }

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0, 2).map((x: string) => x[0].toUpperCase()).join('')
}

const STATUS_STYLES: Record<Betalingstermijn['status'], { label: string; cls: string }> = {
  verwacht: { label: 'Verwacht',   cls: 'bg-black/[0.06] text-[#6e6e73]' },
  actief:   { label: 'Actief',     cls: 'bg-[rgba(255,159,10,0.12)] text-[#a05a00]' },
  voldaan:  { label: 'Voldaan',    cls: 'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]' },
}

export function EigenarenClient({ owners, kavels }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBetaling, setFilterBetaling] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [betalingen, setBetalingen] = useState<Betalingstermijn[]>([])
  const [toast, setToast] = useState('')
  const router = useRouter()

  const refreshBetalingen = () => getBetalingen('11111111-0000-0000-0000-000000000001').then(setBetalingen)

  useEffect(() => {
    refreshBetalingen()
    // Refresh when tab gets focus (user switched from dashboard)
    const onFocus = () => refreshBetalingen()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t) }
  }, [toast])

  const TOTAL_TERMIJNEN = 7
  // Termijn volgorde voor sortering
  const TERMIJN_VOLGORDE = [
    'eerste_termijn','doorgang_fase','bouw_gestart','transport',
    'geplaatst','gereed_oplevering','opgeleverd'
  ]

  const ownerBetalingSummary = useMemo(() => {
    const map: Record<string, { current: number; currentNaam: string; currentKey: string }> = {}
    owners.forEach(o => {
      const bs = betalingen.filter(b => b.owner_id === o.id)
      if (bs.length === 0) {
        map[o.id] = { current: 0, currentNaam: '', currentKey: '' }
        return
      }
      // Find highest termijn by volgorde
      let maxIdx = -1
      let maxB = bs[0]
      bs.forEach(b => {
        const idx = TERMIJN_VOLGORDE.indexOf(b.termijn_key)
        if (idx > maxIdx) { maxIdx = idx; maxB = b }
      })
      map[o.id] = {
        current: maxIdx + 1,
        currentNaam: maxB.naam,
        currentKey: maxB.termijn_key,
      }
    })
    return map
  }, [owners, betalingen])

  const filtered = useMemo(() => {
    let list = owners
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.name.toLowerCase().includes(q) ||
        (o.email ?? '').toLowerCase().includes(q) ||
        kavels.filter(k => k.owner_id === o.id).some(k => String(k.number).includes(q))
      )
    }
    if (filterStatus) {
      list = list.filter(o => {
        const kv = kavels.filter(k => k.owner_id === o.id)
        if (filterStatus === 'opgeleverd') return kv.length > 0 && kv.every(isOpgeleverd)
        if (filterStatus === 'actief') return kv.some(isActief)
        if (filterStatus === 'gepland') return !kv.some(isActief) && !kv.every(isOpgeleverd)
        return true
      })
    }
    if (filterBetaling) {
      list = list.filter(o => {
        const s = ownerBetalingSummary[o.id]
        if (filterBetaling === 'geen') return s?.current === 0
        return s?.currentKey === filterBetaling
      })
    }
    return list
  }, [owners, kavels, search, filterStatus, filterBetaling, ownerBetalingSummary])

  const selected = owners.find(o => o.id === selectedId) ?? null
  const selectedKavels = selected ? kavels.filter(k => k.owner_id === selected.id) : []
  const selectedBetalingen = selected ? betalingen.filter(b => b.owner_id === selected.id) : []

  async function handleStatusChange(id: string, status: Betalingstermijn['status']) {
    await updateBetaling(id, { status })
    setBetalingen(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  async function handleDeleteBetaling(id: string) {
    await deleteBetaling(id)
    setBetalingen(prev => prev.filter(b => b.id !== id))
    setToast('Verwijderd ✓')
  }

  return (
    <div className="p-7 max-w-[1280px]">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50">
          {toast}
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">Eigenaren</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">Kopersoverzicht, kavels & betalingstermijnen</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshBetalingen}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10 transition-all">
            ↻ Verversen
          </button>
          <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all">
            + Eigenaar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-4 items-start">
        {/* Left: filters + table */}
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2]">⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Zoek op naam, e-mail of kavel…"
                className="w-full bg-white border border-black/[0.05] rounded-full py-2.5 pl-9 pr-4 text-[14px] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] focus:border-[#0071e3] transition-all" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-black/[0.05] rounded-full px-4 py-2.5 text-[13px] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] text-[#3a3a3c]">
              <option value="">Alle statussen</option>
              <option value="opgeleverd">Opgeleverd</option>
              <option value="actief">In uitvoering</option>
              <option value="gepland">Gepland</option>
            </select>
            <select value={filterBetaling} onChange={e => setFilterBetaling(e.target.value)}
              className="bg-white border border-black/[0.05] rounded-full px-4 py-2.5 text-[13px] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] text-[#3a3a3c]">
              <option value="">Alle termijnen</option>
              <option value="geen">Geen termijnen</option>
              <option value="eerste_termijn">Eerste termijn</option>
              <option value="doorgang_fase">Doorgang fase</option>
              <option value="bouw_gestart">Bouw woning gestart</option>
              <option value="transport">Transport klaarstaan</option>
              <option value="geplaatst">Geplaatst op kavel</option>
              <option value="gereed_oplevering">Gereed voor oplevering</option>
              <option value="opgeleverd">Opgeleverd</option>
            </select>
          </div>

          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['', 'Naam', 'Kavel(s)', 'Status', 'Betaling', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] text-left border-b border-black/[0.05] bg-[#f5f5f7]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const kv = kavels.filter(k => k.owner_id === o.id)
                  const sel = selectedId === o.id
                  const isLast = i === filtered.length - 1
                  const allDone = kv.length > 0 && kv.every(isOpgeleverd)
                  const anyActive = kv.some(isActief)
                  return (
                    <tr key={o.id} onClick={() => setSelectedId(o.id)}
                      className={`cursor-pointer transition-all align-top
                        ${sel ? '[&>td]:bg-[rgba(0,113,227,0.08)]' : 'hover:[&>td]:bg-black/[0.02]'}
                        ${!isLast ? '[&>td]:border-b [&>td]:border-black/[0.05]' : ''}`}>
                      {/* Avatar */}
                      <td className="px-4 py-3">
                        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-semibold text-white mt-0.5"
                          style={{ background: o.color }}>{initials(o.name)}</div>
                      </td>
                      {/* Naam */}
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-[#1d1d1f]">{o.name}</div>
                        <div className="text-[12px] text-[#6e6e73]">{o.email}</div>
                      </td>
                      {/* Kavel(s) */}
                      <td className="px-4 py-3">
                        {kv.length === 0
                          ? <span className="text-[12px] text-[#aeaeb2]">—</span>
                          : kv.map(k => (
                            <div key={k.id} className="text-[12px] text-[#6e6e73] leading-relaxed">
                              #{k.number} <span className="text-[#aeaeb2]">{k.type}</span>
                            </div>
                          ))
                        }
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        {kv.length === 0
                          ? <span className="text-[11px] text-[#aeaeb2]">—</span>
                          : kv.map(k => {
                            const done = isOpgeleverd(k), active = isActief(k)
                            return (
                              <div key={k.id} className="mb-1 last:mb-0 flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                                  ${done ? 'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]'
                                  : active ? 'bg-[rgba(255,159,10,0.12)] text-[#a05a00]'
                                  : 'bg-black/[0.06] text-[#6e6e73]'}`}>
                                  {done ? 'Opgeleverd' : active ? 'In uitvoering' : 'Gepland'}
                                </span>
                                {k.verkocht && (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.13)] text-[#1a7a32]">Verkocht</span>
                                )}
                              </div>
                            )
                          })
                        }
                      </td>
                      {/* Betaling */}
                      <td className="px-4 py-3">
                        {kv.length === 0
                          ? <span className="text-[11px] text-[#aeaeb2]">—</span>
                          : kv.map(k => {
                            const kBetalingen = betalingen.filter(b => b.kavel_id === k.id)
                            const maxIdx = Math.max(-1, ...kBetalingen.map(b => TERMIJN_VOLGORDE.indexOf(b.termijn_key)))
                            const currentTermijn = maxIdx >= 0 ? kBetalingen.find(b => b.termijn_key === TERMIJN_VOLGORDE[maxIdx]) : null
                            return (
                              <div key={k.id} className="mb-1 last:mb-0">
                                {currentTermijn ? (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e]">
                                    {maxIdx + 1}/{TOTAL_TERMIJNEN} · {currentTermijn.naam}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#aeaeb2]">0/{TOTAL_TERMIJNEN}</span>
                                )}
                              </div>
                            )
                          })
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-[#aeaeb2] text-[12px]">→</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-[#aeaeb2]">Geen eigenaren gevonden</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail */}
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
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-[#aeaeb2]">Kavel #{k.number}</div>
                        <div className="text-[13px] font-medium">{k.type} · {getKavelPct(k.status)}% gereed</div>
                      </div>
                      {k.verkocht && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(48,209,88,0.13)] text-[#1a7a32]">Verkocht</span>}
                      <span className="text-[#aeaeb2] text-[12px]">→</span>
                    </div>
                  )
                }) : <p className="text-[12px] text-[#6e6e73] py-2">Geen kavels</p>}

                <ST className="mt-4">Betalingstermijnen</ST>
                {selectedBetalingen.length === 0 && (
                  <p className="text-[12px] text-[#aeaeb2] py-2">Geen betalingstermijnen — worden automatisch aangemaakt bij mijlpalen</p>
                )}
                {selectedBetalingen.map(b => {
                  const s = STATUS_STYLES[b.status]
                  const kavelNum = kavels.find(k => k.id === b.kavel_id)?.number
                  return (
                    <div key={b.id} className={`p-3 rounded-[10px] border mb-2 transition-all
                      ${b.status === 'actief' ? 'border-[rgba(255,159,10,0.2)] bg-[rgba(255,159,10,0.04)]'
                      : b.status === 'voldaan' ? 'border-[rgba(48,209,88,0.2)] bg-[rgba(48,209,88,0.04)]'
                      : 'border-black/[0.05] bg-[#f5f5f7]'}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-[13px] font-medium text-[#1d1d1f]">{b.naam}</div>
                          <div className="text-[11px] text-[#6e6e73] mt-0.5">
                            {kavelNum ? `Kavel #${kavelNum}` : ''}
                            {b.triggered_at ? ` · ${new Date(b.triggered_at).toLocaleDateString('nl-NL')}` : ''}
                          </div>
                        </div>
                        <select value={b.status}
                          onChange={e => handleStatusChange(b.id, e.target.value as Betalingstermijn['status'])}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border-none outline-none cursor-pointer ${s.cls}`}
                          style={{background:'transparent'}}>
                          <option value="verwacht">Verwacht</option>
                          <option value="actief">Actief</option>
                          <option value="voldaan">Voldaan</option>
                        </select>
                        <button onClick={() => handleDeleteBetaling(b.id)}
                          className="text-[#aeaeb2] hover:text-[#ff3b30] text-[14px] leading-none transition-all">×</button>
                      </div>
                    </div>
                  )
                })}

                {/* Summary */}
                {selectedBetalingen.length > 0 && (
                  <div className="mt-3 p-3 bg-[#f5f5f7] rounded-[10px] border border-black/[0.05]">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-[#6e6e73]">Huidige termijn</span>
                      <span className="font-medium">{selectedBetalingen.length}/{TOTAL_TERMIJNEN}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#6e6e73]">Nog te komen</span>
                      <span className="text-[#6e6e73] font-medium">{TOTAL_TERMIJNEN - selectedBetalingen.length}</span>
                    </div>
                  </div>
                )}

                {selected.notes && <><ST className="mt-4">Notities</ST><p className="text-[13px] text-[#3a3a3c] leading-relaxed">{selected.notes}</p></>}

                <div className="flex gap-2 mt-5">
                  <button className="flex-1 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed]">Bewerken</button>
                  <button className="px-4 py-2 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10">Bericht</button>
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
