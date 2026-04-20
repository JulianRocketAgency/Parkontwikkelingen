'use client'
import { useState } from 'react'
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, MapPin, MessageSquare, Home } from 'lucide-react'

interface Taak {
  id: string
  titel: string
  omschrijving: string | null
  optie_key: string | null
  status: string
  prioriteit: string
  deadline: string | null
  gereed_op: string | null
  opmerking_vakman: string | null
  geblokkeerd: boolean | null
  blokkeer_reden: string | null
  kavels: { number: number; type: string; uitvoering: string; fase: number } | null
  vakman_categorieen: { naam: string } | null
}

interface Profile {
  id: string
  naam: string | null
  role: string
  avatar_color: string | null
  vakman_categorieen: { naam: string } | null
}

interface Props {
  profile: Profile
  taken: Taak[]
  parkNaam: string
}

const PRIORITEIT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  spoed:   { label: 'Spoed',   color: '#ff3b30', bg: 'rgba(255,59,48,0.10)'   },
  hoog:    { label: 'Hoog',    color: '#ff9f0a', bg: 'rgba(255,159,10,0.10)'  },
  normaal: { label: 'Normaal', color: '#0071e3', bg: 'rgba(0,113,227,0.08)'   },
  laag:    { label: 'Laag',    color: '#6e6e73', bg: 'rgba(174,174,178,0.12)' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  open:          { label: 'Open',         icon: Clock,        color: '#6e6e73' },
  in_uitvoering: { label: 'Bezig',        icon: AlertCircle,  color: '#ff9f0a' },
  gereed:        { label: 'Gereed',       icon: CheckCircle,  color: '#30d158' },
}

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('')
}

