-- Openbare stand van het aanbestedingsarchief, voor de inlogpagina (toegang, ronde 4, 28-10-2026).
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "aanbestedingen_openbare_stand".
--
-- Bezoekers zien op /inloggen live hoeveel aanbestedingen het archief bevat, hoeveel er open zijn, sinds wanneer en
-- wanneer het archief voor het laatst is bijgewerkt. Alleen deze vier totalen: geen rijen, titels of andere velden.
-- Besluit Niels 27-10-2026: open aanbestedingen zijn zonder account doorzoekbaar (public.open_aanbestedingen_zoeken).
--
-- Afdwinging: public.aanbestedingen en public.aanbestedingen_verversingen blijven dicht voor anon (RLS, geen grant).
-- Deze functie is security definer zodat ze de totalen mag tellen. "Open" gebruikt hetzelfde criterium als
-- public.open_aanbestedingen_zoeken, zodat het getal en de lijst voor bezoekers overeenkomen.
-- De advisor meldt "anon kan security definer-functie uitvoeren": dat is hier de bedoeling.

create or replace function public.aanbestedingen_openbare_stand()
returns table (
  totaal bigint,
  open bigint,
  oudste date,
  laatste_verversing timestamptz
)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.aanbestedingen),
    (select count(*) from public.aanbestedingen a
      where a.status_basis = 'aankondiging'
        and a.sluitingsdatum is not null
        and a.sluitingsdatum >= (now() at time zone 'Europe/Amsterdam')),
    (select min(a.publicatiedatum)::date from public.aanbestedingen a),
    (select max(v.klaar) from public.aanbestedingen_verversingen v where v.gelukt);
$$;

comment on function public.aanbestedingen_openbare_stand() is
  'Voor bezoekers: totalen van het aanbestedingsarchief (totaal, open, oudste publicatiedatum, laatste gelukte verversing). Geen rijen.';

revoke all on function public.aanbestedingen_openbare_stand() from public;
grant execute on function public.aanbestedingen_openbare_stand() to anon, authenticated;
