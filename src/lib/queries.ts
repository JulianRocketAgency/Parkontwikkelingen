import { createClient } from './supabase/client'
import type { Kavel, Owner, Park, KavelStatus, KavelOpties } from '@/types'

// ── Parks ─────────────────────────────────────────────────────
export async function getPark(id: string): Promise<Park | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('parks')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

// ── Kavels ────────────────────────────────────────────────────
export async function getKavels(parkId: string): Promise<Kavel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kavels')
    .select(`
      *,
      owner:owners(*),
      status:kavel_status(*),
      opties:kavel_opties(*)
    `)
    .eq('park_id', parkId)
    .order('number', { ascending: true })

  if (error) { console.error('getKavels:', error); return [] }
  return (data as Kavel[]) ?? []
}

export async function updateKavel(
  id: string,
  updates: Partial<Omit<Kavel, 'id' | 'created_at' | 'owner' | 'status' | 'opties'>>
): Promise<void> {
  await fetch('/api/kavel/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, updates }),
  })
}

export async function updateKavelPolygon(
  kavelId: string,
  polygon: { x: number; y: number }[] | null
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('kavels')
    .update({ polygon })
    .eq('id', kavelId)
  if (error) throw error
}

// ── Status ────────────────────────────────────────────────────
export async function upsertKavelStatus(
  kavelId: string,
  updates: Partial<Omit<KavelStatus, 'id' | 'kavel_id' | 'updated_at'>>
): Promise<void> {
  const res = await fetch('/api/kavel/update-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kavel_id: kavelId, updates }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Fout bij opslaan status')
  }
}

