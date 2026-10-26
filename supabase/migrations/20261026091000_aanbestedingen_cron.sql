-- Aanbestedingen (ronde 1): dagelijkse verversing van public.aanbestedingen via pg_cron en pg_net.
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "aanbestedingen_cron".
--
-- Elke dag om 05:17 UTC (06:17 of 07:17 Nederlandse tijd) roept de database de Edge Function
-- ververs-aanbestedingen aan. Het geheim komt uit Vault en staat niet in deze code.
-- Handmatig verversen: zie docs/stukken/aanbestedingen.md.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Herbruikbare aanroep (ook voor handmatig verversen door een beheerder in de SQL-editor).
-- Alleen voor postgres/service-rol; niet via de API aan te roepen.
create or replace function public.start_ververs_aanbestedingen(p_max_details integer default 300)
returns bigint
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := 'https://mnwynrioozcqqvhelqku.supabase.co/functions/v1/ververs-aanbestedingen',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ververs-geheim', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'ververs_aanbestedingen_geheim')
    ),
    body := jsonb_build_object('maxDetails', p_max_details),
    timeout_milliseconds := 150000
  );
$$;

revoke all on function public.start_ververs_aanbestedingen(integer) from public, anon, authenticated;
grant execute on function public.start_ververs_aanbestedingen(integer) to service_role;

select cron.schedule('ververs-aanbestedingen', '17 5 * * *', $$select public.start_ververs_aanbestedingen(300);$$);
