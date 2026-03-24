'use client'
import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import type { Kavel } from '@/types'
import { STATUS_LABELS, OPTIES, getOptie, getKavelPct } from '@/types'
import { upsertKavelStatus, upsertKavelOpties, updateKavel } from '@/lib/queries'

interface Props {
  kavel: Kavel
  onClose: () => void
  onUpdate: (k: Kavel) => void
}

export function KavelPanel({ kavel, onClose, onUpdate }: Props) {
  const [k, setK] = useState(kavel)
  const [saving, setSaving] = useState(false)
  const [expandedOptie, setExpandedOptie] = useState<string | null>(null)

  const pct = getKavelPct(k.status)

  async function save() {
    setSaving(true)
    try {
      if (k.status) await upsertKavelStatus(k.id, k.status)
      if (k.opties) await upsertKavelOpties(k.id, k.opties)
      await updateKavel(k.id, {
        notitie: k.notitie,
        huisdieren: k.huisdieren,
        owner_id: k.owner_id,
      })
      onUpdate(k)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function toggleStatus(key: string) {
    setK(prev => ({
      ...prev,
      status: prev.status
        ? { ...prev.status, [key]: !prev.status[key as keyof typeof prev.status] }
        : prev.status,
    }))
  }

  function setOptieField(optKey: string, field: 'besteld' | 'gereed' | 'notitie', value: boolean | string) {
    setK(prev => ({
      ...prev,
      opties: prev.opties
        ? { ...prev.opties, [`${optKey}_${field}`]: value }
        : prev.opties,
    }))
  }

  const mapBadge = k.polygon && k.polygon.length >= 3
    ? <span className="text-[11px] text-[#1a7a32] font-medium">✓ Gebied ingetekend</span>
    : <span className="text-[11px] text-[#aeaeb2]">Geen gebied — teken via Instellingen</span>

  const ownerBtn = k.owner
    ? <button className="text-[11px] text-[#0071e3] hover:underline ml-auto">Eigenaar bekijken →</button>
    : null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-[520px] bg-white z-[201] flex flex-col
        border-l border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.12)]
        animate-in slide-in-from-right duration-300">

        {/* Head */}
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-start bg-white/75 backdrop-blur-xl flex-shrink-0">
          <div>
            <div className="text-[16px] font-bold tracking-[-0.2px]">Kavel #{k.number}</div>
            <div className="text-[12px] text-[#6e6e73] mt-0.5">
              {k.type} · Fase {k.fase}{k.owner?.name ? ` · ${k.owner.name}` : ''}
            </div>
          </div>
          <button onClick={onClose}
            className="ml-auto w-[26px] h-[26px] rounded-full bg-black/[0.07] flex items-center justify-center hover:bg-black/[0.12] transition-all flex-shrink-0">
            <X size={12} className="text-[#6e6e73]" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-[#e8e8ed]">
          <div className="h-full bg-[#0071e3] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Basisgegevens */}
          <Section title="Basisgegevens">
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Type">{k.type ?? '—'}</Field>
              <Field label="Uitvoering">{k.uitvoering ?? '—'}</Field>
              <Field label="Chassisnummer"><span className="font-mono">{k.chassis ?? '—'}</span></Field>
              <EditField label="Gereed bouwer" value={k.gereed_bouwer ?? ''} onChange={v => setK(p => ({...p, gereed_bouwer: v}))} />
              <EditField label="Transportdatum" value={k.transport_date ?? ''} onChange={v => setK(p => ({...p, transport_date: v}))} />
              <Field label="Huisdieren">
                <select value={k.huisdieren ? 'Ja' : 'Nee'}
                  onChange={e => setK(p => ({...p, huisdieren: e.target.value === 'Ja'}))}
                  className="bg-transparent border-none outline-none text-[13px] font-medium text-[#1d1d1f] w-full">
                  <option>Ja</option><option>Nee</option>
                </select>
              </Field>
            </div>
            <div className="mt-1.5">
              <Field label="Eigenaar" fullWidth>{k.owner?.name ?? <span className="text-[#aeaeb2] font-normal">Geen eigenaar</span>}</Field>
            </div>
            <div className="mt-2 flex gap-3 items-center flex-wrap">{mapBadge}{ownerBtn}</div>
          </Section>

          {/* Voortgang */}
          <Section title="Voortgang bouw">
            <div className="flex flex-col gap-0.5">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const checked = k.status ? Boolean(k.status[key as keyof typeof k.status]) : false
                return (
                  <div key={key} onClick={() => toggleStatus(key)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] cursor-pointer hover:bg-[#f5f5f7] transition-all">
                    <Checkbox checked={checked} />
                    <span className={`text-[13px] ${checked ? 'text-[#1d1d1f]' : 'text-[#3a3a3c]'}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Opties */}
          <Section title="Opties & bestellingen">
            <div className="flex flex-col gap-1.5">
              {OPTIES.map(({ key, label }) => {
                const entry = getOptie(k.opties, key)
                const isOpen = expandedOptie === key
                const hasActivity = entry.besteld || entry.gereed || entry.notitie

                return (
                  <div key={key}
                    className={`rounded-[12px] border transition-all overflow-hidden
                      ${hasActivity
                        ? 'border-[rgba(0,113,227,0.2)] bg-[rgba(0,113,227,0.04)]'
                        : 'border-black/[0.06] bg-[#f5f5f7]'
                      }`}>

                    {/* Row header */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {/* Besteld checkbox */}
                      <button
                        onClick={() => setOptieField(key, 'besteld', !entry.besteld)}
                        className="flex items-center gap-1.5 flex-shrink-0 group">
                        <div className={`w-[15px] h-[15px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-all
                          ${entry.besteld ? 'bg-[#0071e3] border-[#0071e3]' : 'border-[#aeaeb2] group-hover:border-[#6e6e73]'}`}>
                          {entry.besteld && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                        <span className="text-[10px] font-medium text-[#6e6e73]">Besteld</span>
                      </button>

                      {/* Gereed checkbox */}
                      <button
                        onClick={() => setOptieField(key, 'gereed', !entry.gereed)}
                        className="flex items-center gap-1.5 flex-shrink-0 group">
                        <div className={`w-[15px] h-[15px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-all
                          ${entry.gereed ? 'bg-[#30d158] border-[#30d158]' : 'border-[#aeaeb2] group-hover:border-[#6e6e73]'}`}>
                          {entry.gereed && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                        <span className="text-[10px] font-medium text-[#6e6e73]">Gereed</span>
                      </button>

                      {/* Label */}
                      <span className={`text-[13px] font-medium flex-1 ${hasActivity ? 'text-[#1d1d1f]' : 'text-[#3a3a3c]'}`}>
                        {label}
                      </span>

                      {/* Status badge */}
                      {entry.gereed && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.15)] text-[#1a7a32]">Gereed</span>
                      )}
                      {entry.besteld && !entry.gereed && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.12)] text-[#004f9e]">Besteld</span>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedOptie(isOpen ? null : key)}
                        className="p-1 rounded-lg hover:bg-black/[0.06] transition-all flex-shrink-0">
                        <ChevronDown size={13} className={`text-[#aeaeb2] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Expanded note */}
                    {isOpen && (
                      <div className="px-3 pb-3 border-t border-black/[0.05]">
                        <textarea
                          value={entry.notitie}
                          onChange={e => setOptieField(key, 'notitie', e.target.value)}
                          placeholder="Opmerking bij deze optie…"
                          rows={2}
                          className="w-full mt-2 bg-white border border-black/[0.05] rounded-[8px] px-3 py-2 text-[12px] text-[#1d1d1f] resize-none outline-none focus:border-[#0071e3] transition-all leading-relaxed placeholder:text-[#aeaeb2]"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Bijzonderheden */}
          <Section title="Bijzonderheden">
            <textarea
              value={k.notitie ?? ''}
              onChange={e => setK(p => ({...p, notitie: e.target.value}))}
              placeholder="Notities, bijzonderheden…"
              className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] text-[#1d1d1f] resize-y min-h-[70px] outline-none focus:border-[#0071e3] focus:bg-white transition-all leading-relaxed placeholder:text-[#aeaeb2]"
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-black/[0.05] flex gap-2 bg-white/75 backdrop-blur-xl flex-shrink-0">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-all disabled:opacity-60 shadow-[0_1px_4px_rgba(0,113,227,0.3)]">
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10 transition-all">
            Sluiten
          </button>
        </div>
      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-2.5 pb-1.5 border-b border-black/[0.05]">
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, fullWidth, children }: {
  label: string; fullWidth?: boolean; children: React.ReactNode
}) {
  return (
    <div className={`bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 border border-black/[0.05] ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="text-[11px] text-[#6e6e73] font-medium mb-0.5">{label}</div>
      <div className="text-[13px] font-medium text-[#1d1d1f]">{children}</div>
    </div>
  )
}

function EditField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 border border-black/[0.05] focus-within:border-[#0071e3] focus-within:bg-white transition-all">
      <div className="text-[11px] text-[#6e6e73] font-medium mb-0.5">{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="text-[13px] font-medium text-[#1d1d1f] bg-transparent border-none outline-none w-full" />
    </div>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-[17px] h-[17px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all flex-shrink-0
      ${checked ? 'bg-[#0071e3] border-[#0071e3]' : 'border-[#aeaeb2]'}`}>
      {checked && <span className="text-white text-[10px] font-bold">✓</span>}
    </div>
  )
}
