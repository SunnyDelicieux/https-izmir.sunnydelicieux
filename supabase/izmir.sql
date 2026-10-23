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
--  Un événement (colonne permissions) est visible s'il contient "public", ou partage au moins
--  un tag avec le joueur. Sans tag, seul l'admin le voit. Un admin (profiles.is_admin) voit tout.
--  Un joueur ne peut connaître que ses propres tags (l'admin, ceux de tout le monde).
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

-- l'utilisateur connecté est-il admin ? (avant izmir_tags_for, qui s'en sert)
create or replace function public.izmir_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = auth.uid() limit 1), false)
$$;

-- tags d'un compte ("security definer" : lit profiles sans passer par ses règles)
-- on ne peut lire que SES propres tags ; l'admin peut lire ceux de tout le monde (vue joueur)
create or replace function public.izmir_tags_for(uid uuid)
returns text[]
language sql stable security definer
set search_path = public
as $$
  select array['public'] || case
    when uid = auth.uid() or public.izmir_is_admin() then coalesce((
      select array_remove(array[lower(p.username), lower(p.clan), lower(p.role)], null)
             || public.izmir_as_tags(to_jsonb(p.extra_tags))
      from public.profiles p
      where p.user_id = uid
      limit 1
    ), '{}')
    else '{}'::text[]
  end
$$;

-- tags du joueur connecté
create or replace function public.izmir_my_tags()
returns text[]
language sql stable security definer
set search_path = public
as $$
  select public.izmir_tags_for(auth.uid())
$$;

