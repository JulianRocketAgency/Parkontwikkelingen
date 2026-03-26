'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import type { Kavel, Owner } from '@/types'
import { STATUS_LABELS, OPTIES, getOptie, getKavelPct } from '@/types'
import {
  upsertKavelStatus, upsertKavelOpties, updateKavel,
  getDependencies, triggerBetalingstermijn,
  type Dependency, type TermijnConfig, type Betalingstermijn
} from '@/lib/queries'

interface Props {
  kavel: Kavel
  termijnConfig: TermijnConfig[]
  owners: Owner[]
  onClose: () => void
  onUpdate: (k: Kavel) => void
  onVerkoop: (kavelId: string) => void
  onBetalingTriggered: (b: Betalingstermijn) => void
  vakmanCategorieen?: { id: string; naam: string }[]
  optieKoppelingen?: Record<string, string>
}

const TRIGGER_MAP: Record<string, string> = {
  geplaatst:         'geplaatst',
  bouw_gestart:      'bouw_gestart',
  intern_opgeleverd: 'intern_opgeleverd',
  opgeleverd:        'opgeleverd',
}

export function KavelPanel({ kavel, termijnConfig, owners, onClose, onUpdate, onVerkoop, onBetalingTriggered, vakmanCategorieen = [], optieKoppelingen = {} }: Props) {
  const [k, setK] = useState(kavel)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedOptie, setExpandedOptie] = useState<string | null>(null)
  const [deps, setDeps] = useState<Dependency[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { getDependencies(kavel.park_id).then(setDeps) }, [kavel.park_id])

  const pct = getKavelPct(k.status)

  const autoSave = useCallback(async (updated: Kavel, changedStatusKey?: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        if (updated.status) await upsertKavelStatus(updated.id, updated.status)
        if (updated.opties) await upsertKavelOpties(updated.id, updated.opties)
        await updateKavel(updated.id, {
          notitie: updated.notitie,
          huisdieren: updated.huisdieren,
          owner_id: updated.owner_id,
          gereed_bouwer: updated.gereed_bouwer,
          transport_date: updated.transport_date,
        })
        onUpdate(updated)

        // Trigger betalingstermijn als een relevant vinkje aangezet wordt
        if (changedStatusKey && updated.owner_id && updated.status) {
          const statusVal = updated.status[changedStatusKey as keyof typeof updated.status]
          if (statusVal === true) {
            // Map status key to trigger key
            const triggerMap: Record<string, string> = {
              bouw_gestart:      'bouw_gestart',
              geplaatst:         'geplaatst',
              intern_opgeleverd: 'intern_opgeleverd',
              opgeleverd:        'opgeleverd',
            }
            const triggerKey = triggerMap[changedStatusKey]
            if (triggerKey) {
              const config = termijnConfig.find(t => t.trigger === triggerKey && t.actief)
              if (config) {
                await triggerBetalingstermijn(updated.id, updated.owner_id, config.termijn_key, config.naam)
              }
            }
          }
        }

        // Transport datum trigger
        if (changedStatusKey === 'transport_date' && updated.transport_date && updated.owner_id) {
          const config = termijnConfig.find(t => t.trigger === 'transport_datum' && t.actief)
          if (config) {
            await triggerBetalingstermijn(updated.id, updated.owner_id, config.termijn_key, config.naam)
          }
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (e) { console.error(e) }
      finally { setSaving(false) }
    }, 600)
  }, [onUpdate, termijnConfig])

  function update(updated: Kavel, changedKey?: string) {
    setK(updated)
    autoSave(updated, changedKey)
  }

  function toggleStatus(key: string) {
    if (!k.status) return
    const currentVal = k.status[key as keyof typeof k.status]
    const updated = {
      ...k,
      status: { ...k.status, [key]: !currentVal },
    }
    update(updated, key)
  }

  function setOptieField(optKey: string, field: 'besteld' | 'gereed' | 'notitie', value: boolean | string) {
    const updated = {
      ...k,
      opties: k.opties ? { ...k.opties, [`${optKey}_${field}`]: value } : k.opties,
    }
    update(updated)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[520px] bg-white z-[201] flex flex-col
        border-l border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.12)]
        animate-in slide-in-from-right duration-300">

        {/* Head */}
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-center bg-white/75 backdrop-blur-xl flex-shrink-0 gap-3">
          <div className="flex-1">
            <div className="text-[16px] font-bold tracking-[-0.2px]">Kavel #{k.number}</div>
            <div className="text-[12px] text-[#6e6e73] mt-0.5">
              {k.type} · Fase {k.fase}{k.owner?.name ? ` · ${k.owner.name}` : ''}
            </div>
          </div>
          {/* Verkoop badge / knop */}
          {k.verkocht ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[rgba(48,209,88,0.13)] text-[#1a7a32]">Verkocht</span>
          ) : (
            <button onClick={() => onVerkoop(k.id)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all">
              Verkopen
            </button>
          )}
          <div className="flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="text-[#aeaeb2] animate-spin" />}
            {saved && !saving && <span className="text-[11px] text-[#1a7a32]">✓ Opgeslagen</span>}
          </div>
          <button onClick={onClose}
            className="w-[26px] h-[26px] rounded-full bg-black/[0.07] flex items-center justify-center hover:bg-black/[0.12] transition-all flex-shrink-0">
            <X size={12} className="text-[#6e6e73]" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-[#e8e8ed]">
          <div className="h-full bg-[#0071e3] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          <Section title="Basisgegevens">
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Type">{k.type ?? '—'}</Field>
              <Field label="Uitvoering">{k.uitvoering ?? '—'}</Field>
              <Field label="Chassisnummer"><span className="font-mono text-[12px]">{k.chassis ?? '—'}</span></Field>
              <EditField label="Gereed bouwer" value={k.gereed_bouwer ?? ''} onChange={v => update({...k, gereed_bouwer: v})} />
              <EditField label="Transportdatum" value={k.transport_date ?? ''}
                onChange={v => update({...k, transport_date: v}, 'transport_date')} />
              <Field label="Huisdieren">
                <select value={k.huisdieren ? 'Ja' : 'Nee'}
                  onChange={e => update({...k, huisdieren: e.target.value === 'Ja'})}
                  className="bg-transparent border-none outline-none text-[13px] font-medium text-[#1d1d1f] w-full">
                  <option>Ja</option><option>Nee</option>
                </select>
              </Field>
            </div>
            <div className="mt-1.5">
              <Field label="Eigenaar" fullWidth>
                {k.owner?.name ?? <span className="text-[#aeaeb2] font-normal">Geen eigenaar</span>}
              </Field>
            </div>
          </Section>

          <Section title="Voortgang bouw">
            <div className="flex flex-col gap-0.5">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const checked = k.status ? Boolean(k.status[key as keyof typeof k.status]) : false
                const hasTrigger = !!TRIGGER_MAP[key]
                return (
                  <div key={key} onClick={() => toggleStatus(key)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] cursor-pointer hover:bg-[#f5f5f7] transition-all">
                    <Checkbox checked={checked} color="blue" />
                    <span className={`text-[13px] flex-1 ${checked ? 'text-[#1d1d1f]' : 'text-[#3a3a3c]'}`}>{label}</span>
                    {hasTrigger && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[rgba(0,113,227,0.08)] text-[#004f9e]">
                        € termijn
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="Opties & bestellingen">
            <div className="flex flex-col gap-1.5">
              {OPTIES.map(({ key, label }) => {
                const entry = getOptie(k.opties, key)
                const isOpen = expandedOptie === key
                const hasActivity = entry.besteld || entry.gereed || entry.notitie
                const vereist = deps.filter(d => d.type === 'optie_optie' && d.trigger_key === key)
                const vereistDoor = deps.filter(d => d.type === 'optie_optie' && d.requires_key === key)
                const geblokkeerd = deps.filter(d => d.type === 'status_optie' && d.requires_key === key)
                  .filter(d => k.status && !k.status[d.trigger_key as keyof typeof k.status])

                return (
                  <div key={key}
                    className={`rounded-[12px] border transition-all overflow-hidden
                      ${hasActivity ? 'border-[rgba(0,113,227,0.2)] bg-[rgba(0,113,227,0.04)]' : 'border-black/[0.06] bg-[#f5f5f7]'}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <button onClick={() => setOptieField(key, 'besteld', !entry.besteld)}
                        className="flex items-center gap-1.5 flex-shrink-0">
                        <Checkbox checked={entry.besteld} color="blue" size="sm" />
                        <span className="text-[10px] font-medium text-[#6e6e73]">Besteld</span>
                      </button>
                      <button onClick={() => setOptieField(key, 'gereed', !entry.gereed)}
                        className="flex items-center gap-1.5 flex-shrink-0">
                        <Checkbox checked={entry.gereed} color="green" size="sm" />
                        <span className="text-[10px] font-medium text-[#6e6e73]">Gereed</span>
                      </button>
                      <span className={`text-[13px] font-medium flex-1 ${hasActivity ? 'text-[#1d1d1f]' : 'text-[#3a3a3c]'}`}>{label}</span>
                      {entry.gereed && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.15)] text-[#1a7a32]">Gereed</span>}
                      {entry.besteld && !entry.gereed && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.12)] text-[#004f9e]">Besteld</span>}
                      <button onClick={() => setExpandedOptie(isOpen ? null : key)}
                        className="p-1 rounded-lg hover:bg-black/[0.06] transition-all flex-shrink-0">
                        <ChevronDown size={13} className={`text-[#aeaeb2] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    {/* Dependency indicators */}
                    {(geblokkeerd.length > 0 || vereist.length > 0 || vereistDoor.length > 0) && (
                      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                        {geblokkeerd.map(d => (
                          <span key={d.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,59,48,0.10)] text-[#8b1a1a]">
                            ⊘ Wacht op: {STATUS_LABELS[d.trigger_key] ?? d.trigger_key}
                          </span>
                        ))}
                        {vereist.map(d => (
                          <span key={d.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,159,10,0.12)] text-[#a05a00]">
                            → Vereist: {OPTIES.find(o=>o.key===d.requires_key)?.label ?? d.requires_key}
                          </span>
                        ))}
                        {vereistDoor.map(d => (
                          <span key={d.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e]">
                            ← Vereist door: {OPTIES.find(o=>o.key===d.trigger_key)?.label ?? d.trigger_key}
                          </span>
                        ))}
                      </div>
                    )}
                    {isOpen && (
                      <div className="px-3 pb-3 border-t border-black/[0.05]">
                        <textarea value={entry.notitie}
                          onChange={e => setOptieField(key, 'notitie', e.target.value)}
                          placeholder="Opmerking bij deze optie…" rows={2}
                          className="w-full mt-2 bg-white border border-black/[0.05] rounded-[8px] px-3 py-2 text-[12px] resize-none outline-none focus:border-[#0071e3] transition-all placeholder:text-[#aeaeb2]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="Bijzonderheden">
            <textarea value={k.notitie ?? ''} onChange={e => update({...k, notitie: e.target.value})}
              placeholder="Notities, bijzonderheden…"
              className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] resize-y min-h-[70px] outline-none focus:border-[#0071e3] focus:bg-white transition-all placeholder:text-[#aeaeb2]" />
          </Section>
        </div>

        <div className="px-6 py-3 border-t border-black/[0.05] flex bg-white/75 backdrop-blur-xl flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-full bg-black/[0.06] text-[#3a3a3c] text-[13px] font-medium hover:bg-black/10 transition-all">
            Sluiten
          </button>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-2.5 pb-1.5 border-b border-black/[0.05]">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, fullWidth, children }: { label: string; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 border border-black/[0.05] ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="text-[11px] text-[#6e6e73] font-medium mb-0.5">{label}</div>
      <div className="text-[13px] font-medium text-[#1d1d1f]">{children}</div>
    </div>
  )
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-[#f5f5f7] rounded-[10px] px-3 py-2.5 border border-black/[0.05] focus-within:border-[#0071e3] focus-within:bg-white transition-all">
      <div className="text-[11px] text-[#6e6e73] font-medium mb-0.5">{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="text-[13px] font-medium text-[#1d1d1f] bg-transparent border-none outline-none w-full" />
    </div>
  )
}

function Checkbox({ checked, color, size = 'md' }: { checked: boolean; color: 'blue' | 'green'; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-[15px] h-[15px] rounded-[4px]' : 'w-[17px] h-[17px] rounded-[5px]'
  const bg = checked
    ? color === 'blue' ? 'bg-[#0071e3] border-[#0071e3]' : 'bg-[#30d158] border-[#30d158]'
    : 'border-[#aeaeb2]'
  return (
    <div className={`${sz} border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 ${bg}`}>
      {checked && <span className="text-white font-bold" style={{ fontSize: size === 'sm' ? 8 : 10 }}>✓</span>}
    </div>
  )
}
