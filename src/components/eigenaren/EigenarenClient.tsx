'use client'
import { useState, useMemo } from 'react'
import type { Owner, Kavel } from '@/types'
import { isOpgeleverd, isActief, getKavelPct } from '@/types'
import { useRouter } from 'next/navigation'
import {
  getBetalingen, upsertBetaling, updateBetaling, deleteBetaling,
  type Betalingstermijn
} from '@/lib/queries'
import { useEffect } from 'react'

interface Props { owners: Owner[]; kavels: Kavel[] }

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0, 2).map((x: string) => x[0].toUpperCase()).join('')
}

const STATUS_STYLES: Record<Betalingstermijn['status'], { label: string; cls: string }> = {
  openstaand:   { label: 'Openstaand',   cls: 'bg-[rgba(255,159,10,0.12)] text-[#a05a00]' },
  betaald:      { label: 'Betaald',      cls: 'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]' },
  te_laat:      { label: 'Te laat',      cls: 'bg-[rgba(255,59,48,0.10)] text-[#8b1a1a]' },
  deelbetaling: { label: 'Deelbetaling', cls: 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]' },
}

export function EigenarenClient({ owners, kavels }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterBetaling, setFilterBetaling] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [betalingen, setBetalingen] = useState<Betalingstermijn[]>([])
  const [showAddBetaling, setShowAddBetaling] = useState(false)
  const [newBetaling, setNewBetaling] = useState({
    omschrijving: '', bedrag: '', vervaldatum: '', status: 'openstaand' as Betalingstermijn['status'], notitie: ''
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const router = useRouter()

  useEffect(() => {
    getBetalingen('11111111-0000-0000-0000-000000000001').then(setBetalingen)
  }, [])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t) }
  }, [toast])

  // Derive payment summary per owner
  const ownerBetalingSummary = useMemo(() => {
    const map: Record<string, { total: number; betaald: number; openstaand: number; teLaat: number; status: string }> = {}
    owners.forEach(o => {
      const bs = betalingen.filter(b => b.owner_id === o.id)
      const total = bs.reduce((s, b) => s + b.bedrag, 0)
      const betaald = bs.filter(b => b.status === 'betaald').reduce((s, b) => s + b.bedrag, 0)
      const openstaand = bs.filter(b => b.status === 'openstaand' || b.status === 'deelbetaling').reduce((s, b) => s + b.bedrag, 0)
      const teLaat = bs.some(b => b.status === 'te_laat')
      const allBetaald = bs.length > 0 && bs.every(b => b.status === 'betaald')
      map[o.id] = {
        total, betaald, openstaand,
        teLaat: bs.filter(b => b.status === 'te_laat').reduce((s, b) => s + b.bedrag, 0),
        status: teLaat ? 'te_laat' : allBetaald ? 'betaald' : bs.length > 0 ? 'openstaand' : 'geen',
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
        const s = ownerBetalingSummary[o.id]?.status
        return s === filterBetaling
      })
    }
    return list
  }, [owners, kavels, search, filterStatus, filterBetaling, ownerBetalingSummary])

  const selected = owners.find(o => o.id === selectedId) ?? null
  const selectedKavels = selected ? kavels.filter(k => k.owner_id === selected.id) : []
  const selectedBetalingen = selected ? betalingen.filter(b => b.owner_id === selected.id) : []

  async function handleAddBetaling() {
    if (!selected || !newBetaling.omschrijving || !newBetaling.bedrag || !newBetaling.vervaldatum) return
    setSaving(true)
    try {
      const b = await upsertBetaling({
        owner_id: selected.id,
        omschrijving: newBetaling.omschrijving,
        bedrag: parseFloat(newBetaling.bedrag),
        vervaldatum: newBetaling.vervaldatum,
        status: newBetaling.status,
        notitie: newBetaling.notitie || null,
      })
      if (b) setBetalingen(prev => [...prev, b])
      setNewBetaling({ omschrijving: '', bedrag: '', vervaldatum: '', status: 'openstaand', notitie: '' })
      setShowAddBetaling(false)
      setToast('Betalingstermijn toegevoegd ✓')
    } catch { setToast('Opslaan mislukt') }
    finally { setSaving(false) }
  }

  async function handleStatusChange(id: string, status: Betalingstermijn['status']) {
    await updateBetaling(id, { status })
    setBetalingen(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  async function handleDeleteBetaling(id: string) {
    await deleteBetaling(id)
    setBetalingen(prev => prev.filter(b => b.id !== id))
    setToast('Verwijderd ✓')
  }

  const fmt = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <div className="p-7 max-w-[1280px]">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">Eigenaren</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">Kopersoverzicht, kavels & betalingen</p>
        </div>
        <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all">
          + Eigenaar
        </button>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-4 items-start">
        {/* Left: filters + table */}
        <div>
          {/* Search + filters */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2]">⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Zoek op naam, e-mail of kavel…"
                className="w-full bg-white border border-black/[0.05] rounded-full py-2.5 pl-9 pr-4 text-[14px] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] focus:border-[#0071e3] transition-all" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-black/[0.05] rounded-full px-4 py-2.5 text-[13px] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] focus:border-[#0071e3] text-[#3a3a3c]">
              <option value="">Alle statussen</option>
              <option value="opgeleverd">Opgeleverd</option>
              <option value="actief">In uitvoering</option>
              <option value="gepland">Gepland</option>
            </select>
            <select value={filterBetaling} onChange={e => setFilterBetaling(e.target.value)}
              className="bg-white border border-black/[0.05] rounded-full px-4 py-2.5 text-[13px] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] focus:border-[#0071e3] text-[#3a3a3c]">
              <option value="">Alle betalingen</option>
              <option value="te_laat">Te laat</option>
              <option value="openstaand">Openstaand</option>
              <option value="betaald">Betaald</option>
              <option value="geen">Geen termijnen</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['', 'Naam', 'Kavels', 'Status', 'Betaling', 'Openstaand', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] text-left border-b border-black/[0.05] bg-[#f5f5f7]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const kv = kavels.filter(k => k.owner_id === o.id)
                  const kNums = kv.map(k => '#' + k.number).join(', ') || '—'
                  const allDone = kv.length > 0 && kv.every(isOpgeleverd)
                  const anyActive = kv.some(isActief)
                  const bSum = ownerBetalingSummary[o.id]
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
                      <td className="px-4 py-3">
                        {bSum && bSum.status !== 'geen' ? (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[bSum.status as Betalingstermijn['status']]?.cls ?? 'bg-black/[0.06] text-[#6e6e73]'}`}>
                            {STATUS_STYLES[bSum.status as Betalingstermijn['status']]?.label ?? bSum.status}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#aeaeb2]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-[#1d1d1f]">
                        {bSum && bSum.openstaand > 0 ? (
                          <span className={bSum.status === 'te_laat' ? 'text-[#ff3b30]' : ''}>{fmt(bSum.openstaand)}</span>
                        ) : bSum && bSum.total > 0 ? (
                          <span className="text-[#1a7a32]">Voldaan</span>
                        ) : <span className="text-[#aeaeb2]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-[#aeaeb2] text-[12px]">→</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px] text-[#aeaeb2]">Geen eigenaren gevonden</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail */}
        <div>
          {selected ? (
            <div className="bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-black/[0.05] overflow-hidden">
              {/* Owner header */}
              <div className="p-5 border-b border-black/[0.05]">
                <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[20px] font-semibold text-white mb-3"
                  style={{ background: selected.color }}>{initials(selected.name)}</div>
                <div className="text-[17px] font-bold tracking-[-0.2px]">{selected.name}</div>
                <div className="text-[13px] text-[#6e6e73] mt-0.5">{selected.contact}</div>
              </div>

              <div className="p-5">
                {/* Contact */}
                <ST>Contactgegevens</ST>
                <IR label="E-mail"><a href={`mailto:${selected.email}`} className="text-[#0071e3]">{selected.email}</a></IR>
                <IR label="Telefoon">{selected.phone}</IR>
                <IR label="Adres">{selected.address}</IR>

                {/* Kavels */}
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
                      <span className="text-[#aeaeb2] text-[12px]">→</span>
                    </div>
                  )
                }) : <p className="text-[12px] text-[#6e6e73] py-2">Geen kavels</p>}

                {/* Betalingstermijnen */}
                <div className="flex items-center justify-between mt-4 mb-2">
                  <ST className="mb-0">Betalingstermijnen</ST>
                  <button onClick={() => setShowAddBetaling(v => !v)}
                    className="text-[11px] font-medium text-[#0071e3] hover:underline">
                    + Toevoegen
                  </button>
                </div>

                {/* Add form */}
                {showAddBetaling && (
                  <div className="bg-[#f5f5f7] rounded-[12px] p-3 mb-3 border border-black/[0.05]">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input placeholder="Omschrijving" value={newBetaling.omschrijving}
                        onChange={e => setNewBetaling(p => ({...p, omschrijving: e.target.value}))}
                        className="col-span-2 bg-white border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]" />
                      <input placeholder="Bedrag (€)" type="number" value={newBetaling.bedrag}
                        onChange={e => setNewBetaling(p => ({...p, bedrag: e.target.value}))}
                        className="bg-white border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]" />
                      <input type="date" value={newBetaling.vervaldatum}
                        onChange={e => setNewBetaling(p => ({...p, vervaldatum: e.target.value}))}
                        className="bg-white border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]" />
                      <select value={newBetaling.status} onChange={e => setNewBetaling(p => ({...p, status: e.target.value as Betalingstermijn['status']}))}
                        className="col-span-2 bg-white border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]">
                        <option value="openstaand">Openstaand</option>
                        <option value="betaald">Betaald</option>
                        <option value="te_laat">Te laat</option>
                        <option value="deelbetaling">Deelbetaling</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddBetaling} disabled={saving}
                        className="flex-1 py-1.5 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] disabled:opacity-60">
                        {saving ? 'Opslaan…' : 'Opslaan'}
                      </button>
                      <button onClick={() => setShowAddBetaling(false)}
                        className="px-3 py-1.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[12px] hover:bg-black/10">
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                {/* Betaling list */}
                {selectedBetalingen.length === 0 && !showAddBetaling && (
                  <p className="text-[12px] text-[#aeaeb2] py-2">Geen betalingstermijnen</p>
                )}
                {selectedBetalingen.map(b => {
                  const s = STATUS_STYLES[b.status]
                  const isOverdue = b.status === 'te_laat' || (b.status === 'openstaand' && new Date(b.vervaldatum) < new Date())
                  return (
                    <div key={b.id} className={`p-3 rounded-[10px] border mb-2 transition-all ${isOverdue && b.status !== 'betaald' ? 'border-[rgba(255,59,48,0.2)] bg-[rgba(255,59,48,0.04)]' : 'border-black/[0.05] bg-[#f5f5f7]'}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="text-[13px] font-medium text-[#1d1d1f]">{b.omschrijving}</div>
                          <div className="text-[12px] text-[#6e6e73] mt-0.5">
                            {fmt(b.bedrag)} · Vervalt {new Date(b.vervaldatum).toLocaleDateString('nl-NL')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select value={b.status}
                            onChange={e => handleStatusChange(b.id, e.target.value as Betalingstermijn['status'])}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-full border-none outline-none cursor-pointer ${s.cls}`}
                            style={{background:'transparent'}}>
                            <option value="openstaand">Openstaand</option>
                            <option value="betaald">Betaald</option>
                            <option value="te_laat">Te laat</option>
                            <option value="deelbetaling">Deelbetaling</option>
                          </select>
                          <button onClick={() => handleDeleteBetaling(b.id)}
                            className="text-[#aeaeb2] hover:text-[#ff3b30] text-[14px] leading-none transition-all">×</button>
                        </div>
                      </div>
                      {b.notitie && <div className="text-[11px] text-[#6e6e73] mt-1.5">{b.notitie}</div>}
                    </div>
                  )
                })}

                {/* Summary */}
                {selectedBetalingen.length > 0 && (
                  <div className="mt-3 p-3 bg-[#f5f5f7] rounded-[10px] border border-black/[0.05]">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-[#6e6e73]">Totaal</span>
                      <span className="font-medium">{fmt(selectedBetalingen.reduce((s,b)=>s+b.bedrag,0))}</span>
                    </div>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-[#6e6e73]">Betaald</span>
                      <span className="text-[#1a7a32] font-medium">{fmt(selectedBetalingen.filter(b=>b.status==='betaald').reduce((s,b)=>s+b.bedrag,0))}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#6e6e73]">Openstaand</span>
                      <span className="font-medium text-[#a05a00]">{fmt(selectedBetalingen.filter(b=>b.status!=='betaald').reduce((s,b)=>s+b.bedrag,0))}</span>
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