// ── Opties ────────────────────────────────────────────────────
export async function upsertKavelOpties(
  kavelId: string,
  updates: Partial<Omit<KavelOpties, 'id' | 'kavel_id' | 'updated_at'>>
): Promise<void> {
  const res = await fetch('/api/kavel/update-opties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kavel_id: kavelId, updates }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Fout bij opslaan opties')
  }
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
  const { data, error } = await supabase
    .from('owners')
    .insert(owner)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateOwner(
  id: string,
  updates: Partial<Omit<Owner, 'id' | 'created_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('owners')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

// ── Map image ─────────────────────────────────────────────────
export async function uploadMapImage(
  parkId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const path = `${parkId}/plattegrond.${file.name.split('.').pop()}`
  const { error } = await supabase.storage
    .from('park-maps')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('park-maps')
    .getPublicUrl(path)

  // Save URL to park record
  await supabase.from('parks').update({ map_image: publicUrl }).eq('id', parkId)
  return publicUrl
}

// ── updatePark ────────────────────────────────────────────────
export async function updatePark(id: string, updates: Partial<Park>): Promise<void> {
  const supabase = createClient()
  await supabase.from('parks').update(updates).eq('id', id)
}

// ── createKavel ───────────────────────────────────────────────
export async function createKavel(data: {
  park_id: string; number: number; fase: number; type: string; uitvoering: string
}): Promise<Kavel | null> {
  const res = await fetch('/api/kavel/aanmaken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Fout bij aanmaken kavel')
  return json.kavel
}

// ── updateKavel ───────────────────────────────────────────────
export async function verkoopKavel(kavelId: string, ownerId: string, parkId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('kavels').update({ verkocht: true, owner_id: ownerId }).eq('id', kavelId)
  await supabase.from('kavel_owners').upsert({ kavel_id: kavelId, owner_id: ownerId, rol: 'eigenaar' }, { onConflict: 'kavel_id,owner_id' })
  const { data: config } = await supabase.from('termijn_config').select('*').eq('park_id', parkId).eq('termijn_key', 'eerste_termijn').single()
  if (config) await triggerBetalingstermijn(kavelId, ownerId, 'eerste_termijn', config.naam)
}

// ── startFase ────────────────────────────────────────────────
export async function startFase(parkId: string, fase: number): Promise<void> {
  const supabase = createClient()
  await supabase.from('fase_status').upsert({ park_id: parkId, fase, gestart_at: new Date().toISOString() }, { onConflict: 'park_id,fase' })
}

// ── getFaseStatussen ──────────────────────────────────────────
export interface FaseStatus {
  id: string; park_id: string; fase: number; gestart_at: string
}
export async function getFaseStatussen(parkId: string): Promise<FaseStatus[]> {
  const supabase = createClient()
  const { data } = await supabase.from('fase_status').select('*').eq('park_id', parkId)
  return data ?? []
}

// ── ParkMap ───────────────────────────────────────────────────
export interface ParkMap {
  id: string; park_id: string; fase: number | null; map_url: string
}
export interface KavelPolygon {
  id: string; kavel_id: string; map_id: string; polygon: { x: number; y: number }[]
}

export async function getParkMaps(parkId: string): Promise<ParkMap[]> {
  const supabase = createClient()
  const { data } = await supabase.from('park_maps').select('*').eq('park_id', parkId)
  return data ?? []
}

export async function upsertParkMap(parkId: string, fase: number | null, file: File): Promise<void> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${parkId}/${fase ?? 'overall'}.${ext}`
  await supabase.storage.from('park-maps').upload(path, file, { upsert: true })
  const { data: urlData } = supabase.storage.from('park-maps').getPublicUrl(path)
  await supabase.from('park_maps').upsert({ park_id: parkId, fase, map_url: urlData.publicUrl }, { onConflict: 'park_id,fase' })
}

export async function deleteParkMap(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('park_maps').delete().eq('id', id)
}

export async function getPolygonsForMap(mapId: string): Promise<KavelPolygon[]> {
  const supabase = createClient()
  const { data } = await supabase.from('kavel_polygons').select('*').eq('map_id', mapId)
  return data ?? []
}

export async function upsertKavelPolygonForMap(kavelId: string, mapId: string, polygon: { x: number; y: number }[]): Promise<void> {
  const supabase = createClient()
  await supabase.from('kavel_polygons').upsert({ kavel_id: kavelId, map_id: mapId, polygon }, { onConflict: 'kavel_id,map_id' })
}

// ── Dependencies ──────────────────────────────────────────────
export interface Dependency {
  id: string; park_id: string; type: string; trigger_key: string; requires_key: string
}
export async function getDependencies(parkId: string): Promise<Dependency[]> {
  const supabase = createClient()
  const { data } = await supabase.from('dependencies').select('*').eq('park_id', parkId)
  return data ?? []
}
export async function createDependency(dep: Omit<Dependency, 'id'>): Promise<void> {
  const supabase = createClient()
  await supabase.from('dependencies').insert(dep)
}
export async function deleteDependency(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('dependencies').delete().eq('id', id)
}

// ── Betalingstermijnen ────────────────────────────────────────
export interface Betalingstermijn {
  id: string; owner_id: string; kavel_id: string; termijn_key: string
  naam: string; status: 'verwacht' | 'actief' | 'voldaan'; triggered_at: string | null; created_at: string
}
export async function getBetalingen(parkId: string): Promise<Betalingstermijn[]> {
  const supabase = createClient()
  const { data: owners } = await supabase.from('owners').select('id').eq('park_id', parkId)
  if (!owners?.length) return []
  const { data } = await supabase.from('betalingstermijnen').select('*').in('owner_id', owners.map(o => o.id)).order('created_at')
  return data ?? []
}
export async function triggerBetalingstermijn(kavelId: string, ownerId: string, termijnKey: string, naam: string): Promise<void> {
  const supabase = createClient()
  const { data: existing } = await supabase.from('betalingstermijnen').select('id').eq('kavel_id', kavelId).eq('termijn_key', termijnKey).single()
  if (existing) return
  await supabase.from('betalingstermijnen').insert({ kavel_id: kavelId, owner_id: ownerId, termijn_key: termijnKey, naam, status: 'actief', triggered_at: new Date().toISOString() })
}
export async function updateBetaling(id: string, updates: Partial<Betalingstermijn>): Promise<void> {
  const supabase = createClient()
  await supabase.from('betalingstermijnen').update(updates).eq('id', id)
}
export async function deleteBetaling(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('betalingstermijnen').delete().eq('id', id)
}

// ── TermijnConfig ─────────────────────────────────────────────
export interface TermijnConfig {
  id: string; park_id: string; termijn_key: string; naam: string; trigger: string; actief: boolean; volgorde: number
}
export async function getTermijnConfig(parkId: string): Promise<TermijnConfig[]> {
  const supabase = createClient()
  const { data } = await supabase.from('termijn_config').select('*').eq('park_id', parkId).order('volgorde')
  return data ?? []
}
export async function updateTermijnConfig(id: string, updates: Partial<TermijnConfig>): Promise<void> {
  const supabase = createClient()
  await supabase.from('termijn_config').update(updates).eq('id', id)
}

// ── Kavel owners ──────────────────────────────────────────────
export async function getKavelOwners(kavelId: string) {
  const supabase = createClient()
  const { data } = await supabase.from('kavel_owners').select('*, owners(*)').eq('kavel_id', kavelId)
  return data ?? []
}
export async function addKavelOwner(kavelId: string, ownerId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('kavel_owners').upsert({ kavel_id: kavelId, owner_id: ownerId }, { onConflict: 'kavel_id,owner_id' })
}
export async function removeKavelOwner(kavelId: string, ownerId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('kavel_owners').delete().eq('kavel_id', kavelId).eq('owner_id', ownerId)
}

// ── Vakman categorieën ────────────────────────────────────────
export interface VakmanCategorie {
  id: string; park_id: string; naam: string; volgorde: number
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

// ── Optie categorieën ─────────────────────────────────────────
export interface OptieCategorie {
  id: string; park_id: string; naam: string; volgorde: number
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

// ── Optie-vakman koppelingen ──────────────────────────────────
export interface OptieVakmanKoppeling {
  id: string; park_id: string; optie_key: string; vakman_categorie_id: string
}
export async function getOptieVakmanKoppelingen(parkId: string): Promise<OptieVakmanKoppeling[]> {
  const supabase = createClient()
  const { data } = await supabase.from('optie_vakman_koppelingen').select('*').eq('park_id', parkId)
  return data ?? []
}
export async function upsertOptieVakmanKoppeling(parkId: string, optieKey: string, vakmanCategorieId: string): Promise<void> {
  const supabase = createClient()
  if (!vakmanCategorieId) {
    await supabase.from('optie_vakman_koppelingen').delete().eq('park_id', parkId).eq('optie_key', optieKey)
    return
  }
  await supabase.from('optie_vakman_koppelingen').upsert({ park_id: parkId, optie_key: optieKey, vakman_categorie_id: vakmanCategorieId }, { onConflict: 'park_id,optie_key' })
}

// ── Fase status ───────────────────────────────────────────────
export async function getFaseStatus(parkId: string) {
  const supabase = createClient()
  const { data } = await supabase.from('fase_status').select('*').eq('park_id', parkId)
  return data ?? []
}
