-- Aanbestedingen (ronde 1): archief van TenderNed-aankondigingen over afval, alleen leesbaar voor leden.
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "aanbestedingen".
--
-- Gevuld door de Edge Function ververs-aanbestedingen (service-rol). Leden lezen via de view
-- public.aanbestedingen_overzicht of de functie public.zoek_aanbestedingen(). Bezoekers en niet-leden zien niets:
-- RLS met public.is_lid().

create table public.aanbestedingen (
  kenmerk bigint primary key,                 -- TenderNed-kenmerk: alle publicaties van één aanbesteding
  titel text not null,
  opdrachtgever text not null,
  omschrijving text,
  procedure text not null,
  type_opdracht text,                         -- Diensten, Leveringen of Werken
  europees boolean,
  status_basis text not null check (status_basis in ('aankondiging','gegund','beeindigd','marktconsultatie','vooraankondiging','ingetrokken')),
  publicatiedatum date not null,              -- eerste publicatie
  laatste_publicatie date not null,
  sluitingsdatum timestamp,                   -- Nederlandse tijd, zoals TenderNed die geeft
  sluiting_tijd_bekend boolean not null default false,
  aankondiging_id bigint not null,            -- publicatie waar de link naar wijst
  tenderned_url text not null check (tenderned_url like 'https://www.tenderned.nl/%'),
  tsender_naam text,                          -- extern platform (bijv. Mercell, Negometrix)
  tsender_url text,
  cpv_hoofd text,
  cpv_hoofd_omschrijving text,
  cpv_codes text[] not null default '{}',
  cpv_details jsonb not null default '[]',
  nuts_codes text[] not null default '{}',
  provincies text[] not null default '{}',
  stromen text[] not null default '{}',       -- afgeleid uit CPV en trefwoorden (zie afleiding.ts)
  diensten text[] not null default '{}',      -- afgeleid uit CPV
  trefwoorden text[] not null default '{}',
  publicaties jsonb not null default '[]',    -- tijdlijn: [{id, datum, type, omschrijving, ingetrokken}]
  detail_publicatie_id bigint,                -- publicatie waarvan CPV en NUTS zijn opgehaald
  bron_opgehaald timestamptz not null default now()
);

comment on table public.aanbestedingen is 'Aanbestedingen over afval (CPV 90500000 en onderliggend) uit de openbare TenderNed-webservice. Gevuld door Edge Function ververs-aanbestedingen.';

create index aanbestedingen_publicatiedatum_idx on public.aanbestedingen (publicatiedatum desc);
create index aanbestedingen_stromen_idx on public.aanbestedingen using gin (stromen);
create index aanbestedingen_provincies_idx on public.aanbestedingen using gin (provincies);

alter table public.aanbestedingen enable row level security;

create policy "leden lezen aanbestedingen" on public.aanbestedingen
  for select to authenticated
  using ((select public.is_lid()));

revoke all on public.aanbestedingen from anon;
revoke insert, update, delete, truncate, references, trigger on public.aanbestedingen from authenticated;
grant select on public.aanbestedingen to authenticated;

-- Logboek van de verversingen: wanneer de bron voor het laatst is opgehaald (peildatum in de UI).
create table public.aanbestedingen_verversingen (
  id bigint generated always as identity primary key,
  gestart timestamptz not null default now(),
  klaar timestamptz,
  gelukt boolean,
  publicaties integer,
  aanbestedingen integer,
  details_opgehaald integer,
  details_open integer,
  melding text
);

alter table public.aanbestedingen_verversingen enable row level security;

create policy "leden lezen verversingen" on public.aanbestedingen_verversingen
  for select to authenticated
  using ((select public.is_lid()));

revoke all on public.aanbestedingen_verversingen from anon;
revoke insert, update, delete, truncate, references, trigger on public.aanbestedingen_verversingen from authenticated;
grant select on public.aanbestedingen_verversingen to authenticated;

