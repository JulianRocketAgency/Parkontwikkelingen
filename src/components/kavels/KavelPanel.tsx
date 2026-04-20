'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { X, ChevronDown, Loader2, ShoppingBag } from 'lucide-react'
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
  taken?: { id: string; optie_key: string | null; status: string; kavel_id: string; opmerking_vakman: string | null; gestart_op: string | null; gereed_op: string | null }[]
  optieKoppelingen?: Record<string, string>
}

const TRIGGER_MAP: Record<string, string> = {
  geplaatst:         'geplaatst',
  bouw_gestart:      'bouw_gestart',
  intern_opgeleverd: 'intern_opgeleverd',
  opgeleverd:        'opgeleverd',
}

export function KavelPanel({ kavel, termijnConfig, owners, onClose, onUpdate, onVerkoop, onBetalingTriggered, vakmanCategorieen = [], optieKoppelingen = {}, taken: initialTaken = [] }: Props) {
  const [k, setK] = useState(kavel)
  const [taken, setTaken] = useState(initialTaken)

  // Herlaad taken elke keer als dit kavel geopend wordt
  useEffect(() => {
    fetch('/api/taken/voor-kavel?kavel_id=' + kavel.id)
      .then(r => r.json())
      .then(data => { if (data.taken) setTaken(data.taken) })
      .catch(() => {})
  }, [kavel.id])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedOptie, setExpandedOptie] = useState<string | null>(null)
  const [gekochteOptiesOpen, setGekochteOptiesOpen] = useState(true)
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
        if (changedStatusKey && updated.owner_id && updated.status) {
          const statusVal = updated.status[changedStatusKey as keyof typeof updated.status]
          if (statusVal === true) {
            const triggerKey = TRIGGER_MAP[changedStatusKey]
            if (triggerKey) {
              const config = termijnConfig.find(t => t.trigger === triggerKey && t.actief)
              if (config) await triggerBetalingstermijn(updated.id, updated.owner_id, config.termijn_key, config.naam)
            }
          }
        }
        if (changedStatusKey === 'transport_date' && updated.transport_date && updated.owner_id) {
          const config = termijnConfig.find(t => t.trigger === 'transport_datum' && t.actief)
          if (config) await triggerBetalingstermijn(updated.id, updated.owner_id, config.termijn_key, config.naam)
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
    update({ ...k, status: { ...k.status, [key]: !currentVal } }, key)
  }

  function setOptieField(optKey: string, field: 'besteld' | 'gereed' | 'notitie' | 'gekocht', value: boolean | string) {
    const updated = {
      ...k,
      opties: k.opties ? { ...k.opties, [`${optKey}_${field}`]: value } : k.opties,
    }
    update(updated)
  }

  // Opties die gekocht zijn
  const gekochteOpties = OPTIES.filter(({ key }) => {
    const opties = k.opties as unknown as Record<string, unknown>
    return opties?.[key + '_gekocht'] === true
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/[0.22] backdrop-blur-[4px] z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[520px] bg-white z-[201] flex flex-col
        border-l border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.12)]
        animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-center bg-white/75 backdrop-blur-xl flex-shrink-0 gap-3">
          <div className="flex-1">
            <div className="text-[16px] font-bold tracking-[-0.2px]">Kavel #{k.number}</div>
            <div className="text-[12px] text-[#6e6e73] mt-0.5">
              {k.type} · Fase {k.fase}{k.owner?.name ? ` · ${k.owner.name}` : ''}
            </div>
          </div>
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
              <EditField label="Transportdatum" value={k.transport_date ?? ''} onChange={v => update({...k, transport_date: v}, 'transport_date')} />
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

          {/* Gekochte opties — inklapbaar */}
          <div className="mb-6">
            <button onClick={() => setGekochteOptiesOpen(o => !o)}
              className="w-full flex items-center gap-2 text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-2.5 pb-1.5 border-b border-black/[0.05] hover:text-[#6e6e73] transition-all">
              <ShoppingBag size={11} />
              <span className="flex-1 text-left">Gekochte opties</span>
              <span className="normal-case text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/[0.06]">
                {gekochteOpties.length}/{OPTIES.length}
              </span>
              <ChevronDown size={11} className={`transition-transform ${gekochteOptiesOpen ? 'rotate-180' : ''}`} />
            </button>
            {gekochteOptiesOpen && (
              <div className="grid grid-cols-2 gap-1">
                {OPTIES.map(({ key, label }) => {
                  const opties = k.opties as unknown as Record<string, unknown>
                  const isGekocht = opties?.[key + '_gekocht'] === true
                  // Check afhankelijkheden: opties die vereist worden door deze optie
                  const vereistKeys = deps.filter(d => d.type === 'optie_optie' && d.trigger_key === key).map(d => d.requires_key)
                  // Check of deze optie vereist wordt door een andere aangevinkte optie
                  const vereistDoorAangevinkt = deps.filter(d => d.type === 'optie_optie' && d.requires_key === key)
                    .some(d => (k.opties as unknown as Record<string, unknown>)?.[d.trigger_key + '_gekocht'] === true)
                  // Waarschuwing: aangevinkt maar vereiste optie niet aangevinkt
                  const missingVereisten = isGekocht ? vereistKeys.filter(vk => !(k.opties as unknown as Record<string, unknown>)?.[vk + '_gekocht']) : []
                  return (
                    <div key={key} onClick={() => setOptieField(key, 'gekocht', !isGekocht)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-[10px] cursor-pointer border transition-all
                        ${isGekocht
                          ? 'bg-[rgba(48,209,88,0.08)] border-[rgba(48,209,88,0.25)] text-[#1a7a32]'
                          : vereistDoorAangevinkt
                            ? 'bg-[rgba(255,59,48,0.06)] border-[rgba(255,59,48,0.2)] text-[#6e6e73]'
                            : 'bg-[#f5f5f7] border-black/[0.05] text-[#6e6e73] hover:bg-[#e8e8ed]'
                        }`}>
                      <Checkbox checked={isGekocht} color="green" size="sm" />
                      <span className="text-[12px] font-medium flex-1">{label}</span>
                      {vereistDoorAangevinkt && !isGekocht && (
                        <span className="w-4 h-4 rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-bold flex-shrink-0" style={{fontSize:9}}>!</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bestellingen — alleen gekochte opties */}
          <div className="mb-6">
            <div className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.07em] mb-2.5 pb-1.5 border-b border-black/[0.05]">
              Bestellingen
            </div>
            {gekochteOpties.length === 0 ? (
              <div className="text-[13px] text-[#aeaeb2] py-3 text-center bg-[#f5f5f7] rounded-[10px]">
                Geen opties gekocht — vink ze aan bij Gekochte opties
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {gekochteOpties.map(({ key, label }) => {
                  const entry = getOptie(k.opties, key)
                  const isOpen = expandedOptie === key
                  const hasActivity = entry.besteld || entry.gereed || entry.notitie
                  const vereist = deps.filter(d => d.type === 'optie_optie' && d.trigger_key === key)
                  const vereistDoor = deps.filter(d => d.type === 'optie_optie' && d.requires_key === key)
                  const geblokkeerd = deps.filter(d => d.type === 'status_optie' && d.requires_key === key)
                    .filter(d => k.status && !k.status[d.trigger_key as keyof typeof k.status])
                  const catId = optieKoppelingen[key]
                  const cat = catId ? vakmanCategorieen.find(c => c.id === catId) : null

                  return (
                    <div key={key}
                      className={`rounded-[12px] border transition-all overflow-hidden
                        ${hasActivity ? 'border-[rgba(0,113,227,0.2)] bg-[rgba(0,113,227,0.04)]' : 'border-black/[0.06] bg-[#f5f5f7]'}`}>
                      <div className="flex items-center gap-2 px-3 py-2.5">
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
                        <span className={`text-[13px] font-medium flex-1 min-w-0 truncate ${hasActivity ? 'text-[#1d1d1f]' : 'text-[#3a3a3c]'}`}>{label}</span>
                        {cat && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,159,10,0.10)] text-[#a05a00] whitespace-nowrap flex-shrink-0">{cat.naam}</span>
                        )}
                        {(() => {
                          const taak = taken.find(t => t.optie_key === key && t.kavel_id === k.id)
                          if (entry.gereed) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.15)] text-[#1a7a32] flex-shrink-0">Gereed</span>
                          if (taak?.status === 'in_uitvoering') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(255,159,10,0.12)] text-[#a05a00] flex-shrink-0">Gestart</span>
                          if (entry.besteld) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.12)] text-[#004f9e] flex-shrink-0">Besteld</span>
                          return null
                        })()}
                        <button onClick={() => setExpandedOptie(isOpen ? null : key)}
                          className="p-1 rounded-lg hover:bg-black/[0.06] transition-all flex-shrink-0">
                          <ChevronDown size={13} className={`text-[#aeaeb2] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {(geblokkeerd.length > 0 || vereist.length > 0 || vereistDoor.length > 0) && (
                        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                          {geblokkeerd.map(d => (
                            <span key={d.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,59,48,0.10)] text-[#8b1a1a]">
                              Wacht op: {STATUS_LABELS[d.trigger_key] ?? d.trigger_key}
                            </span>
                          ))}
                          {vereist.map(d => (
                            <span key={d.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,159,10,0.12)] text-[#a05a00]">
                              Vereist: {OPTIES.find(o=>o.key===d.requires_key)?.label ?? d.requires_key}
                            </span>
                          ))}
                          {vereistDoor.map(d => (
                            <span key={d.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e]">
                              Vereist door: {OPTIES.find(o=>o.key===d.trigger_key)?.label ?? d.trigger_key}
                            </span>
                          ))}
                        </div>
                      )}
                      {isOpen && (
                        <div className="px-3 pb-3 border-t border-black/[0.05] mt-1">
                          {(() => {
                            const taak = taken.find(t => t.optie_key === key && t.kavel_id === k.id)
                            const notitieWaarde = taak?.opmerking_vakman ?? entry.notitie ?? ''
                            return (
                              <textarea
                                key={taak?.id ?? key}
                                defaultValue={notitieWaarde}
                                onBlur={async e => {
                                  const val = e.target.value
                                  // Sla op in beide velden
                                  setOptieField(key, 'notitie', val)
                                  if (taak) {
                                    await fetch('/api/taken/update', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: taak.id, opmerking_vakman: val }),
                                    })
                                    setTaken(prev => prev.map(t => t.id === taak.id ? { ...t, opmerking_vakman: val } : t))
                                  }
                                }}
                                placeholder="Notities voor team en vakman..." rows={2}
                                className="w-full mt-2 bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] resize-none outline-none focus:border-[#0071e3] focus:bg-white transition-all placeholder:text-[#aeaeb2]" />
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Section title="Bijzonderheden">
            <textarea value={k.notitie ?? ''} onChange={e => update({...k, notitie: e.target.value})}
              placeholder="Notities, bijzonderheden..."
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
  const sz = size === 'sm' ? 'w-[15px] h-[15px] rounded-[4px]' : 'w-[18px] h-[18px] rounded-[5px]'
  const bg = checked
    ? color === 'blue' ? 'bg-[#0071e3] border-[#0071e3]' : 'bg-[#30d158] border-[#30d158]'
    : 'bg-white border-[#d1d1d6]'
  const checkSize = size === 'sm' ? 9 : 11
  return (
    <div className={`${sz} border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ${bg}`}>
      {checked && (
        <svg width={checkSize} height={checkSize} viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}
