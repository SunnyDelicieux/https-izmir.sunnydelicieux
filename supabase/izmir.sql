-- ═══════════════════════════════════════════════════════════════════════════
--  İzmir by Night : règles de sécurité Supabase (à coller dans SQL Editor → Run)
--
--  Ce script peut être relancé sans risque (tout est "if not exists" / "or replace").
--
--  Ce qu'il fait :
--    1. le calendrier n'envoie plus que les événements que le joueur a le droit de voir
--       (avant : tout était envoyé au navigateur, puis trié en JavaScript)
--    2. chaque joueur ne lit que son propre profil, et ne peut pas le modifier
--    3. un profil est créé tout seul quand tu crées un compte (identifiant = début de l'email)
--    4. table "tickets" pour "signaler une erreur"
--    5. coffre-fort : dossier privé "handouts" dans Storage
--
--  Tags : un joueur a les tags  public + son identifiant + son clan + son rôle + extra_tags.
--  Un événement (colonne permissions) est visible si : permissions vide, ou contient "public",
--  ou partage au moins un tag avec le joueur. Un admin (profiles.is_admin) voit tout.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Outils ─────────────────────────────────────────────────────────────────

-- transforme une colonne de tags (text[], jsonb, ou simple texte) en liste en minuscules
create or replace function public.izmir_as_tags(v jsonb)
returns text[]
language sql immutable
as $$
  select coalesce(array_agg(lower(trim(t))) filter (where trim(t) <> ''), '{}')
  from (
    select jsonb_array_elements_text(v) as t where jsonb_typeof(v) = 'array'
    union all
    select v #>> '{}' where jsonb_typeof(v) = 'string'
  ) x
$$;

-- tags du joueur connecté ("security definer" : lit profiles sans passer par ses règles)
create or replace function public.izmir_my_tags()
returns text[]
language sql stable security definer
set search_path = public
as $$
  select array['public'] || coalesce((
    select array_remove(array[lower(p.username), lower(p.clan), lower(p.role)], null)
           || public.izmir_as_tags(to_jsonb(p.extra_tags))
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1
  ), '{}')
$$;

create or replace function public.izmir_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = auth.uid() limit 1), false)
$$;

create or replace function public.izmir_username()
returns text
language sql stable security definer
set search_path = public
as $$
  select lower(p.username) from public.profiles p where p.user_id = auth.uid() limit 1
$$;


-- ── 1. Calendrier ──────────────────────────────────────────────────────────

alter table public."Calendar" enable row level security;

drop policy if exists "izmir: voir les evenements autorises" on public."Calendar";
create policy "izmir: voir les evenements autorises"
on public."Calendar" for select
to anon, authenticated
using (
  cardinality(public.izmir_as_tags(to_jsonb(permissions))) = 0
  or 'public' = any(public.izmir_as_tags(to_jsonb(permissions)))
  or public.izmir_as_tags(to_jsonb(permissions)) && public.izmir_my_tags()
  or public.izmir_is_admin()
);
-- Pas de règle insert/update/delete : seul le tableau de bord Supabase peut modifier le calendrier.


-- ── 2. Profils ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "izmir: lire son profil" on public.profiles;
create policy "izmir: lire son profil"
on public.profiles for select
to authenticated
using (user_id = auth.uid() or public.izmir_is_admin());
-- Pas de règle update : un joueur ne peut pas se mettre is_admin = true ou changer de clan.


-- ── 3. Profil créé automatiquement avec le compte ──────────────────────────
-- ⚠ À faire aussi dans le tableau de bord : Authentication → Sign In / Providers →
--   décocher "Allow new users to sign up". Sinon n'importe qui peut se créer un compte
--   avec la clé publique du site.

-- Authentication → Users → Add user → "kaadir@izmir.local" + mot de passe (cocher Auto Confirm)
-- → une ligne profiles (user_id, username = "kaadir") apparaît ; il ne reste qu'à remplir clan / rôle.

create or replace function public.izmir_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (user_id, username)
    select new.id, split_part(new.email, '@', 1)
    where new.email like '%@izmir.local'
      and not exists (select 1 from public.profiles where user_id = new.id);
  exception when others then
    -- ne jamais bloquer la création du compte si profiles a d'autres colonnes obligatoires
    raise warning 'izmir_new_user: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists izmir_on_auth_user_created on auth.users;
create trigger izmir_on_auth_user_created
after insert on auth.users
for each row execute function public.izmir_new_user();


-- ── 4. Signalements ("signaler une erreur") ────────────────────────────────

create table if not exists public.tickets (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid default auth.uid() references auth.users (id) on delete set null,
  username   text,
  categorie  text not null default 'autre',
  page       text,
  message    text not null check (char_length(message) between 1 and 4000),
  statut     text not null default 'nouveau' check (statut in ('nouveau', 'en cours', 'réglé')),
  reponse    text
);

alter table public.tickets enable row level security;

-- l'auteur, le pseudo et le statut sont remplis par la base, pas par le navigateur
create or replace function public.izmir_ticket_defaults()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.user_id   := auth.uid();
  new.username  := coalesce(public.izmir_username(), 'inconnu');
  new.statut    := 'nouveau';
  new.reponse   := null;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists izmir_ticket_before_insert on public.tickets;
create trigger izmir_ticket_before_insert
before insert on public.tickets
for each row execute function public.izmir_ticket_defaults();

drop policy if exists "izmir: envoyer un ticket" on public.tickets;
create policy "izmir: envoyer un ticket"
on public.tickets for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "izmir: lire ses tickets" on public.tickets;
create policy "izmir: lire ses tickets"
on public.tickets for select
to authenticated
using (user_id = auth.uid() or public.izmir_is_admin());

drop policy if exists "izmir: admin repond aux tickets" on public.tickets;
create policy "izmir: admin repond aux tickets"
on public.tickets for update
to authenticated
using (public.izmir_is_admin())
with check (public.izmir_is_admin());


-- ── 5. Coffre-fort (Storage) ───────────────────────────────────────────────
-- Bucket privé "handouts". Range les fichiers par dossier :
--   handouts/kaadir/lettre.png   → visible par kaadir seulement
--   handouts/brujah/tract.pdf    → visible par tous les joueurs qui ont le tag "brujah"
--   handouts/public/carte.png    → visible par tous les joueurs connectés
-- (le nom du dossier = un tag : identifiant, clan, rôle ou extra_tag, en minuscules)

insert into storage.buckets (id, name, public)
values ('handouts', 'handouts', false)
on conflict (id) do update set public = false;

drop policy if exists "izmir: lire ses handouts" on storage.objects;
create policy "izmir: lire ses handouts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'handouts'
  and (
    lower((storage.foldername(name))[1]) = any(public.izmir_my_tags())
    or public.izmir_is_admin()
  )
);
-- Pas de règle d'envoi : les fichiers s'ajoutent uniquement depuis le tableau de bord Supabase.
