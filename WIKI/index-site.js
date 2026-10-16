// Index du site (WIKI/liste.html) : toutes les pages, rangées par rubrique.
// La liste vient de DATA/search-index.js (régénérée automatiquement à chaque envoi sur main) :
// une nouvelle page apparaît ici toute seule.
(function () {
  const box = document.getElementById("index-site");
  const filter = document.getElementById("index-filtre");
  if (!box) return;

  // rubriques, dans l'ordre d'affichage ; "match" dit quelles pages y vont (par dossier)
  const RUBRIQUES = [
    { titre: "Le site", match: (p) => p.folder === "" && ["accueil"].includes(p.name) },
    { titre: "Univers", match: (p) =>
        (p.folder === "" && p.name === "WIKI") ||
        (p.folder === "WIKI" && ["brujah", "tremere", "ventrue"].includes(p.name)) ||
        ["WIKI/autre", "WIKI/brujah", "WIKI/toreador", "WIKI/toreador/info"].includes(p.folder) },
    { titre: "Personnages", match: (p) => p.folder === "WIKI" && p.name === "fiche" },
    { titre: "Personnages · Brujah", match: (p) => p.folder === "WIKI/brujah/pnj" },
    { titre: "Personnages · Toreador", match: (p) => p.folder === "WIKI/toreador/pnj" },
    { titre: "Personnages · Tremere", match: (p) => p.folder === "WIKI/tremere/pnj" },
    { titre: "Personnages · Ventrue", match: (p) => p.folder === "WIKI/ventrue/pnj" },
    { titre: "Personnages · autres", match: (p) => p.folder === "WIKI/autre/pnj" },
    { titre: "Système", match: (p) => p.folder === "SITE/SYSTEME" },
    { titre: "Création", match: (p) => p.folder === "SITE/CREATION" },
    { titre: "Outils", match: (p) => p.folder === "SITE/OUTILS" || ["JOURNAL"].includes(p.name) },
    { titre: "Organisation", match: (p) => p.folder === "SITE/ORGANISATION" || p.name === "GALLERIE" },
    { titre: "Pages à part", match: (p) => p.folder === "" && ["ELYSIUM", "INGA"].includes(p.name) },
  ];

  // pages en plus, qui ne sont pas des fichiers html à part
  const EN_PLUS = [
    { rubrique: "Outils", titre: "Calendrier", url: "/COMPTE/#calendrier" },
  ];

  // pages qu'on ne liste pas : cette page, redirections, brouillons du modèle, vieux blog
  const IGNORER = (p) =>
    p.url === "/WIKI/liste.html" ||
    p.folder === "SITE/CALENDAR" ||
    p.folder.startsWith("newblog") ||
    (p.headings || []).includes("Le titre de la page");

  // titres plus parlants que le nom de fichier
  const NOMS = { "/WIKI/": "La ville d'Izmir", "/GALLERIE/": "Galerie", "/JOURNAL/": "Journal", "/ELYSIUM/": "Elysium", "/INGA/": "Inga", "/WIKI/fiche/": "Tous les personnages" };

  const plain = (s) => (s || "").toLowerCase().replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function titreDe(p) {
    if (NOMS[p.url]) return NOMS[p.url];
    const h = (p.headings || []).filter((x) => !/^izmir character build$/i.test(x));
    // fiches de personnage : le nom du personnage (2e titre de la page), sinon le nom du fichier
    if (p.url.includes("/pnj/")) return h[0] || capital(p.name.replace(/-/g, " "));
    return capital(h[0] || p.name.replace(/[-_]/g, " "));
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(pages) {
    const q = plain(filter.value.trim());
    box.innerHTML = "";
    let total = 0;
    for (const r of RUBRIQUES) {
      const items = pages
        .filter((p) => p.rubrique === r.titre)
        .filter((p) => !q || plain(`${p.titre} ${p.url} ${(p.headings || []).join(" ")}`).includes(q))
        .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
      if (!items.length) continue;
      total += items.length;
      box.appendChild(el("h2", null, r.titre));
      const ul = el("ul", "index-liste");
      for (const p of items) {
        const li = el("li");
        const a = el("a", null, p.titre);
        a.href = p.url;
        li.appendChild(a);
        // pour une recherche : les sections de la page qui correspondent
        if (q) {
          const hits = (p.headings || []).slice(1).filter((h) => plain(h).includes(q)).slice(0, 4);
          if (hits.length) li.appendChild(el("small", null, ` — ${hits.join(" · ")}`));
        }
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
    if (!total) box.appendChild(el("p", "chapeau", "Aucune page ne correspond."));
    // sommaire de la page : reconstruit avec les rubriques affichées
    window.izmirBuildToc?.(true);
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

  const s = document.createElement("script");
  s.src = "/DATA/search-index.js";
  s.onload = () => start(window.IZMIR_SEARCH_INDEX || []);
  s.onerror = () => { box.innerHTML = "<p>Impossible de charger la liste des pages.</p>"; };
  document.head.appendChild(s);
})();
