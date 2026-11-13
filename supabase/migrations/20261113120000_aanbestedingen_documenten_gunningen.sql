-- Aanbestedingsarchief: documenten per aanbesteding, gunningsgegevens en de documentenbibliotheek (13-11-2026).
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "aanbestedingen_documenten_gunningen".
--
-- Wat er wordt bewaard (alleen metadata, nooit het document zelf of de inhoud):
--   public.aanbesteding_documenten: per document naam, soort (afgeleid door dit platform), bestandstype, datum, grootte en de
--     link naar het document op TenderNed. Gevuld door de Edge Function ververs-aanbestedingen.
--   public.aanbesteding_gunningen: per gegunde aanbesteding de gegunde partij(en) (bedrijfsnamen), contractdatum, waarde,
--     aantal inschrijvingen, percelen en, voor zover de bron ze noemt, looptijd en verlengingen. Geen contactpersonen.
-- Toegang: alleen leden lezen (RLS, public.is_lid()). anon heeft geen rechten. Bezoekers krijgen via
--   public.aanbestedingen_documenten_openbaar() alleen aantallen per soort.
-- Niet-destructief: geen drop, delete of update van bestaande rijen. Nieuwe kolommen op public.aanbestedingen zijn leeg tot de
--   Edge Function ze vult.

-- 1. Kolommen op public.aanbestedingen (voortgang van het ophalen en samenvatting voor filters).
alter table public.aanbestedingen
  add column if not exists documenten_publicatie_id bigint,
  add column if not exists documenten_opgehaald timestamptz,
  add column if not exists documenten_aantal integer not null default 0,
  add column if not exists documenten_soorten text[] not null default '{}',
  add column if not exists gunning_publicatie_id bigint,
  add column if not exists gunning_opgehaald timestamptz;

-- Logboek: wat een run aan documenten en gunningen heeft opgehaald en wat er nog openstaat.
alter table public.aanbestedingen_verversingen
  add column if not exists documenten_opgehaald integer,
  add column if not exists documenten_open integer,
  add column if not exists gunningen_opgehaald integer,
  add column if not exists gunningen_open integer;

-- 2. Documenten.
create table if not exists public.aanbesteding_documenten (
  kenmerk bigint not null references public.aanbestedingen (kenmerk) on delete cascade,
  document_id text not null,
  publicatie_id bigint not null,
  naam text not null,
  soort text not null,
  bestandstype text,
  categorie text,
  datum date,
  grootte bigint,
  url text not null check (url like 'https://www.tenderned.nl/papi/tenderned-rs-tns/%'),
  bijgewerkt timestamptz not null default now(),
  primary key (kenmerk, document_id)
);

create index if not exists aanbesteding_documenten_soort_idx on public.aanbesteding_documenten (soort);
create index if not exists aanbesteding_documenten_datum_idx on public.aanbesteding_documenten (datum desc);

alter table public.aanbesteding_documenten enable row level security;

create policy "leden lezen aanbesteding_documenten" on public.aanbesteding_documenten
  for select to authenticated using ((select public.is_lid()));

revoke all on public.aanbesteding_documenten from anon, authenticated;
grant select on public.aanbesteding_documenten to authenticated;

comment on table public.aanbesteding_documenten is
  'Metadata van aanbestedingsdocumenten op TenderNed (naam, soort, datum, grootte, link). Geen documentinhoud. Alleen leden lezen.';
comment on column public.aanbesteding_documenten.soort is
  'Indeling van dit platform, afgeleid van de bestandsnaam en de categorie van TenderNed (afleiding in supabase/functions/ververs-aanbestedingen/documenten.ts). Geen oordeel van TenderNed.';

-- 3. Gunningen.
create table if not exists public.aanbesteding_gunningen (
  kenmerk bigint primary key references public.aanbestedingen (kenmerk) on delete cascade,
  publicatie_id bigint not null,
  formaat text not null check (formaat in ('eforms', 'sf03')),
  gegund_aan text[] not null default '{}',
  gunningsdatum date,
  waarde_totaal numeric,
  aantal_inschrijvingen integer,
  percelen jsonb not null default '[]',
  looptijd_start date,
  looptijd_einde date,
  einde_afgeleid boolean not null default false,
  einde_bron text check (einde_bron in ('aankondiging', 'detail')),
  verlengingen_max integer,
  verlenging_tekst text,
  bijgewerkt timestamptz not null default now()
);

create index if not exists aanbesteding_gunningen_einde_idx on public.aanbesteding_gunningen (looptijd_einde);

