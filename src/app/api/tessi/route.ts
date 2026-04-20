import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

const STATUS_KEYS = ['bouw_gestart','geplaatst','aansloten','tuin_aangelegd','meubels_geplaatst','opgestart','itt_aangesloten','intern_opgeleverd','opgeleverd']
const STATUS_LABELS: Record<string,string> = {
  bouw_gestart:'Bouw gestart', geplaatst:'Geplaatst', aansloten:'Aangesloten',
  tuin_aangelegd:'Tuin aangelegd', meubels_geplaatst:'Meubels geplaatst',
  opgestart:'Opgestart', itt_aangesloten:'ITT aangesloten',
  intern_opgeleverd:'Intern opgeleverd', opgeleverd:'Opgeleverd',
}
const OPTIE_KEYS = ['meubels','spec_meubels','tuinaanleg','marindex','madino','airco','pergola','hottub','horren','loungeset','zitkuil','berging','zonnepanelen']
const OPTIE_LABELS: Record<string,string> = {
  meubels:'Meubels', spec_meubels:'Spec. meubels', tuinaanleg:'Tuinaanleg',
  marindex:'Marindex', madino:'Madino', airco:'Airco', pergola:'Pergola',
  hottub:'Hottub', horren:'Horren', loungeset:'Loungeset', zitkuil:'Zitkuil',
  berging:'Berging', zonnepanelen:'Zonnepanelen',
}
const TERMIJN_VOLGORDE = ['eerste_termijn','doorgang_fase','bouw_gestart','transport','geplaatst','gereed_oplevering','opgeleverd']

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getParkContext() {
  const sb = getSupabase()

  const [k, o, s, ow, bet, prof, fase, tc, deps, vc, vk] = await Promise.all([
    sb.from('kavels').select('*').eq('park_id', PARK_ID),
    sb.from('park_opties').select('*').eq('park_id', PARK_ID).eq('actief', true).order('volgorde'),
    sb.from('kavel_optie_waarden').select('*'),
    sb.from('kavel_status').select('*'),
    sb.from('owners').select('*').eq('park_id', PARK_ID),
    sb.from('betalingstermijnen').select('*'),
    sb.from('profiles').select('*'),
    sb.from('fase_status').select('*').eq('park_id', PARK_ID),
    sb.from('termijn_config').select('*').eq('park_id', PARK_ID).order('volgorde'),
    sb.from('dependencies').select('*').eq('park_id', PARK_ID),
    sb.from('vakman_categorieen').select('*').eq('park_id', PARK_ID),
    sb.from('optie_vakman_koppelingen').select('*, vakman_categorieen(naam)').eq('park_id', PARK_ID),
  ])

  const kavels = k.data ?? []
  const opties = o.data ?? []
  const statussen = s.data ?? []
  const owners = ow.data ?? []
  const betalingen = bet.data ?? []
  const profiles = prof.data ?? []
  const fases = fase.data ?? []
  const termijnConfig = tc.data ?? []
  const dependencies = deps.data ?? []
  const vakmanCat = vc.data ?? []
  const koppelingen = vk.data ?? []

  const lines: string[] = []
  lines.push('=== PARKBOUW DATA ===')
  lines.push('Datum: ' + new Date().toLocaleDateString('nl-NL'))
  lines.push('')

  // Statistieken
  const totaal = kavels.length
  const verkocht = kavels.filter(k => k.verkocht).length
  lines.push('STATISTIEKEN:')
  lines.push('Totaal kavels: ' + totaal + ', Verkocht: ' + verkocht + ', Beschikbaar: ' + (totaal-verkocht))
  lines.push('Openstaande betalingen: ' + betalingen.filter(b => b.status === 'actief').length)
  lines.push('')

  // Per kavel
  lines.push('KAVELS:')
  for (const kavel of kavels) {
    const owner = owners.find(ow => ow.id === kavel.owner_id)
    const st = statussen.find(s => s.kavel_id === kavel.id) ?? {}
    const op = opties.find(o => o.kavel_id === kavel.id) ?? {}

    const bouwGereed = STATUS_KEYS.filter(key => (st as Record<string,unknown>)[key] === true).map(k => STATUS_LABELS[k])
    const gekocht = OPTIE_KEYS.filter(key => (op as Record<string,unknown>)[key+'_gekocht'] === true).map(k => OPTIE_LABELS[k])
    const besteld = OPTIE_KEYS.filter(key => (op as Record<string,unknown>)[key+'_besteld'] === true).map(k => OPTIE_LABELS[k])
    const gereed = OPTIE_KEYS.filter(key => (op as Record<string,unknown>)[key+'_gereed'] === true).map(k => OPTIE_LABELS[k])

    const kBet = betalingen.filter(b => b.kavel_id === kavel.id)
    const maxTermijn = TERMIJN_VOLGORDE.reduce((best, key) => kBet.find(b => b.termijn_key === key) ? key : best, 'geen')

    lines.push('Kavel #' + kavel.number + ' fase=' + kavel.fase + ' type=' + kavel.type + ' uitv=' + kavel.uitvoering)
    lines.push('  verkocht=' + (kavel.verkocht?'ja':'nee') + ' eigenaar=' + (owner?.name ?? 'geen'))
    lines.push('  bouw gereed: ' + (bouwGereed.join(', ') || 'geen'))
    lines.push('  opties gekocht: ' + (gekocht.join(', ') || 'geen'))
    lines.push('  opties besteld: ' + (besteld.join(', ') || 'geen'))
    lines.push('  opties gereed/geplaatst: ' + (gereed.join(', ') || 'geen'))
    lines.push('  betalingstermijn: ' + maxTermijn + ' (' + kBet.length + '/7)')
    if (kavel.notitie) lines.push('  notitie: ' + kavel.notitie)
  }
  lines.push('')

  // Eigenaren
  lines.push('EIGENAREN:')
  for (const owner of owners) {
    const kv = kavels.filter(k => k.owner_id === owner.id)
    const oBet = betalingen.filter(b => kv.some(k => k.id === b.kavel_id))
    lines.push(owner.name + ': kavels=' + kv.map(k=>'#'+k.number).join(',') + ' email=' + (owner.email??'-'))
    lines.push('  betalingen: ' + oBet.filter(b=>b.status==='voldaan').length + '/' + oBet.length + ' voldaan')
  }
  lines.push('')

  // Team
  lines.push('TEAM:')
  for (const p of profiles) {
    lines.push((p.naam ?? p.full_name ?? p.email) + ' rol=' + (p.role??'-'))
  }
  lines.push('')

  // Optie verantwoordelijkheden
  lines.push('OPTIE -> VAKMAN:')
  for (const kop of koppelingen) {
    const cat = (kop as Record<string,unknown>).vakman_categorieen as {naam:string}|null
    lines.push((OPTIE_LABELS[kop.optie_key]??kop.optie_key) + ' -> ' + (cat?.naam??'-'))
  }
  lines.push('')

  // Vakman types
  lines.push('VAKMAN TYPES: ' + vakmanCat.map((c:{naam:string})=>c.naam).join(', '))
  lines.push('')

  // Fases
  lines.push('FASE STATUS:')
  for (const f of fases) {
    lines.push('Fase ' + f.fase + ' gestart op ' + new Date(f.gestart_at).toLocaleDateString('nl-NL'))
  }
  lines.push('')

  // Afhankelijkheden
  lines.push('AFHANKELIJKHEDEN:')
  for (const d of dependencies) {
    if (d.type === 'optie_optie') {
      lines.push((OPTIE_LABELS[d.trigger_key]??d.trigger_key) + ' vereist: ' + (OPTIE_LABELS[d.requires_key]??d.requires_key))
    } else {
      lines.push('Bouwstap ' + (STATUS_LABELS[d.trigger_key]??d.trigger_key) + ' vrijgeeft: ' + (OPTIE_LABELS[d.requires_key]??d.requires_key))
    }
  }
  lines.push('')

  // Termijn config
  lines.push('TERMIJN CONFIG:')
  for (const t of termijnConfig) {
    lines.push(t.naam + ' trigger=' + t.trigger + ' actief=' + t.actief)
  }

  return lines.join('\n')
}

export async function GET() {
  const context = await getParkContext()
  const hottub = context.split('\n').filter(l => l.toLowerCase().includes('hottub'))
  return Response.json({ hottub, len: context.length })
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const promptPath = path.join(process.cwd(), 'src/config/tessi-prompt.yaml')
    const promptConfig = yaml.load(fs.readFileSync(promptPath, 'utf8')) as {
      system_prompt: string; model: string; max_tokens: number; temperature: number
    }
    const context = await getParkContext()
    const systemPrompt = promptConfig.system_prompt + '\n\n' + context
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.TOGETHER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: promptConfig.model, max_tokens: promptConfig.max_tokens, temperature: promptConfig.temperature,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    })
    const data = await response.json()
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content ?? 'Geen antwoord.' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ reply: 'Er is een fout opgetreden.' }, { status: 500 })
  }
}
