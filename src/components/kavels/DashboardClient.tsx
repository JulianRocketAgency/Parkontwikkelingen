'use client'
import { useState, useCallback } from 'react'
import type { Kavel, Park } from '@/types'
import { isOpgeleverd, isActief, getKavelPct } from '@/types'
import { PhaseBlock } from './PhaseBlock'
import { KavelPanel } from './KavelPanel'
import { MapWidget } from '@/components/map/MapWidget'

interface Props {
  park: Park | null
  kavels: Kavel[]
}

export function DashboardClient({ park, kavels: initial }: Props) {
  const [kavels, setKavels] = useState(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const total = kavels.length
  const opl = kavels.filter(isOpgeleverd).length
  const act = kavels.filter(isActief).length
  const eig = kavels.filter(k => k.owner_id).length

  const fases = [...new Set(kavels.map(k => k.fase))].sort()

  const selectKavel = useCallback((id: string) => {
    setSelectedId(id)
    setPanelOpen(true)
  }, [])

  const highlightFromMap = useCallback((id: string) => {
    setSelectedId(id)
    setPanelOpen(true)
  }, [])

  const updateKavelLocal = useCallback((updated: Kavel) => {
    setKavels(prev => prev.map(k => k.id === updated.id ? updated : k))
  }, [])

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
          <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all shadow-[0_1px_4px_rgba(0,113,227,0.3)]">
            + Kavel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {[
          { label: 'Totaal kavels', value: total, sub: park?.name ?? '', color: '' },
          { label: 'Opgeleverd', value: opl, sub: `${Math.round(opl/total*100)}% gereed`, color: 'text-[#30d158]' },
          { label: 'In uitvoering', value: act, sub: 'actief', color: 'text-[#ff9f0a]' },
          { label: 'Verkocht', value: eig, sub: `${total - eig} beschikbaar`, color: '' },
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
        {/* Phases */}
        <div className="flex flex-col gap-2.5">
          {fases.map(fase => (
            <PhaseBlock
              key={fase}
              fase={fase}
              kavels={kavels.filter(k => k.fase === fase)}
              selectedId={selectedId}
              onSelect={selectKavel}
            />
          ))}
        </div>

        {/* Map widget */}
        <div className="sticky top-7">
          <MapWidget
            park={park}
            kavels={kavels}
            highlightId={selectedId}
            onKavelClick={highlightFromMap}
          />
        </div>
      </div>

      {/* Kavel detail panel */}
      {panelOpen && selectedKavel && (
        <KavelPanel
          kavel={selectedKavel}
          onClose={() => { setPanelOpen(false); setSelectedId(null) }}
          onUpdate={updateKavelLocal}
        />
      )}
    </div>
  )
}
