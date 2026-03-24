# ParkBouw — Complete Setup Guide

## Stack
- **Next.js 15** (App Router)
- **Supabase** (Postgres database + Auth + Realtime)
- **Tailwind CSS 4**
- **TypeScript**
- **Vercel** (hosting)

---

## Stap 1 — Supabase project aanmaken

1. Ga naar https://supabase.com en maak een account
2. Klik **New project**
3. Naam: `parkbouw`, regio: `West EU (Frankfurt)`
4. Sla je wachtwoord op
5. Wacht ~2 minuten tot het project klaar is

Kopieer uit **Settings → API**:
- `Project URL` → bewaar als `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` → bewaar als `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → bewaar als `SUPABASE_SERVICE_ROLE_KEY`

---

## Stap 2 — Database schema aanmaken

Ga in Supabase naar **SQL Editor** en voer het meegeleverde
bestand `supabase/schema.sql` uit.

---

## Stap 3 — Next.js project aanmaken

```bash
npx create-next-app@latest parkbouw \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd parkbouw
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-select
npm install class-variance-authority clsx tailwind-merge
```

---

## Stap 4 — Environment variabelen

Maak `.env.local` aan in de root:

```
NEXT_PUBLIC_SUPABASE_URL=jouw_url_hier
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw_anon_key_hier
SUPABASE_SERVICE_ROLE_KEY=jouw_service_role_key_hier
```

---

## Stap 5 — Starten

```bash
npm run dev
```

Open http://localhost:3000

---

## Stap 6 — Deployen naar Vercel

```bash
npm install -g vercel
vercel
```

Voeg de 3 environment variabelen toe in het Vercel dashboard.