alter table public.aanbesteding_gunningen enable row level security;

create policy "leden lezen aanbesteding_gunningen" on public.aanbesteding_gunningen
  for select to authenticated using ((select public.is_lid()));

revoke all on public.aanbesteding_gunningen from anon, authenticated;
grant select on public.aanbesteding_gunningen to authenticated;

comment on table public.aanbesteding_gunningen is
  'Gunningsgegevens uit de aankondiging van een gegunde opdracht op TenderNed: wat de bron vermeldt, anders leeg. Alleen leden lezen.';
comment on column public.aanbesteding_gunningen.einde_afgeleid is
  'Waar: de einddatum is afgeleid uit begindatum en looptijd, omdat de bron geen einddatum noemt.';
comment on column public.aanbesteding_gunningen.waarde_totaal is
  'Euro, exclusief btw, zoals de aankondiging die noemt. Bedragen onder 1.000 euro zijn invulwaarden in de bron en worden niet bewaard.';

-- 4. Overzichtsview: extra kolommen achteraan (bestaande kolommen blijven gelijk).
create or replace view public.aanbestedingen_overzicht with (security_invoker = true) as
select
  a.kenmerk, a.titel, a.opdrachtgever, a.omschrijving, a.procedure, a.type_opdracht, a.europees,
  a.status_basis, a.publicatiedatum, a.laatste_publicatie, a.sluitingsdatum, a.sluiting_tijd_bekend,
  a.aankondiging_id, a.tenderned_url, a.tsender_naam, a.tsender_url, a.cpv_hoofd, a.cpv_hoofd_omschrijving,
  a.cpv_codes, a.nuts_codes, a.provincies, a.stromen, a.diensten, a.trefwoorden, a.publicaties, a.bron_opgehaald,
  case
    when a.status_basis <> 'aankondiging' then a.status_basis
    when a.sluitingsdatum is null then 'onbekend'
    when a.sluitingsdatum >= (now() at time zone 'Europe/Amsterdam') then 'open'
    else 'gesloten'
  end as status,
  a.provincie_bron,
  (a.cpv_hoofd is null or a.cpv_hoofd like '905%' or a.cpv_hoofd like '90000000%') as afval_hoofd,
  a.documenten_aantal,
  a.documenten_soorten,
  a.documenten_opgehaald,
  g.gegund_aan,
  g.gunningsdatum,
  g.waarde_totaal as gunning_waarde,
  g.aantal_inschrijvingen as gunning_inschrijvingen,
  g.looptijd_start as contract_start,
  g.looptijd_einde as contract_einde,
  g.einde_afgeleid as contract_einde_afgeleid,
  g.verlengingen_max as contract_verlengingen,
  g.verlenging_tekst as contract_verlenging_tekst,
  g.percelen as gunning_percelen
from public.aanbestedingen a
left join public.aanbesteding_gunningen g on g.kenmerk = a.kenmerk;

revoke all on public.aanbestedingen_overzicht from anon;
revoke insert, update, delete, truncate, references, trigger on public.aanbestedingen_overzicht from authenticated;
grant select on public.aanbestedingen_overzicht to authenticated;

