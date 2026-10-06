// Barre de navigation du wiki, en haut de chaque page (<header-component>)
// Couleurs : DATA/theme.css
// Thème jour/nuit : même réglage que le bouton des pages du site (DATA/izmir.js)
const THEME_KEY = "izmir-theme";

function wikiThemeIsLight() {
  try { return localStorage.getItem(THEME_KEY) === "light"; } catch (e) { return false; }
}

function wikiThemeLabel(button) {
  button.textContent = document.body.classList.contains("light") ? "☾ nuit" : "☀ jour";
}

const WIKI_LINKS = [
  { href: "/WIKI/index.html", label: "Izmir" },
  { href: "/WIKI/autre/clan", label: "Clans" },
  { href: "/WIKI/autre/chrono", label: "Chronologie" },
  { href: "/WIKI/fiche/index", label: "Personnages" },
];

class Header extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    document.body.classList.toggle("light", wikiThemeIsLight());

    // l'onglet de la page en cours est souligné
    const here = location.pathname.replace(/(\.html|\/)$/, "").replace(/\/index$/, "");
    const links = WIKI_LINKS.map(function (l) {
      const target = l.href.replace(/(\.html|\/)$/, "").replace(/\/index$/, "");
      const active = here === target ? ' class="active"' : "";
      return '<a href="' + l.href + '"' + active + ">" + l.label + "</a>";
    }).join("");

    this.innerHTML = `
      <style>

.wikinav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 28px;
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
  font: 19px var(--iz-font-title);
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
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.wikinav .links a {
  padding: 14px 12px 12px;
  color: var(--iz-text-soft);
  font-size: 15px;
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 3px solid transparent;
}

.wikinav .links a:hover {
  color: var(--iz-accent-hover);
  border-bottom-color: var(--iz-accent-dim);
}

.wikinav .links a.active {
  color: var(--iz-accent);
  border-bottom-color: var(--iz-accent);
}

#theme-toggle {
  margin-left: auto;
  flex-shrink: 0;
  padding: 5px 12px;
  font: 13px var(--iz-font);
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

/* téléphone : le nom à gauche de la recherche, les onglets en dessous */
@media screen and (max-width: 700px) {
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

  .wikinav .brand span {
    display: none;
  }

  /* à côté du logo, à gauche de la recherche */
  #theme-toggle {
    position: absolute;
    top: 12px;
    left: 56px;
    margin: 0;
  }

  .wikinav .links {
    padding: 0 6px;
    border-top: 1px solid var(--iz-border);
  }

  .wikinav .links a {
    padding: 10px 10px 8px;
  }
}

      </style>

      <nav class="wikinav">
        <a class="brand" href="/WIKI/index.html">
          <img src="/img/wiki/icon/wikilogo.png" alt="">
          <span>Wiki Izmir</span>
        </a>
        <div class="links">${links}</div>
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

    // Charge la barre de recherche (une seule fois, même si la page l'a déjà)
    if (!document.querySelector('script[src*="search.js"]')) {
      var script = document.createElement("script");
      script.src = "/WIKI/search.js";
      document.head.appendChild(script);
    }
  }
}

customElements.define('header-component', Header);
