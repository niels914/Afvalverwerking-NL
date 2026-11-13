-- Aanvragen voor een rapport van de Heffingenscan restafval (formulier op /heffingenscan/<gemeente>).
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku).
-- Bezoekers (anon en authenticated) mogen alleen een rij toevoegen; niemand kan via de API lezen, wijzigen of
-- verwijderen. KplusV leest de aanvragen in het beheer van de database (en in Netlify Forms, waar dezelfde aanvraag
-- ook binnenkomt). Lengtes: houd ze gelijk aan aanvraagLengtes in src/data/heffingen-aanbod.ts.
create table public.rapportaanvragen (
  id uuid primary key default gen_random_uuid(),
  aangemaakt timestamptz not null default now(),
  gemeente text not null check (char_length(gemeente) between 1 and 100),
  gemeentecode text not null check (gemeentecode ~ '^GM[0-9]{4}$'),
  naam text not null check (char_length(btrim(naam)) between 1 and 120),
  organisatie text not null check (char_length(btrim(organisatie)) between 1 and 160),
  functie text not null check (char_length(btrim(functie)) between 1 and 120),
  email text not null check (char_length(email) between 5 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  telefoon text check (telefoon is null or char_length(telefoon) <= 40),
  keuze text not null check (keuze in ('rapport', 'rapport-toelichting', 'groep')),
  opmerking text check (opmerking is null or char_length(opmerking) <= 2000),
  kerncijfers text check (kerncijfers is null or char_length(kerncijfers) <= 1500),
  bron text check (bron is null or char_length(bron) <= 60),
  akkoord_privacy boolean not null check (akkoord_privacy)
);
alter table public.rapportaanvragen enable row level security;

-- Alleen toevoegen. Geen select-, update- of delete-beleid en geen rechten daarop: niemand leest via de API.
revoke all on table public.rapportaanvragen from public, anon, authenticated;
grant insert on table public.rapportaanvragen to anon, authenticated;
create policy "aanvraag toevoegen" on public.rapportaanvragen
  for insert to anon, authenticated
  with check (akkoord_privacy is true and char_length(btrim(naam)) > 0);
