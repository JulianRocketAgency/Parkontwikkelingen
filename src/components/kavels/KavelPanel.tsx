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

interface ParkOptie {
  id: string
  park_id: string
  slug: string
  label: string
  volgorde: number
  actief: boolean
}

interface OptieWaarde {
  id?: string
  kavel_id: string
  optie_id: string
  gekocht: boolean
  besteld: boolean
  gereed: boolean
  notitie: string | null
}
interface Props {
  kavel: Kavel
  termijnConfig: TermijnConfig[]
  owners: Owner[]
  onClose: () => void
  onUpdate: (k: Kavel) => void
  onVerkoop: (kavelId: string) => void
  onBetalingTriggered: (b: Betalingstermijn) => void
  vakmanCategorieen?: { id: string; naam: string }[]
  taken?: { id: string; optie_key: string | null; optie_id?: string | null; status: string; kavel_id: string; opmerking_vakman: string | null; gestart_op: string | null; gereed_op: string | null }[]
  optieKoppelingen?: Record<string, string>
  parkOpties?: ParkOptie[]
  optieWaarden?: OptieWaarde[]
}

const TRIGGER_MAP: Record<string, string> = {
  geplaatst:         'geplaatst',
  bouw_gestart:      'bouw_gestart',
  intern_opgeleverd: 'intern_opgeleverd',
  opgeleverd:        'opgeleverd',
}