-- 5. Zoeken met de nieuwe filters: soort document, gegunde partij, jaar waarin het contract afloopt.
--    Zelfde regels als aanbestedingen_zoeken; zoekt ook in de naam van de gegunde partij. Security invoker: RLS geldt.
create or replace function public.aanbestedingen_zoeken_plus(
  p_zoek text default null,
  p_stroom text default null,
  p_status text default null,
  p_provincie text default null,
  p_dienst text default null,
  p_sortering text default 'publicatie-nieuw',
  p_alleen_hoofd boolean default false,
  p_soort text default null,
  p_partij text default null,
  p_afloop_jaar integer default null
)
returns setof public.aanbestedingen_overzicht
language sql stable security invoker set search_path = public as $$
  select o.*
  from public.aanbestedingen_overzicht o
  where (p_stroom is null or p_stroom = any (o.stromen))
    and (p_status is null or o.status = p_status)
    and (p_dienst is null or p_dienst = any (o.diensten))
    and (not coalesce(p_alleen_hoofd, false) or o.afval_hoofd)
    and (
      p_provincie is null
      or (p_provincie = 'landelijk' and cardinality(o.provincies) = 0)
      or p_provincie = any (o.provincies)
    )
    and (p_soort is null or p_soort = any (o.documenten_soorten))
    and (p_partij is null or position(lower(p_partij) in lower(coalesce(array_to_string(o.gegund_aan, ' | '), ''))) > 0)
    and (p_afloop_jaar is null or extract(year from o.contract_einde) = p_afloop_jaar)
    and not exists (
      select 1
      from public.aanbestedingen_zoektermen(p_zoek) as z(term)
      where position(z.term in lower(
        o.titel || ' ' || o.opdrachtgever || ' ' || coalesce(o.omschrijving, '') || ' ' || array_to_string(o.trefwoorden, ' ')
        || ' ' || array_to_string(o.cpv_codes, ' ') || ' ' || coalesce(o.cpv_hoofd_omschrijving, '')
        || ' ' || array_to_string(o.stromen, ' ') || ' ' || array_to_string(o.provincies, ' ') || ' ' || o.kenmerk::text
        || ' ' || coalesce(array_to_string(o.gegund_aan, ' '), '')
      )) = 0
    )
  order by
    case when p_sortering = 'publicatie-oud' then o.publicatiedatum end asc,
    case when p_sortering = 'sluiting-op' then o.sluitingsdatum end asc nulls last,
    case when p_sortering = 'sluiting-af' then o.sluitingsdatum end desc nulls last,
    case when p_sortering = 'laatste-nieuw' then o.laatste_publicatie end desc,
    case when p_sortering = 'opdrachtgever' then lower(o.opdrachtgever) end asc,
    case when p_sortering = 'afloop-op' then o.contract_einde end asc nulls last,
    o.publicatiedatum desc,
    o.kenmerk desc;
$$;

revoke all on function public.aanbestedingen_zoeken_plus(text, text, text, text, text, text, boolean, text, text, integer) from public, anon;
grant execute on function public.aanbestedingen_zoeken_plus(text, text, text, text, text, text, boolean, text, text, integer) to authenticated;

-- 6. Hulplijsten voor de filters (leden): gegunde partijen en jaren waarin contracten aflopen.
create or replace function public.aanbestedingen_gegunde_partijen()
returns table (partij text, aantal bigint)
language sql stable security invoker set search_path = public as $$
  select p, count(*)
  from public.aanbesteding_gunningen g, unnest(g.gegund_aan) as p
  group by p
  order by count(*) desc, p
  limit 300;
$$;

create or replace function public.aanbestedingen_afloopjaren()
returns table (jaar integer, aantal bigint)
language sql stable security invoker set search_path = public as $$
  select extract(year from looptijd_einde)::integer, count(*)
  from public.aanbesteding_gunningen
  where looptijd_einde is not null
  group by 1
  order by 1;
$$;

revoke all on function public.aanbestedingen_gegunde_partijen() from public, anon;
revoke all on function public.aanbestedingen_afloopjaren() from public, anon;
grant execute on function public.aanbestedingen_gegunde_partijen() to authenticated;
grant execute on function public.aanbestedingen_afloopjaren() to authenticated;

-- 7. Documentenbibliotheek (leden): zoeken en filteren over alle documenten, met de aanbesteding erbij.
create or replace function public.documenten_zoeken(
  p_zoek text default null,
  p_stroom text default null,
  p_soort text default null,
  p_jaar integer default null,
  p_opdrachtgever text default null,
  p_procedure text default null,
  p_sortering text default 'nieuw'
)
returns table (
  kenmerk bigint,
  document_id text,
  naam text,
  soort text,
  bestandstype text,
  datum date,
  grootte bigint,
  url text,
  titel text,
  opdrachtgever text,
  procedure text,
  status text,
  publicatiedatum date,
  stromen text[],
  tenderned_url text
)
language sql stable security invoker set search_path = public as $$
  select d.kenmerk, d.document_id, d.naam, d.soort, d.bestandstype, d.datum, d.grootte, d.url,
         o.titel, o.opdrachtgever, o.procedure, o.status, o.publicatiedatum, o.stromen, o.tenderned_url
  from public.aanbesteding_documenten d
  join public.aanbestedingen_overzicht o on o.kenmerk = d.kenmerk
  where (p_stroom is null or p_stroom = any (o.stromen))
    and (p_soort is null or d.soort = p_soort)
    and (p_jaar is null or extract(year from o.publicatiedatum) = p_jaar)
    and (p_opdrachtgever is null or o.opdrachtgever = p_opdrachtgever)
    and (p_procedure is null or o.procedure = p_procedure)
    and not exists (
      select 1
      from public.aanbestedingen_zoektermen(p_zoek) as z(term)
      where position(z.term in lower(d.naam || ' ' || o.titel || ' ' || o.opdrachtgever || ' ' || array_to_string(o.stromen, ' '))) = 0
    )
  order by
    case when p_sortering = 'oud' then o.publicatiedatum end asc,
    case when p_sortering = 'naam' then lower(d.naam) end asc,
    case when p_sortering = 'opdrachtgever' then lower(o.opdrachtgever) end asc,
    o.publicatiedatum desc,
    d.kenmerk desc,
    d.naam;
