-- Contractenkalender (14-11-2026): welke verwerkings- en inzamelcontracten lopen af, volgens de aankondiging van de gegunde opdracht.
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "contractenkalender".
-- Alleen contracten waarvan de bron een einddatum noemt (of begindatum en looptijd, dan met einde_afgeleid). Security invoker: alleen leden.
-- Niet-destructief: alleen een nieuwe functie.

create or replace function public.contracten_kalender(
  p_stroom text default null,
  p_provincie text default null,
  p_vanaf date default current_date
)
returns table (
  kenmerk bigint,
  titel text,
  opdrachtgever text,
  stromen text[],
  diensten text[],
  provincies text[],
  gegund_aan text[],
  gunningsdatum date,
  contract_start date,
  contract_einde date,
  einde_afgeleid boolean,
  verlengingen integer,
  verlenging_tekst text,
  tenderned_url text
)
language sql stable security invoker set search_path = public as $$
  select o.kenmerk, o.titel, o.opdrachtgever, o.stromen, o.diensten, o.provincies, o.gegund_aan, o.gunningsdatum,
         o.contract_start, o.contract_einde, coalesce(o.contract_einde_afgeleid, false), o.contract_verlengingen,
         o.contract_verlenging_tekst, o.tenderned_url
  from public.aanbestedingen_overzicht o
  where o.contract_einde is not null
    and o.contract_einde >= coalesce(p_vanaf, current_date)
    and o.afval_hoofd
    and (p_stroom is null or p_stroom = any (o.stromen))
    and (
      p_provincie is null
      or (p_provincie = 'landelijk' and cardinality(o.provincies) = 0)
      or p_provincie = any (o.provincies)
    )
  order by o.contract_einde, o.kenmerk;
$$;

revoke all on function public.contracten_kalender(text, text, date) from public, anon;
grant execute on function public.contracten_kalender(text, text, date) to authenticated;
