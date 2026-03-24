-- ============================================================
-- ParkBouw — Database Schema
-- Voer dit uit in Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PARKS
-- ============================================================
create table parks (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  location    text,
  start_date  date,
  end_date    date,
  map_image   text,         -- storage path of floor plan image
  created_at  timestamptz default now()
);

-- ============================================================
-- OWNERS (eigenaren / kopers)
-- ============================================================
create table owners (
  id          uuid primary key default uuid_generate_v4(),
  park_id     uuid references parks(id) on delete cascade,
  name        text not null,
  contact     text,
  email       text,
  phone       text,
  address     text,
  notes       text,
  color       text default '#0071e3',
  created_at  timestamptz default now()
);

-- ============================================================
-- KAVELS
-- ============================================================
create table kavels (
  id            uuid primary key default uuid_generate_v4(),
  park_id       uuid references parks(id) on delete cascade,
  owner_id      uuid references owners(id) on delete set null,
  number        integer not null,
  fase          integer not null default 1,
  type          text,                   -- 'Tiny 2p', 'Tiny 4p', 'Tiny 2+2'
  uitvoering    text,                   -- 'Links' | 'Rechts'
  chassis       text,
  gereed_bouwer text,
  transport_date date,
  huisdieren    boolean default false,
  notitie       text,
  polygon       jsonb,                  -- [{x, y}] percentages for map overlay
  created_at    timestamptz default now(),
  unique(park_id, number)
);

-- ============================================================
-- KAVEL STATUS (voortgang bouw)
-- ============================================================
create table kavel_status (
  id                uuid primary key default uuid_generate_v4(),
  kavel_id          uuid references kavels(id) on delete cascade unique,
  geplaatst         boolean default false,
  aansloten         boolean default false,
  tuin_aangelegd    boolean default false,
  meubels_geplaatst boolean default false,
  opgestart         boolean default false,
  itt_aangesloten   boolean default false,
  intern_opgeleverd boolean default false,
  opgeleverd        boolean default false,
  updated_at        timestamptz default now()
);

-- ============================================================
-- KAVEL OPTIES (bestellingen)
-- ============================================================
create table kavel_opties (
  id                    uuid primary key default uuid_generate_v4(),
  kavel_id              uuid references kavels(id) on delete cascade unique,

  meubels_besteld       boolean default false,
  meubels_gereed        boolean default false,
  meubels_notitie       text,

  spec_meubels_besteld  boolean default false,
  spec_meubels_gereed   boolean default false,
  spec_meubels_notitie  text,

  tuinaanleg_besteld    boolean default false,
  tuinaanleg_gereed     boolean default false,
  tuinaanleg_notitie    text,

  marindex_besteld      boolean default false,
  marindex_gereed       boolean default false,
  marindex_notitie      text,

  madino_besteld        boolean default false,
  madino_gereed         boolean default false,
  madino_notitie        text,

  airco_besteld         boolean default false,
  airco_gereed          boolean default false,
  airco_notitie         text,

  pergola_besteld       boolean default false,
  pergola_gereed        boolean default false,
  pergola_notitie       text,

  hottub_besteld        boolean default false,
  hottub_gereed         boolean default false,
  hottub_notitie        text,

  horren_besteld        boolean default false,
  horren_gereed         boolean default false,
  horren_notitie        text,

  loungeset_besteld     boolean default false,
  loungeset_gereed      boolean default false,
  loungeset_notitie     text,

  zitkuil_besteld       boolean default false,
  zitkuil_gereed        boolean default false,
  zitkuil_notitie       text,

  berging_besteld       boolean default false,
  berging_gereed        boolean default false,
  berging_notitie       text,

  zonnepanelen_besteld  boolean default false,
  zonnepanelen_gereed   boolean default false,
  zonnepanelen_notitie  text,

  updated_at            timestamptz default now()
);

-- ============================================================
-- USER PROFILES & ROLES
-- ============================================================
create type user_role as enum ('developer', 'projectleider', 'planner', 'vakman', 'koper');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  park_id     uuid references parks(id),
  full_name   text,
  role        user_role default 'vakman',
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table parks        enable row level security;
alter table owners       enable row level security;
alter table kavels       enable row level security;
alter table kavel_status enable row level security;
alter table kavel_opties enable row level security;
alter table profiles     enable row level security;

-- Logged-in users can read everything in their park
-- (vereenvoudigd — uitbreiden per rol later)
create policy "park members can read"
  on parks for select using (auth.role() = 'authenticated');

create policy "park members can read owners"
  on owners for select using (auth.role() = 'authenticated');

create policy "park members can read kavels"
  on kavels for select using (auth.role() = 'authenticated');

create policy "park members can read status"
  on kavel_status for select using (auth.role() = 'authenticated');

create policy "park members can read opties"
  on kavel_opties for select using (auth.role() = 'authenticated');

-- Developers and projectleiders can write
create policy "developers can write kavels"
  on kavels for all using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('developer', 'projectleider', 'planner')
    )
  );

create policy "developers can write status"
  on kavel_status for all using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('developer', 'projectleider', 'planner', 'vakman')
    )
  );

create policy "developers can write opties"
  on kavel_opties for all using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('developer', 'projectleider', 'planner')
    )
  );

create policy "own profile"
  on profiles for all using (id = auth.uid());

-- ============================================================
-- STORAGE BUCKET voor plattegrond afbeeldingen
-- ============================================================
insert into storage.buckets (id, name, public)
values ('park-maps', 'park-maps', true)
on conflict do nothing;

create policy "anyone can read maps"
  on storage.objects for select
  using (bucket_id = 'park-maps');

create policy "developers can upload maps"
  on storage.objects for insert
  with check (
    bucket_id = 'park-maps' and
    auth.role() = 'authenticated'
  );

-- ============================================================
-- SEED DATA — Heideplas testdata
-- ============================================================
insert into parks (id, name, location, start_date, end_date)
values ('11111111-0000-0000-0000-000000000001', 'Heideplas', 'Drenthe, Nederland', '2024-01-01', '2025-12-31');

-- Owners
insert into owners (park_id, name, contact, email, phone, address, color) values
  ('11111111-0000-0000-0000-000000000001', 'J.A. Haverkamp Holding BV', 'Johan Haverkamp', 'j.haverkamp@haverkamp.nl', '06-12345678', 'Molenstraat 12, Assen', '#0071e3'),
  ('11111111-0000-0000-0000-000000000001', 'Wijnands - de Hoog', 'Peter Wijnands', 'p.wijnands@gmail.com', '06-23456789', 'Kerklaan 5, Emmen', '#30d158'),
  ('11111111-0000-0000-0000-000000000001', 'Kaptein', 'Arie Kaptein', 'a.kaptein@hotmail.com', '06-34567890', 'Dorpsweg 8, Hoogeveen', '#ff9f0a'),
  ('11111111-0000-0000-0000-000000000001', 'Arjan de Hoog Beheer B.V.', 'Arjan de Hoog', 'arjan@dehoogbeheer.nl', '06-45678901', 'Handelskade 22, Meppel', '#bf5af2'),
  ('11111111-0000-0000-0000-000000000001', 'Kuijpers Supresa', 'Mark Kuijpers', 'm.kuijpers@supresa.nl', '06-56789012', 'Industrieweg 44, Coevorden', '#ff3b30'),
  ('11111111-0000-0000-0000-000000000001', 'van Gool', 'Lisa van Gool', 'lisa@vangool.com', '06-67890123', 'Heidepad 3, Beilen', '#0071e3');