$$;

-- Keuzelijsten voor de bibliotheek, met aantallen documenten (leden).
create or replace function public.documenten_filteropties()
returns jsonb
language sql stable security invoker set search_path = public as $$
  with x as (
    select d.soort, o.opdrachtgever, o.procedure, o.stromen, extract(year from o.publicatiedatum)::integer as jaar
    from public.aanbesteding_documenten d
    join public.aanbestedingen_overzicht o on o.kenmerk = d.kenmerk
  )
  select jsonb_build_object(
    'totaal', (select count(*) from x),
    'soorten', coalesce((select jsonb_agg(jsonb_build_object('naam', soort, 'aantal', n) order by n desc) from (select soort, count(*) n from x group by 1) s), '[]'::jsonb),
    'jaren', coalesce((select jsonb_agg(jsonb_build_object('naam', jaar, 'aantal', n) order by jaar desc) from (select jaar, count(*) n from x group by 1) s), '[]'::jsonb),
    'opdrachtgevers', coalesce((select jsonb_agg(jsonb_build_object('naam', opdrachtgever, 'aantal', n) order by lower(opdrachtgever)) from (select opdrachtgever, count(*) n from x group by 1) s), '[]'::jsonb),
    'procedures', coalesce((select jsonb_agg(jsonb_build_object('naam', procedure, 'aantal', n) order by n desc) from (select procedure, count(*) n from x group by 1) s), '[]'::jsonb),
    'stromen', coalesce((select jsonb_agg(jsonb_build_object('naam', stroom, 'aantal', n) order by n desc) from (select u as stroom, count(*) n from x, unnest(x.stromen) u group by 1) s), '[]'::jsonb)
  );
$$;

revoke all on function public.documenten_zoeken(text, text, text, integer, text, text, text) from public, anon;
revoke all on function public.documenten_filteropties() from public, anon;
grant execute on function public.documenten_zoeken(text, text, text, integer, text, text, text) to authenticated;
grant execute on function public.documenten_filteropties() to authenticated;

-- 8. Bezoekers: alleen aantallen per soort, geen documentregels (security definer, zoals aanbestedingen_openbare_stand).
--    De advisor meldt "anon kan security definer-functie uitvoeren": dat is hier de bedoeling.
create or replace function public.aanbestedingen_documenten_openbaar()
returns table (soort text, documenten bigint, aanbestedingen bigint)
language sql stable security definer set search_path = '' as $$
  select d.soort, count(*), count(distinct d.kenmerk)
  from public.aanbesteding_documenten d
  group by d.soort
  union all
  select 'totaal', count(*), count(distinct d.kenmerk)
  from public.aanbesteding_documenten d;
$$;

comment on function public.aanbestedingen_documenten_openbaar() is
  'Voor bezoekers: aantal documenten en aanbestedingen per soort document, plus een totaalregel. Geen documentregels.';

revoke all on function public.aanbestedingen_documenten_openbaar() from public;
grant execute on function public.aanbestedingen_documenten_openbaar() to anon, authenticated;

-- 9. Aanroep van de Edge Function in vul-modus (hervatbaar ophalen van documenten en gunningen, zonder de hele lijst te verversen).
--    Alleen voor service-rol/postgres; niet via de API aan te roepen.
create or replace function public.start_vul_aanbestedingen(p_max_documenten integer default 150, p_max_gunningen integer default 60)
returns bigint
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := 'https://mnwynrioozcqqvhelqku.supabase.co/functions/v1/ververs-aanbestedingen',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ververs-geheim', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'ververs_aanbestedingen_geheim')
    ),
    body := jsonb_build_object('modus', 'vul', 'maxDocumenten', p_max_documenten, 'maxGunningen', p_max_gunningen),
    timeout_milliseconds := 150000
  );
$$;

revoke all on function public.start_vul_aanbestedingen(integer, integer) from public, anon, authenticated;
grant execute on function public.start_vul_aanbestedingen(integer, integer) to service_role;
