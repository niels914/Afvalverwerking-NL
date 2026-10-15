-- Toegang (ronde 1): lidmaatschapsgegevens van de ingelogde gebruiker voor de pagina /account.
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "mijn_lidmaatschap".
--
-- SECURITY INVOKER: de functie leest public.organisaties met de rechten van de gebruiker, dus de
-- bestaande RLS-policy "eigen organisatie lezen" bepaalt wat zichtbaar is. Geen extra rechten nodig.
--
-- effectieve_status: 'actief' wordt 'verlopen' zodra geldig_tot voorbij is, ook als niemand de
-- status heeft bijgewerkt. Dezelfde regel als in public.is_lid().
-- Hebben meerdere organisaties hetzelfde domein, dan komt de actieve (met de langste looptijd) eerst.
create or replace function public.mijn_lidmaatschap()
returns table (
  organisatie text,
  organisatietype text,
  status text,
  effectieve_status text,
  geldig_tot date,
  domein text,
  is_lid boolean
)
language sql stable security invoker set search_path = public as $$
  with eigen as (
    select o.naam, o.type, o.status, o.geldig_tot,
      case
        when o.status = 'actief' and o.geldig_tot is not null and o.geldig_tot < current_date then 'verlopen'
        else o.status
      end as eff
    from public.organisaties o
    where public.mijn_domein() = any (select lower(d) from unnest(o.emaildomeinen) d)
  )
  select e.naam, e.type, e.status, e.eff, e.geldig_tot, public.mijn_domein(), (e.eff = 'actief')
  from eigen e
  order by (e.eff = 'actief') desc, e.geldig_tot desc nulls first
  limit 1;
$$;

revoke all on function public.mijn_lidmaatschap() from public, anon;
grant execute on function public.mijn_lidmaatschap() to authenticated;
