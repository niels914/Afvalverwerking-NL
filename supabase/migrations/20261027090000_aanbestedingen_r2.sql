-- Aanbestedingen (ronde 2). Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie
-- "aanbestedingen_r2".
--
-- 1. Kolom provincie_bron: 'nuts' (plaats van uitvoering) of 'opdrachtgever' (afgeleid uit "Gemeente X", CBS-indeling).
-- 2. View: kolommen provincie_bron en afval_hoofd (hoofd-CPV is een afvalcode 905..., de algemene 90000000 of onbekend).
-- 3. zoek_aanbestedingen: filter p_alleen_hoofd, zoektermen tussen aanhalingstekens als woordgroep, tekens als % en *
--    worden genegeerd, zoeken ook in CPV-codes, afvalstroom, provincie en kenmerk; sortering 'laatste-nieuw'.
-- 4. aanbestedingen_telling_stromen(): aantallen per afvalstroom voor de filterlijst.
-- Alles security invoker: de RLS van public.aanbestedingen (alleen leden via public.is_lid()) blijft gelden.

alter table public.aanbestedingen
  add column if not exists provincie_bron text check (provincie_bron in ('nuts', 'opdrachtgever'));

update public.aanbestedingen set provincie_bron = 'nuts' where provincie_bron is null and cardinality(provincies) > 0;

drop function if exists public.zoek_aanbestedingen(text, text, text, text, text, text);

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
  (a.cpv_hoofd is null or a.cpv_hoofd like '905%' or a.cpv_hoofd like '90000000%') as afval_hoofd
from public.aanbestedingen a;

revoke all on public.aanbestedingen_overzicht from anon;
revoke insert, update, delete, truncate, references, trigger on public.aanbestedingen_overzicht from authenticated;
grant select on public.aanbestedingen_overzicht to authenticated;

-- Zoektermen uit de invoer: "woordgroep tussen aanhalingstekens" blijft één term; losse woorden apart.
-- Tekens zonder betekenis voor de zoekopdracht (% * ? ( ) en dergelijke) worden genegeerd.
create or replace function public.aanbestedingen_zoektermen(p_zoek text)
returns setof text
language sql immutable set search_path = '' as $$
  select distinct t
  from (
    select btrim(regexp_replace(m[1], '[%*_?!(){}<>+=~^$#@;:,|\\\[\]]', ' ', 'g')) as t
    from regexp_matches(lower(coalesce(p_zoek, '')), '"([^"]+)"', 'g') as m
    union all
    select btrim(w)
    from regexp_split_to_table(
      regexp_replace(regexp_replace(lower(coalesce(p_zoek, '')), '"[^"]*"', ' ', 'g'), '[%*_?!(){}<>+=~^$#@;:,|\\\[\]"]', ' ', 'g'),
      '\s+'
    ) as w
  ) x
  where t <> '' and t is not null;
$$;

revoke all on function public.aanbestedingen_zoektermen(text) from public, anon;
grant execute on function public.aanbestedingen_zoektermen(text) to authenticated;

create or replace function public.zoek_aanbestedingen(
  p_zoek text default null,
  p_stroom text default null,
  p_status text default null,
  p_provincie text default null,
  p_dienst text default null,
  p_sortering text default 'publicatie-nieuw',
  p_alleen_hoofd boolean default false
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
    and not exists (
      select 1
      from public.aanbestedingen_zoektermen(p_zoek) as z(term)
      where position(z.term in lower(
        o.titel || ' ' || o.opdrachtgever || ' ' || coalesce(o.omschrijving, '') || ' ' || array_to_string(o.trefwoorden, ' ')
        || ' ' || array_to_string(o.cpv_codes, ' ') || ' ' || coalesce(o.cpv_hoofd_omschrijving, '')
        || ' ' || array_to_string(o.stromen, ' ') || ' ' || array_to_string(o.provincies, ' ') || ' ' || o.kenmerk::text
      )) = 0
    )
  order by
    case when p_sortering = 'publicatie-oud' then o.publicatiedatum end asc,
    case when p_sortering = 'sluiting-op' then o.sluitingsdatum end asc nulls last,
    case when p_sortering = 'sluiting-af' then o.sluitingsdatum end desc nulls last,
    case when p_sortering = 'laatste-nieuw' then o.laatste_publicatie end desc,
    case when p_sortering = 'opdrachtgever' then lower(o.opdrachtgever) end asc,
    o.publicatiedatum desc,
    o.kenmerk desc;
$$;

revoke all on function public.zoek_aanbestedingen(text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.zoek_aanbestedingen(text, text, text, text, text, text, boolean) to authenticated;

-- Aantallen per afvalstroom (een aanbesteding kan meerdere stromen hebben).
create or replace function public.aanbestedingen_telling_stromen()
returns table (stroom text, aantal bigint)
language sql stable security invoker set search_path = public as $$
  select s.stroom, count(*) from public.aanbestedingen a cross join lateral unnest(a.stromen) as s(stroom) group by s.stroom;
$$;

revoke all on function public.aanbestedingen_telling_stromen() from public, anon;
grant execute on function public.aanbestedingen_telling_stromen() to authenticated;
