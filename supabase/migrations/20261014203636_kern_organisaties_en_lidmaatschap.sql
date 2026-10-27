-- Kern: organisaties met lidmaatschap per organisatie, herkend aan e-maildomein.
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku).
create table public.organisaties (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  type text not null check (type in ('samenwerkingsverband-klein','samenwerkingsverband-groot','gemeente','verwerker','overig')),
  emaildomeinen text[] not null default '{}',
  status text not null default 'aangevraagd' check (status in ('aangevraagd','actief','opgezegd','verlopen')),
  geldig_tot date,
  aangemaakt timestamptz not null default now(),
  -- Publieke maildomeinen nooit als organisatiedomein: anders krijgt iedereen toegang.
  constraint geen_publieke_domeinen check (not (emaildomeinen && array['gmail.com','hotmail.com','outlook.com','live.nl','live.com','yahoo.com','icloud.com','ziggo.nl','kpnmail.nl','planet.nl','home.nl','xs4all.nl','hotmail.nl','msn.com','proton.me','protonmail.com']))
);
alter table public.organisaties enable row level security;

-- Domein van de ingelogde gebruiker, alleen als het e-mailadres bevestigd is.
create or replace function public.mijn_domein() returns text
language sql stable security definer set search_path = public, auth as $$
  select lower(split_part(u.email, '@', 2))
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

-- Is de ingelogde gebruiker lid via een actieve organisatie?
create or replace function public.is_lid() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.organisaties o
    where o.status = 'actief'
      and (o.geldig_tot is null or o.geldig_tot >= current_date)
      and public.mijn_domein() = any (select lower(d) from unnest(o.emaildomeinen) d)
  );
$$;

revoke all on function public.mijn_domein() from public, anon;
revoke all on function public.is_lid() from public, anon;
grant execute on function public.mijn_domein() to authenticated;
grant execute on function public.is_lid() to authenticated;

-- Ingelogde gebruikers zien alleen hun eigen organisatie.
create policy "eigen organisatie lezen" on public.organisaties
  for select to authenticated
  using (public.mijn_domein() = any (select lower(d) from unnest(emaildomeinen) d));
