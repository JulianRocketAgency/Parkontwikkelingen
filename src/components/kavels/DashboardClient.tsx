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
}

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export function DashboardClient({ park, kavels: initial, parkMaps, faseStatussen: initialFaseStatussen, termijnConfig, betalingen: initialBetalingen }: Props) {
  const [kavels, setKavels] = useState(initial)
  const [faseStatussen, setFaseStatussen] = useState(initialFaseStatussen)
  const [betalingen, setBetalingen] = useState(initialBetalingen)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [verkoopModal, setVerkoopModal] = useState<string | null>(null) // kavelId
  const [owners, setOwners] = useState<Owner[]>([])
  const [verkoopOwnerId, setVerkoopOwnerId] = useState('')
  const [verkoopSaving, setVerkoopSaving] = useState(false)
  const [newKavel, setNewKavel] = useState({ number: '', fase: '1', type: 'Tiny 2p', uitvoering: 'Rechts' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getOwners(PARK_ID).then(setOwners)
  }, [])

  const total = kavels.length
  const opl = kavels.filter(isOpgeleverd).length
  const act = kavels.filter(isActief).length
  const verkocht = kavels.filter(k => k.verkocht).length
  const fases = [...new Set(kavels.map(k => k.fase))].sort()

  const selectKavel = useCallback((id: string) => {
    setSelectedId(id); setPanelOpen(true)
  }, [])

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
      setKavels(prev => prev.map(k => k.id === verkoopModal
        ? { ...k, verkocht: true, owner_id: verkoopOwnerId, owner }
        : k
      ))
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
    // Trigger "doorgang_fase" betalingstermijn for all kavels in this fase
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
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px]">{park?.name ?? 'Park'}</h1>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">Bouwplanning & kavelstatus</p>
        </div>
        <div className="flex gap-2 pt-0.5">
          <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10 transition-all">
            Exporteren
          </button>
          <button onClick={() => setAddOpen(true)}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all shadow-[0_1px_4px_rgba(0,113,227,0.3)]">
            + Kavel
          </button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-2.5">
          {fases.map(fase => {
            const faseStatus = faseStatussen.find(f => f.fase === fase)
            return (
              <PhaseBlock key={fase} fase={fase}
                kavels={kavels.filter(k => k.fase === fase)}
                selectedId={selectedId}
                onSelect={selectKavel}
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
        <div className="sticky top-7">
          <MapWidget park={park} kavels={kavels} highlightId={selectedId}
            mapId={parkMaps.find(m => m.fase === null)?.id ?? null}
            onKavelClick={(id) => { setSelectedId(id); setPanelOpen(true) }} />
        </div>
      </div>

      {/* Kavel panel */}
      {panelOpen && selectedKavel && (
        <KavelPanel
          kavel={selectedKavel}
          termijnConfig={termijnConfig}
          owners={owners}
          onClose={() => { setPanelOpen(false); setSelectedId(null) }}
          onUpdate={updateKavelLocal}
          onVerkoop={(kavelId) => { setVerkoopModal(kavelId); setVerkoopOwnerId('') }}
          onBetalingTriggered={(b) => setBetalingen(prev => [...prev, b])}
        />
      )}

      {/* Verkoop modal */}
      {verkoopModal && (
        <>
          <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={() => setVerkoopModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-black/[0.05] w-[420px] p-6">
            <div className="text-[16px] font-bold mb-1">Kavel verkopen</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">
              Koppel een eigenaar aan kavel #{kavels.find(k=>k.id===verkoopModal)?.number}
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Eigenaar</label>
              <select value={verkoopOwnerId} onChange={e => setVerkoopOwnerId(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] transition-all">
                <option value="">Selecteer eigenaar…</option>
                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="bg-[rgba(0,113,227,0.06)] rounded-[10px] p-3 mb-5 text-[12px] text-[#004f9e]">
              Na verkoop wordt automatisch de <strong>eerste betalingstermijn</strong> aangemaakt.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setVerkoopModal(null)}
                className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10">
                Annuleren
              </button>
              <button onClick={handleVerkoop} disabled={verkoopSaving || !verkoopOwnerId}
                className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {verkoopSaving ? 'Opslaan…' : 'Verkopen'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add kavel modal */}
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
                  <option value="1">Fase 1</option>
                  <option value="2">Fase 2</option>
                  <option value="3">Fase 3</option>
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
              <button onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10">Annuleren</button>
              <button onClick={handleAddKavel} disabled={adding || !newKavel.number}
                className="flex-1 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50">
                {adding ? 'Toevoegen…' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
