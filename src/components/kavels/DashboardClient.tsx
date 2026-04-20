'use client'
import { useState, useCallback, useEffect } from 'react'
import type { Kavel, Park } from '@/types'
import { isOpgeleverd, isActief, getKavelPct } from '@/types'
import { PhaseBlock } from './PhaseBlock'
import { KavelPanel } from './KavelPanel'
import { MapWidget } from '@/components/map/MapWidget'
import {
  createKavel, getOwners, verkoopKavel, startFase,
  type ParkMap, type FaseStatus, type TermijnConfig, type Betalingstermijn
} from '@/lib/queries'
import type { Owner } from '@/types'

interface Props {
  park: Park | null
  kavels: Kavel[]
  parkMaps: ParkMap[]
  faseStatussen: FaseStatus[]
  termijnConfig: TermijnConfig[]
  betalingen: Betalingstermijn[]
  vakmanCategorieen?: { id: string; naam: string }[]
  optieKoppelingen?: Record<string, string>
  taken?: { id: string; optie_key: string | null; status: string; kavel_id: string; opmerking_vakman: string | null; gestart_op: string | null; gereed_op: string | null }[]
}

const PARK_ID = '11111111-0000-0000-0000-000000000001'
const TERMIJN_VOLGORDE_KEYS = ['eerste_termijn','doorgang_fase','bouw_gestart','transport','geplaatst','gereed_oplevering','opgeleverd']

