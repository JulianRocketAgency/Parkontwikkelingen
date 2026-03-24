'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Kavel, Park } from '@/types'
import { isOpgeleverd, isActief } from '@/types'
import { getPolygonsForMap, type KavelPolygon, getParkMaps } from '@/lib/queries'
import Link from 'next/link'

interface Props {
  park: Park | null
  kavels: Kavel[]
  highlightId: string | null
  onKavelClick: (id: string) => void
  mapUrl?: string | null
  mapId?: string | null
  title?: string
}

function useMapImage(url: string | null | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [dims, setDims] = useState<{ cw: number; ch: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!url) { setImg(null); setDims(null); return }
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => {
      setImg(el)
      const box = boxRef.current
      const W = box?.clientWidth || 290
      const H = box?.clientHeight || 240
      const scale = Math.min(W / el.width, H / el.height)
      setDims({ cw: Math.round(el.width * scale), ch: Math.round(el.height * scale) })
    }
    el.src = url
  }, [url])

  return { img, dims, boxRef }
}

export function MapWidget({ park, kavels, highlightId, onKavelClick, mapUrl, mapId, title = 'Plattegrond' }: Props) {
  const url = mapUrl ?? park?.map_image
  const { img, dims, boxRef } = useMapImage(url)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [polygons, setPolygons] = useState<KavelPolygon[]>([])
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  // Reset zoom/pan when map changes
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [url])

  // Load polygons for this specific map
  useEffect(() => {
    if (mapId) getPolygonsForMap(mapId).then(setPolygons)
    else setPolygons([])
  }, [mapId])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.5), 6))
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
  }, [pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    })
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  // Use map-specific polygons if available, otherwise fall back to kavel.polygon
  const withPolygon = mapId
    ? polygons.filter(mp => mp.polygon.length >= 3).map(mp => ({ ...kavels.find(k => k.id === mp.kavel_id)!, _poly: mp.polygon }))
    : kavels.filter(k => k.polygon && k.polygon.length >= 3).map(k => ({ ...k, _poly: k.polygon! }))

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
      <div className="px-[18px] pt-3.5 pb-1 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-[#3a3a3c] flex-1">{title}</span>
        {dims && (
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.min(z * 1.25, 6))}
              className="w-6 h-6 rounded-md bg-[#f5f5f7] text-[14px] font-medium flex items-center justify-center hover:bg-[#e8e8ed] transition-all">+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
              className="px-2 h-6 rounded-md bg-[#f5f5f7] text-[#6e6e73] text-[10px] flex items-center justify-center hover:bg-[#e8e8ed] transition-all min-w-[40px]">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.5))}
              className="w-6 h-6 rounded-md bg-[#f5f5f7] text-[14px] font-medium flex items-center justify-center hover:bg-[#e8e8ed] transition-all">−</button>
          </div>
        )}
        {!url && (
          <span className="text-[11px] text-[#aeaeb2]">Stel in via Instellingen</span>
        )}
      </div>
      <div className="p-3">
        <div
          ref={boxRef}
          className="w-full h-[240px] bg-[#f5f5f7] rounded-2xl relative overflow-hidden flex items-center justify-center select-none"
          style={{ cursor: img ? (dragging.current ? 'grabbing' : 'grab') : 'default' }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {!url && (
            <div className="text-center text-[#6e6e73] pointer-events-none">
              <div className="text-[28px] opacity-20 mb-2">⊡</div>
              <div className="text-[12px] font-medium mb-1">Geen plattegrond</div>
              <Link href="/instellingen" className="text-[11px] text-[#0071e3] hover:underline pointer-events-auto">
                Voeg toe via Instellingen →
              </Link>
            </div>
          )}
          {url && !img && (
            <div className="text-[12px] text-[#aeaeb2] animate-pulse">Laden…</div>
          )}
          {img && dims && (
            <div
              style={{
                position: 'absolute',
                width: dims.cw,
                height: dims.ch,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <CanvasImage img={img} cw={dims.cw} ch={dims.ch} />
              <svg
                style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'all' }}
                width={dims.cw} height={dims.ch}
                viewBox={`0 0 ${dims.cw} ${dims.ch}`}
              >
                {withPolygon.map(k => {
                  const hl = highlightId === k.id
                  const done = isOpgeleverd(k), active = isActief(k)
                  const fill = hl ? 'rgba(0,113,227,.28)' : done ? 'rgba(48,209,88,.20)' : active ? 'rgba(255,159,10,.20)' : 'rgba(174,174,178,.16)'
                  const stroke = hl ? '#0071e3' : done ? '#30d158' : active ? '#ff9f0a' : '#aeaeb2'
                  const pts = k.polygon!.map(p => `${(p.x/100*dims.cw).toFixed(1)},${(p.y/100*dims.ch).toFixed(1)}`).join(' ')
                  const cx = (k.polygon!.reduce((s,p)=>s+p.x,0)/k.polygon!.length/100*dims.cw).toFixed(1)
                  const cy = (k.polygon!.reduce((s,p)=>s+p.y,0)/k.polygon!.length/100*dims.ch).toFixed(1)
                  return (
                    <g key={k.id} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onKavelClick(k.id) }}>
                      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={hl ? 2.5 : 1.5} strokeLinejoin="round" />
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                        fontFamily="-apple-system,sans-serif" fontSize={hl ? 12 : 10} fontWeight="600"
                        fill={hl ? '#0071e3' : done ? '#1a7a32' : active ? '#a05a00' : '#6e6e73'}>
                        {k.number}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CanvasImage({ img }: { img: HTMLImageElement; cw: number; ch: number }) {
  return <img src={img.src} alt="plattegrond"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', userSelect: 'none', pointerEvents: 'none' }} />
}
