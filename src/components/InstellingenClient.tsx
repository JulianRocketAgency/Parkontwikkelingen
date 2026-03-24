'use client'
import { useRef, useState, useEffect } from 'react'
import type { Park, Kavel } from '@/types'
import { isOpgeleverd, isActief, OPTIES, STATUS_LABELS } from '@/types'
import {
  getParkMaps, upsertParkMap, deleteParkMap,
  getDependencies, createDependency, deleteDependency,
  updatePark, getPolygonsForMap, upsertKavelPolygonForMap,
  type Dependency, type ParkMap, type KavelPolygon
} from '@/lib/queries'

interface Props { park: Park | null; kavels: Kavel[] }
type Pt = { x: number; y: number }
const PARK_ID = '11111111-0000-0000-0000-000000000001'

async function pdfToImageUrl(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const scale = 3
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.style.display = 'none'
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) { document.body.removeChild(canvas); throw new Error('Canvas context unavailable') }
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  const url = canvas.toDataURL('image/png')
  document.body.removeChild(canvas)
  return url
}

export function InstellingenClient({ park, kavels: initial }: Props) {
  const [kavels, setKavels] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingFase, setEditingFase] = useState<number | null>(null)
  const [currentPts, setCurrentPts] = useState<Pt[]>([])
  const [hoverPx, setHoverPx] = useState<{ x: number; y: number } | null>(null)
  const [editorW, setEditorW] = useState(1)
  const [editorH, setEditorH] = useState(1)
  const [editorZoom, setEditorZoom] = useState(1)
  const [uploading, setUploading] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [deps, setDeps] = useState<Dependency[]>([])
  const [mapPolygons, setMapPolygons] = useState<KavelPolygon[]>([])
  const [currentMapId, setCurrentMapId] = useState<string | null>(null)
  const [parkMaps, setParkMaps] = useState<ParkMap[]>([])
  const [newOO, setNewOO] = useState({ trigger: '', requires: '' })
  const [newSO, setNewSO] = useState({ trigger: '', requires: '' })
  const [parkForm, setParkForm] = useState({
    name: park?.name ?? '',
    location: park?.location ?? '',
    start_date: park?.start_date ?? '',
    end_date: park?.end_date ?? '',
  })
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    getDependencies(PARK_ID).then(setDeps)
    getParkMaps(PARK_ID).then(setParkMaps)
  }, [])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) }
  }, [toast])

  async function savePark() {
    try { await updatePark(PARK_ID, parkForm); setToast('Parkgegevens opgeslagen ✓') }
    catch { setToast('Opslaan mislukt') }
  }

  function loadMapIntoEditor(url: string, fase: number | null, mapId?: string) {
    setEditingFase(fase)
    setEditingId(null)
    setCurrentPts([])
    setEditorZoom(1)
    imgRef.current = null
    setEditorW(1)
    setEditorH(1)
    setMapPolygons([])
    if (mapId) {
      setCurrentMapId(mapId)
      getPolygonsForMap(mapId).then(setMapPolygons)
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      const w = img.naturalWidth
      const h = img.naturalHeight
      setEditorW(w)
      setEditorH(h)
      const fitZoom = Math.min(900 / w, 520 / h, 1)
      setEditorZoom(Math.round(fitZoom * 100) / 100)
    }
    img.src = url
  }

  function onCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!editingId) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width * editorW
    const py = (e.clientY - r.top) / r.height * editorH
    if (currentPts.length >= 3) {
      const fp = currentPts[0]
      const pxPerUnit = r.width / editorW
      const threshold = 30 / pxPerUnit
      if (Math.hypot(px - fp.x/100*editorW, py - fp.y/100*editorH) < threshold) {
        closePoly()
        return
      }
    }
    setCurrentPts(prev => [...prev, { x: px/editorW*100, y: py/editorH*100 }])
  }

  async function closePoly() {
    if (!editingId || !currentMapId) return
    const polygon = currentPts.slice()
    await upsertKavelPolygonForMap(editingId, currentMapId, polygon)
    setMapPolygons(prev => {
      const filtered = prev.filter(p => !(p.kavel_id === editingId && p.map_id === currentMapId))
      return [...filtered, { id: Date.now().toString(), kavel_id: editingId, map_id: currentMapId, polygon }]
    })
    setCurrentPts([])
    setHoverPx(null)
    setEditingId(null)
    setToast('Kavel opgeslagen ✓')
  }

  function startEdit(id: string) {
    setEditingId(id)
    setCurrentPts([])
    setHoverPx(null)
    if (currentMapId) {
      setMapPolygons(prev => prev.filter(p => !(p.kavel_id === id && p.map_id === currentMapId)))
    }
  }

  async function handleMapUpload(fase: number | null, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const faseKey = fase === null ? 'overall' : `fase-${fase}`
    setUploading(faseKey)
    try {
      let uploadFile = file
      if (file.type === 'application/pdf') {
        setToast('PDF verwerken…')
        const dataUrl = await pdfToImageUrl(file)
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        uploadFile = new File([blob], file.name.replace('.pdf', '.png'), { type: 'image/png' })
      }
      await upsertParkMap(PARK_ID, fase, uploadFile)
      const freshMaps = await getParkMaps(PARK_ID)
      setParkMaps(freshMaps)
      const uploaded = freshMaps.find(m => m.fase === fase)
      if (uploaded) loadMapIntoEditor(uploaded.map_url + '?t=' + Date.now(), fase, uploaded.id)
      setToast('Plattegrond geüpload ✓')
    } catch (err) {
      console.error(err)
      setToast('Upload mislukt')
    } finally {
      setUploading(null)
    }
  }

  async function handleDeleteMap(fase: number | null) {
    const existing = parkMaps.find(m => m.fase === fase)
    if (existing) await deleteParkMap(existing.id)
    setParkMaps(prev => prev.filter(m => m.fase !== fase))
    if (editingFase === fase) { imgRef.current = null; setEditorW(1); setEditorH(1) }
    setToast('Plattegrond verwijderd')
  }

  async function addDep(type: 'optie_optie' | 'status_optie', trigger: string, requires: string) {
    if (!trigger || !requires) return
    const dep = { park_id: PARK_ID, type, trigger_key: trigger, requires_key: requires }
    await createDependency(dep)
    setDeps(prev => [...prev, { ...dep, id: Date.now().toString() }])
    if (type === 'optie_optie') setNewOO({ trigger: '', requires: '' })
    else setNewSO({ trigger: '', requires: '' })
    setToast('Regel toegevoegd ✓')
  }

  async function removeDep(id: string) {
    await deleteDependency(id)
    setDeps(prev => prev.filter(d => d.id !== id))
  }

  const fases = [...new Set(kavels.map(k => k.fase))].sort()
  const allMaps = [
    { fase: null as number | null, label: 'Totaaloverzicht' },
    ...fases.map(f => ({ fase: f as number | null, label: `Fase ${f}` }))
  ]
  const optieOptions = OPTIES.map(o => ({ key: o.key, label: o.label }))
  const statusOptions = Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label }))
  const ooDeps = deps.filter(d => d.type === 'optie_optie')
  const soDeps = deps.filter(d => d.type === 'status_optie')
  const faseKavelsForEditor = editingFase === null ? kavels : kavels.filter(k => k.fase === editingFase)

  const Chip = ({ label, color }: { label: string; color: 'blue'|'green'|'amber' }) => {
    const s = { blue:'bg-[rgba(0,113,227,0.10)] text-[#004f9e]', green:'bg-[rgba(48,209,88,0.13)] text-[#1a7a32]', amber:'bg-[rgba(255,159,10,0.12)] text-[#a05a00]' }
    return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${s[color]}`}>{label}</span>
  }

  return (
    <div className="p-7 max-w-[1280px]">
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

        {/* Plattegronden */}
        <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
          <div className="text-[15px] font-semibold mb-1">Plattegronden & kavelindeling</div>
          <div className="text-[13px] text-[#6e6e73] mb-5">Upload een plattegrond per fase en het totaaloverzicht. Ondersteunt PNG, JPG en PDF.</div>
          <div className="grid grid-cols-[200px_1fr] gap-6">
            {/* Left: map selector */}
            <div>
              <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2">Plattegronden</div>
              <div className="flex flex-col gap-1.5">
                {allMaps.map(({ fase, label }) => {
                  const existing = parkMaps.find(m => m.fase === fase)
                  const isActive = editingFase === fase && imgRef.current !== null
                  const isUploading = uploading === (fase === null ? 'overall' : `fase-${fase}`)
                  return (
                    <div key={String(fase)} className={`rounded-[10px] border overflow-hidden transition-all ${isActive ? 'border-[rgba(0,113,227,0.4)] bg-[rgba(0,113,227,0.05)]' : 'border-black/[0.06] bg-[#f5f5f7]'}`}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className={`text-[12px] font-medium flex-1 ${isActive ? 'text-[#004f9e]' : 'text-[#3a3a3c]'}`}>{label}</span>
                        {existing && <span className="text-[10px] font-semibold text-[#1a7a32]">✓</span>}
                      </div>
                      <div className="flex gap-1 px-2 pb-2">
                        {existing ? (
                          <>
                            <button onClick={() => loadMapIntoEditor(existing.map_url, fase, existing.id)}
                              className="flex-1 py-1 rounded-lg bg-white border border-black/[0.08] text-[11px] text-[#3a3a3c] hover:bg-[#e8e8ed] transition-all">
                              Bewerken
                            </button>
                            <button onClick={() => handleDeleteMap(fase)}
                              className="px-2 py-1 rounded-lg bg-white border border-black/[0.08] text-[11px] text-[#ff3b30] hover:bg-[#fbeaea] transition-all">
                              ×
                            </button>
                          </>
                        ) : (
                          <label className="flex-1 py-1 rounded-lg bg-[#0071e3] text-white text-[11px] text-center cursor-pointer hover:bg-[#0077ed] transition-all">
                            {isUploading ? 'Uploaden…' : '+ Upload'}
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleMapUpload(fase, e)} disabled={!!uploading} />
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: editor */}
            <div>
              {!imgRef.current ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-[#d1d1d6] rounded-2xl text-[#aeaeb2] text-[13px]">
                  <div className="text-[28px] opacity-30 mb-2">⊡</div>
                  Selecteer een plattegrond links om te bewerken
                </div>
              ) : (
                <div>
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[12px] text-[#6e6e73] flex-1">
                      {editingId
                        ? `Kavel #${kavels.find(k=>k.id===editingId)?.number} — klik punten op de kaart`
                        : `${editingFase === null ? 'Totaaloverzicht' : `Fase ${editingFase}`} — selecteer een kavel om te tekenen`}
                    </span>
                    {currentPts.length > 0 && (
                      <>
                        <button onClick={() => setCurrentPts(p => p.slice(0,-1))} className="px-2.5 py-1 rounded-lg text-[12px] bg-black/[0.06] hover:bg-black/10">↩ Undo</button>
                        {currentPts.length >= 3 && (
                          <button onClick={closePoly} className="px-2.5 py-1 rounded-lg text-[12px] bg-[#0071e3] text-white hover:bg-[#0077ed] font-medium">✓ Sluiten</button>
                        )}
                        <button onClick={() => { setCurrentPts([]); setEditingId(null) }} className="px-2.5 py-1 rounded-lg text-[12px] bg-black/[0.06] hover:bg-black/10">Annuleren</button>
                      </>
                    )}
                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={() => setEditorZoom(z => Math.min(+(z+0.25).toFixed(2), 4))} className="w-7 h-7 rounded-lg bg-[#f5f5f7] text-[14px] font-medium hover:bg-[#e8e8ed] flex items-center justify-center">+</button>
                      <button onClick={() => setEditorZoom(z => { const fit = Math.min(900/editorW, 520/editorH, 1); return Math.round(fit*100)/100 })} className="px-2 h-7 rounded-lg bg-[#f5f5f7] text-[#6e6e73] text-[10px] hover:bg-[#e8e8ed] min-w-[44px] text-center">{Math.round(editorZoom*100)}%</button>
                      <button onClick={() => setEditorZoom(z => Math.max(+(z-0.25).toFixed(2), 0.1))} className="w-7 h-7 rounded-lg bg-[#f5f5f7] text-[14px] font-medium hover:bg-[#e8e8ed] flex items-center justify-center">−</button>
                    </div>
                  </div>

                  {/* Editor canvas */}
                  <div ref={wrapRef} className="relative bg-[#e8e8ed] rounded-2xl overflow-auto" style={{maxHeight: '560px'}}>
                    <div style={{ position: 'relative', width: Math.round(editorW * editorZoom), height: Math.round(editorH * editorZoom) }}>
                      <img src={imgRef.current.src} alt="plattegrond"
                        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'fill',userSelect:'none',pointerEvents:'none'}} />
                      <svg
                        style={{position:'absolute',inset:0,width:'100%',height:'100%',cursor: editingId ? 'crosshair' : 'default'}}
                        viewBox={`0 0 ${editorW} ${editorH}`}
                        preserveAspectRatio="none"
                        onClick={onCanvasClick}
                        onMouseMove={e => {
                          if (!editingId || currentPts.length === 0) return
                          const r = e.currentTarget.getBoundingClientRect()
                          setHoverPx({ x: (e.clientX - r.left) / r.width * editorW, y: (e.clientY - r.top) / r.height * editorH })
                        }}
                      >
                        {/* Saved polygons */}
                        {mapPolygons.map(mp => {
                          const k = kavels.find(k => k.id === mp.kavel_id)
                          if (!k || mp.polygon.length < 3) return null
                          const done = isOpgeleverd(k), active = isActief(k)
                          const pts = mp.polygon.map(p => `${p.x/100*editorW},${p.y/100*editorH}`).join(' ')
                          const cx = mp.polygon.reduce((s,p)=>s+p.x,0)/mp.polygon.length/100*editorW
                          const cy = mp.polygon.reduce((s,p)=>s+p.y,0)/mp.polygon.length/100*editorH
                          return (
                            <g key={mp.id}>
                              <polygon points={pts}
                                fill={done?'rgba(48,209,88,.22)':active?'rgba(255,159,10,.22)':'rgba(0,113,227,.18)'}
                                stroke={done?'#30d158':active?'#ff9f0a':'#0071e3'}
                                strokeWidth={Math.max(1, 2/editorZoom)} />
                              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                                fontSize={Math.max(10, 14/editorZoom)} fontWeight="bold" fill="rgba(0,0,0,.7)"
                                fontFamily="-apple-system,sans-serif">#{k.number}</text>
                            </g>
                          )
                        })}
                        {/* In-progress polygon */}
                        {currentPts.length > 0 && (
                          <g>
                            <polyline
                              points={[
                                ...currentPts.map(p => `${p.x/100*editorW},${p.y/100*editorH}`),
                                ...(hoverPx ? [`${hoverPx.x},${hoverPx.y}`] : [])
                              ].join(' ')}
                              fill="none" stroke="#0071e3"
                              strokeWidth={Math.max(1, 2/editorZoom)}
                              strokeDasharray={`${5/editorZoom},${4/editorZoom}`} />
                            {currentPts.map((p, i) => {
                              const px = p.x/100*editorW, py = p.y/100*editorH
                              const r = Math.max(4, 8/editorZoom)
                              const rOuter = Math.max(8, 20/editorZoom)
                              return (
                                <g key={i}>
                                  {i === 0 && <circle cx={px} cy={py} r={rOuter} fill="rgba(0,113,227,.15)" stroke="rgba(0,113,227,.5)" strokeWidth={Math.max(1, 1.5/editorZoom)} />}
                                  <circle cx={px} cy={py} r={r} fill={i===0?'#fff':'#0071e3'} stroke="#0071e3" strokeWidth={Math.max(1, 2/editorZoom)} />
                                </g>
                              )
                            })}
                          </g>
                        )}
                      </svg>
                    </div>
                  </div>

                  {/* Kavel list */}
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2">Kavels — klik om gebied te tekenen</div>
                    <div className="flex flex-wrap gap-1.5">
                      {faseKavelsForEditor.map(k => {
                        const hasPoly = mapPolygons.some(mp => mp.kavel_id === k.id && mp.polygon.length >= 3)
                        const isEd = editingId === k.id
                        return (
                          <div key={k.id} onClick={() => startEdit(k.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border text-[11px] cursor-pointer transition-all
                              ${isEd ? 'bg-[rgba(0,113,227,0.10)] border-[rgba(0,113,227,0.35)] text-[#004f9e]'
                              : hasPoly ? 'bg-[rgba(48,209,88,0.10)] border-[rgba(48,209,88,0.3)]'
                              : 'bg-[#f5f5f7] border-black/[0.05] hover:bg-[#e8e8ed]'}`}>
                            <span className="font-semibold text-[#aeaeb2]">#{k.number}</span>
                            <span>{k.type}</span>
                            <span className="text-[10px]">{isEd ? '●' : hasPoly ? '✓' : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Afhankelijkheden */}
        <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
          <div className="text-[15px] font-semibold mb-1">Afhankelijkheden</div>
          <div className="text-[13px] text-[#6e6e73] mb-5">Stel in welke opties samenhangen en wanneer opties beschikbaar worden.</div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-3 pb-2 border-b border-black/[0.05]">Optie vereist optie</div>
              <div className="text-[12px] text-[#6e6e73] mb-3">Als optie A besteld wordt, is optie B automatisch vereist</div>
              <div className="flex flex-col gap-2 mb-4">
                {ooDeps.length === 0 && <div className="text-[12px] text-[#aeaeb2] py-2">Nog geen regels</div>}
                {ooDeps.map(d => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2.5 bg-[#f5f5f7] rounded-[10px] border border-black/[0.05]">
                    <Chip label={optieOptions.find(o=>o.key===d.trigger_key)?.label ?? d.trigger_key} color="blue" />
                    <span className="text-[11px] text-[#aeaeb2]">→ vereist</span>
                    <Chip label={optieOptions.find(o=>o.key===d.requires_key)?.label ?? d.requires_key} color="amber" />
                    <button onClick={() => removeDep(d.id)} className="ml-auto text-[#aeaeb2] hover:text-[#ff3b30] text-[16px] leading-none">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <select value={newOO.trigger} onChange={e => setNewOO(p=>({...p,trigger:e.target.value}))}
                  className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]">
                  <option value="">Als... (optie)</option>
                  {optieOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <span className="text-[11px] text-[#aeaeb2]">→</span>
                <select value={newOO.requires} onChange={e => setNewOO(p=>({...p,requires:e.target.value}))}
                  className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]">
                  <option value="">Dan... (optie)</option>
                  {optieOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <button onClick={() => addDep('optie_optie', newOO.trigger, newOO.requires)}
                  disabled={!newOO.trigger || !newOO.requires}
                  className="px-3 py-2 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] disabled:opacity-40 flex-shrink-0">
                  + Voeg toe
                </button>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-3 pb-2 border-b border-black/[0.05]">Bouwstatus vrijgeeft optie</div>
              <div className="text-[12px] text-[#6e6e73] mb-3">Een optie kan pas worden uitgevoerd als een bouwstap gereed is</div>
              <div className="flex flex-col gap-2 mb-4">
                {soDeps.length === 0 && <div className="text-[12px] text-[#aeaeb2] py-2">Nog geen regels</div>}
                {soDeps.map(d => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2.5 bg-[#f5f5f7] rounded-[10px] border border-black/[0.05]">
                    <Chip label={statusOptions.find(o=>o.key===d.trigger_key)?.label ?? d.trigger_key} color="green" />
                    <span className="text-[11px] text-[#aeaeb2]">→ vrijgeeft</span>
                    <Chip label={optieOptions.find(o=>o.key===d.requires_key)?.label ?? d.requires_key} color="blue" />
                    <button onClick={() => removeDep(d.id)} className="ml-auto text-[#aeaeb2] hover:text-[#ff3b30] text-[16px] leading-none">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <select value={newSO.trigger} onChange={e => setNewSO(p=>({...p,trigger:e.target.value}))}
                  className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]">
                  <option value="">Als... (status)</option>
                  {statusOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <span className="text-[11px] text-[#aeaeb2]">→</span>
                <select value={newSO.requires} onChange={e => setNewSO(p=>({...p,requires:e.target.value}))}
                  className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-[8px] px-2.5 py-2 text-[12px] outline-none focus:border-[#0071e3]">
                  <option value="">Dan... (optie)</option>
                  {optieOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <button onClick={() => addDep('status_optie', newSO.trigger, newSO.requires)}
                  disabled={!newSO.trigger || !newSO.requires}
                  className="px-3 py-2 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] disabled:opacity-40 flex-shrink-0">
                  + Voeg toe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
            <div className="text-[15px] font-semibold mb-1">Parkgegevens</div>
            <div className="text-[13px] text-[#6e6e73] mb-5">Algemene informatie over dit park.</div>
            <div className="mb-3">
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">Parknaam</label>
              <input value={parkForm.name} onChange={e => setParkForm(p=>({...p,name:e.target.value}))}
                className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
            </div>
            <div className="mb-3">
              <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">Locatie</label>
              <input value={parkForm.location} onChange={e => setParkForm(p=>({...p,location:e.target.value}))}
                className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">Startdatum</label>
                <input type="date" value={parkForm.start_date} onChange={e => setParkForm(p=>({...p,start_date:e.target.value}))}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#0071e3] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#6e6e73] mb-1.5">Opleverdatum</label>
                <input type="date" value={parkForm.end_date} onChange={e => setParkForm(p=>({...p,end_date:e.target.value}))}
                  className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#0071e3] transition-all" />
              </div>
            </div>
            <button onClick={savePark} className="px-5 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-all">Opslaan</button>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
              <div className="text-[15px] font-semibold mb-1">Gebruikers & rollen</div>
              <div className="text-[13px] text-[#6e6e73] mb-4">Beheer wie toegang heeft.</div>
              <div className="flex flex-col gap-2 mb-4">
                {[['JV','Jan de Vries','jan@heideplas.nl','Ontwikkelaar','#0071e3'],['SB','Sara Bakker','sara@bouwbv.nl','Planner','#bf5af2'],['TH','Tom Hendriks','tom@bouwbv.nl','Vakman','#ff9f0a']].map(([av,name,email,role,col]) => (
                  <div key={name} className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f5f5f7] rounded-[10px] border border-black/[0.05]">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style={{background:col}}>{av}</div>
                    <div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{name}</div><div className="text-[11px] text-[#6e6e73] truncate">{email}</div></div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/[0.06] text-[#6e6e73] flex-shrink-0">{role}</span>
                  </div>
                ))}
              </div>
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-black/[0.06] text-[#3a3a3c] hover:bg-black/10">+ Gebruiker uitnodigen</button>
            </div>
            <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
              <div className="text-[15px] font-semibold mb-1">Notificaties</div>
              <div className="text-[13px] text-[#6e6e73] mb-4">Stel in wanneer je meldingen ontvangt.</div>
              {[['Bij statuswijziging kavel',true],['Bij oplevering woning',true],['Nieuwe eigenaar gekoppeld',false],['Weekrapportage',true]].map(([label,on]) => (
                <div key={String(label)} className="flex items-center justify-between py-2.5 border-b border-black/[0.05] last:border-0">
                  <span className="text-[13px]">{label as string}</span>
                  <div onClick={e=>{(e.currentTarget as HTMLElement).classList.toggle('on');setToast('Instelling gewijzigd')}}
                    className={`w-9 h-5 rounded-full cursor-pointer transition-colors relative flex-shrink-0 ${on?'bg-[#0071e3] on':'bg-[#e8e8ed]'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on?'left-[18px]':'left-0.5'}`}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