-- LES deux règles de visibilité. Utilisées à la fois par la sécurité (RLS) et par la page
-- "vue joueur" de l'admin : ce que la page montre est donc exactement ce que le joueur reçoit.
create or replace function public.izmir_event_visible_to(perms text[], author uuid, uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  -- sans tag = invisible (sauf pour l'admin, via les règles de sécurité)
  select 'public' = any(coalesce(perms, '{}'))
      or coalesce(perms, '{}') && public.izmir_tags_for(uid)
      or (uid is not null and author = uid)
$$;

create or replace function public.izmir_handout_visible_to(tags text[], author uuid, uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(tags && public.izmir_tags_for(uid), false)
      or (uid is not null and author = uid)
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

-- permissions : texte (un seul tag) -> liste de tags, pour qu'un événement vise plusieurs personnes.
-- "brujah" devient {brujah}, "brujah, limier" devient {brujah,limier}. Fait une seule fois.
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'Calendar' and column_name = 'permissions') = 'text' then
    alter table public."Calendar" alter column permissions type text[] using
      case
        when permissions is null or trim(permissions) = '' then '{}'::text[]
        when trim(permissions) like '[%' then public.izmir_as_tags(permissions::jsonb)
        else public.izmir_as_tags(to_jsonb(string_to_array(permissions, ',')))
      end;
    alter table public."Calendar" alter column permissions set default '{}';
  end if;
end $$;

-- qui a créé l'événement (vide = toi, depuis le tableau de bord)
alter table public."Calendar" add column if not exists author uuid references auth.users (id) on delete set null;
alter table public."Calendar" add column if not exists author_name text;

create policy "izmir: voir les evenements autorises"
on public."Calendar" for select
to anon, authenticated
using (
  public.izmir_event_visible_to(public.izmir_as_tags(to_jsonb(permissions)), author, auth.uid())
  or public.izmir_is_admin()
);
-- Création / modification par les joueurs : section 7.


-- ── 2. Profils ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "izmir: lire son profil" on public.profiles;
create policy "izmir: lire son profil"
on public.profiles for select
to authenticated
using (user_id = auth.uid() or public.izmir_is_admin());
-- Pas de règle update : un joueur ne peut pas se mettre is_admin = true ou changer de clan.

-- badges donnés à la main par la MJ (identifiants, ex : {pigeon}). Les badges automatiques
-- sont calculés par la page (COMPTE/badges.js). Pas de règle update : un joueur ne peut pas
-- se donner un badge lui-même.
alter table public.profiles add column if not exists badges text[] not null default '{}';


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
-- Bucket privé "handouts" : les fichiers des handouts (dossiers lettres/ et joueurs/).
-- Qui peut lire un fichier : ceux qui peuvent lire son handout (section 6 et 7).
-- Il n'y a plus de dossiers au nom d'un tag : tout passe par la page "gérer les handouts".

insert into storage.buckets (id, name, public)
values ('handouts', 'handouts', false)
on conflict (id) do update set public = false;

-- ancienne règle "un dossier par tag" : retirée
drop policy if exists "izmir: lire ses handouts" on storage.objects;


-- ── 6. Lettres (handouts découpés depuis un PDF, page COMPTE/handouts.html) ──
-- Une ligne = une lettre = un fichier dans le bucket "handouts" (dossier lettres/).
-- Qui la voit : ses tags (comme le calendrier). Pour la partager plus tard,
-- il suffit de changer ses tags, le fichier ne bouge pas.

create table if not exists public.handouts (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  titre      text not null,
  path       text not null unique,          -- chemin dans le bucket, ex "lettres/1a2b….pdf"
  tags       text[] not null default '{}',  -- ex {kaadir} ou {brujah,limier}
  source     text,                           -- nom du PDF d'origine
  page       int                             -- numéro de page dans ce PDF
);

alter table public.handouts enable row level security;

drop policy if exists "izmir: lire ses lettres" on public.handouts;
create policy "izmir: lire ses lettres"
on public.handouts for select
to authenticated
using (public.izmir_as_tags(to_jsonb(tags)) && public.izmir_my_tags() or public.izmir_is_admin());

drop policy if exists "izmir: admin gere les lettres" on public.handouts;
create policy "izmir: admin gere les lettres"
on public.handouts for all
to authenticated
using (public.izmir_is_admin())
with check (public.izmir_is_admin());

-- le fichier d'une lettre est lisible par ceux qui ont le droit de lire la lettre
create or replace function public.izmir_can_read_handout(object_path text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.handouts h
    where h.path = object_path
      and public.izmir_as_tags(to_jsonb(h.tags)) && public.izmir_my_tags()
  )
$$;

drop policy if exists "izmir: lire le fichier de ses lettres" on storage.objects;
create policy "izmir: lire le fichier de ses lettres"
on storage.objects for select
to authenticated
using (bucket_id = 'handouts' and public.izmir_can_read_handout(name));

-- envoi et suppression de fichiers depuis le site : admin seulement
drop policy if exists "izmir: admin envoie des handouts" on storage.objects;
create policy "izmir: admin envoie des handouts"
on storage.objects for insert
to authenticated
with check (bucket_id = 'handouts' and public.izmir_is_admin());

drop policy if exists "izmir: admin supprime des handouts" on storage.objects;
create policy "izmir: admin supprime des handouts"
on storage.objects for delete
to authenticated
using (bucket_id = 'handouts' and public.izmir_is_admin());



-- ── 7. Créations des joueurs (événements et handouts) ──────────────────────
-- Un joueur peut créer des événements et des handouts (texte écrit ou fichier),
-- avec ses propres tags (pseudo, clan, rôle, extra_tags, public) et le pseudo de n'importe quel joueur.
-- Il ne peut modifier / supprimer que ce qu'il a créé. L'admin peut tout faire.

-- tags qu'un joueur a le droit d'utiliser
create or replace function public.izmir_allowed_tags()
returns text[]
language sql stable security definer
set search_path = public
as $$
  select public.izmir_my_tags()
         || coalesce((select array_agg(lower(username)) from public.profiles where username is not null), '{}')
$$;

-- liste des pseudos, pour proposer "écrire à …" (joueurs connectés seulement)
create or replace function public.izmir_usernames()
returns setof text
language sql stable security definer
set search_path = public
as $$
  select lower(username) from public.profiles
  where username is not null and auth.uid() is not null
  order by 1
$$;
revoke execute on function public.izmir_usernames() from public, anon;
grant execute on function public.izmir_usernames() to authenticated;

-- l'auteur est rempli par la base (impossible de se faire passer pour quelqu'un d'autre),
-- les tags sont mis en minuscules, et un joueur ne peut pas changer l'image d'un événement
create or replace function public.izmir_event_defaults()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.permissions := public.izmir_as_tags(to_jsonb(new.permissions));
  if auth.uid() is null then return new; end if; -- tableau de bord Supabase
  if tg_op = 'INSERT' then
    if not public.izmir_is_admin() then
      new.author := auth.uid();
      new.author_name := public.izmir_username();
      new.image := null;
    end if;
  else
    new.author := old.author;
    new.author_name := old.author_name;
    if not public.izmir_is_admin() then new.image := old.image; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists izmir_event_before_write on public."Calendar";
create trigger izmir_event_before_write
before insert or update on public."Calendar"
for each row execute function public.izmir_event_defaults();

drop policy if exists "izmir: creer un evenement" on public."Calendar";
create policy "izmir: creer un evenement"
on public."Calendar" for insert
to authenticated
with check (
  public.izmir_is_admin()
  or (author = auth.uid()
      and cardinality(permissions) > 0
      and permissions <@ public.izmir_allowed_tags())
);

drop policy if exists "izmir: modifier son evenement" on public."Calendar";
create policy "izmir: modifier son evenement"
on public."Calendar" for update
to authenticated
using (public.izmir_is_admin() or author = auth.uid())
with check (
  public.izmir_is_admin()
  or (author = auth.uid()
      and cardinality(permissions) > 0
      and permissions <@ public.izmir_allowed_tags())
);

drop policy if exists "izmir: supprimer son evenement" on public."Calendar";
create policy "izmir: supprimer son evenement"
on public."Calendar" for delete
to authenticated
using (public.izmir_is_admin() or author = auth.uid());

-- handouts des joueurs : texte écrit (contenu) ou fichier (path, dans joueurs/<son id>/)
alter table public.handouts add column if not exists author uuid references auth.users (id) on delete set null;
alter table public.handouts add column if not exists author_name text;
alter table public.handouts add column if not exists contenu text check (char_length(contenu) <= 20000);
alter table public.handouts alter column path drop not null;

create or replace function public.izmir_handout_defaults()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.tags := public.izmir_as_tags(to_jsonb(new.tags));
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not public.izmir_is_admin() then
      new.author := auth.uid();
      new.author_name := public.izmir_username();
    end if;
  else
    new.author := old.author;
    new.author_name := old.author_name;
    new.path := old.path; -- le fichier ne change pas
  end if;
  return new;
end;
$$;

drop trigger if exists izmir_handout_before_write on public.handouts;
create trigger izmir_handout_before_write
before insert or update on public.handouts
for each row execute function public.izmir_handout_defaults();

drop policy if exists "izmir: lire ses lettres" on public.handouts;
create policy "izmir: lire ses lettres"
on public.handouts for select
to authenticated
using (
  public.izmir_handout_visible_to(public.izmir_as_tags(to_jsonb(tags)), author, auth.uid())
  or public.izmir_is_admin()
);

drop policy if exists "izmir: creer un handout" on public.handouts;
create policy "izmir: creer un handout"
on public.handouts for insert
to authenticated
with check (
  author = auth.uid()
  and cardinality(tags) > 0
  and tags <@ public.izmir_allowed_tags()
  and (path is null or path like 'joueurs/' || auth.uid()::text || '/%')
  and (path is not null or coalesce(trim(contenu), '') <> '')
);

drop policy if exists "izmir: modifier son handout" on public.handouts;
create policy "izmir: modifier son handout"
on public.handouts for update
to authenticated
using (author = auth.uid())
with check (author = auth.uid() and cardinality(tags) > 0 and tags <@ public.izmir_allowed_tags());

drop policy if exists "izmir: supprimer son handout" on public.handouts;
create policy "izmir: supprimer son handout"
on public.handouts for delete
to authenticated
using (author = auth.uid());

-- fichier d'un handout : lisible aussi par son auteur
create or replace function public.izmir_can_read_handout(object_path text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.handouts h
    where h.path = object_path
      and public.izmir_handout_visible_to(public.izmir_as_tags(to_jsonb(h.tags)), h.author, auth.uid())
  )
$$;

-- fichiers des joueurs : chacun dans joueurs/<son id>/
drop policy if exists "izmir: joueur envoie ses fichiers" on storage.objects;
create policy "izmir: joueur envoie ses fichiers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'handouts' and name like 'joueurs/' || auth.uid()::text || '/%');

drop policy if exists "izmir: joueur supprime ses fichiers" on storage.objects;
create policy "izmir: joueur supprime ses fichiers"
on storage.objects for delete
to authenticated
using (bucket_id = 'handouts' and name like 'joueurs/' || auth.uid()::text || '/%');

-- taille et type des fichiers acceptés (10 Mo, images et PDF)
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'handouts';



-- ── 8. Vue joueur (page admin COMPTE/vue-joueur.html) ──────────────────────
-- Tout ce qu'un joueur donné peut voir : événements et handouts.
-- Calculé avec les mêmes fonctions que les règles de sécurité. Réservé à l'admin.

create or replace function public.izmir_vue_joueur(target uuid)
returns table (genre text, id bigint, titre text, jour date, tags text[], auteur text, chemin text)
language sql stable security definer
set search_path = public
as $$
  with cible as (
    select coalesce((select p.is_admin from public.profiles p where p.user_id = target limit 1), false) as admin
  )
  select 'evenement', c.id, c.titre, c.date::date, public.izmir_as_tags(to_jsonb(c.permissions)), c.author_name, null
  from public."Calendar" c, cible
  where public.izmir_is_admin()
    and (cible.admin or public.izmir_event_visible_to(public.izmir_as_tags(to_jsonb(c.permissions)), c.author, target))
  union all
  select 'handout', h.id, h.titre, h.created_at::date, h.tags, h.author_name, h.path
  from public.handouts h, cible
  where public.izmir_is_admin()
    and (cible.admin or public.izmir_handout_visible_to(public.izmir_as_tags(to_jsonb(h.tags)), h.author, target))
$$;
revoke execute on function public.izmir_vue_joueur(uuid) from public, anon;
grant execute on function public.izmir_vue_joueur(uuid) to authenticated;
