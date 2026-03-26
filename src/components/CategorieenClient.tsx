'use client'
import { useState } from 'react'
import { OPTIES } from '@/types'
import {
  createOptieCategorie, deleteOptieCategorie,
  createVakmanCategorie, deleteVakmanCategorie,
  type OptieCategorie, type VakmanCategorie,
} from '@/lib/queries'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

interface Props {
  optieCategorieen: OptieCategorie[]
  vakmanCategorieen: VakmanCategorie[]
  optieKoppelingen: Record<string, string> // optie_key -> categorie_id
  onOptieKoppelingChange: (optieKey: string, categorieId: string) => void
}

export function CategorieenClient({ optieCategorieen: initialOC, vakmanCategorieen: initialVC, optieKoppelingen, onOptieKoppelingChange }: Props) {
  const [optieCategorieen, setOptieCategorieen] = useState(initialOC)
  const [vakmanCategorieen, setVakmanCategorieen] = useState(initialVC)
  const [newOptieNaam, setNewOptieNaam] = useState('')
  const [newVakmanNaam, setNewVakmanNaam] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; naam: string; type: 'optie' | 'vakman' } | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function handleAddOptieCategorie() {
    if (!newOptieNaam.trim()) return
    const created = await createOptieCategorie(PARK_ID, newOptieNaam.trim())
    if (created) { setOptieCategorieen(prev => [...prev, created]); setNewOptieNaam(''); showToast('Categorie toegevoegd ✓') }
  }

  async function handleAddVakmanCategorie() {
    if (!newVakmanNaam.trim()) return
    const created = await createVakmanCategorie(PARK_ID, newVakmanNaam.trim())
    if (created) { setVakmanCategorieen(prev => [...prev, created]); setNewVakmanNaam(''); showToast('Subcategorie toegevoegd ✓') }
  }

  async function handleDelete() {
    if (!deleteConfirm || deleteInput !== 'verwijderen') return
    if (deleteConfirm.type === 'optie') {
      await deleteOptieCategorie(deleteConfirm.id)
      setOptieCategorieen(prev => prev.filter(c => c.id !== deleteConfirm.id))
    } else {
      await deleteVakmanCategorie(deleteConfirm.id)
      setVakmanCategorieen(prev => prev.filter(c => c.id !== deleteConfirm.id))
    }
    setDeleteConfirm(null)
    setDeleteInput('')
    showToast('Verwijderd ✓')
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(29,29,31,0.9)] backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-50">{toast}</div>
      )}

      {/* Optie categorieën */}
      <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
        <div className="text-[15px] font-semibold mb-1">Optie categorieën</div>
        <div className="text-[13px] text-[#6e6e73] mb-5">Wijs elke optie toe aan een categorie voor overzichtelijkere weergave.</div>

        {/* Categorieën beheren */}
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2">Categorieën</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {optieCategorieen.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f7] rounded-full border border-black/[0.06]">
                <span className="text-[12px] font-medium text-[#3a3a3c]">{c.naam}</span>
                <button onClick={() => setDeleteConfirm({ id: c.id, naam: c.naam, type: 'optie' })}
                  className="text-[#aeaeb2] hover:text-[#ff3b30] transition-all text-[14px] leading-none ml-0.5">×</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newOptieNaam} onChange={e => setNewOptieNaam(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddOptieCategorie()}
              placeholder="Nieuwe categorie..."
              className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2 text-[13px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
            <button onClick={handleAddOptieCategorie} disabled={!newOptieNaam.trim()}
              className="px-4 py-2 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-all">
              + Toevoegen
            </button>
          </div>
        </div>

        {/* Opties toewijzen */}
        <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-2">Opties toewijzen</div>
        <div className="grid grid-cols-2 gap-2">
          {OPTIES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 border border-black/[0.05]">
              <span className="text-[12px] font-medium text-[#3a3a3c] flex-1">{label}</span>
              <select value={optieKoppelingen[key] ?? ''}
                onChange={e => onOptieKoppelingChange(key, e.target.value)}
                className="bg-white border border-black/[0.08] rounded-[8px] px-2 py-1 text-[11px] outline-none focus:border-[#0071e3] transition-all">
                <option value="">Geen</option>
                {optieCategorieen.map(c => <option key={c.id} value={c.id}>{c.naam}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Vakman subcategorieën */}
      <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] p-6">
        <div className="text-[15px] font-semibold mb-1">Vakman subcategorieën</div>
        <div className="text-[13px] text-[#6e6e73] mb-5">Specialisaties voor vakmannen zoals timmerman, schilder, elektricien etc.</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {vakmanCategorieen.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(255,159,10,0.08)] rounded-full border border-[rgba(255,159,10,0.2)]">
              <span className="text-[12px] font-medium text-[#a05a00]">{c.naam}</span>
              <button onClick={() => setDeleteConfirm({ id: c.id, naam: c.naam, type: 'vakman' })}
                className="text-[rgba(160,90,0,0.4)] hover:text-[#ff3b30] transition-all text-[14px] leading-none ml-0.5">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newVakmanNaam} onChange={e => setNewVakmanNaam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddVakmanCategorie()}
            placeholder="bijv. Timmerman, Schilder..."
            className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2 text-[13px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
          <button onClick={handleAddVakmanCategorie} disabled={!newVakmanNaam.trim()}
            className="px-4 py-2 rounded-full bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-all">
            + Toevoegen
          </button>
        </div>
      </div>

      {/* Verwijder bevestiging modal */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={() => { setDeleteConfirm(null); setDeleteInput('') }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-black/[0.05] w-[400px] p-6">
            <div className="text-[16px] font-bold mb-1 text-[#ff3b30]">Verwijderen bevestigen</div>
            <div className="text-[13px] text-[#6e6e73] mb-2">Je staat op het punt <strong>{deleteConfirm.naam}</strong> te verwijderen.</div>
            <div className="bg-[rgba(255,59,48,0.06)] rounded-[10px] p-3 mb-4 text-[12px] text-[#8b1a1a]">
              ⚠ Dit kan niet meer ongedaan worden gemaakt.
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">
                Typ <strong>verwijderen</strong> om te bevestigen
              </label>
              <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                placeholder="verwijderen"
                className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[14px] outline-none focus:border-[#ff3b30] transition-all" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setDeleteConfirm(null); setDeleteInput('') }}
                className="flex-1 py-2.5 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10">
                Annuleren
              </button>
              <button onClick={handleDelete} disabled={deleteInput !== 'verwijderen'}
                className="flex-1 py-2.5 rounded-full bg-[#ff3b30] text-white text-[13px] font-medium hover:bg-[#e02e24] disabled:opacity-40 transition-all">
                Definitief verwijderen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
