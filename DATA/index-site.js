// Index du site (SITE/index.html) : toutes les pages, rangées par rubrique.
// La liste vient de DATA/search-index.js (régénérée automatiquement à chaque envoi sur main) :
// une nouvelle page apparaît ici toute seule, dans la rubrique de son dossier.
(function () {
  const box = document.getElementById("index-site");
  const filter = document.getElementById("index-filtre");
  const compte = document.getElementById("index-compte");
  const sommaire = document.getElementById("index-sommaire");
  if (!box) return;

  // rubriques, dans l'ordre d'affichage ; "match" dit quelles pages y vont (d'après leur dossier)
  const RUBRIQUES = [
    { titre: "le site", match: (p) => p.url === "/" || p.url === "/accueil.html" },
    { titre: "la ville", match: (p) => ["/WIKI/", "/WIKI/autre/chrono.html", "/WIKI/autre/assamite.html"].includes(p.url) },
    { titre: "les clans", match: (p) =>
        p.url === "/WIKI/autre/clan.html" ||
        ["WIKI/brujah", "WIKI/toreador", "WIKI/toreador/info", "WIKI/tremere", "WIKI/ventrue"].includes(p.folder) ||
        (p.folder === "WIKI" && ["brujah", "tremere", "ventrue"].includes(p.name)) },
    { titre: "personnages", match: (p) => p.url === "/WIKI/fiche/" },
    { titre: "personnages · brujah", match: (p) => p.folder === "WIKI/brujah/pnj" },
    { titre: "personnages · toreador", match: (p) => p.folder === "WIKI/toreador/pnj" },
    { titre: "personnages · tremere", match: (p) => p.folder === "WIKI/tremere/pnj" },
    { titre: "personnages · ventrue", match: (p) => p.folder === "WIKI/ventrue/pnj" },
    { titre: "personnages · autres", match: (p) => p.folder === "WIKI/autre/pnj" },
    { titre: "rencontres", match: (p) => ["/INGA/", "/ELYSIUM/"].includes(p.url) },
    { titre: "créer son personnage", match: (p) => p.folder === "SITE/CREATION" && ["creation", "groupes", "objectif"].includes(p.name) },
    { titre: "créer l'environnement", match: (p) => p.folder === "SITE/CREATION" },
    { titre: "système", match: (p) => p.folder === "SITE/SYSTEME" },
    { titre: "outils", match: (p) => p.folder === "SITE/OUTILS" || ["/JOURNAL/", "/GALLERIE/"].includes(p.url) },
    { titre: "organisation", match: (p) => p.folder === "SITE/ORGANISATION" },
    { titre: "le blog", match: (p) => p.folder === "newblog" },
  ];

  // pages qui ne sont pas des fichiers html à part
  const EN_PLUS = [
    { rubrique: "outils", titre: "Calendrier", url: "/COMPTE/#calendrier" },
    { rubrique: "outils", titre: "Coffre-fort", url: "/COMPTE/#coffre" },
    { rubrique: "outils", titre: "Signaler une erreur", url: "/COMPTE/#signaler" },
  ];

  // pages qu'on ne liste pas : cette page, l'ancien index du wiki, redirections, modèles de page
  const IGNORER = (p) =>
    p.url === "/SITE/" || p.url === "/SITE/index.html" || p.url === "/WIKI/liste.html" ||
    p.folder === "SITE/CALENDAR" ||
    (p.headings || []).includes("Le titre de la page");

  // titres plus parlants que le nom de fichier
  const NOMS = {
    "/": "Hub", "/accueil.html": "Accueil du site", "/WIKI/": "La ville d'Izmir", "/WIKI/fiche/": "Tous les personnages",
    "/GALLERIE/": "Galerie", "/JOURNAL/": "Journal", "/INGA/": "Inga", "/ELYSIUM/": "Nebetta (Elysium)",
    "/SITE/CREATION/clan.html": "Feuille de création du clan",
    "/newblog/blog.html": "Blog", "/newblog/gallerie.html": "Galerie du blog", "/newblog/project.html": "Projet",
  };

  const plain = (s) => (s || "").toLowerCase().replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // noms du menu (header.html) : « Le clan », « Les PNJ »… plutôt que le premier titre de la page
  const MENU = {};
  const clean = (u) => u.split("#")[0].replace(/(\.html|\/)$/, "").replace(/\/index$/, "");

  function titreDe(p) {
    if (NOMS[p.url]) return NOMS[p.url];
    if (MENU[clean(p.url)]) return MENU[clean(p.url)];
    const h = (p.headings || []).filter((x) => !/^izmir character build$/i.test(x));
    // fiches de personnage : le nom du personnage (titre de la fiche), sinon le nom du fichier
    if (p.url.includes("/pnj/")) return h[0] || capital(p.name.replace(/-/g, " "));
    return capital(h[0] || p.name.replace(/[-_]/g, " "));
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const slug = (s) => "r-" + plain(s).replace(/[^a-z0-9]+/g, "-");

  function render(pages) {
    const q = plain(filter.value.trim());
    box.innerHTML = "";
    sommaire.innerHTML = "";
    let total = 0;
    for (const r of RUBRIQUES) {
      const items = pages
        .filter((p) => p.rubrique === r.titre)
        .filter((p) => !q || plain(`${p.titre} ${p.url} ${(p.headings || []).join(" ")}`).includes(q))
        .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
      if (!items.length) continue;
      total += items.length;

      const note = el("div", "note");
      note.id = slug(r.titre);
      note.appendChild(el("div", "title", r.titre));
      const ul = el("ul", "index-liste");
      for (const p of items) {
        const li = el("li");
        const a = el("a", null, p.titre);
        a.href = p.url;
        li.appendChild(a);
        // pendant une recherche : les sections de la page qui correspondent
        if (q) {
          const hits = (p.headings || []).slice(1).filter((h) => plain(h).includes(q)).slice(0, 3);
          if (hits.length) li.appendChild(el("small", null, ` — ${hits.join(" · ")}`));
        }
        ul.appendChild(li);
      }
      note.appendChild(ul);
      box.appendChild(note);

      const lien = el("a", "row", `${r.titre} (${items.length})`);
      lien.href = `#${note.id}`;
      sommaire.appendChild(lien);
    }
    compte.textContent = `${total} page${total > 1 ? "s" : ""}`;
    if (!total) box.appendChild(el("div", "note", "Aucune page ne correspond."));
  }

  function start(index) {
    const pages = [];
    for (const p of index) {
      if (IGNORER(p)) continue;
      const r = RUBRIQUES.find((x) => x.match(p));
      if (!r) continue;
      pages.push({ ...p, rubrique: r.titre, titre: titreDe(p) });
    }
    for (const x of EN_PLUS) pages.push({ url: x.url, titre: x.titre, rubrique: x.rubrique, headings: [] });
    filter.addEventListener("input", () => render(pages));
    render(pages);
  }

  const menu = fetch("/header.html").then((r) => r.text()).then((html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    for (const a of tmp.querySelectorAll(".navi-sub a")) {
      const href = a.getAttribute("href");
      if (href && !href.includes("#")) MENU[clean(href)] = a.textContent.trim();
    }
  }).catch(() => {});

  const s = document.createElement("script");
  s.src = "/DATA/search-index.js";
  s.onload = () => menu.then(() => start(window.IZMIR_SEARCH_INDEX || []));
  s.onerror = () => { box.textContent = "Impossible de charger la liste des pages."; };
  document.head.appendChild(s);
})();
