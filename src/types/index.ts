// ============================================================
// ParkBouw — TypeScript Types
// ============================================================

export type UserRole = 'developer' | 'projectleider' | 'planner' | 'vakman' | 'koper'

export interface Park {
  id: string
  name: string
  location: string | null
  start_date: string | null
  end_date: string | null
  map_image: string | null
  created_at: string
}

export interface Owner {
  id: string
  park_id: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  color: string
  created_at: string
}

export interface PolygonPoint {
  x: number  // percentage of image width (0-100)
  y: number  // percentage of image height (0-100)
}

export interface Kavel {
  id: string
  park_id: string
  owner_id: string | null
  number: number
  fase: number
  type: string | null
  uitvoering: string | null
  chassis: string | null
  gereed_bouwer: string | null
  transport_date: string | null
  huisdieren: boolean
  notitie: string | null
  polygon: PolygonPoint[] | null
  created_at: string
  // Joined relations
  owner?: Owner | null
  status?: KavelStatus | null
  opties?: KavelOpties | null
}

export interface KavelStatus {
  id: string
  kavel_id: string
  geplaatst: boolean
  aansloten: boolean
  tuin_aangelegd: boolean
  meubels_geplaatst: boolean
  opgestart: boolean
  itt_aangesloten: boolean
  intern_opgeleverd: boolean
  opgeleverd: boolean
  updated_at: string
}

// Each option has: besteld (ordered), gereed (done), notitie (note)
export interface OptieEntry {
  besteld: boolean
  gereed: boolean
  notitie: string
}

export interface KavelOpties {
  id: string
  kavel_id: string
  meubels_besteld: boolean;      meubels_gereed: boolean;      meubels_notitie: string | null
  spec_meubels_besteld: boolean; spec_meubels_gereed: boolean; spec_meubels_notitie: string | null
  tuinaanleg_besteld: boolean;   tuinaanleg_gereed: boolean;   tuinaanleg_notitie: string | null
  marindex_besteld: boolean;     marindex_gereed: boolean;     marindex_notitie: string | null
  madino_besteld: boolean;       madino_gereed: boolean;       madino_notitie: string | null
  airco_besteld: boolean;        airco_gereed: boolean;        airco_notitie: string | null
  pergola_besteld: boolean;      pergola_gereed: boolean;      pergola_notitie: string | null
  hottub_besteld: boolean;       hottub_gereed: boolean;       hottub_notitie: string | null
  horren_besteld: boolean;       horren_gereed: boolean;       horren_notitie: string | null
  loungeset_besteld: boolean;    loungeset_gereed: boolean;    loungeset_notitie: string | null
  zitkuil_besteld: boolean;      zitkuil_gereed: boolean;      zitkuil_notitie: string | null
  berging_besteld: boolean;      berging_gereed: boolean;      berging_notitie: string | null
  zonnepanelen_besteld: boolean; zonnepanelen_gereed: boolean; zonnepanelen_notitie: string | null
  updated_at: string
}

// The canonical list of opties with display label
export const OPTIES: { key: string; label: string }[] = [
  { key: 'meubels',      label: 'Meubels' },
  { key: 'spec_meubels', label: 'Spec. meubels' },
  { key: 'tuinaanleg',   label: 'Tuinaanleg' },
  { key: 'marindex',     label: 'Marindex' },
  { key: 'madino',       label: 'Madino' },
  { key: 'airco',        label: 'Airco' },
  { key: 'pergola',      label: 'Pergola' },
  { key: 'hottub',       label: 'Hottub' },
  { key: 'horren',       label: 'Horren' },
  { key: 'loungeset',    label: 'Loungeset' },
  { key: 'zitkuil',      label: 'Zitkuil' },
  { key: 'berging',      label: 'Berging' },
  { key: 'zonnepanelen', label: 'Zonnepanelen' },
]

// Helper: get besteld/gereed/notitie for a given key from KavelOpties
export function getOptie(opties: KavelOpties | null | undefined, key: string): OptieEntry {
  if (!opties) return { besteld: false, gereed: false, notitie: '' }
  return {
    besteld:  (opties as Record<string, unknown>)[`${key}_besteld`] as boolean ?? false,
    gereed:   (opties as Record<string, unknown>)[`${key}_gereed`] as boolean ?? false,
    notitie:  ((opties as Record<string, unknown>)[`${key}_notitie`] as string | null) ?? '',
  }
}

// ── Derived helpers ──────────────────────────────────────────
export function getKavelPct(status: KavelStatus | null | undefined): number {
  if (!status) return 0
  const vals = [
    status.geplaatst, status.aansloten, status.tuin_aangelegd,
    status.meubels_geplaatst, status.opgestart, status.itt_aangesloten,
    status.intern_opgeleverd, status.opgeleverd,
  ]
  return Math.round(vals.filter(Boolean).length / vals.length * 100)
}

export function isOpgeleverd(k: Kavel): boolean {
  return k.status?.opgeleverd ?? false
}

export function isActief(k: Kavel): boolean {
  return !isOpgeleverd(k) && getKavelPct(k.status) > 0
}

export const STATUS_LABELS: Record<string, string> = {
  geplaatst:         'Geplaatst',
  aansloten:         'Aangesloten',
  tuin_aangelegd:    'Tuin aangelegd',
  meubels_geplaatst: 'Meubels geplaatst',
  opgestart:         'Opgestart',
  itt_aangesloten:   'ITT aangesloten',
  intern_opgeleverd: 'Intern opgeleverd',
  opgeleverd:        'Opgeleverd',
}

// Legacy label map kept for PhaseBlock tag display
export const OPTIE_LABELS: Record<string, string> = Object.fromEntries(
  OPTIES.map(o => [o.key, o.label])
)
