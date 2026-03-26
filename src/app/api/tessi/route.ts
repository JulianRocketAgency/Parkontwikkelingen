import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

const STATUS_LABELS: Record<string, string> = {
  bouw_gestart: 'Bouw gestart', geplaatst: 'Geplaatst', aansloten: 'Aangesloten',
  tuin_aangelegd: 'Tuin aangelegd', meubels_geplaatst: 'Meubels geplaatst',
  opgestart: 'Opgestart', itt_aangesloten: 'ITT aangesloten',
  intern_opgeleverd: 'Intern opgeleverd', opgeleverd: 'Opgeleverd',
}

const OPTIE_KEYS = [
  'meubels', 'spec_meubels', 'tuinaanleg', 'marindex', 'madino',
  'airco', 'pergola', 'hottub', 'horren', 'loungeset',
  'zitkuil', 'berging', 'zonnepanelen'
]

const OPTIE_LABELS: Record<string, string> = {
  meubels: 'Meubels', spec_meubels: 'Spec. meubels', tuinaanleg: 'Tuinaanleg',
  marindex: 'Marindex', madino: 'Madino', airco: 'Airco', pergola: 'Pergola',
  hottub: 'Hottub', horren: 'Horren', loungeset: 'Loungeset', zitkuil: 'Zitkuil',
  berging: 'Berging', zonnepanelen: 'Zonnepanelen',
}

const TERMIJN_VOLGORDE = ['eerste_termijn','doorgang_fase','bouw_gestart','transport','geplaatst','gereed_oplevering','opgeleverd']

