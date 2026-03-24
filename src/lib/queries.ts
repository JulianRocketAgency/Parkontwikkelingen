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
  const path = `${parkId}/${faseStr}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('park-maps')
    .upload(path, file, { upsert: true })
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
