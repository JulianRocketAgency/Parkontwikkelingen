'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp, Check, X } from 'lucide-react'

interface Park {
  id: string
  name: string
  organisaties?: { naam: string } | null
}

interface ParkRol {
  id: string
  park_id: string
  rol: string
  label: string
  kleur: string
  rechten: Record<string, boolean>
}

interface MedewerkerType {
  id: string
  park_id: string
  naam: string
  rechten: Record<string, boolean>
}

interface VakmanCategorie {
  id: string
  park_id: string
  naam: string
  rechten?: Record<string, boolean>
}

interface Props {
  parks: Park[]
  parkRollen: ParkRol[]
  medewerkerTypes: MedewerkerType[]
  vakmanCategorieen: VakmanCategorie[]
}

const ROL_RECHTEN: Record<string, string> = {
  dashboard: 'Dashboard',
  eigenaren: 'Eigenaren',
  werklieden: 'Werklieden',
  chat: 'Chat',
  instellingen: 'Instellingen',
  tessi: 'Tessi AI',
  kavel_bewerken: 'Kavels bewerken',
  kavel_verkopen: 'Kavels verkopen',
  fase_starten: 'Fase starten',
  taken_inzien: 'Taken inzien',
  taken_gereedmelden: 'Gereed melden',
  opmerkingen_inzien: 'Opmerkingen',
  eigen_kavel_inzien: 'Eigen kavel',
  betalingen_inzien: 'Betalingen',
}

const MEDEWERKER_RECHTEN: Record<string, string> = {
  dashboard: 'Dashboard',
  eigenaren: 'Eigenaren',
  chat: 'Chat',
  tessi: 'Tessi AI',
  kavel_bewerken: 'Kavels bewerken',
  kavel_verkopen: 'Kavels verkopen',
  fase_starten: 'Fase starten',
  taken_inzien: 'Taken inzien',
  opmerkingen_inzien: 'Opmerkingen inzien',
}

const VAKMAN_RECHTEN: Record<string, string> = {
  taken_inzien: 'Taken inzien',
  taken_gereedmelden: 'Taken gereed melden',
  opmerkingen_inzien: 'Opmerkingen inzien',
  chat: 'Chat gebruiken',
  foto_uploaden: "Foto's uploaden",
  materialen_inzien: 'Materialen inzien',
}

const ROL_KLEUR: Record<string, string> = {
  ontwikkelaar: '#0071e3',
  medewerker: '#30d158',
  vakman: '#ff9f0a',
  koper: '#bf5af2',
}

