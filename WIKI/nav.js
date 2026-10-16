// Barre de navigation commune du site et du wiki, en haut de chaque page (<header-component>).
// Menu : mêmes rubriques que l'ancien menu du site (header.html), en menus déroulants.
// Remplit aussi le sommaire (<div id="toc">) avec les titres h2 / h3 de la page.
// Couleurs : DATA/theme.css. Thème jour/nuit : même réglage que DATA/izmir.js.
const THEME_KEY = "izmir-theme";

function wikiThemeIsLight() {
  try { return localStorage.getItem(THEME_KEY) === "light"; } catch (e) { return false; }
}

function wikiThemeLabel(button) {
  button.textContent = document.body.classList.contains("light") ? "☾ nuit" : "☀ jour";
}

// Le menu. Un lien seul : { label, href }. Une rubrique : { label, items: [...] }.
const SITE_MENU = [
  { label: "accueil", href: "/accueil.html" },
  { label: "univers", items: [
    { label: "la ville d'Izmir", href: "/WIKI/index.html" },
    { label: "clans", href: "/WIKI/autre/clan" },
    { label: "chronologie", href: "/WIKI/autre/chrono" },
    { label: "personnages", href: "/WIKI/fiche/" },
  ] },
  { label: "système", items: [
    { label: "factions", href: "/SITE/SYSTEME/factions.html" },
    { label: "ressources", href: "/SITE/SYSTEME/ressource.html" },
    { label: "entreprises", href: "/SITE/SYSTEME/entreprises.html" },
  ] },
  { label: "création", items: [
    { label: "création de personnage", href: "/SITE/CREATION/creation.html" },
    { label: "le clan", href: "/SITE/CREATION/creaclan.html" },
    { label: "les groupes", href: "/SITE/CREATION/groupes.html" },
    { label: "les objectifs", href: "/SITE/CREATION/objectif.html" },
    { label: "les PNJ", href: "/SITE/CREATION/pnj.html" },
  ] },
  { label: "outils", items: [
    { label: "calendrier", href: "/COMPTE/#calendrier" },
    { label: "relations", href: "/SITE/OUTILS/relation.html" },
    { label: "carte", href: "/SITE/OUTILS/carte.html" },
    { label: "journal", href: "/JOURNAL/index.html" },
  ] },
  { label: "organisation", items: [
    { label: "lignes et voiles", href: "/SITE/ORGANISATION/lignes_et_voiles.html" },
    { label: "FAQ", href: "/SITE/ORGANISATION/faq.html" },
    { label: "alchemy", href: "/SITE/OUTILS/alchemy.html" },
    { label: "galerie", href: "/GALLERIE/" },
  ] },
  // pages à part, où l'on rencontre un personnage : pour en ajouter une, copier une ligne
  { label: "rencontres", items: [
    { label: "Inga", href: "/INGA/" },
    { label: "Nebetta", href: "/ELYSIUM/" },
  ] },
  { label: "index", href: "/WIKI/liste.html" },
];

// "/WIKI/fiche/index.html", "/WIKI/fiche/" et "/WIKI/fiche" désignent la même page
const samePage = (href) => {
  const clean = (p) => p.split("#")[0].replace(/(\.html|\/)$/, "").replace(/\/index$/, "").replace(/\/$/, "");
  return clean(location.pathname) === clean(new URL(href, location.origin).pathname);
};

function menuHtml() {
  return SITE_MENU.map((entry) => {
    if (entry.href) {
      return `<a class="navlink${samePage(entry.href) ? " active" : ""}" href="${entry.href}">${entry.label}</a>`;
    }
    const inside = entry.items.some((i) => samePage(i.href));
    const items = entry.items.map((i) =>
      `<a href="${i.href}"${samePage(i.href) ? ' class="active"' : ""}>${i.label}</a>`).join("");
    return `<div class="navgroup${inside ? " active" : ""}">
      <button class="navparent" type="button" aria-haspopup="true">${entry.label}</button>
      <div class="navsub">${items}</div>
    </div>`;
  }).join("");
}

