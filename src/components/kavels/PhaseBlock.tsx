'use client'
import { useState } from 'react'
import type { Kavel } from '@/types'
import { isOpgeleverd, isActief, getKavelPct, OPTIES, getOptie } from '@/types'
import { ChevronRight } from 'lucide-react'
import { MapWidget } from '@/components/map/MapWidget'

interface Props {
  fase: number
  kavels: Kavel[]
  selectedId: string | null
  onSelect: (id: string) => void
  mapUrl: string | null
  mapId?: string | null
  faseGestart: boolean
  faseGestartAt: string | null
  onStartFase: () => void
  onVerkoop: (kavelId: string) => void
}

export function PhaseBlock({ fase, kavels, selectedId, onSelect, mapUrl, mapId, faseGestart, faseGestartAt, onStartFase, onVerkoop }: Props) {
  const [open, setOpen] = useState(fase === 1)
  const [confirmStart, setConfirmStart] = useState(false)

  const pct = Math.round(kavels.reduce((s, k) => s + getKavelPct(k.status), 0) / (kavels.length || 1))
  const done = kavels.filter(isOpgeleverd).length
  const allDone = done === kavels.length
  const anyActive = kavels.some(isActief)
  const verkocht = kavels.filter(k => k.verkocht).length

  const barColor = allDone ? '#30d158' : anyActive ? '#ff9f0a' : '#d1d1d6'

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
      <div className="flex items-center gap-3 px-[18px] py-3.5 cursor-pointer select-none hover:bg-black/[0.02] transition-all"
        onClick={() => setOpen(o => !o)}>
        <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 transition-all
          ${open ? 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]' : 'bg-[#e8e8ed] text-[#6e6e73]'}`}>
          <ChevronRight size={10} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
        <div>
          <div className="text-[14px] font-semibold">Fase {fase}</div>
          <div className="text-[12px] text-[#6e6e73]">{kavels.length} woningen · {verkocht} verkocht</div>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {/* Fase status badge */}
          {faseGestart ? (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[rgba(48,209,88,0.13)] text-[#1a7a32]">
              Gestart {faseGestartAt ? new Date(faseGestartAt).toLocaleDateString('nl-NL') : ''}
            </span>
          ) : (
            <button onClick={e => { e.stopPropagation(); setConfirmStart(true) }}
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e] hover:bg-[rgba(0,113,227,0.18)] transition-all">
              Fase starten
            </button>
          )}
          <span className="text-[12px] font-semibold text-[#3a3a3c] tabular-nums">{pct}%</span>
          <div className="w-[90px] h-1 bg-[#e8e8ed] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
          </div>
        </div>
      </div>

      {/* Confirm fase starten */}
      {confirmStart && (
        <div className="mx-4 mb-3 p-3 bg-[rgba(0,113,227,0.06)] rounded-[12px] border border-[rgba(0,113,227,0.15)]">
          <div className="text-[13px] font-medium text-[#004f9e] mb-1">Fase {fase} starten?</div>
          <div className="text-[12px] text-[#6e6e73] mb-3">Dit triggert automatisch de "doorgang fase" betalingstermijn voor alle verkochte kavels in deze fase.</div>
          <div className="flex gap-2">
            <button onClick={() => { onStartFase(); setConfirmStart(false) }}
              className="px-4 py-1.5 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed]">
              Bevestigen
            </button>
            <button onClick={() => setConfirmStart(false)}
              className="px-4 py-1.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[12px] font-medium hover:bg-black/10">
              Annuleren
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="px-4 pb-4">
          {mapUrl && (
            <div className="mb-4">
              <MapWidget park={null} kavels={kavels} highlightId={selectedId}
                onKavelClick={onSelect} mapUrl={mapUrl} mapId={mapId}
                title={`Plattegrond fase ${fase}`} />
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {kavels.map(k => (
              <KavelCard key={k.id} kavel={k} selected={selectedId === k.id}
                onSelect={onSelect} onVerkoop={onVerkoop} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KavelCard({ kavel: k, selected, onSelect, onVerkoop }: {
  kavel: Kavel; selected: boolean; onSelect: (id: string) => void; onVerkoop: (id: string) => void
}) {
  const pct = getKavelPct(k.status)
  const done = isOpgeleverd(k)
  const active = isActief(k)
  const dotColor = done ? '#30d158' : active ? '#ff9f0a' : '#aeaeb2'
  const barColor = done ? '#30d158' : active ? '#ff9f0a' : '#d1d1d6'
  const activeOpties = OPTIES.filter(({ key }) => { const e = getOptie(k.opties, key); return e.besteld || e.gereed })

  return (
    <div onClick={() => onSelect(k.id)}
      className={`relative rounded-2xl px-3.5 py-3 cursor-pointer transition-all overflow-hidden border
        ${selected
          ? 'bg-[rgba(0,113,227,0.10)] border-[rgba(0,113,227,0.3)] shadow-[0_0_0_2px_rgba(0,113,227,0.2)]'
          : 'bg-[#f5f5f7] border-black/[0.08] hover:bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px'
        }`}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: done ? '#30d158' : active ? '#ff9f0a' : '#d1d1d6' }} />
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-[#aeaeb2]">Kavel #{k.number}</span>
        <div className="flex items-center gap-1.5">
          {k.verkocht ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(48,209,88,0.13)] text-[#1a7a32]">Verkocht</span>
          ) : (
            <button onClick={e => { e.stopPropagation(); onVerkoop(k.id) }}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e] hover:bg-[rgba(0,113,227,0.18)] transition-all">
              Verkopen
            </button>
          )}
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: dotColor }} />
        </div>
      </div>
      <div className="text-[13px] font-semibold text-[#1d1d1f] mb-0.5 truncate">
        {k.owner?.name ?? <span className="text-[#aeaeb2] font-normal">Geen eigenaar</span>}
      </div>
      <div className="text-[12px] text-[#6e6e73] mb-2">{k.type} · {k.uitvoering}</div>
      <div className="h-[3px] bg-[#e8e8ed] rounded-full overflow-hidden mb-1.5">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex flex-wrap gap-1">
        {activeOpties.slice(0, 2).map(({ key, label }) => {
          const e = getOptie(k.opties, key)
          return (
            <span key={key} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full
              ${e.gereed ? 'bg-[rgba(48,209,88,0.15)] text-[#1a7a32]' : 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]'}`}>
              {label}
            </span>
          )
        })}
        {activeOpties.length > 2 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/[0.06] text-[#6e6e73]">
            +{activeOpties.length - 2}
          </span>
        )}
      </div>
    </div>
  )
}
