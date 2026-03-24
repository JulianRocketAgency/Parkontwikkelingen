'use client'
import { useEffect, useRef, useState } from 'react'
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
  const [imgLoaded, setImgLoaded] = useState(false)

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
      canvas.style.left = ox + 'px'; canvas.style.top = oy + 'px'
      canvas.getContext('2d')!.drawImage(img, 0, 0, cw, ch)
      setDims({ w: cw, h: ch, ox, oy })
      setImgLoaded(true)
    }
    img.src = park.map_image
  }, [park?.map_image])

  const withPolygon = kavels.filter(k => k.polygon && k.polygon.length >= 3)

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
      <div className="px-[18px] pt-3.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#3a3a3c]">Plattegrond</span>
        <span className="text-[11px] text-[#aeaeb2]">
          {park?.map_image ? 'Klik op kavel om te selecteren' : 'Stel in via Instellingen'}
        </span>
      </div>
      <div className="p-3">
        <div ref={boxRef} className="w-full h-[260px] bg-[#f5f5f7] rounded-2xl relative overflow-hidden flex items-center justify-center">
          {!park?.map_image && (
            <div className="text-center text-[#6e6e73]">
              <div className="text-[28px] opacity-20 mb-2">⊡</div>
              <div className="text-[12px] font-medium mb-1">Geen plattegrond</div>
              <Link href="/instellingen" className="text-[11px] text-[#0071e3] hover:underline">
                Voeg toe via Instellingen →
              </Link>
            </div>
          )}
          {park?.map_image && (
            <>
              <canvas ref={canvasRef} className="absolute" />
              {imgLoaded && dims && (
                <svg
                  className="absolute"
                  style={{ left: dims.ox, top: dims.oy, pointerEvents: 'all' }}
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
                      <g key={k.id} onClick={() => onKavelClick(k.id)} style={{ cursor: 'pointer' }}>
                        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={hl ? 2.5 : 1.5} strokeLinejoin="round" />
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                          fontFamily="-apple-system,sans-serif" fontSize={hl ? 12 : 10} fontWeight="600" fill={textFill}>
                          {k.number}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