export function VakmanClient({ profile, taken: initialTaken, parkNaam }: Props) {
  const [taken, setTaken] = useState(initialTaken)
  const [filter, setFilter] = useState<'open' | 'in_uitvoering' | 'gereed' | 'geblokkeerd'>('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [opmerking, setOpmerking] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const naam = profile.naam ?? 'Vakman'
  const categorie = profile.vakman_categorieen?.naam ?? ''

  const geblokkeerd = taken.filter(t => t.geblokkeerd === true && t.status === 'open')
  const gefilterd = filter === 'geblokkeerd'
    ? geblokkeerd
    : taken.filter(t => t.status === filter && !t.geblokkeerd)
  const openCount = taken.filter(t => t.status === 'open' && !t.geblokkeerd).length
  const bezigCount = taken.filter(t => t.status === 'in_uitvoering').length
  const geblokkeerdCount = geblokkeerd.length

  async function updateStatus(taakId: string, status: string) {
    setSaving(taakId)
    try {
      const res = await fetch('/api/taken/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taakId, status, opmerking_vakman: opmerking[taakId] ?? null }),
      })
      if (!res.ok) throw new Error('Fout')
      setTaken(prev => prev.map(t => t.id === taakId ? { ...t, status, opmerking_vakman: opmerking[taakId] ?? t.opmerking_vakman } : t))
      if (status === 'gereed') setExpanded(null)
    } catch {
      alert('Kon status niet bijwerken')
    } finally { setSaving(null) }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]" style={{fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      {/* Header */}
      <div className="bg-white border-b border-black/[0.08] px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
            style={{background: profile.avatar_color ?? '#0071e3'}}>
            {initials(naam)}
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-[-0.3px]">{naam}</div>
            <div className="text-[13px] text-[#6e6e73]">{categorie} · {parkNaam}</div>
          </div>
          <a href="/dashboard" className="ml-auto p-2 rounded-full bg-[#f2f2f7]">
            <Home size={16} className="text-[#6e6e73]" />
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Open', count: openCount, color: '#ff9f0a' },
            { label: 'Bezig', count: bezigCount, color: '#0071e3' },
            { label: 'Gereed', count: taken.filter(t=>t.status==='gereed').length, color: '#30d158' },
            { label: 'Wacht', count: geblokkeerdCount, color: '#aeaeb2' },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-[#f2f2f7] rounded-[12px] px-3 py-2 text-center">
              <div className="text-[20px] font-bold" style={{color}}>{count}</div>
              <div className="text-[11px] text-[#6e6e73]">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-[#f2f2f7] rounded-[10px] p-1">
          {(['open', 'in_uitvoering', 'gereed', 'geblokkeerd'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={"flex-1 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all " +
                (filter === s ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]')}>
              {s === 'geblokkeerd' ? 'Wacht' : STATUS_CONFIG[s].label}
              {s === 'open' && openCount > 0 && <span className="ml-1 text-[10px] text-[#ff9f0a]">{openCount}</span>}
              {s === 'geblokkeerd' && geblokkeerdCount > 0 && <span className="ml-1 text-[10px] text-[#aeaeb2]">{geblokkeerdCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Taken lijst */}
      <div className="px-4 py-4 flex flex-col gap-3 max-w-[600px] mx-auto">
        {gefilterd.length === 0 && (
          <div className="text-center py-12 text-[#aeaeb2]">
            <CheckCircle size={36} className="mx-auto mb-3 opacity-30" />
            <div className="text-[15px] font-medium">Geen taken</div>
            <div className="text-[13px] mt-1">
              {filter === 'gereed' ? 'Nog niets afgerond' : 'Alles is bijgewerkt'}
            </div>
          </div>
        )}

        {gefilterd.map(taak => {
          const prio = PRIORITEIT_CONFIG[taak.prioriteit] ?? PRIORITEIT_CONFIG.normaal
          const isExpanded = expanded === taak.id
          const StatusIcon = STATUS_CONFIG[taak.status]?.icon ?? Clock

          return (
            <div key={taak.id} className="bg-white rounded-[16px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
              {/* Prioriteit balk */}
              <div className="h-1" style={{background: prio.color}} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{background: prio.bg, color: prio.color}}>
                        {prio.label}
                      </span>
                      {taak.deadline && (
                        <span className="text-[11px] text-[#6e6e73] flex items-center gap-1">
                          <Clock size={10} /> {new Date(taak.deadline).toLocaleDateString('nl-NL', {day:'numeric', month:'short'})}
                        </span>
                      )}
                    </div>
                    <div className="text-[15px] font-semibold leading-tight">{taak.titel}</div>
                  </div>
                  <button onClick={() => setExpanded(isExpanded ? null : taak.id)}
                    className="w-8 h-8 rounded-full bg-[#f2f2f7] flex items-center justify-center flex-shrink-0">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Geblokkeerd banner */}
                {taak.geblokkeerd && taak.blokkeer_reden && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(174,174,178,0.12)] rounded-[8px] mb-2 text-[12px] text-[#6e6e73]">
                    <span>⏳</span>
                    <span>{taak.blokkeer_reden}</span>
                  </div>
                )}

                {/* Kavel info */}
                {taak.kavels && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#6e6e73] mb-2">
                    <MapPin size={11} />
                    <span>Kavel #{taak.kavels.number} · {taak.kavels.type} · Fase {taak.kavels.fase}</span>
                  </div>
                )}

                {/* Uitklap */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-black/[0.06]">
                    {taak.omschrijving && (
                      <div className="text-[13px] text-[#3a3a3c] mb-3 leading-relaxed">{taak.omschrijving}</div>
                    )}

                    {taak.opmerking_vakman && (
                      <div className="flex gap-2 bg-[rgba(0,113,227,0.06)] rounded-[10px] p-3 mb-3">
                        <MessageSquare size={13} className="text-[#0071e3] flex-shrink-0 mt-0.5" />
                        <div className="text-[12px] text-[#3a3a3c]">{taak.opmerking_vakman}</div>
                      </div>
                    )}

                    {taak.status !== 'gereed' && (
                      <>
                        <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">
                          Opmerking (optioneel)
                        </label>
                        <textarea
                          value={opmerking[taak.id] ?? ''}
                          onChange={e => setOpmerking(p => ({...p, [taak.id]: e.target.value}))}
                          placeholder="Bijv. materialen besteld, wachten op leverancier..."
                          rows={2}
                          className="w-full bg-[#f2f2f7] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#0071e3] resize-none mb-3"
                        />
                        <div className="flex gap-2">
                          {taak.status === 'open' && (
                            <button
                              onClick={() => updateStatus(taak.id, 'in_uitvoering')}
                              disabled={saving === taak.id}
                              className="flex-1 py-2.5 rounded-[10px] bg-[rgba(255,159,10,0.12)] text-[#a05a00] text-[13px] font-semibold disabled:opacity-50">
                              {saving === taak.id ? '...'  : 'Starten'}
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(taak.id, 'gereed')}
                            disabled={saving === taak.id}
                            className="flex-1 py-2.5 rounded-[10px] bg-[rgba(48,209,88,0.12)] text-[#1a7a32] text-[13px] font-semibold disabled:opacity-50">
                            {saving === taak.id ? 'Opslaan...' : 'Gereed melden'}
                          </button>
                        </div>
                      </>
                    )}

                    {taak.status === 'gereed' && taak.gereed_op && (
                      <div className="text-[12px] text-[#30d158] flex items-center gap-1.5">
                        <CheckCircle size={13} />
                        Gereed op {new Date(taak.gereed_op).toLocaleDateString('nl-NL')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
