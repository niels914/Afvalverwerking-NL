-- Toegang (ronde 1): is_lid() niet aanroepbaar voor niet-ingelogde bezoekers (rol anon).
-- Toegepast op Supabase-project afvalverwerking-nl (mnwynrioozcqqvhelqku) als migratie "is_lid_niet_voor_anon".
-- Dit bestand legt een migratie vast die al in de database stond maar nog niet in de repository.
-- De app roept is_lid() alleen aan met een sessie; zonder sessie is iemand per definitie geen lid.
revoke execute on function public.is_lid() from anon;