export function DashboardClient({ park, kavels: initial, parkMaps, faseStatussen: initialFaseStatussen, termijnConfig, betalingen: initialBetalingen, vakmanCategorieen = [], optieKoppelingen = {}, taken = [] }: Props) {
  const [kavels, setKavels] = useState(initial)
  const [faseStatussen, setFaseStatussen] = useState(initialFaseStatussen)
  const [betalingen, setBetalingen] = useState(initialBetalingen)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [verkoopModal, setVerkoopModal] = useState<string | null>(null)
  const [owners, setOwners] = useState<Owner[]>([])
  const [verkoopOwnerId, setVerkoopOwnerId] = useState('')
  const [verkoopSaving, setVerkoopSaving] = useState(false)
  const [newKavel, setNewKavel] = useState({ number: '', fase: '1', type: 'Tiny 2p', uitvoering: 'Rechts' })
  const [adding, setAdding] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [filters, setFilters] = useState<{
    search: string
    fases: number[]
    status: string[]
    verkoop: string[]
    voortgang: string[]
    opties: string[]
    termijn: string[]
  }>({ search: '', fases: [], status: [], verkoop: [], voortgang: [], opties: [], termijn: [] })

  useEffect(() => { getOwners(PARK_ID).then(setOwners) }, [])

  const total = kavels.length
  const opl = kavels.filter(isOpgeleverd).length
  const act = kavels.filter(isActief).length
  const verkocht = kavels.filter(k => k.verkocht).length
  const fases = [...new Set(kavels.map(k => k.fase))].sort()

  const activeFilterCount = filters.fases.length + filters.status.length + filters.verkoop.length +
    filters.voortgang.length + filters.opties.length + filters.termijn.length + (filters.search ? 1 : 0)

  const clearFilters = () => setFilters({ search:'', fases:[], status:[], verkoop:[], voortgang:[], opties:[], termijn:[] })

  function toggleFilter(key: keyof typeof filters, val: unknown) {
    setFilters(prev => {
      const arr = prev[key] as unknown[]
      return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })
  }

  const filteredKavels = kavels.filter(k => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!k.owner?.name?.toLowerCase().includes(q) && !String(k.number).includes(q)) return false
    }
    if (filters.fases.length && !filters.fases.includes(k.fase)) return false
    if (filters.status.length) {
      const s = isOpgeleverd(k) ? 'opgeleverd' : isActief(k) ? 'actief' : 'gepland'
      if (!filters.status.includes(s)) return false
    }
    if (filters.verkoop.length) {
      if (!filters.verkoop.includes(k.verkocht ? 'verkocht' : 'beschikbaar')) return false
    }
    if (filters.voortgang.length) {
      const pct = getKavelPct(k.status)
      const bucket = pct < 25 ? '0-25' : pct < 50 ? '25-50' : pct < 75 ? '50-75' : '75-100'
      if (!filters.voortgang.includes(bucket)) return false
    }
    if (filters.opties.length) {
      const hasAll = filters.opties.every(optKey => {
        const o = k.opties as unknown as Record<string,unknown>
        return !!(o?.[optKey + '_besteld'] || o?.[optKey + '_gereed'])
      })
      if (!hasAll) return false
    }
    if (filters.termijn.length) {
      const kBet = betalingen.filter(b => b.kavel_id === k.id)
      const maxIdx = Math.max(-1, ...kBet.map(b => TERMIJN_VOLGORDE_KEYS.indexOf(b.termijn_key)))
      const currentKey = maxIdx >= 0 ? TERMIJN_VOLGORDE_KEYS[maxIdx] : 'geen'
      if (!filters.termijn.includes(currentKey)) return false
    }
    return true
  })

  const selectKavel = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true) }, [])
  const updateKavelLocal = useCallback((updated: Kavel) => {
    setKavels(prev => prev.map(k => k.id === updated.id ? updated : k))
  }, [])

  async function handleAddKavel() {
    if (!newKavel.number) return
    setAdding(true)
    try {
      const created = await createKavel({
        park_id: PARK_ID,
        number: parseInt(newKavel.number),
        fase: parseInt(newKavel.fase),
        type: newKavel.type,
        uitvoering: newKavel.uitvoering,
      })
      if (created) {
        setKavels(prev => [...prev, created].sort((a, b) => a.number - b.number))
        setAddOpen(false)
        setNewKavel({ number: '', fase: '1', type: 'Tiny 2p', uitvoering: 'Rechts' })
      }
    } catch (e) { console.error(e) }
    finally { setAdding(false) }
  }

  async function handleVerkoop() {
    if (!verkoopModal || !verkoopOwnerId) return
    setVerkoopSaving(true)
    try {
      await verkoopKavel(verkoopModal, verkoopOwnerId, PARK_ID)
      const owner = owners.find(o => o.id === verkoopOwnerId)
      setKavels(prev => prev.map(k => k.id === verkoopModal ? { ...k, verkocht: true, owner_id: verkoopOwnerId, owner } : k))
      setVerkoopModal(null)
      setVerkoopOwnerId('')
    } catch (e) { console.error(e) }
    finally { setVerkoopSaving(false) }
  }

  async function handleStartFase(fase: number) {
    await startFase(PARK_ID, fase)
    setFaseStatussen(prev => {
      const filtered = prev.filter(f => f.fase !== fase)
      return [...filtered, { id: Date.now().toString(), park_id: PARK_ID, fase, gestart_at: new Date().toISOString() }]
    })
    const faseKavels = kavels.filter(k => k.fase === fase && k.verkocht && k.owner_id)
    const config = termijnConfig.find(t => t.trigger === 'fase_gestart')
    if (config) {
      for (const k of faseKavels) {
        const { triggerBetalingstermijn } = await import('@/lib/queries')
        await triggerBetalingstermijn(k.id, k.owner_id!, config.termijn_key, config.naam)
      }
    }
  }

  const selectedKavel = kavels.find(k => k.id === selectedId) ?? null

  return (
    <div className="p-7 max-w-[1280px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">{park?.name ?? 'Park'}</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">
            {activeFilterCount > 0 ? `${filteredKavels.length} van ${total} kavels` : 'Bouwplanning & kavelstatus'}
          </p>
        </div>
        <div className="flex gap-2 pt-0.5">
          <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10 transition-all">Exporteren</button>
          <button onClick={() => setAddOpen(true)}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all shadow-[0_1px_4px_rgba(0,113,227,0.3)]">
            + Kavel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {[
          { label: 'Totaal kavels', value: total, sub: park?.name ?? '', color: '' },
          { label: 'Opgeleverd', value: opl, sub: `${total ? Math.round(opl/total*100) : 0}% gereed`, color: 'text-[#30d158]' },
          { label: 'In uitvoering', value: act, sub: 'actief', color: 'text-[#ff9f0a]' },
          { label: 'Verkocht', value: verkocht, sub: `${total - verkocht} beschikbaar`, color: '' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl px-[18px] py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05]">
            <div className="text-[12px] text-[#6e6e73] font-medium mb-1.5">{label}</div>
            <div className={`text-[28px] font-bold tracking-[-0.5px] leading-none ${color}`}>{value}</div>
            <div className="text-[11px] text-[#aeaeb2] mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-2.5">
          {fases.map(fase => {
            const faseStatus = faseStatussen.find(f => f.fase === fase)
            return (
              <PhaseBlock key={fase} fase={fase}
                kavels={filteredKavels.filter(k => k.fase === fase)}
                selectedId={selectedId} onSelect={selectKavel}
                mapUrl={parkMaps.find(m => m.fase === fase)?.map_url ?? null}
                mapId={parkMaps.find(m => m.fase === fase)?.id ?? null}
                faseGestart={!!faseStatus?.gestart_at}
                faseGestartAt={faseStatus?.gestart_at ?? null}
                onStartFase={() => handleStartFase(fase)}
                onVerkoop={(kavelId) => { setVerkoopModal(kavelId); setVerkoopOwnerId('') }}
              />
            )
          })}
        </div>
        <div className="sticky top-7 flex flex-col gap-3">
          <MapWidget park={park} kavels={kavels} highlightId={selectedId}
            mapId={parkMaps.find(m => m.fase === null)?.id ?? null}
            onKavelClick={(id) => { setSelectedId(id); setPanelOpen(true) }} />
          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-black/[0.02] transition-all"
              onClick={() => setFilterOpen(o => !o)}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#aeaeb2]" style={{display:'inline-block',transform:filterOpen?'rotate(0deg)':'rotate(-90deg)'}}>&#9660;</span>
                <span className="text-[13px] font-semibold">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e]">{activeFilterCount} actief</span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button onClick={e => { e.stopPropagation(); clearFilters() }}
                  className="text-[11px] font-medium text-[#0071e3] px-2.5 py-1 rounded-full bg-[rgba(0,113,227,0.08)] hover:bg-[rgba(0,113,227,0.14)] transition-all">
                  x Alles wissen
                </button>
              )}
            </div>
            {filterOpen && (
              <div className="px-4 pb-4 border-t border-black/[0.05]">
                <div className="mt-3 mb-3">
                  <input value={filters.search} onChange={e => setFilters(p => ({...p, search: e.target.value}))}
                    placeholder="Zoek op kavel of eigenaar"
                    className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-full px-3.5 py-2 text-[12px] outline-none focus:border-[#0071e3] transition-all" />
                </div>
                <FilterSection title="Fase">
                  {fases.map(f => <Chip key={f} label={`Fase ${f}`} active={filters.fases.includes(f)} onClick={() => toggleFilter('fases', f)} />)}
                </FilterSection>
                <FilterSection title="Bouwstatus">
                  {[['gepland','Gepland'],['actief','In uitvoering'],['opgeleverd','Opgeleverd']].map(([v,l]) => (
                    <Chip key={v} label={l} active={filters.status.includes(v)} onClick={() => toggleFilter('status', v)} />
                  ))}
                </FilterSection>
                <FilterSection title="Verkoop">
                  {[['verkocht','Verkocht'],['beschikbaar','Beschikbaar']].map(([v,l]) => (
                    <Chip key={v} label={l} active={filters.verkoop.includes(v)} onClick={() => toggleFilter('verkoop', v)} />
                  ))}
                </FilterSection>
                <FilterSection title="Voortgang">
                  {[['0-25','0-25%'],['25-50','25-50%'],['50-75','50-75%'],['75-100','75-100%']].map(([v,l]) => (
                    <Chip key={v} label={l} active={filters.voortgang.includes(v)} onClick={() => toggleFilter('voortgang', v)} />
                  ))}
                </FilterSection>
                <FilterSection title="Opties">
                  {[['airco','Airco'],['hottub','Hottub'],['zonnepanelen','Zonnepanelen'],['tuinaanleg','Tuinaanleg'],
                    ['pergola','Pergola'],['berging','Berging'],['meubels','Meubels'],['loungeset','Loungeset'],
                    ['horren','Horren'],['zitkuil','Zitkuil']].map(([v,l]) => (
                    <Chip key={v} label={l} active={filters.opties.includes(v)} onClick={() => toggleFilter('opties', v)} />
                  ))}
                </FilterSection>
                <FilterSection title="Betalingstermijn" last>
                  {[['geen','Geen termijn'],['eerste_termijn','Eerste termijn'],['doorgang_fase','Doorgang fase'],
                    ['bouw_gestart','Bouw gestart'],['transport','Transport'],['geplaatst','Geplaatst'],
                    ['gereed_oplevering','Gereed oplevering'],['opgeleverd','Opgeleverd']].map(([v,l]) => (
                    <Chip key={v} label={l} active={filters.termijn.includes(v)} onClick={() => toggleFilter('termijn', v)} />
                  ))}
                </FilterSection>
              </div>
            )}
          </div>
        </div>
      </div>

      {panelOpen && selectedKavel && (
        <KavelPanel kavel={selectedKavel} termijnConfig={termijnConfig} owners={owners}
          onClose={() => { setPanelOpen(false); setSelectedId(null) }}
          onUpdate={updateKavelLocal}
          onVerkoop={(kavelId) => { setVerkoopModal(kavelId); setVerkoopOwnerId('') }}
          onBetalingTriggered={(b) => setBetalingen(prev => [...prev, b])}
          vakmanCategorieen={vakmanCategorieen}
          optieKoppelingen={optieKoppelingen} />
      )}

      {verkoopModal && (
        <>
          <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={() => setVerkoopModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-black/[0.05] w-[420px] p-6">
            <div className="text-[16px] font-bold mb-1">Kavel verkopen</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">Koppel een eigenaar aan kavel #{kavels.find(k=>k.id===verkoopModal)?.number}</div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Eigenaar</label>
              <select value={verkoopOwnerId} onChange={e => setVerkoopOwnerId(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                <option value="">Selecteer eigenaar</option>
                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="bg-[rgba(0,113,227,0.06)] rounded-[10px] p-3 mb-5 text-[12px] text-[#004f9e]">
              Na verkoop wordt automatisch de eerste betalingstermijn aangemaakt.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setVerkoopModal(null)} className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10">Annuleren</button>
              <button onClick={handleVerkoop} disabled={verkoopSaving || !verkoopOwnerId}
                className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {verkoopSaving ? 'Opslaan...' : 'Verkopen'}
              </button>
            </div>
          </div>
        </>
      )}

      {addOpen && (
        <>
          <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={() => setAddOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-black/[0.05] w-[400px] p-6">
            <div className="text-[16px] font-bold mb-1">Kavel toevoegen</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">Vul de basisgegevens in</div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Kavelnummer</label>
                <input type="number" value={newKavel.number} onChange={e => setNewKavel(p => ({...p, number: e.target.value}))}
                  placeholder="bijv. 112"
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Fase</label>
                <select value={newKavel.fase} onChange={e => setNewKavel(p => ({...p, fase: e.target.value}))}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                  <option value="1">Fase 1</option><option value="2">Fase 2</option><option value="3">Fase 3</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Type</label>
                <select value={newKavel.type} onChange={e => setNewKavel(p => ({...p, type: e.target.value}))}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                  <option>Tiny 2p</option><option>Tiny 4p</option><option>Tiny 2+2</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Uitvoering</label>
                <select value={newKavel.uitvoering} onChange={e => setNewKavel(p => ({...p, uitvoering: e.target.value}))}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                  <option>Rechts</option><option>Links</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setAddOpen(false)} className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10">Annuleren</button>
              <button onClick={handleAddKavel} disabled={adding || !newKavel.number}
                className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {adding ? 'Toevoegen...' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FilterSection({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`py-2.5 ${!last ? 'border-b border-black/[0.05]' : ''}`}>
      <div className="text-[10px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all
        ${active
          ? 'bg-[rgba(0,113,227,0.10)] border-[rgba(0,113,227,0.3)] text-[#004f9e]'
          : 'bg-[#f5f5f7] border-black/[0.06] text-[#6e6e73] hover:bg-[#e8e8ed] hover:text-[#3a3a3c]'
        }`}>
      {label}
    </button>
  )
}
