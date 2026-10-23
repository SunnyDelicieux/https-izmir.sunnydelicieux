// Onglet « ressources » de l'espace joueur : les ressources du clan du joueur.
// Les données sont dans Supabase (tables ressources et ressources_sources, supabase/izmir.sql,
// section 9) : chaque joueur ne reçoit que celles de son clan, l'admin reçoit tout.
// Elles se modifient dans Supabase → Table Editor, jamais dans ce fichier (le dépôt est public).
//
// Mode test (pour essayer l'affichage sans Supabase) : ouvrir /COMPTE/?test#ressources.
// La page lit alors les données écrites à la main dans COMPTE/ressources-test.js :
//   window.RESSOURCES_TEST = { ressources: [ {clan, ressource, etat, valeur_max, disponible,
//     stress, seuil, notes}, … ], sources: [ {clan, ressource, valeur, source, description}, … ] };
// Ce fichier reste sur ton ordi : il est dans .gitignore et n'est jamais envoyé sur GitHub.
(function () {
  const gate = document.getElementById("re-gate");
  const content = document.getElementById("re-content");
  const listBox = document.getElementById("re-list");
  const clanTitle = document.getElementById("re-clan");
  const clanLinks = document.getElementById("re-clans");
  const clanSide = document.getElementById("re-clans-box");
  const detail = document.getElementById("re-detail");
  if (!gate || !content || !listBox || !detail || !window.izmirAccount) return;

  let rows = [];
  let sources = [];
  let clanActif = null;

  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ●●○ : points disponibles pleins, points engagés vides
  function pips(plein, total, cls) {
    const box = el("span", "re-pips " + (cls || ""));
    for (let i = 0; i < total; i++) box.appendChild(el("i", i < plein ? "on" : "off"));
    return box;
  }

  const signe = (v) => (v == null ? "" : v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");

  function carte(r) {
    const card = el("div", "note re-card");
    const head = el("div", "re-head");
    head.appendChild(el("div", "title re-name", r.ressource));
    if (r.etat) head.appendChild(el("span", "re-etat", r.etat));
    card.appendChild(head);

    const stats = el("div", "re-stats");
    if (r.valeur_max != null) {
      const dispo = el("div", "re-stat");
      dispo.appendChild(el("span", "re-label", "disponible"));
      dispo.appendChild(pips(r.disponible ?? r.valeur_max, r.valeur_max));
      dispo.appendChild(el("span", "re-num", `${r.disponible ?? r.valeur_max} / ${r.valeur_max}`));
      stats.appendChild(dispo);
    }
    if (r.seuil != null) {
      const stress = r.stress || 0;
      const critique = stress >= r.seuil;
      const st = el("div", "re-stat" + (critique ? " critique" : ""));
      st.appendChild(el("span", "re-label", "stress"));
      st.appendChild(pips(stress, r.seuil, "stress"));
      st.appendChild(el("span", "re-num", `${stress} / ${r.seuil}` + (critique ? " · critique" : "")));
      stats.appendChild(st);
    }
    if (stats.childNodes.length) card.appendChild(stats);
    if (r.notes) card.appendChild(el("div", "re-notes", r.notes));

    // provenance : un bouton dans la carte, les détails s'affichent sous la grille
    const src = sourcesDe(r);
    if (src.length) {
      const btn = el("button", "re-src-btn", `provenance (${src.length})`);
      btn.type = "button";
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", () => montrer(ouverte === r.ressource ? null : r.ressource));
      card.appendChild(btn);
      card.dataset.ressource = r.ressource;
    }
    return card;
  }

  let ouverte = null; // ressource dont la provenance est affichée

  function sourcesDe(r) {
    return sources.filter((s) => norm(s.clan) === norm(r.clan) && norm(s.ressource) === norm(r.ressource));
  }

  // affiche (ou referme) la provenance d'une ressource, juste sous la ligne de cartes qui la contient
  function montrer(nom) {
    ouverte = nom;
    // position à l'écran de la carte cliquée, pour qu'elle ne saute pas sous la souris
    const cible = nom && listBox.querySelector(`.re-card[data-ressource="${CSS.escape(nom)}"]`);
    const avant = cible ? cible.getBoundingClientRect().top : null;
    for (const c of listBox.querySelectorAll(".re-card")) {
      const actif = !!nom && c.dataset.ressource === nom;
      c.classList.toggle("re-actif", actif);
      c.querySelector(".re-src-btn")?.setAttribute("aria-expanded", String(actif));
    }
    detail.innerHTML = "";
    detail.remove(); // retiré de la grille avant de mesurer les lignes
    const r = nom && rows.find((x) => norm(x.clan) === clanActif && x.ressource === nom);
    detail.hidden = !r;
    if (!r) return;
    const head = el("div", "re-detail-head");
    head.appendChild(el("div", "title", `provenance · ${r.ressource}`));
    const fermer = el("button", "re-src-btn", "fermer");
    fermer.type = "button";
    fermer.addEventListener("click", () => montrer(null));
    head.appendChild(fermer);
    detail.appendChild(head);
    const liste = el("div", "re-src-list");
    for (const s of sourcesDe(r)) {
      const li = el("div", "re-source");
      li.appendChild(el("span", "re-val" + ((s.valeur || 0) < 0 ? " neg" : ""), signe(s.valeur)));
      const txt = el("div", "re-src-txt");
      txt.appendChild(el("b", null, s.source));
      if (s.description) txt.appendChild(el("div", "re-src-desc", s.description));
      li.appendChild(txt);
      liste.appendChild(li);
    }
    detail.appendChild(liste);

    // dernière carte de la ligne où se trouve la ressource ouverte : l'encadré se place après elle
    const cartes = [...listBox.querySelectorAll(".re-card")];
    const active = cartes.find((c) => c.dataset.ressource === nom);
    const ligne = cartes.filter((c) => Math.abs(c.offsetTop - active.offsetTop) < 2);
    ligne[ligne.length - 1].after(detail);
    // l'ancien encadré était au-dessus : la carte est remontée, on compense le défilement
    if (avant != null) {
      const ecart = active.getBoundingClientRect().top - avant;
      if (Math.abs(ecart) > 1) scrollBy(0, ecart);
    }

    // si l'encadré sort de l'écran, on le fait apparaître
    const b = detail.getBoundingClientRect();
    if (b.top > innerHeight || b.bottom < 0) detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // la largeur change (fenêtre, téléphone tourné) : les lignes aussi, on replace l'encadré
  let attente = null;
  addEventListener("resize", () => {
    clearTimeout(attente);
    attente = setTimeout(() => { if (ouverte) montrer(ouverte); }, 150);
  });

  function render() {
    const clans = [...new Set(rows.map((r) => norm(r.clan)))].sort();
    if (!clans.includes(clanActif)) clanActif = clans[0] || null;

    // l'admin voit tous les clans : un bouton par clan dans la colonne de gauche
    clanSide.hidden = clans.length < 2;
    clanLinks.innerHTML = "";
    for (const c of clans) {
      const b = el("button", "tag" + (c === clanActif ? " active" : ""), c);
      b.type = "button";
      b.addEventListener("click", () => { clanActif = c; render(); });
      clanLinks.appendChild(b);
    }

    listBox.innerHTML = "";
    ouverte = null;
    detail.hidden = true;
    detail.innerHTML = "";
    clanTitle.textContent = clanActif ? `ressources ${clanActif}` : "";
    const mine = rows.filter((r) => norm(r.clan) === clanActif);
    if (!mine.length) {
      listBox.appendChild(el("div", "muted", "Aucune ressource enregistrée pour ton clan pour l'instant."));
      return;
    }
    for (const r of mine) listBox.appendChild(carte(r));
  }

  async function load(client) {
    const [a, b] = await Promise.all([
      client.from("ressources").select("*").order("ordre").order("id"),
      client.from("ressources_sources").select("*").order("ordre").order("id"),
    ]);
    if (a.error) {
      console.error(a.error);
      gate.hidden = false;
      content.hidden = true;
      gate.textContent = /does not exist|schema cache/i.test(a.error.message || "")
        ? "Les ressources ne sont pas encore installées (supabase/izmir.sql, section 9)."
        : "Impossible de charger les ressources.";
      return;
    }
    rows = a.data || [];
    sources = b.error ? [] : b.data || [];
    gate.hidden = true;
    content.hidden = false;
    render();
  }

  // mode test : données écrites à la main, pas de Supabase ni de connexion
  if (new URLSearchParams(location.search).has("test")) {
    const script = document.createElement("script");
    script.src = "/COMPTE/ressources-test.js";
    script.onload = () => {
      const d = window.RESSOURCES_TEST || {};
      rows = d.ressources || [];
      sources = d.sources || [];
      gate.hidden = true;
      content.hidden = false;
      render();
    };
    script.onerror = () => {
      gate.hidden = false;
      gate.textContent = "Mode test : le fichier COMPTE/ressources-test.js est introuvable.";
    };
    document.head.appendChild(script);
    return;
  }

  izmirAccount.onChange((acc) => {
    rows = [];
    sources = [];
    if (!acc.user) {
      gate.hidden = false;
      content.hidden = true;
      clanSide.hidden = true;
      gate.textContent = "Connecte-toi pour voir les ressources de ton clan.";
      return;
    }
    clanActif = norm(acc.profile?.clan) || null;
    gate.hidden = false;
    gate.textContent = "chargement…";
    load(acc.client);
  });
})();
