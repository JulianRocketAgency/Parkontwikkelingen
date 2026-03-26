import { createBrowserClient } from '@supabase/ssr'
import type { Kavel, Owner, Park, KavelStatus, KavelOpties } from '@/types'

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface Dependency {
  id: string
  park_id: string
  type: 'optie_optie' | 'status_optie'
  trigger_key: string
  requires_key: string
}

// ── Parks ─────────────────────────────────────────────────────
export async function getPark(id: string): Promise<Park | null> {
  const supabase = createClient()
  const { data } = await supabase.from('parks').select('*').eq('id', id).single()
  return data
}

export async function updatePark(id: string, updates: Partial<Park>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('parks').update(updates).eq('id', id)
  if (error) throw error
}

// ── Kavels ────────────────────────────────────────────────────
export async function getKavels(parkId: string): Promise<Kavel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kavels')
    .select('*, owner:owners(*), status:kavel_status(*), opties:kavel_opties(*)')
    .eq('park_id', parkId)
    .order('number', { ascending: true })
  if (error) { console.error('getKavels:', error); return [] }
  return (data as Kavel[]) ?? []
}

export async function createKavel(kavel: {
  park_id: string
  number: number
  fase: number
  type: string
  uitvoering: string
}): Promise<Kavel | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kavels')
    .insert(kavel)
    .select()
    .single()
  if (error) throw error

  // Auto-create status and opties rows
  await supabase.from('kavel_status').insert({ kavel_id: data.id })
  await supabase.from('kavel_opties').insert({ kavel_id: data.id })

  return data
}

export async function updateKavel(
  id: string,
  updates: Partial<Omit<Kavel, 'id' | 'created_at' | 'owner' | 'status' | 'opties'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('kavels').update(updates).eq('id', id)
  if (error) throw error
}

export async function updateKavelPolygon(
  kavelId: string,
  polygon: { x: number; y: number }[] | null
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('kavels').update({ polygon }).eq('id', kavelId)
  if (error) throw error
}

// ── Status ────────────────────────────────────────────────────
export async function upsertKavelStatus(
  kavelId: string,
  updates: Partial<Omit<KavelStatus, 'id' | 'kavel_id' | 'updated_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('kavel_status')
    .upsert({ kavel_id: kavelId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'kavel_id' })
  if (error) throw error
}

// ── Opties ────────────────────────────────────────────────────
export async function upsertKavelOpties(
  kavelId: string,
  updates: Partial<Omit<KavelOpties, 'id' | 'kavel_id' | 'updated_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('kavel_opties')
    .upsert({ kavel_id: kavelId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'kavel_id' })
  if (error) throw error
}

// ── Owners ────────────────────────────────────────────────────
export async function getOwners(parkId: string): Promise<Owner[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('park_id', parkId)
    .order('name', { ascending: true })
  if (error) { console.error('getOwners:', error); return [] }
  return data ?? []
}

export async function createOwner(
  owner: Omit<Owner, 'id' | 'created_at'>
): Promise<Owner | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('owners').insert(owner).select().single()
  if (error) throw error
  return data
}

export async function updateOwner(
  id: string,
  updates: Partial<Omit<Owner, 'id' | 'created_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('owners').update(updates).eq('id', id)
  if (error) throw error
}

// ── Dependencies ──────────────────────────────────────────────
export async function getDependencies(parkId: string): Promise<Dependency[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('dependencies')
    .select('*')
    .eq('park_id', parkId)
  if (error) { console.error('getDependencies:', error); return [] }
  return data ?? []
}

export async function createDependency(dep: Omit<Dependency, 'id'>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('dependencies').insert(dep)
  if (error) throw error
}

export async function deleteDependency(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('dependencies').delete().eq('id', id)
  if (error) throw error
}

