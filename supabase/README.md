# Supabase : mise en place

À faire **dans cet ordre**, avant de mettre le site en ligne (sinon le calendrier n'affichera
plus aucun événement privé, ou les affichera à tout le monde).

## 1. Fermer les inscriptions

Authentication → Sign In / Providers → décocher **Allow new users to sign up**.
La clé publique est dans le code du site : sans ça, n'importe qui peut se créer un compte.

## 2. Règles de sécurité

SQL Editor → coller `izmir.sql` → Run. Le script peut être relancé sans risque.

Puis Database → Policies : sur `Calendar` et `profiles`, **supprime les anciennes règles**
(tout ce qui ne commence pas par `izmir:`), surtout celles qui laissent `anon` tout lire
ou modifier. Les règles s'additionnent : une vieille règle « tout le monde voit tout »
annule les nouvelles.

Test rapide : déconnecté, la page calendrier ne doit montrer que les événements publics,
et l'onglet Réseau du navigateur ne doit plus contenir les autres.

## 3. Créer un compte joueur

Authentication → Users → Add user → `pseudo@izmir.local` + mot de passe, **Auto Confirm**.
Une ligne `profiles` est créée toute seule (`username` = pseudo) : il reste à remplir
`clan`, `role`, `extra_tags` dans Table Editor. `is_admin = true` pour ton compte.

Le joueur se connecte avec `pseudo` + mot de passe, en haut à droite de n'importe quelle page.

## 4. Coffre-fort

Storage → bucket `handouts` (créé par le script, privé). Un dossier par tag, **en minuscules** :

| dossier | qui le voit |
|---|---|
| `kaadir/` | le joueur kaadir |
| `brujah/` | tous les joueurs avec le tag brujah (clan, rôle ou extra_tags) |
| `public/` | tous les joueurs connectés |

Les liens donnés aux joueurs expirent au bout d'une heure.

## 5. Mail à chaque signalement

1. Crée un compte sur [resend.com](https://resend.com) et une clé API. Sans domaine à toi,
   Resend n'envoie qu'à l'adresse de ton compte Resend, ce qui suffit ici.
2. Edge Functions → Deploy a new function → nom `ticket-mail` → coller
   `functions/ticket-mail/index.ts`. Désactive **Verify JWT** (le webhook est protégé par son propre secret).
3. Edge Functions → Secrets : `RESEND_API_KEY`, `ADMIN_EMAIL`, `WEBHOOK_SECRET` (un mot de passe au hasard),
   et si tu veux `SITE_URL` (adresse du site, pour un lien cliquable).
4. Database → Webhooks → Create : table `tickets`, événement **Insert**, type **Supabase Edge Functions**,
   fonction `ticket-mail`, en-tête HTTP `x-izmir-secret` = la même valeur que `WEBHOOK_SECRET`.

Même sans le mail, les signalements sont visibles sur `/COMPTE/signaler.html` quand tu te
connectes avec le compte admin : tu peux y répondre et changer leur statut.
