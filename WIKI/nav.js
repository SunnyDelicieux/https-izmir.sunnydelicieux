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
  { href: "/WIKI/liste.html", label: "Index" },
  { href: "/WIKI/autre/clan", label: "Clans" },
  { href: "/WIKI/autre/chrono", label: "Chronologie" },
  { href: "/WIKI/fiche/index", label: "Personnages" },
];

class Header extends HTMLElement {
  connectedCallback() {
    document.body.classList.toggle("light", wikiThemeIsLight());

    // même barre de navigation que le site (DATA/barre.js) : menu, recherche, jour/nuit, compte
    if (!document.getElementById("iz-barre") && !document.querySelector('script[src="/DATA/barre.js"]')) {
      const barre = document.createElement("script");
      barre.src = "/DATA/barre.js";
      document.head.appendChild(barre);
    }
    if (!document.querySelector('script[src="/DATA/search.js"]')) {
      const recherche = document.createElement("script");
      recherche.src = "/DATA/search.js";
      recherche.defer = true;
      document.head.appendChild(recherche);
    }
  }
}

customElements.define('header-component', Header);
