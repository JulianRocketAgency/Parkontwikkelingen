'use client'
import { useState } from 'react'
import { upsertOptieVakmanKoppeling, createVakmanCategorie, deleteVakmanCategorie } from '@/lib/queries'
import type { VakmanCategorie } from '@/lib/queries'

interface Props {
  vakmanCategorieen: VakmanCategorie[]
  optieKoppelingen: Record<string, string>
  onOptieKoppelingChange: (optieKey: string, categorieId: string) => void
  parkOpties?: { id: string; slug: string; label: string; volgorde: number }[]
}

export function CategorieenClient({ vakmanCategorieen: initialVC, optieKoppelingen, onOptieKoppelingChange, parkOpties: initialParkOpties = [] }: Props) {
  const [vakmanCategorieen, setVakmanCategorieen] = useState(initialVC)
  const [parkOpties, setParkOpties] = useState(initialParkOpties)
  const [koppelingen, setKoppelingen] = useState<Record<string, string>>(optieKoppelingen)
  const [nieuweVakman, setNieuweVakman] = useState('')
  const [nieuweOptie, setNieuweOptie] = useState('')
  const [savingVakman, setSavingVakman] = useState(false)
  const [savingOptie, setSavingOptie] = useState(false)
  const PARK_ID = '11111111-0000-0000-0000-000000000001'

  async function voegVakmanToe() {
    if (!nieuweVakman.trim()) return
    setSavingVakman(true)
    try {
      const cat = await createVakmanCategorie(PARK_ID, nieuweVakman.trim())
      if (cat) setVakmanCategorieen(prev => [...prev, cat])
      setNieuweVakman('')
    } finally { setSavingVakman(false) }
  }

  async function verwijderVakman(id: string) {
    await deleteVakmanCategorie(id)
    setVakmanCategorieen(prev => prev.filter(c => c.id !== id))
  }

  async function voegOptieToe() {
    if (!nieuweOptie.trim()) return
    setSavingOptie(true)
    try {
      const res = await fetch('/api/park/optie-toevoegen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ park_id: PARK_ID, label: nieuweOptie.trim() }),
      })
      const data = await res.json()
      if (data.optie) {
        setParkOpties(prev => [...prev, data.optie])
        setNieuweOptie('')
      }
    } finally { setSavingOptie(false) }
  }

  async function verwijderOptie(id: string) {
    await fetch('/api/park/optie-verwijderen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setParkOpties(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">

      {/* Vakman types */}
      <div className="mb-8">
        <div className="text-[15px] font-semibold mb-1">Vakman types</div>
        <div className="text-[13px] text-[#6e6e73] mb-4">Beheer de vakman types voor dit park.</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {vakmanCategorieen.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(255,159,10,0.10)] rounded-full border border-[rgba(255,159,10,0.2)]">
              <span className="text-[13px] font-medium text-[#a05a00]">{c.naam}</span>
              <button onClick={() => verwijderVakman(c.id)}
                className="w-4 h-4 rounded-full hover:bg-[rgba(255,59,48,0.15)] flex items-center justify-center transition-all text-[#aeaeb2] hover:text-[#ff3b30] text-[14px] leading-none">
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={nieuweVakman}
            onChange={e => setNieuweVakman(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && voegVakmanToe()}
            placeholder="bijv. Timmerman, Schilder..."
            className="flex-1 bg-[#f5f5f7] border border-black/[0.06] rounded-full px-4 py-2 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
          <button onClick={voegVakmanToe} disabled={savingVakman || !nieuweVakman.trim()}
            className="px-4 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-all whitespace-nowrap">
            {savingVakman ? '...' : '+ Toevoegen'}
          </button>
        </div>
      </div>

      <div className="border-t border-black/[0.05] mb-8" />

      {/* Opties & vakman toewijzing */}
      <div>
        <div className="text-[15px] font-semibold mb-1">Opties & verantwoordelijke vakman</div>
        <div className="text-[13px] text-[#6e6e73] mb-5">Stel per optie in welk type vakman verantwoordelijk is voor de uitvoering.</div>

        <div className="flex flex-col gap-2 mb-4">
          {parkOpties.map(opt => (
            <div key={opt.id} className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f7] rounded-[12px] border border-black/[0.05]">
              <span className="text-[14px] font-medium flex-1">{opt.label}</span>
              <select
                value={koppelingen[opt.slug] ?? ''}
                onChange={async e => {
                  const catId = e.target.value
                  setKoppelingen(prev => ({ ...prev, [opt.slug]: catId }))
                  onOptieKoppelingChange(opt.slug, catId)
                  await upsertOptieVakmanKoppeling(PARK_ID, opt.slug, catId)
                }}
                className="text-[13px] border border-black/[0.1] rounded-full px-3 py-1.5 bg-white outline-none cursor-pointer hover:border-[#0071e3] transition-all min-w-[140px]">
                <option value="">— Geen vakman —</option>
                {vakmanCategorieen.map(c => (
                  <option key={c.id} value={c.id}>{c.naam}</option>
                ))}
              </select>
              <button onClick={() => verwijderOptie(opt.id)}
                className="w-7 h-7 rounded-full hover:bg-[rgba(255,59,48,0.1)] flex items-center justify-center transition-all text-[#aeaeb2] hover:text-[#ff3b30] text-[18px] leading-none flex-shrink-0">
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={nieuweOptie}
            onChange={e => setNieuweOptie(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && voegOptieToe()}
            placeholder="Nieuwe optie toevoegen, bijv. Jacuzzi, Carport..."
            className="flex-1 bg-[#f5f5f7] border border-black/[0.06] rounded-full px-4 py-2.5 text-[14px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
          <button onClick={voegOptieToe} disabled={savingOptie || !nieuweOptie.trim()}
            className="px-5 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-all whitespace-nowrap">
            {savingOptie ? '...' : '+ Toevoegen'}
          </button>
        </div>
      </div>
    </div>
  )
}
