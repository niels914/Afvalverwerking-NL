-- Toegang (ronde 2): nieuwe accounts alleen voor e-maildomeinen van een bekende organisatie.
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "hook_alleen_bekende_domeinen".
--
-- Bedoeld als Supabase Auth-hook "Before User Created" (dashboard: Authentication -> Hooks -> Add hook ->
-- Before User Created -> Postgres -> schema public, functie hook_alleen_bekende_domeinen). Zonder die instelling
-- doet de functie niets. Beschikbaar op het gratis plan (https://supabase.com/docs/guides/auth/auth-hooks).
--
-- Wat het doet: een nieuw account (eerste inloglink, registratie, of aangemaakt via het dashboard) wordt alleen
-- aangemaakt als het e-maildomein voorkomt in public.organisaties, ongeacht de status. Zo kan "Stuur mij een
-- inloglink" niet worden misbruikt om mail te sturen naar willekeurige adressen, en ontstaan er geen accounts
-- die toch nooit toegang krijgen. Bestaande accounts kunnen altijd blijven inloggen (de hook draait alleen
-- bij het aanmaken). De site herkent de melding hieronder en toont een Nederlandse uitleg (src/lib/authFouten.ts).
--
-- SECURITY DEFINER zodat de functie organisaties kan lezen zonder extra RLS-policy voor supabase_auth_admin.
-- Alleen supabase_auth_admin mag de functie uitvoeren; bezoekers en ingelogde gebruikers niet.
create or replace function public.hook_alleen_bekende_domeinen(event jsonb)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  dom text := lower(split_part(coalesce(event->'user'->>'email', ''), '@', 2));
begin
  if dom <> '' and exists (
    select 1 from public.organisaties o
    where dom = any (select lower(d) from unnest(o.emaildomeinen) d)
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Geen organisatie bekend voor dit e-maildomein.'
    )
  );
end;
$$;

revoke execute on function public.hook_alleen_bekende_domeinen(jsonb) from public, anon, authenticated;
grant execute on function public.hook_alleen_bekende_domeinen(jsonb) to supabase_auth_admin;
