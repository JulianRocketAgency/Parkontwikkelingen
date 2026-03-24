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
  const supabase = createClient()
  const { error } = await supabase
    .from('kavels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
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
  const supabase = createClient()
  const { error } = await supabase
    .from('kavel_status')
    .upsert({
      kavel_id: kavelId,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'kavel_id' })
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
    .upsert({
      kavel_id: kavelId,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'kavel_id' })
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
