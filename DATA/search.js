// Barre de recherche : cherche dans le nom des pages du site et dans leurs titres h1/h2
// (liste dans search-index.js, générée par build-search-index.py)
(function () {
  // les couleurs viennent de DATA/theme.css : les pages d'ambiance (hub, Journal, Élysium…)
  // ne le chargent pas, on l'ajoute pour elles (il ne contient que des variables)
  if (!getComputedStyle(document.documentElement).getPropertyValue("--iz-accent")) {
    const theme = document.createElement("link");
    theme.rel = "stylesheet";
    theme.href = "/DATA/theme.css";
    document.head.appendChild(theme);
  }

  const MAX_RESULTS = 10;

  // minuscules, sans accents, "ı" turc -> "i", tirets/underscores -> espaces
  const norm = (s) => (s || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .trim();

  // "Structure de pouvoir" -> "structure-de-pouvoir" (pour le #titre dans l'adresse)
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // une entrée par page, puis une par titre
  function entries(index) {
    const list = [];
    for (const page of index) {
      list.push({ label: page.name, sub: page.folder || "accueil du site", url: page.url, page, heading: null });
      for (const h of page.headings || []) {
        list.push({
          label: h,
          sub: page.folder ? `${page.name} · ${page.folder}` : page.name,
          url: `${page.url}#${slug(h)}`,
          page,
          heading: h,
        });
      }
    }
    return list;
  }

  // plus le score est petit, plus le résultat remonte ; les noms de pages passent avant les titres
  function score(entry, q) {
    if (entry.heading) {
      const h = norm(entry.heading);
      if (h.startsWith(q)) return 4;
      if (h.includes(q)) return 5;
      return -1;
    }
    const name = norm(entry.page.name);
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    if (norm(entry.page.folder).includes(q)) return 3;
    return -1;
  }

  function search(list, query) {
    const q = norm(query);
    if (!q) return [];
    return list
      .map((entry) => ({ entry, s: score(entry, q) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s || a.entry.label.localeCompare(b.entry.label))
      .slice(0, MAX_RESULTS)
      .map((r) => r.entry);
  }

  // en arrivant via un résultat de titre : défile jusqu'au h1/h2 qui correspond au #titre
  function scrollToHeading() {
    const target = decodeURIComponent(location.hash.slice(1));
    if (!target || document.getElementById(target)) return;
    const heading = [...document.querySelectorAll("h1, h2")].find((h) => slug(h.textContent) === target);
    if (heading) window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 20 });
  }

  const CSS = `
#iz-topbar {
  position: fixed; top: 10px; right: 10px; z-index: 9999;
  display: flex; gap: 6px; align-items: flex-start;
  max-width: calc(100vw - 20px);
}
.izs-box {
  flex: 0 1 230px; width: 230px; min-width: 0;
  font: 12px/1.3 Arial, Tahoma, Verdana, sans-serif; letter-spacing: 0.3px;
}
.izs-input {
  width: 100%; box-sizing: border-box; padding: 6px 9px;
  background: var(--iz-field); color: var(--iz-text);
  border: 1px solid var(--iz-border); border-radius: 0; outline: none;
  font: inherit;
}
.izs-input::placeholder { color: var(--iz-placeholder); }
.izs-input:focus { border-color: var(--iz-accent); }
.izs-results {
  margin: 2px 0 0; padding: 0; list-style: none;
  background: var(--iz-panel); border: 1px solid var(--iz-border);
  max-height: 60vh; overflow-y: auto;
}
.izs-results:empty { display: none; }
.izs-results a {
  display: block; padding: 6px 9px; text-decoration: none;
  color: var(--iz-text); border-bottom: 1px solid var(--iz-box);
}
.izs-results li:last-child a { border-bottom: none; }
.izs-results a.izs-active, .izs-results a:hover { background: var(--iz-button); color: var(--iz-accent-hover); }
.izs-folder { display: block; font-size: 10px; opacity: 0.6; }
.izs-none { padding: 6px 9px; color: var(--iz-placeholder); }

@media (max-width: 520px) {
  .izs-box { flex-basis: 150px; }
  .iza-btn { min-width: 0; max-width: 100px; }
}
`;

  function init() {
    if (document.querySelector(".izs-box")) return;

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const box = document.createElement("div");
    box.className = "izs-box";
    box.setAttribute("role", "search");
    box.innerHTML = `
      <input class="izs-input" type="search" placeholder="rechercher une page…" aria-label="Rechercher une page" autocomplete="off">
      <ul class="izs-results"></ul>
    `;
    // barre fixe en haut à droite, partagée avec le bouton de compte (DATA/account.js)
    let bar = document.getElementById("iz-topbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "iz-topbar";
      document.body.appendChild(bar);
    }
    bar.appendChild(box);

    // bouton de connexion, à gauche de la recherche
    if (!window.izmirAccount && !document.querySelector('script[src="/DATA/account.js"]')) {
      const s = document.createElement("script");
      s.src = "/DATA/account.js";
      document.head.appendChild(s);
    }

    const input = box.querySelector(".izs-input");
    const list = box.querySelector(".izs-results");
    let index = null;
    let active = -1;

    // la liste des pages n'est chargée qu'au premier clic dans la barre
    function loadIndex() {
      if (index) return Promise.resolve(index);
      return new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "/DATA/search-index.js";
        s.onload = () => resolve(index = entries(window.IZMIR_SEARCH_INDEX || []));
        s.onerror = () => resolve(index = []);
        document.head.appendChild(s);
      });
    }

    function setActive(i) {
      const links = list.querySelectorAll("a");
      links.forEach((a) => a.classList.remove("izs-active"));
      active = links.length ? (i + links.length) % links.length : -1;
      if (active >= 0) {
        links[active].classList.add("izs-active");
        links[active].scrollIntoView({ block: "nearest" });
      }
    }

    function render() {
      list.innerHTML = "";
      active = -1;
      if (!input.value.trim()) return;

      const results = search(index || [], input.value);
      if (!results.length) {
        list.innerHTML = `<li class="izs-none">Aucune page trouvée</li>`;
        return;
      }

      for (const entry of results) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = entry.url;
        a.textContent = entry.label;
        const folder = document.createElement("span");
        folder.className = "izs-folder";
        folder.textContent = entry.sub;
        a.appendChild(folder);
        li.appendChild(a);
        list.appendChild(li);
      }
      setActive(0);
    }

    input.addEventListener("focus", () => loadIndex().then(render));
    input.addEventListener("input", () => loadIndex().then(render));

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") {
        const link = list.querySelectorAll("a")[active];
        if (link) location.href = link.href;
      }
      else if (e.key === "Escape") { input.value = ""; render(); input.blur(); }
    });

    window.addEventListener("hashchange", scrollToHeading);
    scrollToHeading();

    // clic ailleurs : on referme la liste
    document.addEventListener("click", (e) => {
      if (!box.contains(e.target)) list.innerHTML = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
