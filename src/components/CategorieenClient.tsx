'use client'
import { useState } from 'react'
import { OPTIES } from '@/types'
import {
  createVakmanCategorie, deleteVakmanCategorie,
  upsertOptieVakmanKoppeling,
  type VakmanCategorie,
} from '@/lib/queries'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

interface Props {
  vakmanCategorieen: VakmanCategorie[]
  optieKoppelingen: Record<string, string>
  onOptieKoppelingChange: (optieKey: string, categorieId: string) => void
  parkOpties?: { id: string; slug: string; label: string; volgorde: number }[]
}

export function CategorieenClient({ vakmanCategorieen: initialVC, optieKoppelingen, onOptieKoppelingChange, parkOpties: initialParkOpties = [] }: Props) {
  const [vakmanCategorieen, setVakmanCategorieen] = useState(initialVC)
  const [koppelingen, setKoppelingen] = useState<Record<string, string>>(optieKoppelingen)
  const [parkOpties, setParkOpties] = useState(initialParkOpties)
  const [nieuweOptie, setNieuweOptie] = useState('')
  const [savingOptie, setSavingOptie] = useState(false)

  async function voegOptieToe() {
    if (!nieuweOptie.trim()) return
    setSavingOptie(true)
    try {
      const res = await fetch('/api/park/optie-toevoegen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ park_id: '11111111-0000-0000-0000-000000000001', label: nieuweOptie.trim() }),
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
  const [newVakmanNaam, setNewVakmanNaam] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; naam: string } | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function handleAdd() {
    if (!newVakmanNaam.trim()) return
    const created = await createVakmanCategorie(PARK_ID, newVakmanNaam.trim())
    if (created) { setVakmanCategorieen(prev => [...prev, created]); setNewVakmanNaam(''); showToast('Toegevoegd ✓') }
  }

  async function handleDelete() {
    if (!deleteConfirm || deleteInput !== 'verwijderen') return
    await deleteVakmanCategorie(deleteConfirm.id)
    setVakmanCategorieen(prev => prev.filter(c => c.id !== deleteConfirm.id))
    setDeleteConfirm(null)
    setDeleteInput('')
    showToast('Verwijderd ✓')
  }

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50">{toast}</div>
      )}

      {/* Opties beheren - geïntegreerd */}
      <div className="text-[15px] font-semibold mb-1">Opties & vakman toewijzing</div>
      <div className="text-[13px] text-[#6e6e73] mb-5">Beheer opties voor dit park en wijs per optie een verantwoordelijke vakman toe.</div>

      <div className="flex flex-col gap-2 mb-4">
        {parkOpties.map(opt => (
          <div key={opt.id} className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f7] rounded-[12px] border border-black/[0.05]">
            <span className="text-[14px] font-medium flex-1">{opt.label}</span>
            <select
              value={koppelingen[opt.slug] ?? ''}
              onChange={async e => {
                const catId = e.target.value
                setKoppelingen(prev => ({ ...prev, [opt.slug]: catId }))
                await upsertOptieVakmanKoppeling('11111111-0000-0000-0000-000000000001', opt.slug, catId)
              }}
              className="text-[13px] border border-black/[0.1] rounded-full px-3 py-1.5 bg-white outline-none cursor-pointer hover:border-[#0071e3] transition-all min-w-[140px]">
              <option value="">— Geen vakman —</option>
              {vakmanCategorieen.map(c => (
                <option key={c.id} value={c.id}>{c.naam}</option>
              ))}
            </select>
            <button onClick={() => verwijderOptie(opt.id)}
              className="w-7 h-7 rounded-full hover:bg-[rgba(255,59,48,0.1)] flex items-center justify-center transition-all text-[#aeaeb2] hover:text-[#ff3b30] text-[16px] leading-none">
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Nieuwe optie toevoegen */}
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
      </div>    </div>
  )
}