export function KavelPanel({ kavel, termijnConfig, owners, onClose, onUpdate, onVerkoop, onBetalingTriggered, vakmanCategorieen = [], optieKoppelingen = {}, parkOpties = [], optieWaarden: initialOptieWaarden = [], taken: initialTaken = [] }: Props) {
  const [k, setK] = useState(kavel)
  const [taken, setTaken] = useState(initialTaken)
  const [optieWaarden, setOptieWaarden] = useState<OptieWaarde[]>(initialOptieWaarden)

  // Herlaad taken elke keer als dit kavel geopend wordt
  useEffect(() => {
    fetch('/api/taken/voor-kavel?kavel_id=' + kavel.id)
      .then(r => r.json())
      .then(data => { if (data.taken) setTaken(data.taken) })
      .catch(() => {})
    fetch('/api/kavel/optie-waarden?kavel_id=' + kavel.id)
      .then(r => r.json())
      .then(data => { if (data.waarden) setOptieWaarden(data.waarden) })
      .catch(() => {})
  }, [kavel.id])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedOptie, setExpandedOptie] = useState<string | null>(null)
  const [gekochteOptiesOpen, setGekochteOptiesOpen] = useState(true)
  const [deps, setDeps] = useState<Dependency[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { getDependencies(kavel.park_id).then(setDeps) }, [kavel.park_id])


  function getWaarde(optieId: string): OptieWaarde {
    return optieWaarden.find(w => w.optie_id === optieId) ?? {
      kavel_id: k.id, optie_id: optieId, gekocht: false, besteld: false, gereed: false, notitie: null
    }
  }

  async function setWaarde(optieId: string, field: 'gekocht' | 'besteld' | 'gereed' | 'notitie', value: boolean | string) {
    const huidige = getWaarde(optieId)
    const nieuw = { ...huidige, [field]: value }
    setOptieWaarden(prev => {
      const idx = prev.findIndex(w => w.optie_id === optieId)
      if (idx >= 0) { const arr = [...prev]; arr[idx] = nieuw; return arr }
      return [...prev, nieuw]
    })
    await fetch('/api/kavel/update-optie-waarde', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kavel_id: k.id, optie_id: optieId, [field]: value }),
    })
  }

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

  // Dynamische opties: gebruik parkOpties + optieWaarden
  const gekochteOpties = parkOpties.filter(opt => getWaarde(opt.id).gekocht)
  const alleOpties = parkOpties

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
                {gekochteOpties.length}/{alleOpties.length}
              </span>
              <ChevronDown size={11} className={`transition-transform ${gekochteOptiesOpen ? 'rotate-180' : ''}`} />
            </button>
            {gekochteOptiesOpen && (
              <div className="grid grid-cols-2 gap-1">
                {alleOpties.map(opt => {
                  const waarde = getWaarde(opt.id)
                  return (
                    <button key={opt.id}
                      onClick={() => setWaarde(opt.id, 'gekocht', !waarde.gekocht)}
                      className={"flex items-center gap-2 px-3 py-2.5 rounded-[12px] border transition-all text-left " +
                        (waarde.gekocht
                          ? 'border-[rgba(48,209,88,0.3)] bg-[rgba(48,209,88,0.08)]'
                          : 'border-black/[0.06] bg-[#f5f5f7] hover:bg-[#ebebeb]')}>
                      <div className={"w-4 h-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 transition-all " +
                        (waarde.gekocht ? 'bg-[#30d158] border-[#30d158]' : 'border-[#d1d1d6] bg-white')}>
                        {waarde.gekocht && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span className={"text-[13px] font-medium " + (waarde.gekocht ? 'text-[#1d1d1f]' : 'text-[#6e6e73]')}>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <Section title="Bestellingen">
            {gekochteOpties.length === 0 ? (
              <div className="text-[13px] text-[#aeaeb2] py-2">
                Geen opties gekocht
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {gekochteOpties.map(opt => {
                  const waarde = getWaarde(opt.id)
                  const isOpen = expandedOptie === opt.id
                  const taak = taken.find(t => (t.optie_id === opt.id || t.optie_key === opt.slug) && t.kavel_id === k.id)
                  const catId = optieKoppelingen[opt.slug]
                  const cat = catId ? vakmanCategorieen.find(c => c.id === catId) : null
                  // Vereisten voor deze optie (optie_optie dependencies)
                  const vereisten = deps.filter(d => d.type === 'optie_optie' && d.trigger_key === opt.slug)
                  // Check welke vereisten nog niet gekocht zijn
                  const ontbrekendVereisten = vereisten.filter(d => {
                    const vereistOptie = parkOpties.find(p => p.slug === d.requires_key)
                    if (!vereistOptie) return false
                    return !getWaarde(vereistOptie.id).gekocht
                  })
                  return (
                    <div key={opt.id}
                      className={"rounded-[12px] border transition-all overflow-hidden " +
                        (waarde.besteld || waarde.gereed
                          ? 'border-[rgba(0,113,227,0.2)] bg-[rgba(0,113,227,0.04)]'
                          : 'border-black/[0.06] bg-[#f5f5f7]')}>
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button onClick={() => setWaarde(opt.id, 'besteld', !waarde.besteld)}
                          className="flex items-center gap-1.5 flex-shrink-0">
                          <div className={"w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-all " +
                            (waarde.besteld ? 'bg-[#0071e3] border-[#0071e3]' : 'border-[#d1d1d6] bg-white')}>
                            {waarde.besteld && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span className="text-[10px] font-medium text-[#6e6e73]">Besteld</span>
                        </button>
                        <button onClick={() => setWaarde(opt.id, 'gereed', !waarde.gereed)}
                          className="flex items-center gap-1.5 flex-shrink-0">
                          <div className={"w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-all " +
                            (waarde.gereed ? 'bg-[#30d158] border-[#30d158]' : 'border-[#d1d1d6] bg-white')}>
                            {waarde.gereed && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span className="text-[10px] font-medium text-[#6e6e73]">Gereed</span>
                        </button>
                        <span className={"text-[13px] font-medium flex-1 min-w-0 truncate " +
                          (waarde.besteld || waarde.gereed ? 'text-[#1d1d1f]' : 'text-[#3a3a3c]')}>{opt.label}</span>
                        {cat && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,159,10,0.10)] text-[#a05a00] whitespace-nowrap flex-shrink-0">{cat.naam}</span>
                        )}
                        {ontbrekendVereisten.length > 0 && (
                          <span title={"Vereist: " + ontbrekendVereisten.map(d => d.requires_key).join(', ')}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[rgba(255,59,48,0.10)] text-[#ff3b30] flex-shrink-0 cursor-help">
                            ! Vereist: {ontbrekendVereisten.map(d => {
                              const vOptie = parkOpties.find(p => p.slug === d.requires_key)
                              return vOptie?.label ?? d.requires_key
                            }).join(', ')}
                          </span>
                        )}
                        {waarde.gereed
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.15)] text-[#1a7a32] flex-shrink-0">Gereed</span>
                          : taak?.status === 'in_uitvoering'
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(255,159,10,0.12)] text-[#a05a00] flex-shrink-0">Gestart</span>
                          : waarde.besteld
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,113,227,0.12)] text-[#004f9e] flex-shrink-0">Besteld</span>
                          : null}
                        <button onClick={() => setExpandedOptie(isOpen ? null : opt.id)}
                          className="p-1 rounded-lg hover:bg-black/[0.06] transition-all flex-shrink-0">
                          <ChevronDown size={13} className={"text-[#aeaeb2] transition-transform " + (isOpen ? 'rotate-180' : '')} />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 border-t border-black/[0.05] mt-1 flex flex-col gap-2">
                          <div>
                            <div className="text-[10px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mt-2 mb-1">Interne opmerking</div>
                            <textarea
                              value={waarde.notitie ?? ''}
                              onChange={e => setWaarde(opt.id, 'notitie', e.target.value)}
                              placeholder="Alleen zichtbaar voor het team..."
                              rows={2}
                              className="w-full bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2.5 text-[13px] resize-none outline-none focus:border-[#0071e3] focus:bg-white transition-all placeholder:text-[#aeaeb2]" />
                          </div>
                          {taak && (
                            <div>
                              <div className="text-[10px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] mb-1">Gedeeld met vakman</div>
                              <textarea
                                key={taak.id}
                                defaultValue={taak.opmerking_vakman ?? ''}
                                onBlur={async e => {
                                  const val = e.target.value
                                  await fetch('/api/taken/update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: taak.id, opmerking_vakman: val }),
                                  })
                                  setTaken(prev => prev.map(t => t.id === taak.id ? { ...t, opmerking_vakman: val } : t))
                                }}
                                placeholder="Zichtbaar voor team én vakman..."
                                rows={2}
                                className="w-full bg-[rgba(0,113,227,0.04)] border border-[rgba(0,113,227,0.15)] rounded-[10px] px-3 py-2.5 text-[13px] resize-none outline-none focus:border-[#0071e3] transition-all placeholder:text-[#aeaeb2]" />
                              {taak.status === 'in_uitvoering' && (
                                <div className="mt-1 text-[11px] text-[#ff9f0a]">⚡ Vakman is gestart{taak.gestart_op ? ' op ' + new Date(taak.gestart_op).toLocaleDateString('nl-NL') : ''}</div>
                              )}
                              {taak.status === 'gereed' && (
                                <div className="mt-1 text-[11px] text-[#30d158]">✓ Gereed gemeld{taak.gereed_op ? ' op ' + new Date(taak.gereed_op).toLocaleDateString('nl-NL') : ''}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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