export function RechtenClient({ parks, parkRollen: initialRollen, medewerkerTypes: initialTypes, vakmanCategorieen }: Props) {
  const [selectedParkId, setSelectedParkId] = useState(parks[0]?.id ?? '')
  const [parkRollen, setParkRollen] = useState(initialRollen)
  const [medewerkerTypes, setMedewerkerTypes] = useState(initialTypes)
  const [expandedRol, setExpandedRol] = useState<string | null>('ontwikkelaar')
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'rollen' | 'medewerkers' | 'vakmannen'>('rollen')

  async function saveRolRechten(rolId: string, rechten: Record<string, boolean>) {
    setSaving(rolId)
    await fetch('/api/admin/update-rol-rechten', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rolId, rechten }),
    })
    setParkRollen(prev => prev.map(r => r.id === rolId ? { ...r, rechten } : r))
    setSaving(null)
  }

  async function saveVakmanRechten(catId: string, rechten: Record<string, boolean>) {
    setSaving(catId)
    await fetch('/api/admin/update-vakman-rechten', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: catId, rechten }),
    })
    setVakmanCats(prev => prev.map(c => c.id === catId ? { ...c, rechten } : c))
    setSaving(null)
  }

  async function saveMedewerkerType(typeId: string, rechten: Record<string, boolean>) {
    setSaving(typeId)
    await fetch('/api/admin/update-medewerker-type', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: typeId, rechten }),
    })
    setMedewerkerTypes(prev => prev.map(t => t.id === typeId ? { ...t, rechten } : t))
    setSaving(null)
  }

  const park = parks.find(p => p.id === selectedParkId)
  const rollen = parkRollen.filter(r => r.park_id === selectedParkId)
  const types = medewerkerTypes.filter(t => t.park_id === selectedParkId)
  const [vakmanCats, setVakmanCats] = useState(vakmanCategorieen)
  const vakmanTypes = vakmanCats.filter(c => c.park_id === selectedParkId)

  function RechtenGrid({ rechtenMap, huidigeRechten, onToggle, kleur }: {
    rechtenMap: Record<string, string>
    huidigeRechten: Record<string, boolean>
    onToggle: (key: string) => void
    kleur: string
  }) {
    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {Object.entries(rechtenMap).map(([key, lbl]) => {
          const isOn = huidigeRechten?.[key] ?? false
          return (
            <button key={key} onClick={() => onToggle(key)}
              className={"flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-all text-left border " +
                (isOn
                  ? 'border-transparent text-white'
                  : 'bg-[#f5f5f7] border-black/[0.05] text-[#6e6e73] hover:bg-[#e8e8ed]')}
              style={isOn ? { background: kleur + '18', color: kleur, borderColor: kleur + '30' } : {}}>
              <div className={"w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 " +
                (isOn ? '' : 'bg-[#d1d1d6]')}
                style={isOn ? { background: kleur } : {}}>
                {isOn && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              {lbl}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      {/* Header */}
      <div className="bg-white border-b border-black/[0.06] px-8 py-4 flex items-center gap-4">
        <a href="/admin" className="flex items-center gap-1.5 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-all">
          <ChevronLeft size={14} /> Admin
        </a>
        <div className="w-px h-4 bg-black/[0.1]" />
        <div className="text-[15px] font-bold">Rollen & Rechten</div>
        <div className="ml-auto">
          <select value={selectedParkId} onChange={e => setSelectedParkId(e.target.value)}
            className="bg-[#f5f5f7] border border-black/[0.05] rounded-[10px] px-3 py-2 text-[13px] outline-none focus:border-[#0071e3]">
            {parks.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.organisaties ? ' — ' + p.organisaties.naam : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[900px]">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-full p-1 w-fit shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] mb-6">
          {[
            { key: 'rollen', label: 'Hoofdrollen' },
            { key: 'medewerkers', label: 'Medewerker types' },
            { key: 'vakmannen', label: 'Vakman types' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
              className={"px-4 py-1.5 rounded-full text-[13px] font-medium transition-all " +
                (activeTab === key ? 'bg-[#1d1d1f] text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]')}>
              {label}
            </button>
          ))}
        </div>

        {/* Hoofdrollen */}
        {activeTab === 'rollen' && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-[#6e6e73] mb-2">
              Hoofdrollen gelden voor alle gebruikers met die rol. Medewerker types en vakman types kunnen extra rechten hebben.
            </p>
            {rollen.map(rol => {
              const isOpen = expandedRol === rol.rol
              return (
                <div key={rol.id} className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
                  <button onClick={() => setExpandedRol(isOpen ? null : rol.rol)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f9f9f9] transition-all">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background: rol.kleur}} />
                    <div className="flex-1 text-left">
                      <div className="text-[14px] font-bold">{rol.label}</div>
                      <div className="text-[11px] text-[#6e6e73] mt-0.5">
                        {Object.values(rol.rechten).filter(Boolean).length} van {Object.keys(ROL_RECHTEN).length} rechten actief
                        {rol.rol === 'vakman' && ' · Mobiele app'}
                        {rol.rol === 'koper' && ' · Eigen portaal (binnenkort)'}
                      </div>
                    </div>
                    {saving === rol.id && <span className="text-[11px] text-[#0071e3]">Opslaan...</span>}
                    {isOpen ? <ChevronUp size={16} className="text-[#6e6e73]" /> : <ChevronDown size={16} className="text-[#6e6e73]" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-black/[0.05]">
                      <RechtenGrid
                        rechtenMap={ROL_RECHTEN}
                        huidigeRechten={rol.rechten}
                        kleur={rol.kleur}
                        onToggle={key => saveRolRechten(rol.id, { ...rol.rechten, [key]: !rol.rechten?.[key] })}
                      />
                      {rol.rol === 'vakman' && (
                        <div className="mt-3 p-3 rounded-[10px] text-[12px]" style={{background: rol.kleur + '10', color: rol.kleur}}>
                          Vakmannen worden na inloggen doorgestuurd naar de mobiele vakman-interface op /vakman. Stel per vakman type extra rechten in via het tabblad Vakman types.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Medewerker types */}
        {activeTab === 'medewerkers' && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-[#6e6e73] mb-2">
              Per medewerker type kun je extra rechten instellen bovenop de basisrechten van de Medewerker rol.
            </p>
            {types.length === 0 && (
              <div className="bg-white rounded-[16px] p-8 text-center text-[13px] text-[#aeaeb2]">
                Geen medewerker types voor dit park. Voeg ze toe via Instellingen.
              </div>
            )}
            {types.map(type => {
              const isOpen = expandedType === type.id
              return (
                <div key={type.id} className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
                  <button onClick={() => setExpandedType(isOpen ? null : type.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f9f9f9] transition-all">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#30d158]" />
                    <div className="flex-1 text-left">
                      <div className="text-[14px] font-bold">{type.naam}</div>
                      <div className="text-[11px] text-[#6e6e73] mt-0.5">
                        {Object.values(type.rechten).filter(Boolean).length} extra rechten actief
                      </div>
                    </div>
                    {saving === type.id && <span className="text-[11px] text-[#0071e3]">Opslaan...</span>}
                    {isOpen ? <ChevronUp size={16} className="text-[#6e6e73]" /> : <ChevronDown size={16} className="text-[#6e6e73]" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-black/[0.05]">
                      <RechtenGrid
                        rechtenMap={MEDEWERKER_RECHTEN}
                        huidigeRechten={type.rechten}
                        kleur="#30d158"
                        onToggle={key => saveMedewerkerType(type.id, { ...type.rechten, [key]: !type.rechten?.[key] })}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Vakman types */}
        {activeTab === 'vakmannen' && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-[#6e6e73] mb-2">
              Per vakman type stel je in welke acties en informatie zij kunnen zien in de vakman-app.
            </p>
            {vakmanTypes.length === 0 && (
              <div className="bg-white rounded-[16px] p-8 text-center text-[13px] text-[#aeaeb2]">
                Geen vakman types voor dit park. Voeg ze toe via Instellingen.
              </div>
            )}
            {vakmanTypes.map(cat => {
              const isOpen = expandedType === ('vak-' + cat.id)
              const catRechten: Record<string, boolean> = cat.rechten ?? {
                taken_inzien: true, taken_gereedmelden: true,
                opmerkingen_inzien: true, chat: true,
                foto_uploaden: false, materialen_inzien: false,
              }
              return (
                <div key={cat.id} className="bg-white rounded-[16px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
                  <button onClick={() => setExpandedType(isOpen ? null : ('vak-' + cat.id))}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f9f9f9] transition-all">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#ff9f0a]" />
                    <div className="flex-1 text-left">
                      <div className="text-[14px] font-bold">{cat.naam}</div>
                      <div className="text-[11px] text-[#6e6e73] mt-0.5">Vakman type · mobiele app</div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-[#6e6e73]" /> : <ChevronDown size={16} className="text-[#6e6e73]" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-black/[0.05]">
                      <RechtenGrid
                        rechtenMap={VAKMAN_RECHTEN}
                        huidigeRechten={catRechten}
                        kleur="#ff9f0a"
                        onToggle={key => saveVakmanRechten(cat.id, { ...catRechten, [key]: !catRechten[key] })}
                      />
                      {saving === cat.id && <div className="mt-2 text-[11px] text-[#0071e3]">Opslaan...</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
