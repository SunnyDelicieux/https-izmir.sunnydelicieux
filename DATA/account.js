// Compte joueur : bouton de connexion à côté de la barre de recherche, sur toutes les pages.
// Chargé par DATA/search.js (ou directement par une page qui en a besoin, ex : le calendrier).
//
// Les pages s'en servent via window.izmirAccount :
//   izmirAccount.onChange(fn)  -> fn({ client, user, profile, tags, isAdmin }) à chaque connexion / déconnexion
//   izmirAccount.load()        -> Promise du client Supabase (déjà connecté si une session existe)
//
// Les comptes sont créés à la main dans Supabase (identifiant@izmir.local) : ici on ne fait que se connecter.
// La sécurité (qui voit quoi) est faite côté Supabase par les règles RLS : supabase/izmir.sql
(function () {
  if (window.izmirAccount) return;

  const SUPABASE_URL = "https://bbxuycsmyowwsjrcdrsd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_IvC70lWI8ymTVMaAnF76Uw_9CEKbexj";
  const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const LOGIN_DOMAIN = "izmir.local";
  // la clé où Supabase garde la session dans le navigateur
  const SESSION_KEY = "sb-bbxuycsmyowwsjrcdrsd-auth-token";

  const norm = (s) => (s || "").toString().toLowerCase().trim();

  let clientPromise = null;
  let state = { client: null, user: null, profile: null, tags: ["public"], isAdmin: false };
  let started = false; // true une fois la première session lue
  const listeners = [];

  function hasStoredSession() {
    try { return !!localStorage.getItem(SESSION_KEY); } catch (e) { return false; }
  }

  // supabase-js n'est téléchargé que si on en a besoin (session existante, page de compte, clic sur connexion)
  function load() {
    if (clientPromise) return clientPromise;
    clientPromise = new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve();
      const s = document.createElement("script");
      s.src = SUPABASE_JS;
      s.onload = resolve;
      s.onerror = () => reject(new Error("supabase-js introuvable"));
      document.head.appendChild(s);
    }).then(() => {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      state.client = client;
      return new Promise((resolve) => {
        client.auth.onAuthStateChange((event, session) => {
          // pas d'appel Supabase directement dans ce rappel (ça bloque supabase-js) : on décale
          setTimeout(async () => {
            await applySession(session);
            resolve(client);
          }, 0);
        });
      });
    });
    return clientPromise;
  }

  let appliedUserId; // compte en cours d'application (mis à jour tout de suite, avant toute attente)

  async function applySession(session) {
    const user = session?.user || null;
    // Supabase envoie souvent deux signaux d'affilée au chargement (session retrouvée, puis connecté) :
    // le second arrive pendant qu'on lit encore le profil. On compare donc au compte déjà en cours,
    // pas à celui déjà affiché, sinon tout serait chargé deux fois.
    const changed = (user?.id || null) !== (appliedUserId ?? null);
    if (started && !changed) return; // même compte : simple rafraîchissement du jeton
    started = true;
    appliedUserId = user?.id || null;

    let profile = null;
    if (user) {
      const { data } = await state.client
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      profile = data || null;
    }

    const username = profile?.username || (user ? user.email.split("@")[0] : null);
    state = {
      client: state.client,
      user,
      profile: profile && { ...profile, username },
      username,
      isAdmin: !!profile?.is_admin,
      tags: user
        ? ["public", username, profile?.clan, profile?.role, ...(Array.isArray(profile?.extra_tags) ? profile.extra_tags : [])]
            .map(norm).filter(Boolean)
        : ["public"],
    };

    // pas de nouveau dessin si rien n'a changé : le formulaire de connexion ouvert reste tel quel
    if (changed) renderWidget();
    for (const fn of listeners) fn(state);
  }

  function onChange(fn) {
    load().then(() => {
      listeners.push(fn);
      fn(state);
    }).catch((err) => {
      console.error(err);
      fn({ ...state, error: err });
    });
  }

  async function signIn(login, password) {
    const client = await load();
    const email = login.includes("@") ? login : `${norm(login)}@${LOGIN_DOMAIN}`;
    const { error } = await client.auth.signInWithPassword({ email, password });
    return !error;
  }

  async function signOut() {
    const client = await load();
    await client.auth.signOut();
  }

  window.izmirAccount = { load, onChange, signIn, signOut, get state() { return state; } };

  // ── Widget ────────────────────────────────────────────────────────────────

  const CSS = `
#iz-topbar {
  position: fixed; top: 10px; right: 10px; z-index: 9999;
  display: flex; gap: 6px; align-items: flex-start;
  max-width: calc(100vw - 20px);
}
.iza-box {
  position: relative; flex: none;
  font: 12px/1.3 Arial, Tahoma, Verdana, sans-serif; letter-spacing: 0.3px;
}
.iza-btn {
  display: block; padding: 6px 10px; min-width: 96px; cursor: pointer;
  background: rgba(28, 18, 8, 0.95); color: #c09050;
  border: 1px solid #3a2810; border-radius: 0;
  font: italic 12px Georgia, serif; letter-spacing: 0.5px; text-align: left;
  white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis;
}
.iza-btn::after { content: " ▾"; font-size: 8px; color: #7a5028; }
.iza-box:hover .iza-btn, .iza-box.iza-open .iza-btn, .iza-btn:focus-visible { border-color: #c09050; color: #d4aa72; outline: none; }
.iza-panel {
  display: none; position: absolute; top: 100%; right: 0; margin-top: 2px;
  min-width: 170px; padding: 6px 4px 4px;
  background: rgba(28, 18, 8, 0.97); border: 1px solid #3a2810;
}
.iza-box.iza-open .iza-panel,
.iza-box.iza-logged:hover .iza-panel,
.iza-box.iza-logged:focus-within .iza-panel { display: block; }
/* petit pont invisible : la souris peut descendre du bouton au menu sans le fermer */
.iza-panel::before { content: ""; position: absolute; left: 0; right: 0; top: -4px; height: 4px; }
.iza-panel a, .iza-panel button.iza-item {
  display: block; width: 100%; padding: 5px 8px; text-align: left;
  color: #c8b898; background: none; border: none; cursor: pointer;
  font: italic 12px Georgia, serif; letter-spacing: 0.5px; text-transform: lowercase;
  text-decoration: none; white-space: nowrap;
}
.iza-panel a:hover, .iza-panel button.iza-item:hover,
.iza-panel a:focus-visible, .iza-panel button.iza-item:focus-visible { color: #d4aa72; background: #2e1e0e; outline: none; }
.iza-sep { border-top: 1px dotted #4a3018; margin: 4px 6px; }
.iza-who { padding: 2px 8px 6px; font-size: 10px; color: #a07840; }
.iza-who:empty { display: none; }
.iza-form { display: flex; flex-direction: column; gap: 4px; padding: 2px 4px 4px; }
.iza-form input {
  width: 100%; box-sizing: border-box; padding: 6px 8px;
  background: #1e1408; color: #e8dcc0; border: 1px solid #3a2810; outline: none; font: inherit;
}
.iza-form input::placeholder { color: #a08a68; }
.iza-form input:focus { border-color: #c09050; }
.iza-form button {
  padding: 5px 8px; cursor: pointer;
  background: #2e1e0e; color: #c09050; border: 1px solid #4a3018;
  font: italic 12px Georgia, serif;
}
.iza-form button:hover { color: #d4aa72; border-color: #c09050; }
.iza-msg { min-height: 1em; font-size: 10px; color: #a07840; }

body.light .iza-btn, body.light .iza-panel { background: rgba(245, 232, 215, 0.98); border-color: #c8906a; color: #8b4a18; }
body.light .iza-btn::after { color: #c8906a; }
body.light .iza-box:hover .iza-btn, body.light .iza-box.iza-open .iza-btn { border-color: #8b4a18; color: #b86030; }
body.light .iza-panel a, body.light .iza-panel button.iza-item { color: #2a1a0e; }
body.light .iza-panel a:hover, body.light .iza-panel button.iza-item:hover { color: #8b4a18; background: #ead8c0; }
body.light .iza-sep { border-top-color: #c8906a; }
body.light .iza-who, body.light .iza-msg { color: #7a5a3e; }
body.light .iza-form input { background: #fbf5ec; color: #2a1a0e; border-color: #c8906a; }
body.light .iza-form input::placeholder { color: #8b6a4a; }
body.light .iza-form input:focus { border-color: #8b4a18; }
body.light .iza-form button { background: #dfc0a0; color: #2a1a0e; border-color: #c8906a; }
body.light .iza-form button:hover { background: #cfaa88; border-color: #8b4a18; }

/* ── Coin haut-droit du bandeau du site (header.html) : même allure que les onglets du menu ── */
.iza-box--navi { position: absolute; top: 8px; right: 8px; z-index: 50; font-family: Arial, Tahoma, Verdana, sans-serif; }
.iza-box--navi .iza-btn {
  padding: 5px 12px; min-width: 0; max-width: 200px; text-align: center;
  color: #ecdfc8; background: var(--iz-button, #2e1e0e);
  border: 1px solid var(--iz-border-strong, #4a3018); border-radius: 4px;
  font: italic 14px georgia, serif; text-transform: lowercase; letter-spacing: 1px;
  transition: 0.2s ease;
}
.iza-box--navi .iza-btn::after { color: var(--iz-accent-dim, #7a5028); }
.iza-box--navi:hover .iza-btn, .iza-box--navi.iza-open .iza-btn { color: #d4aa72; background: #1e1208; border-color: var(--iz-border-strong, #4a3018); }
/* comme les autres onglets : s'ouvre au survol, et reste ouvert pendant qu'on tape */
.iza-box--navi:hover .iza-panel, .iza-box--navi:focus-within .iza-panel { display: block; }
.iza-box--navi .iza-panel {
  z-index: 100; margin-top: 0; padding: 6px 4px 4px; min-width: 180px;
  background: #1e1208; border: 1px solid var(--iz-border-strong, #4a3018); border-radius: 4px;
}
.iza-box--navi .iza-panel a, .iza-box--navi .iza-panel button.iza-item { border-radius: 3px; padding: 4px 8px; }
.iza-box--navi .iza-panel a:hover, .iza-box--navi .iza-panel button.iza-item:hover { background: var(--iz-button, #2e1e0e); }
body.light .iza-box--navi .iza-btn { color: #2a1a0e; background: #dfc0a0; border-color: #c8906a; }
body.light .iza-box--navi:hover .iza-btn, body.light .iza-box--navi.iza-open .iza-btn { color: #150d05; background: #cfaa88; border-color: #a86840; }
body.light .iza-box--navi .iza-panel { background: #f0e0cc; border-color: #c8906a; }
body.light .iza-box--navi .iza-panel a, body.light .iza-box--navi .iza-panel button.iza-item { color: #3a2010; }
body.light .iza-box--navi .iza-panel a:hover, body.light .iza-box--navi .iza-panel button.iza-item:hover { background: #dfc0a0; color: #150d05; }
@media (max-width: 768px) {
  .iza-box--navi .iza-btn { max-width: 120px; padding: 4px 10px; font-size: 13px; }
}

/* ── Dans la barre du wiki (WIKI/nav.js) : à côté du bouton jour/nuit ── */
.iza-box--wiki { margin-left: -20px; align-self: center; } /* la barre du wiki espace ses éléments de 28px : on se colle au bouton jour/nuit */
.iza-box--wiki .iza-btn {
  height: 28px; box-sizing: border-box; padding: 0 12px; min-width: 0; max-width: 150px;
  font: 13px/26px Arial, Tahoma, Verdana, sans-serif; letter-spacing: 0;
  color: var(--iz-accent, #c09050); background: var(--iz-button, #2e1e0e);
  border: 1px solid var(--iz-border-strong, #4a3018); border-radius: var(--iz-radius, 4px);
}
.iza-box--wiki:hover .iza-btn, .iza-box--wiki.iza-open .iza-btn { color: var(--iz-accent-hover, #d4aa72); border-color: var(--iz-accent, #c09050); }
.iza-box--wiki .iza-panel { margin-top: 6px; border-radius: var(--iz-radius, 4px); }
.iza-box--wiki .iza-panel::before { top: -8px; height: 8px; }
/* la barre du wiki reste sombre en mode jour : le bouton aussi */
body.light .iza-box--wiki .iza-btn { color: var(--iz-accent, #c09050); background: var(--iz-button, #2e1e0e); border-color: var(--iz-border-strong, #4a3018); }
@media screen and (max-width: 700px) {
  .iza-box--wiki { position: absolute; top: 12px; left: 128px; margin: 0; }
  .iza-box--wiki .iza-btn { max-width: 80px; padding: 0 8px; }
  .iza-box--wiki .iza-panel { left: 0; right: auto; }
}
`;

  let box = null;

  // barre fixe en haut à droite, partagée avec la recherche (DATA/search.js)
  function topbar() {
    let bar = document.getElementById("iz-topbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "iz-topbar";
      document.body.appendChild(bar);
    }
    return bar;
  }

  // Où mettre le bouton :
  //   pages du site  -> coin haut-droit du bandeau (header.html, injecté par DATA/izmir.js)
  //   pages du wiki  -> dans la barre du wiki, à côté du bouton jour/nuit (WIKI/nav.js)
  //   autres pages   -> en haut à droite, à côté de la recherche
  function place() {
    const siteHeader = document.getElementById("site-header");
    const wikiHeader = document.querySelector("header-component");
    const host = siteHeader || wikiHeader;

    const tryPlace = () => {
      const navi = siteHeader?.querySelector(".navi");
      const wikinav = wikiHeader?.querySelector(".wikinav");
      if (navi) {
        // dans le coin haut-droit du bandeau du site : ne prend pas de place dans le menu,
        // qui passerait sinon à la ligne avec un pseudo un peu long
        box.className = box.className.replace(/iza-box--\w+/g, "") + " iza-box--navi";
        siteHeader.style.position = "relative";
        siteHeader.appendChild(box);
      } else if (wikinav) {
        box.className = box.className.replace(/iza-box--\w+/g, "") + " iza-box--wiki";
        const toggle = wikinav.querySelector("#theme-toggle");
        toggle ? toggle.after(box) : wikinav.appendChild(box);
      } else {
        return false;
      }
      return true;
    };

    if (host && tryPlace()) return;
    if (host) {
      // le menu arrive un peu après (chargé à part) : en attendant, on n'affiche rien
      const obs = new MutationObserver(() => { if (tryPlace()) obs.disconnect(); });
      obs.observe(host, { childList: true, subtree: true });
      // menu introuvable au bout de 3 s : retour en haut à droite
      setTimeout(() => { if (!box.isConnected) { obs.disconnect(); topbar().prepend(box); } }, 3000);
      return;
    }
    topbar().prepend(box);
  }

  function renderWidget() {
    if (!box) return;
    box.classList.remove("iza-open");
    box.classList.toggle("iza-logged", !!state.user);

    if (state.user) {
      const pageUrl = encodeURIComponent(location.pathname + location.hash);
      box.innerHTML = `
        <button class="iza-btn" type="button" aria-haspopup="true"></button>
        <div class="iza-panel" role="menu">
          <div class="iza-who"></div>
          <a href="/COMPTE/evenements.html" role="menuitem">mes événements</a>
          <a href="/COMPTE/signaler.html?page=${pageUrl}" role="menuitem">signaler une erreur</a>
          <a href="/COMPTE/coffre.html" role="menuitem">coffre-fort</a>
          ${state.isAdmin ? '<a href="/COMPTE/handouts.html" role="menuitem">gérer les handouts</a>' : ""}
          <div class="iza-sep"></div>
          <button class="iza-item" type="button" data-logout role="menuitem">déconnexion</button>
        </div>`;
      box.querySelector(".iza-btn").textContent = state.username;
      box.querySelector(".iza-who").textContent =
        state.isAdmin ? "MJ" : [state.profile?.clan, state.profile?.role].filter(Boolean).join(" · ");
      box.querySelector("[data-logout]").addEventListener("click", signOut);
    } else {
      box.innerHTML = `
        <button class="iza-btn" type="button" aria-haspopup="true">connexion</button>
        <div class="iza-panel">
          <form class="iza-form">
            <input name="login" type="text" autocomplete="username" placeholder="identifiant…" aria-label="Identifiant" required>
            <input name="password" type="password" autocomplete="current-password" placeholder="mot de passe…" aria-label="Mot de passe" required>
            <button type="submit">se connecter</button>
            <div class="iza-msg" aria-live="polite"></div>
          </form>
        </div>`;
      const form = box.querySelector("form");
      const msg = box.querySelector(".iza-msg");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "connexion…";
        const ok = await signIn(form.login.value.trim(), form.password.value);
        if (!ok) msg.textContent = "identifiants invalides";
      });
    }

    // clic sur le bouton : ouvre / ferme (utile au tactile, où il n'y a pas de survol)
    box.querySelector(".iza-btn").addEventListener("click", () => {
      const open = box.classList.toggle("iza-open");
      if (open && !state.user) {
        load();
        box.querySelector("input")?.focus();
      }
    });
  }

  function init() {
    if (box) return;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    box = document.createElement("div");
    box.className = "iza-box";
    place();
    renderWidget();

    // clic ailleurs ou Échap : on referme
    document.addEventListener("click", (e) => {
      if (!box.contains(e.target)) box.classList.remove("iza-open");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") box.classList.remove("iza-open");
    });

    if (hasStoredSession()) load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
