import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const PARK_ID = '11111111-0000-0000-0000-000000000001'

async function getParkContext() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [kavelsRes, ownersRes, betalingenRes, profilesRes] = await Promise.all([
    supabase.from('kavels').select('*, kavel_status(*), kavel_opties(*)').eq('park_id', PARK_ID),
    supabase.from('owners').select('*').eq('park_id', PARK_ID),
    supabase.from('betalingstermijnen').select('*'),
    supabase.from('profiles').select('*'),
  ])

  const kavels = kavelsRes.data ?? []
  const owners = ownersRes.data ?? []
  const betalingen = betalingenRes.data ?? []
  const profiles = profilesRes.data ?? []

  const kavelsText = kavels.map(k => {
    const owner = owners.find(o => o.id === k.owner_id)
    const status = k.kavel_status?.[0]
    const opties = k.kavel_opties?.[0]
    const bouw = status ? Object.entries(status)
      .filter(([key, val]) => !['id','kavel_id','updated_at'].includes(key) && val === true)
      .map(([key]) => key).join(', ') : 'geen'
    const kBet = betalingen.filter(b => b.kavel_id === k.id)
    return `Kavel #${k.number} (Fase ${k.fase}, ${k.type}, ${k.uitvoering}): verkocht=${k.verkocht}, eigenaar=${owner?.name ?? 'geen'}, bouw_stappen_gereed=[${bouw}], termijnen=${kBet.length}`
  }).join('\n')

  const ownersText = owners.map(o => {
    const kv = kavels.filter(k => k.owner_id === o.id)
    return `${o.name}: kavels=[${kv.map(k=>'#'+k.number).join(', ')}], email=${o.email ?? '-'}`
  }).join('\n')

  const profilesText = profiles.map(p =>
    `${p.naam ?? p.full_name ?? p.email}: rol=${p.role ?? '-'}`
  ).join('\n')

  return `=== PARK DATA (${new Date().toLocaleDateString('nl-NL')}) ===

KAVELS (${kavels.length} totaal):
${kavelsText}

EIGENAREN (${owners.length} totaal):
${ownersText}

TEAM (${profiles.length} gebruikers):
${profilesText}

STATISTIEKEN:
- Totaal kavels: ${kavels.length}
- Verkocht: ${kavels.filter(k=>k.verkocht).length}
- Beschikbaar: ${kavels.filter(k=>!k.verkocht).length}
- Fases: ${[...new Set(kavels.map(k=>k.fase))].sort().join(', ')}
`
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Load prompt config
    const promptPath = path.join(process.cwd(), 'src/config/tessi-prompt.yaml')
    const promptConfig = yaml.load(fs.readFileSync(promptPath, 'utf8')) as {
      system_prompt: string
      model: string
      max_tokens: number
      temperature: number
    }

    // Get live park data
    const context = await getParkContext()
    const systemPrompt = promptConfig.system_prompt + '\n\n' + context

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
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
