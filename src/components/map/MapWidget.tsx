'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Kavel, Park } from '@/types'
import { isOpgeleverd, isActief } from '@/types'
import Link from 'next/link'

interface Props {
  park: Park | null
  kavels: Kavel[]
  highlightId: string | null
  onKavelClick: (id: string) => void
}

interface CanvasDims { w: number; h: number; ox: number; oy: number }

export function MapWidget({ park, kavels, highlightId, onKavelClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<CanvasDims | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!park?.map_image || !canvasRef.current || !boxRef.current) return
    const img = new Image()
    img.onload = () => {
      const box = boxRef.current!
      const W = box.clientWidth, H = box.clientHeight
      const scale = Math.min(W / img.width, H / img.height)
      const cw = Math.round(img.width * scale)
      const ch = Math.round(img.height * scale)
      const ox = Math.round((W - cw) / 2)
      const oy = Math.round((H - ch) / 2)
      const canvas = canvasRef.current!
      canvas.width = cw; canvas.height = ch
      canvas.getContext('2d')!.drawImage(img, 0, 0, cw, ch)
      setDims({ w: cw, h: ch, ox, oy })
    }
    img.src = park.map_image
  }, [park?.map_image])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(Math.max(z * delta, 0.5), 5))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { ...pan }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    })
  }, [])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  const withPolygon = kavels.filter(k => k.polygon && k.polygon.length >= 3)

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
      <div className="px-[18px] pt-3.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#3a3a3c]">Plattegrond</span>
        <div className="flex items-center gap-2">
          {dims && (
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))}
                className="w-6 h-6 rounded-md bg-[#f5f5f7] text-[#3a3a3c] text-[14px] flex items-center justify-center hover:bg-[#e8e8ed] transition-all">+</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
                className="px-2 h-6 rounded-md bg-[#f5f5f7] text-[#6e6e73] text-[10px] flex items-center justify-center hover:bg-[#e8e8ed] transition-all">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.5))}
                className="w-6 h-6 rounded-md bg-[#f5f5f7] text-[#3a3a3c] text-[14px] flex items-center justify-center hover:bg-[#e8e8ed] transition-all">−</button>
            </div>
          )}
          <span className="text-[11px] text-[#aeaeb2]">
            {park?.map_image ? 'Scroll om te zoomen' : 'Stel in via Instellingen'}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div
          ref={boxRef}
          className="w-full h-[260px] bg-[#f5f5f7] rounded-2xl relative overflow-hidden flex items-center justify-center"
          style={{ cursor: isDragging.current ? 'grabbing' : dims ? 'grab' : 'default' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {!park?.map_image && (
            <div className="text-center text-[#6e6e73]">
              <div className="text-[28px] opacity-20 mb-2">⊡</div>
              <div className="text-[12px] font-medium mb-1">Geen plattegrond</div>
              <Link href="/instellingen" className="text-[11px] text-[#0071e3] hover:underline">
                Voeg toe via Instellingen →
              </Link>
            </div>
          )}
          {park?.map_image && dims && (
            <div
              style={{
                position: 'absolute',
                left: dims.ox, top: dims.oy,
                width: dims.w, height: dims.h,
                transform,
                transformOrigin: 'center center',
                transition: isDragging.current ? 'none' : 'transform 0.1s',
              }}
            >
              <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0 }} />
              <svg
                style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'all' }}
                width={dims.w} height={dims.h}
                viewBox={`0 0 ${dims.w} ${dims.h}`}
              >
                {withPolygon.map(k => {
                  const hl = highlightId === k.id
                  const done = isOpgeleverd(k), active = isActief(k)
                  const fill = hl ? 'rgba(0,113,227,0.28)' : done ? 'rgba(48,209,88,0.20)' : active ? 'rgba(255,159,10,0.20)' : 'rgba(174,174,178,0.16)'
                  const stroke = hl ? '#0071e3' : done ? '#30d158' : active ? '#ff9f0a' : '#aeaeb2'
                  const pts = k.polygon!.map(p => `${(p.x/100*dims.w).toFixed(1)},${(p.y/100*dims.h).toFixed(1)}`).join(' ')
                  const cx = (k.polygon!.reduce((s,p) => s+p.x,0)/k.polygon!.length/100*dims.w).toFixed(1)
                  const cy = (k.polygon!.reduce((s,p) => s+p.y,0)/k.polygon!.length/100*dims.h).toFixed(1)
                  const textFill = hl ? '#0071e3' : done ? '#1a7a32' : active ? '#a05a00' : '#6e6e73'
                  return (
                    <g key={k.id} style={{ cursor: 'pointer' }} onClick={() => onKavelClick(k.id)}>
                      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={hl ? 2.5 : 1.5} strokeLinejoin="round" />
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                        fontFamily="-apple-system,sans-serif" fontSize={hl ? 12 : 10} fontWeight="600" fill={textFill}>
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
