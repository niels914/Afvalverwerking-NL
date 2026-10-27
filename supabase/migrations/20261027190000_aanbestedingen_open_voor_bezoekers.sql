-- Aanbestedingen: beperkt open voor bezoekers (besluit Niels, 27-10-2026).
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "aanbestedingen_open_voor_bezoekers".
--
-- Bezoekers (anon) mogen zoeken in aanbestedingen die OPEN zijn voor inschrijving en zien alleen titel, opdrachtgever,
-- sluitingsdatum en de link naar TenderNed. Filters, details, gesloten en gegunde aanbestedingen, tijdlijn en export
-- blijven voor leden.
--
-- Afdwinging op de server: de tabel public.aanbestedingen blijft dicht voor anon (RLS aan, geen policy voor anon, geen
-- grant). Deze functie is security definer zodat ze de tabel mag lezen, maar geeft hard alleen rijen met status 'open'
-- (sluitingsdatum in de toekomst, geen marktconsultatie, gunning of beëindiging) en alleen vijf kolommen terug, maximaal
-- 100 rijen. De advisor meldt "anon kan security definer-functie uitvoeren": dat is hier de bedoeling.

create or replace function public.open_aanbestedingen_zoeken(p_zoek text default null)
returns table (
  titel text,
  opdrachtgever text,
  sluitingsdatum timestamp,
  sluiting_tijd_bekend boolean,
  tenderned_url text
)
language sql stable security definer set search_path = '' as $$
  select a.titel, a.opdrachtgever, a.sluitingsdatum, a.sluiting_tijd_bekend, a.tenderned_url
  from public.aanbestedingen a
  where a.status_basis = 'aankondiging'
    and a.sluitingsdatum is not null
    and a.sluitingsdatum >= (now() at time zone 'Europe/Amsterdam')
    and not exists (
      select 1
      from public.aanbestedingen_zoektermen(left(p_zoek, 200)) as z(term)
      where position(z.term in lower(a.titel || ' ' || a.opdrachtgever)) = 0
    )
  order by a.sluitingsdatum asc, a.kenmerk desc
  limit 100;
$$;

comment on function public.open_aanbestedingen_zoeken(text) is
  'Voor bezoekers: open aanbestedingen (titel, opdrachtgever, sluitingsdatum, TenderNed-link), zoeken in titel en opdrachtgever. Besluit 27-10-2026.';

revoke all on function public.open_aanbestedingen_zoeken(text) from public;
grant execute on function public.open_aanbestedingen_zoeken(text) to anon, authenticated;