// ── Map image ─────────────────────────────────────────────────
export async function uploadMapImage(parkId: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${parkId}/plattegrond.${file.name.split('.').pop()}`
  const { error } = await supabase.storage
    .from('park-maps')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('park-maps').getPublicUrl(path)
  await supabase.from('parks').update({ map_image: publicUrl }).eq('id', parkId)
  return publicUrl
}

// ── Park maps (per fase) ──────────────────────────────────────
export interface ParkMap {
  id: string
  park_id: string
  fase: number | null
  map_url: string
}

export async function getParkMaps(parkId: string): Promise<ParkMap[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('park_maps')
    .select('*')
    .eq('park_id', parkId)
  if (error) { console.error('getParkMaps:', error); return [] }
  return data ?? []
}

export async function upsertParkMap(parkId: string, fase: number | null, file: File): Promise<string> {
  const supabase = createClient()
  const faseStr = fase === null ? 'overall' : `fase-${fase}`
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  // Unique filename to bust CDN cache
  const timestamp = Date.now()
  const path = `${parkId}/${faseStr}-${timestamp}.${ext}`

  // Delete old file(s) for this fase
  const { data: existing } = await supabase.storage
    .from('park-maps')
    .list(parkId)
  if (existing) {
    const oldFiles = existing
      .filter(f => f.name.startsWith(faseStr + '-') || f.name.startsWith(faseStr + '.'))
      .map(f => `${parkId}/${f.name}`)
    if (oldFiles.length > 0) {
      await supabase.storage.from('park-maps').remove(oldFiles)
    }
  }

  const { error: uploadError } = await supabase.storage
    .from('park-maps')
    .upload(path, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('park-maps').getPublicUrl(path)

  await supabase.from('park_maps').upsert(
    { park_id: parkId, fase, map_url: publicUrl },
    { onConflict: 'park_id,fase' }
  )
  if (fase === null) {
    await supabase.from('parks').update({ map_image: publicUrl }).eq('id', parkId)
  }
  return publicUrl
}

export async function deleteParkMap(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('park_maps').delete().eq('id', id)
  if (error) throw error
}

// ── Kavel polygons per map ────────────────────────────────────
export interface KavelPolygon {
  id: string
  kavel_id: string
  map_id: string
  polygon: { x: number; y: number }[]
}

export async function getPolygonsForMap(mapId: string): Promise<KavelPolygon[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kavel_polygons')
    .select('*')
    .eq('map_id', mapId)
  if (error) { console.error('getPolygonsForMap:', error); return [] }
  return data ?? []
}

export async function upsertKavelPolygonForMap(
  kavelId: string,
  mapId: string,
  polygon: { x: number; y: number }[] | null
): Promise<void> {
  const supabase = createClient()
  if (!polygon) {
    await supabase.from('kavel_polygons').delete()
      .eq('kavel_id', kavelId).eq('map_id', mapId)
    return
  }
  const { error } = await supabase.from('kavel_polygons')
    .upsert({ kavel_id: kavelId, map_id: mapId, polygon }, { onConflict: 'kavel_id,map_id' })
  if (error) throw error
}

// ── Fase status ───────────────────────────────────────────────
export interface FaseStatus {
  id: string
  park_id: string
  fase: number
  gestart_at: string | null
}

export async function getFaseStatussen(parkId: string): Promise<FaseStatus[]> {
  const supabase = createClient()
  const { data } = await supabase.from('fase_status').select('*').eq('park_id', parkId)
  return data ?? []
}

export async function startFase(parkId: string, fase: number): Promise<void> {
  const supabase = createClient()
  await supabase.from('fase_status').upsert(
    { park_id: parkId, fase, gestart_at: new Date().toISOString() },
    { onConflict: 'park_id,fase' }
  )
}

// ── Kavel owners (meerdere per kavel) ─────────────────────────
export interface KavelOwner {
  id: string
  kavel_id: string
  owner_id: string
  rol: string
  owner?: Owner
}

export async function getKavelOwners(kavelId: string): Promise<KavelOwner[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('kavel_owners')
    .select('*, owner:owners(*)')
    .eq('kavel_id', kavelId)
  return data ?? []
}

export async function addKavelOwner(kavelId: string, ownerId: string, rol = 'eigenaar'): Promise<void> {
  const supabase = createClient()
  await supabase.from('kavel_owners').upsert(
    { kavel_id: kavelId, owner_id: ownerId, rol },
    { onConflict: 'kavel_id,owner_id' }
  )
}

export async function removeKavelOwner(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('kavel_owners').delete().eq('id', id)
}

// ── Termijn config ────────────────────────────────────────────
export interface TermijnConfig {
  id: string
  park_id: string
  termijn_key: string
  naam: string
  trigger: string
  actief: boolean
  volgorde: number
}

export async function getTermijnConfig(parkId: string): Promise<TermijnConfig[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('termijn_config')
    .select('*')
    .eq('park_id', parkId)
    .order('volgorde')
  return data ?? []
}

export async function updateTermijnConfig(id: string, updates: Partial<TermijnConfig>): Promise<void> {
  const supabase = createClient()
  await supabase.from('termijn_config').update(updates).eq('id', id)
}

// ── Betalingstermijnen (event-based) ──────────────────────────
export interface Betalingstermijn {
  id: string
  owner_id: string
  kavel_id: string
  termijn_key: string
  naam: string
  status: 'verwacht' | 'actief' | 'voldaan'
  triggered_at: string | null
  created_at: string
}

export async function getBetalingen(parkId: string): Promise<Betalingstermijn[]> {
  const supabase = createClient()
  const { data: owners } = await supabase.from('owners').select('id').eq('park_id', parkId)
  if (!owners?.length) return []
  const { data } = await supabase
    .from('betalingstermijnen')
    .select('*')
    .in('owner_id', owners.map(o => o.id))
    .order('created_at')
  return data ?? []
}

export async function triggerBetalingstermijn(
  kavelId: string,
  ownerId: string,
  termijnKey: string,
  naam: string
): Promise<void> {
  const supabase = createClient()
  // Check if already exists
  const { data: existing } = await supabase
    .from('betalingstermijnen')
    .select('id')
    .eq('kavel_id', kavelId)
    .eq('termijn_key', termijnKey)
    .single()
  if (existing) return // already triggered

  await supabase.from('betalingstermijnen').insert({
    kavel_id: kavelId,
    owner_id: ownerId,
    termijn_key: termijnKey,
    naam,
    status: 'actief',
    triggered_at: new Date().toISOString(),
  })
}

export async function updateBetaling(id: string, updates: Partial<Betalingstermijn>): Promise<void> {
  const supabase = createClient()
  await supabase.from('betalingstermijnen').update(updates).eq('id', id)
}

export async function deleteBetaling(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('betalingstermijnen').delete().eq('id', id)
}

// ── Verkoop: kavel op verkocht zetten + eigenaar koppelen ─────
export async function verkoopKavel(
  kavelId: string,
  ownerId: string,
  parkId: string
): Promise<void> {
  const supabase = createClient()
  // Mark as verkocht
  await supabase.from('kavels').update({ verkocht: true, owner_id: ownerId }).eq('id', kavelId)
  // Add to kavel_owners
  await supabase.from('kavel_owners').upsert(
    { kavel_id: kavelId, owner_id: ownerId, rol: 'eigenaar' },
    { onConflict: 'kavel_id,owner_id' }
  )
  // Get termijn config for eerste_termijn
  const { data: config } = await supabase
    .from('termijn_config')
    .select('*')
    .eq('park_id', parkId)
    .eq('termijn_key', 'eerste_termijn')
    .single()
  if (config) {
    await triggerBetalingstermijn(kavelId, ownerId, 'eerste_termijn', config.naam)
  }
}

// ── Optie categorieën ─────────────────────────────────────────
export interface OptieCategorie {
  id: string
  park_id: string
  naam: string
  volgorde: number
}

export async function getOptieCategorieen(parkId: string): Promise<OptieCategorie[]> {
  const supabase = createClient()
  const { data } = await supabase.from('optie_categorieen').select('*').eq('park_id', parkId).order('volgorde')
  return data ?? []
}

export async function createOptieCategorie(parkId: string, naam: string): Promise<OptieCategorie | null> {
  const supabase = createClient()
  const { data } = await supabase.from('optie_categorieen').insert({ park_id: parkId, naam }).select().single()
  return data
}

export async function deleteOptieCategorie(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('optie_categorieen').delete().eq('id', id)
}

// ── Vakman categorieën ────────────────────────────────────────
export interface VakmanCategorie {
  id: string
  park_id: string
  naam: string
  volgorde: number
}

export async function getVakmanCategorieen(parkId: string): Promise<VakmanCategorie[]> {
  const supabase = createClient()
  const { data } = await supabase.from('vakman_categorieen').select('*').eq('park_id', parkId).order('volgorde')
  return data ?? []
}

export async function createVakmanCategorie(parkId: string, naam: string): Promise<VakmanCategorie | null> {
  const supabase = createClient()
  const { data } = await supabase.from('vakman_categorieen').insert({ park_id: parkId, naam }).select().single()
  return data
}

export async function deleteVakmanCategorie(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('vakman_categorieen').delete().eq('id', id)
}

// ── Optie-vakman koppelingen ──────────────────────────────────
export interface OptieVakmanKoppeling {
  id: string
  park_id: string
  optie_key: string
  vakman_categorie_id: string
}

export async function getOptieVakmanKoppelingen(parkId: string): Promise<OptieVakmanKoppeling[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('optie_vakman_koppelingen')
    .select('*')
    .eq('park_id', parkId)
  return data ?? []
}

export async function upsertOptieVakmanKoppeling(parkId: string, optieKey: string, vakmanCategorieId: string): Promise<void> {
  const supabase = createClient()
  if (!vakmanCategorieId) {
    await supabase.from('optie_vakman_koppelingen').delete().eq('park_id', parkId).eq('optie_key', optieKey)
    return
  }
  await supabase.from('optie_vakman_koppelingen').upsert(
    { park_id: parkId, optie_key: optieKey, vakman_categorie_id: vakmanCategorieId },
    { onConflict: 'park_id,optie_key' }
  )
}
