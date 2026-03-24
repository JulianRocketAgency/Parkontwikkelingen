'use client'
import { useRef, useState, useEffect } from 'react'
import type { Park, Kavel } from '@/types'
import { isOpgeleverd, isActief } from '@/types'
import { uploadMapImage, updateKavelPolygon } from '@/lib/queries'

interface Props { park: Park | null; kavels: Kavel[] }
type Pt = { x: number; y: number }

export function InstellingenClient({ park, kavels: initial }: Props) {
  const [kavels, setKavels] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentPts, setCurrentPts] = useState<Pt[]>([])
  const [hoverPx, setHoverPx] = useState<{ x: number; y: number } | null>(null)
  const [mapUrl, setMapUrl] = useState(park?.map_image ?? null)
  const [editorW, setEditorW] = useState(1)
  const [editorH, setEditorH] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t) } }, [toast])

  useEffect(() => {
    if (!mapUrl || !canvasRef.current || !wrapRef.current) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const maxW = wrapRef.current!.clientWidth || 700
      const scale = Math.min(maxW / img.width, 500 / img.height, 1)
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
      setEditorW(w); setEditorH(h)
      const c = canvasRef.current!
      c.width = w; c.height = h
      c.style.width = w + 'px'; c.style.height = h + 'px'
    }
    img.src = mapUrl
  }, [mapUrl])

  useEffect(() => { redraw() }, [kavels, currentPts, hoverPx, editingId, editorW, editorH])

  function redraw() {
    const c = canvasRef.current; const img = imgRef.current
    if (!c || !img || editorW <= 1) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, editorW, editorH)
    ctx.drawImage(img, 0, 0, editorW, editorH)
    kavels.forEach(k => {
      if (!k.polygon || k.polygon.length < 3) return
      const done = isOpgeleverd(k), active = isActief(k)
      ctx.beginPath()
      k.polygon.forEach((p, i) => i === 0 ? ctx.moveTo(p.x/100*editorW, p.y/100*editorH) : ctx.lineTo(p.x/100*editorW, p.y/100*editorH))
      ctx.closePath()
      ctx.fillStyle = done ? 'rgba(48,209,88,.22)' : active ? 'rgba(255,159,10,.22)' : 'rgba(0,113,227,.18)'
      ctx.fill()
      ctx.strokeStyle = done ? '#30d158' : active ? '#ff9f0a' : '#0071e3'
      ctx.lineWidth = 2; ctx.stroke()
      const cx = k.polygon.reduce((s,p)=>s+p.x,0)/k.polygon.length/100*editorW
      const cy = k.polygon.reduce((s,p)=>s+p.y,0)/k.polygon.length/100*editorH
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = 'bold 11px -apple-system,sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('#' + k.number, cx, cy)
    })
    if (currentPts.length > 0) {
      ctx.beginPath()
      currentPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x/100*editorW, p.y/100*editorH) : ctx.lineTo(p.x/100*editorW, p.y/100*editorH))
      if (hoverPx) ctx.lineTo(hoverPx.x, hoverPx.y)
      ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 2; ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([])
      currentPts.forEach((p, i) => {
        const px = p.x/100*editorW, py = p.y/100*editorH
        if (i === 0) { ctx.beginPath(); ctx.arc(px,py,13,0,Math.PI*2); ctx.strokeStyle='rgba(0,113,227,.3)'; ctx.lineWidth=1.5; ctx.stroke() }
        ctx.beginPath(); ctx.arc(px,py,i===0?6:4,0,Math.PI*2)
        ctx.fillStyle = i===0?'#fff':'#0071e3'; ctx.fill()
        ctx.strokeStyle='#0071e3'; ctx.lineWidth=2; ctx.stroke()
      })
    }
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!editingId) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left, py = e.clientY - r.top
    if (currentPts.length >= 3) {
      const fp = currentPts[0]
      if (Math.hypot(px - fp.x/100*editorW, py - fp.y/100*editorH) < 14) { closePoly(); return }
    }
    setCurrentPts(prev => [...prev, { x: px/editorW*100, y: py/editorH*100 }])
  }

  async function closePoly() {
    if (!editingId) return
    const polygon = currentPts.slice()
    await updateKavelPolygon(editingId, polygon)
    setKavels(prev => prev.map(k => k.id === editingId ? { ...k, polygon } : k))
    setCurrentPts([]); setHoverPx(null); setEditingId(null)
    setToast('Kavel opgeslagen ✓')
  }

  function startEdit(id: string) {
    setEditingId(id); setCurrentPts([]); setHoverPx(null)
    setKavels(prev => prev.map(k => k.id === id ? { ...k, polygon: null } : k))
  }

  async function handleMapUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !park) return
    setUploading(true)
    try {
      const url = await uploadMapImage(park.id, file)
      setMapUrl(url); setToast('Plattegrond geüpload ✓')
    } catch { setToast('Upload mislukt') } finally { setUploading(false) }
  }

  const Toggle = ({ on }: { on: boolean }) => (
    <div onClick={() => {}} className={`w-9 h-5 rounded-full cursor-pointer transition-colors relative flex-shrink-0 ${on ? 'bg-[#0071e3]' : 'bg-[#e8e8ed]'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </div>
  )

  return (
    <div className="p-7 max-w-[1280px]">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50 shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-[-0.5px]">Instellingen</h1>
        <p className="text-[14px] text-[#6e6e73] mt-0.5">Park & platform configuratie</p>
      </div>

      <div className="flex flex-col gap-4">

        {/* Plattegrond — full width */}
        <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
          <div className="text-[15px] font-semibold mb-1">Plattegrond & kavelindeling</div>
          <div className="text-[13px] text-[#6e6e73] mb-5">Upload de plattegrond en teken per kavel een gebied. Klik punten om de omtrek te tekenen — sluit af door op het eerste punt (○) te klikken.</div>

          <div className="grid grid-cols-[1fr_200px] gap-5">
            <div>
              {!mapUrl ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#d1d1d6] rounded-2xl p-8 cursor-pointer hover:border-[#0071e3] hover:bg-[rgba(0,113,227,0.04)] transition-all text-[#6e6e73]">
                  <div className="text-[24px] mb-2 opacity-50">↑</div>
                  <span className="text-[13px] font-medium mb-0.5">{uploading ? 'Uploaden…' : 'Afbeelding uploaden'}</span>
                  <span className="text-[11px]">PNG, JPG of SVG</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleMapUpload} disabled={uploading} />
                </label>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[12px] text-[#6e6e73] flex-1" id="editorHint">
                      {editingId ? `Kavel #${kavels.find(k=>k.id===editingId)?.number} — klik punten, sluit op het startpunt` : 'Selecteer een kavel om te tekenen'}
                    </span>
                    {currentPts.length > 0 && (
                      <>
                        <button onClick={() => setCurrentPts(p => p.slice(0,-1))} className="px-2.5 py-1 rounded-lg text-[12px] bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10">↩ Undo</button>
                        <button onClick={() => { setCurrentPts([]); setEditingId(null) }} className="px-2.5 py-1 rounded-lg text-[12px] bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10">Annuleren</button>
                      </>
                    )}
                    <button onClick={() => { setMapUrl(null); setKavels(prev => prev.map(k => ({...k, polygon: null}))) }} className="px-3 py-1 rounded-full text-[12px] bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10">Verwijderen</button>
                  </div>
                  <div ref={wrapRef} className={`relative bg-[#e8e8ed] rounded-2xl overflow-hidden ${editingId ? 'cursor-crosshair' : 'cursor-default'}`}>
                    <canvas ref={canvasRef} onClick={onCanvasClick} onMouseMove={e => { if (editingId && currentPts.length > 0) { const r = e.currentTarget.getBoundingClientRect(); setHoverPx({x:e.clientX-r.left,y:e.clientY-r.top}) }}} />
                  </div>
                </div>
              )}
            </div>

            {/* Kavel list */}
            <div>
              <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2">Kavels</div>
              <div className="flex flex-col gap-1 max-h-[440px] overflow-y-auto">
                {kavels.map(k => {
                  const hasPoly = k.polygon && k.polygon.length >= 3
                  const isEd = editingId === k.id
                  return (
                    <div key={k.id} onClick={() => mapUrl && startEdit(k.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-[10px] border text-[12px] transition-all
                        ${!mapUrl ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                        ${isEd ? 'bg-[rgba(0,113,227,0.10)] border-[rgba(0,113,227,0.35)] text-[#004f9e]'
                        : hasPoly ? 'bg-[rgba(48,209,88,0.10)] border-[rgba(48,209,88,0.3)]'
                        : 'bg-[#f5f5f7] border-black/[0.05] hover:bg-[#e8e8ed]'}`}>
                      <span className="text-[11px] font-semibold text-[#aeaeb2] min-w-[28px]">#{k.number}</span>
                      <span className="flex-1">{k.type}</span>
                      <span className="text-[11px] font-semibold">{isEd ? '●' : hasPoly ? '✓' : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom two-col */}
        <div className="grid grid-cols-2 gap-4">
          {/* Parkgegevens */}
          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
            <div className="text-[15px] font-semibold mb-1">Parkgegevens</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">Algemene informatie over dit park.</div>
            {[['Parknaam', park?.name ?? ''], ['Locatie', '']].map(([label, val]) => (
              <div key={label} className="mb-3">
                <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">{label}</label>
                <input defaultValue={val} className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[['Startdatum', park?.start_date ?? ''], ['Opleverdatum', park?.end_date ?? '']].map(([label, val]) => (
                <div key={label}>
                  <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">{label}</label>
                  <input type="date" defaultValue={val} className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#0071e3] transition-all" />
                </div>
              ))}
            </div>
            <button onClick={() => setToast('Opgeslagen ✓')} className="px-5 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-all">Opslaan</button>
          </div>

          {/* Gebruikers & Notificaties */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
              <div className="text-[15px] font-semibold mb-1">Gebruikers & rollen</div>
              <div className="text-[13px] text-[#6e6e73] mb-4">Beheer wie toegang heeft.</div>
              <div className="flex flex-col gap-2 mb-4">
                {[['JV','Jan de Vries','jan@heideplas.nl','Ontwikkelaar','#0071e3'],
                  ['SB','Sara Bakker','sara@bouwbv.nl','Planner','#bf5af2'],
                  ['TH','Tom Hendriks','tom@bouwbv.nl','Vakman','#ff9f0a']].map(([av,name,email,role,col]) => (
                  <div key={name} className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f5f5f7] rounded-[10px] border border-black/[0.05]">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style={{background:col}}>{av}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{name}</div>
                      <div className="text-[11px] text-[#6e6e73] truncate">{email}</div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/[0.06] text-[#6e6e73] flex-shrink-0">{role}</span>
                  </div>
                ))}
              </div>
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10 transition-all">+ Gebruiker uitnodigen</button>
            </div>
            <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
              <div className="text-[15px] font-semibold mb-1">Notificaties</div>
              <div className="text-[13px] text-[#6e6e73] mb-4">Stel in wanneer je meldingen ontvangt.</div>
              {[['Bij statuswijziging kavel', true],['Bij oplevering woning', true],['Nieuwe eigenaar gekoppeld', false],['Weekrapportage', true]].map(([label, on]) => (
                <div key={String(label)} className="flex items-center justify-between py-2.5 border-b border-black/[0.05] last:border-0">
                  <span className="text-[13px]">{label as string}</span>
                  <Toggle on={on as boolean} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