// ── Sommaire automatique ────────────────────────────────────────────────────
// Si la page a un <div id="toc"></div> vide, on y liste ses titres h2 (et h3 dessous).
function slug(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildToc(force) {
  const toc = document.getElementById("toc");
  if (!toc || (toc.children.length && !force)) return;
  toc.innerHTML = "";
  const scope = document.getElementById("contents") || document.getElementById("container") || document.body;
  const heads = [...scope.querySelectorAll("h2, h3")].filter((h) => !h.closest("#toc, header-component, .no-toc"));
  if (heads.length < 2) return;

  const root = document.createElement("ol");
  let sub = null;
  for (const h of heads) {
    if (!h.id) h.id = slug(h.textContent) || `section-${heads.indexOf(h)}`;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent.trim();
    li.appendChild(a);
    if (h.tagName === "H3" && root.lastElementChild) {
      if (!sub || sub.parentElement !== root.lastElementChild) {
        sub = document.createElement("ol");
        root.lastElementChild.appendChild(sub);
      }
      sub.appendChild(li);
    } else {
      root.appendChild(li);
      sub = null;
    }
  }
  toc.appendChild(root);
}

// pour les pages qui ajoutent leurs titres après coup (ex : l'index du site)
window.izmirBuildToc = buildToc;

class Header extends HTMLElement {
  connectedCallback() {
    document.body.classList.toggle("light", wikiThemeIsLight());

    this.innerHTML = `
      <style>
.wikinav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 52px;
  padding: 0 260px 0 20px;
  background: var(--iz-deep);
  border-bottom: 2px solid var(--iz-accent);
  font-family: var(--iz-font);
}

.wikinav .brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: var(--iz-text);
  font: italic 19px var(--iz-font-title);
  letter-spacing: 1px;
  text-decoration: none;
}

.wikinav .brand img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.wikinav .links {
  display: flex;
  align-items: stretch;
  gap: 2px;
}

.wikinav .navlink,
.wikinav .navparent {
  display: block;
  padding: 15px 10px 12px;
  color: var(--iz-text-soft);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font: 15px var(--iz-font);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.wikinav .navparent::after {
  content: " ▾";
  font-size: 9px;
  color: var(--iz-accent-dim);
}

.wikinav .navlink:hover,
.wikinav .navgroup:hover .navparent,
.wikinav .navgroup.open .navparent {
  color: var(--iz-accent-hover);
  border-bottom-color: var(--iz-accent-dim);
}

.wikinav .navlink.active,
.wikinav .navgroup.active .navparent {
  color: var(--iz-accent);
  border-bottom-color: var(--iz-accent);
}

.wikinav .navgroup {
  position: relative;
}

.wikinav .navsub {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 120;
  min-width: 190px;
  padding: 6px 0;
  background: var(--iz-deep);
  border: 1px solid var(--iz-border-strong);
  border-top: 2px solid var(--iz-accent);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
}

.wikinav .navgroup:hover .navsub,
.wikinav .navgroup:focus-within .navsub,
.wikinav .navgroup.open .navsub {
  display: block;
}

.wikinav .navsub a {
  display: block;
  padding: 6px 16px;
  color: var(--iz-text-soft);
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;
}

.wikinav .navsub a:hover {
  color: var(--iz-accent-hover);
  background: var(--iz-box);
}

.wikinav .navsub a.active {
  color: var(--iz-accent);
  border-left: 2px solid var(--iz-accent);
  padding-left: 14px;
}

#theme-toggle {
  margin-left: auto;
  flex-shrink: 0;
  height: 28px;
  box-sizing: border-box;
  padding: 0 12px;
  font: 13px/26px var(--iz-font);
  color: var(--iz-accent);
  background: var(--iz-button);
  border: 1px solid var(--iz-border-strong);
  border-radius: var(--iz-radius);
  cursor: pointer;
}

#theme-toggle:hover {
  color: var(--iz-accent-hover);
  border-color: var(--iz-accent);
}

/* barre de recherche (DATA/search.js) : sur la même ligne que les boutons de la barre */
#iz-topbar { top: 12px; }
#iz-topbar .izs-input { height: 28px; padding-top: 0; padding-bottom: 0; }

/* recherche de secours (WIKI/search.js), si la page n'a pas DATA/search.js */
header-component #search {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 230px;
}

header-component .search-champ {
  border: 1px solid var(--iz-border-strong);
  background-color: var(--iz-box);
  color: var(--iz-text);
}

/* écran moyen : on garde le logo, sans le nom */
@media screen and (max-width: 1250px) {
  .wikinav .brand span { display: none; }
  .wikinav { gap: 10px; }
}

/* téléphone : logo + boutons en haut, le menu en dessous, sur plusieurs lignes */
@media screen and (max-width: 860px) {
  .wikinav {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0;
  }

  .wikinav .brand {
    min-height: 52px;
    padding: 0 12px;
  }

  #theme-toggle {
    position: absolute;
    top: 12px;
    left: 56px;
    margin: 0;
  }

  .wikinav .links {
    flex-wrap: wrap;
    padding: 0 6px;
    border-top: 1px solid var(--iz-border);
  }

  .wikinav .navlink,
  .wikinav .navparent {
    padding: 10px 8px 8px;
  }

  /* au doigt : le menu s'ouvre au toucher (classe "open"), pas au survol */
  .wikinav .navgroup:hover .navsub { display: none; }
  .wikinav .navgroup.open .navsub { display: block; }
}
      </style>

      <nav class="wikinav">
        <a class="brand" href="/accueil.html">
          <img src="/img/wiki/icon/wikilogo.png" alt="">
          <span>İzmir by Night</span>
        </a>
        <div class="links">${menuHtml()}</div>
        <button id="theme-toggle" type="button"></button>
        <div id="search"></div>
      </nav>
    `;

    const button = this.querySelector("#theme-toggle");
    wikiThemeLabel(button);
    button.addEventListener("click", function () {
      const light = document.body.classList.toggle("light");
      try { localStorage.setItem(THEME_KEY, light ? "light" : "dark"); } catch (e) {}
      wikiThemeLabel(button);
    });

    // rubriques : un clic ouvre / ferme (au doigt), un clic ailleurs ou Échap referme
    const groups = [...this.querySelectorAll(".navgroup")];
    for (const g of groups) {
      g.querySelector(".navparent").addEventListener("click", () => {
        const open = !g.classList.contains("open");
        groups.forEach((x) => x.classList.remove("open"));
        g.classList.toggle("open", open);
      });
    }
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".navgroup")) groups.forEach((x) => x.classList.remove("open"));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") groups.forEach((x) => x.classList.remove("open"));
    });

    // Charge la barre de recherche (une seule fois, même si la page l'a déjà)
    if (!document.querySelector('script[src*="search.js"]')) {
      var script = document.createElement("script");
      script.src = "/WIKI/search.js";
      document.head.appendChild(script);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => buildToc());
    else buildToc();
  }
}

customElements.define('header-component', Header);