async function getParkContext() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [kavelsRes, ownersRes, betalingenRes, profilesRes, faseRes, termijnConfigRes, depsRes, vakmanCatRes, optieKoppelingenRes] = await Promise.all([
    supabase.from('kavels').select('*, kavel_status(*), kavel_opties(*)').eq('park_id', PARK_ID),
    supabase.from('owners').select('*').eq('park_id', PARK_ID),
    supabase.from('betalingstermijnen').select('*'),
    supabase.from('profiles').select('*').eq('park_id', PARK_ID),
    supabase.from('fase_status').select('*').eq('park_id', PARK_ID),
    supabase.from('termijn_config').select('*').eq('park_id', PARK_ID).order('volgorde'),
    supabase.from('dependencies').select('*').eq('park_id', PARK_ID),
    supabase.from('vakman_categorieen').select('*').eq('park_id', PARK_ID),
    supabase.from('optie_vakman_koppelingen').select('*, vakman_categorieen(naam)').eq('park_id', PARK_ID),
  ])

  const kavels = kavelsRes.data ?? []
  const owners = ownersRes.data ?? []
  const betalingen = betalingenRes.data ?? []
  const profiles = profilesRes.data ?? []
  const faseStatussen = faseRes.data ?? []
  const termijnConfig = termijnConfigRes.data ?? []
  const deps = depsRes.data ?? []
  const vakmanCat = vakmanCatRes.data ?? []
  const optieKoppelingen = optieKoppelingenRes.data ?? []

  const lines: string[] = []
  lines.push('=== PARKBOUW DATA (' + new Date().toLocaleDateString('nl-NL', {day:'numeric',month:'long',year:'numeric'}) + ') ===')
  lines.push('')

  // Statistieken
  const totaal = kavels.length
  const verkocht = kavels.filter(k => k.verkocht).length
  const opgeleverd = kavels.filter(k => k.kavel_status?.[0]?.opgeleverd === true).length
  lines.push('OVERZICHT:')
  lines.push('- Totaal kavels: ' + totaal)
  lines.push('- Verkocht: ' + verkocht + ' (' + Math.round(verkocht/Math.max(totaal,1)*100) + '%)')
  lines.push('- Beschikbaar: ' + (totaal - verkocht))
  lines.push('- Opgeleverd: ' + opgeleverd)
  lines.push('- Openstaande betalingen: ' + betalingen.filter(b => b.status === 'actief').length)
  lines.push('- Voldane betalingen: ' + betalingen.filter(b => b.status === 'voldaan').length)
  lines.push('')

  // Fases
  lines.push('FASES:')
  const faseNums = [...new Set(kavels.map(k => k.fase))].sort()
  for (const fase of faseNums) {
    const fk = kavels.filter(k => k.fase === fase)
    const gestart = faseStatussen.find(f => f.fase === fase)
    lines.push('Fase ' + fase + ': ' + fk.length + ' kavels, ' + fk.filter(k=>k.verkocht).length + ' verkocht, ' + fk.filter(k => { const s = Array.isArray(k.kavel_status) ? k.kavel_status[0] : k.kavel_status; return s?.opgeleverd === true }).length + ' opgeleverd, gestart: ' + (gestart ? new Date(gestart.gestart_at).toLocaleDateString('nl-NL') : 'nee'))
  }
  lines.push('')

  // Kavels gedetailleerd
  lines.push('KAVELS (gedetailleerd):')
  for (const k of kavels) {
    const owner = owners.find(o => o.id === k.owner_id)
    const statusRaw = k.kavel_status
    const status: Record<string, unknown> = (Array.isArray(statusRaw) ? statusRaw[0] : statusRaw) ?? {}
    const opties = k.kavel_opties?.[0] ?? {}

    const bouwGereed = Object.keys(STATUS_LABELS).filter(key => status[key] === true).map(key => STATUS_LABELS[key])
    const pct = Math.round(bouwGereed.length / Object.keys(STATUS_LABELS).length * 100)

    const optiesGekocht = OPTIE_KEYS.filter(key => opties[key + '_gekocht'] === true).map(key => OPTIE_LABELS[key])
    const optiesBesteld = OPTIE_KEYS.filter(key => opties[key + '_besteld'] === true).map(key => OPTIE_LABELS[key])
    const optiesGereed = OPTIE_KEYS.filter(key => opties[key + '_gereed'] === true).map(key => OPTIE_LABELS[key])
    const optiesNogNietBesteld = optiesGekocht.filter(l => !optiesBesteld.includes(l))

    const kBet = betalingen.filter(b => b.kavel_id === k.id)
    const maxTermijn = TERMIJN_VOLGORDE.reduce((best, key) => kBet.find(b => b.termijn_key === key) ? key : best, 'geen')

    lines.push('Kavel #' + k.number + ' (Fase ' + k.fase + ', ' + k.type + ', ' + k.uitvoering + '):')
    lines.push('  Verkocht: ' + (k.verkocht ? 'ja' : 'nee') + ', Eigenaar: ' + (owner?.name ?? 'geen'))
    lines.push('  Bouwvoortgang: ' + pct + '% - Gereed stappen: ' + (bouwGereed.join(', ') || 'geen'))
    lines.push('  Opties gekocht: ' + (optiesGekocht.join(', ') || 'geen'))
    lines.push('  Opties besteld: ' + (optiesBesteld.join(', ') || 'geen'))
    lines.push('  Opties gereed/geplaatst: ' + (optiesGereed.join(', ') || 'geen'))
    lines.push('  Opties gekocht maar nog niet besteld: ' + (optiesNogNietBesteld.join(', ') || 'geen'))
    lines.push('  Huidige betalingstermijn: ' + maxTermijn + ' (' + kBet.length + '/7)')
    if (k.notitie) lines.push('  Notitie: ' + k.notitie)
    if (k.transport_date) lines.push('  Transportdatum: ' + k.transport_date)
    if (k.chassis) lines.push('  Chassis: ' + k.chassis)
  }
  lines.push('')

  // Eigenaren
  lines.push('EIGENAREN:')
  for (const o of owners) {
    const kv = kavels.filter(k => k.owner_id === o.id)
    const oBet = betalingen.filter(b => kv.some(k => k.id === b.kavel_id))
    lines.push(o.name + ':')
    lines.push('  Email: ' + (o.email ?? '-') + ', Telefoon: ' + (o.phone ?? '-'))
    lines.push('  Kavels: ' + (kv.map(k => '#' + k.number).join(', ') || 'geen'))
    lines.push('  Betalingen: ' + oBet.filter(b => b.status === 'voldaan').length + '/' + oBet.length + ' voldaan')
    const openBet = oBet.filter(b => b.status === 'actief')
    if (openBet.length > 0) lines.push('  Openstaande termijnen: ' + openBet.map(b => b.naam).join(', '))
  }
  lines.push('')

  // Team
  lines.push('TEAM:')
  for (const p of profiles) {
    lines.push((p.naam ?? p.full_name ?? p.email) + ': rol=' + (p.role ?? '-') + ', email=' + (p.email ?? '-'))
  }
  lines.push('')

  // Optie-vakman verantwoordelijkheden
  lines.push('OPTIE VERANTWOORDELIJKHEDEN (welke vakman doet wat):')
  for (const k of optieKoppelingen) {
    const cat = (k as Record<string, unknown>).vakman_categorieen as {naam: string} | null
    lines.push((OPTIE_LABELS[k.optie_key] ?? k.optie_key) + ' -> ' + (cat?.naam ?? 'niet toegewezen'))
  }
  lines.push('')

  // Vakman types
  lines.push('VAKMAN TYPES: ' + vakmanCat.map((c: {naam: string}) => c.naam).join(', '))
  lines.push('')

  // Afhankelijkheden
  lines.push('AFHANKELIJKHEDEN TUSSEN OPTIES:')
  for (const d of deps) {
    if (d.type === 'optie_optie') {
      lines.push((OPTIE_LABELS[d.trigger_key] ?? d.trigger_key) + ' vereist ook: ' + (OPTIE_LABELS[d.requires_key] ?? d.requires_key))
    } else {
      lines.push('Bouwstap ' + (STATUS_LABELS[d.trigger_key] ?? d.trigger_key) + ' vrijgeeft optie: ' + (OPTIE_LABELS[d.requires_key] ?? d.requires_key))
    }
  }
  lines.push('')

  // Termijn configuratie
  lines.push('BETALINGSTERMIJNEN CONFIGURATIE:')
  for (const t of termijnConfig) {
    lines.push(t.naam + ': trigger=' + t.trigger + ', actief=' + t.actief)
  }

  return lines.join('\n')
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const promptPath = path.join(process.cwd(), 'src/config/tessi-prompt.yaml')
    const promptConfig = yaml.load(fs.readFileSync(promptPath, 'utf8')) as {
      system_prompt: string
      model: string
      max_tokens: number
      temperature: number
    }

    const context = await getParkContext()
    const systemPrompt = promptConfig.system_prompt + '\n\n' + context

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.TOGETHER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: promptConfig.model,
        max_tokens: promptConfig.max_tokens,
        temperature: promptConfig.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? 'Geen antwoord ontvangen.'
    return NextResponse.json({ reply })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ reply: 'Er is een fout opgetreden.' }, { status: 500 })
  }
}