-- Overzicht met actuele status. security_invoker: de RLS van public.aanbestedingen blijft gelden.
-- Statusregel gelijk aan statusOp() in supabase/functions/ververs-aanbestedingen/afleiding.ts.
create view public.aanbestedingen_overzicht with (security_invoker = true) as
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
  end as status
from public.aanbestedingen a;

revoke all on public.aanbestedingen_overzicht from anon;
revoke insert, update, delete, truncate, references, trigger on public.aanbestedingen_overzicht from authenticated;
grant select on public.aanbestedingen_overzicht to authenticated;

-- Zoeken, filteren en sorteren. security invoker: RLS bepaalt wat zichtbaar is.
-- p_zoek: alle woorden moeten voorkomen in titel, opdrachtgever, omschrijving of trefwoorden.
-- p_provincie 'landelijk' = geen provincie bekend (alleen NUTS-code NL of niets).
create or replace function public.zoek_aanbestedingen(
  p_zoek text default null,
  p_stroom text default null,
  p_status text default null,
  p_provincie text default null,
  p_dienst text default null,
  p_sortering text default 'publicatie-nieuw'
)
returns setof public.aanbestedingen_overzicht
language sql stable security invoker set search_path = public as $$
  select o.*
  from public.aanbestedingen_overzicht o
  where (p_stroom is null or p_stroom = any (o.stromen))
    and (p_status is null or o.status = p_status)
    and (p_dienst is null or p_dienst = any (o.diensten))
    and (
      p_provincie is null
      or (p_provincie = 'landelijk' and cardinality(o.provincies) = 0)
      or p_provincie = any (o.provincies)
    )
    and (
      coalesce(trim(p_zoek), '') = ''
      or not exists (
        select 1
        from unnest(regexp_split_to_array(lower(trim(p_zoek)), '\s+')) as w(woord)
        where w.woord <> ''
          and position(w.woord in lower(o.titel || ' ' || o.opdrachtgever || ' ' || coalesce(o.omschrijving, '') || ' ' || array_to_string(o.trefwoorden, ' '))) = 0
      )
    )
  order by
    case when p_sortering = 'publicatie-oud' then o.publicatiedatum end asc,
    case when p_sortering = 'sluiting-op' then o.sluitingsdatum end asc nulls last,
    case when p_sortering = 'sluiting-af' then o.sluitingsdatum end desc nulls last,
    case when p_sortering = 'opdrachtgever' then lower(o.opdrachtgever) end asc,
    o.publicatiedatum desc,
    o.kenmerk desc;
$$;

revoke all on function public.zoek_aanbestedingen(text, text, text, text, text, text) from public, anon;
grant execute on function public.zoek_aanbestedingen(text, text, text, text, text, text) to authenticated;

-- Aantallen per status (voor de filterlijst en de kop).
create or replace function public.aanbestedingen_telling()
returns table (status text, aantal bigint)
language sql stable security invoker set search_path = public as $$
  select o.status, count(*) from public.aanbestedingen_overzicht o group by o.status;
$$;

revoke all on function public.aanbestedingen_telling() from public, anon;
grant execute on function public.aanbestedingen_telling() to authenticated;

-- Geheim voor de dagelijkse aanroep van de Edge Function. Willekeurig gegenereerd in de database;
-- staat in Vault en nergens anders.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'ververs_aanbestedingen_geheim') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ververs_aanbestedingen_geheim',
      'Geheim voor Edge Function ververs-aanbestedingen (kop x-ververs-geheim)');
  end if;
end $$;

-- De Edge Function controleert het meegestuurde geheim hiermee. Alleen de service-rol mag dit aanroepen.
create or replace function public.ververs_geheim_klopt(p_geheim text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_geheim, '') <> '' and exists (
    select 1 from vault.decrypted_secrets s
    where s.name = 'ververs_aanbestedingen_geheim' and s.decrypted_secret = p_geheim
  );
$$;

revoke all on function public.ververs_geheim_klopt(text) from public, anon, authenticated;
grant execute on function public.ververs_geheim_klopt(text) to service_role;
