class Header extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <style>

.sidenav {
  height: 100%;
  width: 230px;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  background-color: var(--iz-deep);
  overflow-x: hidden;
  padding-top: 20px;
  border-right: 1px solid var(--iz-border-strong);
}

.sidenav .imagehere {
  width: 170px;
  height: 120px;
  margin: 0 auto 15px auto;
  background-image: url('/img/wiki/icon/wikilogo.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.sidenav a {
  padding: 6px 0 6px 16px;
  margin: 0 30px 6px 30px;
  display: block;
  text-decoration: none;
  text-transform: lowercase;
  font: italic 15px var(--iz-font-title);
  letter-spacing: 0.5px;
  color: var(--iz-text);
  background-color: var(--iz-button);
  border: 1px solid var(--iz-border-strong);
  border-radius: var(--iz-radius);
  transition: 0.2s ease;
}

.sidenav a:hover {
  color: var(--iz-accent-hover);
  background-color: var(--iz-bg);
  border-color: var(--iz-accent);
}

.sidenav p {
  padding: 0px 20px;
  text-decoration: none;
}

.sidenav h2 {
  margin-top: 0px;
  padding: 0px 30px;
  text-align: center;
  border-bottom: 0px;
  font: italic 18px var(--iz-font-title);
  letter-spacing: 2px;
  color: var(--iz-accent);
}

/* ===== BARRE DE RECHERCHE (ordinateur) =====
   Collée en bas de la barre latérale, les résultats s'ouvrent vers le haut. */
header-component #search {
  position: fixed;
  z-index: 2;
  left: 0;
  bottom: 20px;
  width: 230px;
  max-width: none;
  padding: 0 30px;
  box-sizing: border-box;
}

header-component .search-champ {
  border: 1px solid var(--iz-border-strong);
  background-color: var(--iz-box);
  color: var(--iz-text);
}

header-component .search-resultats {
  top: auto;
  bottom: 100%;
  margin: 0 30px 4px;
  border: 1px solid var(--iz-border-strong);
}

@media screen and (max-width: 1350px) {

  .sidenav {
    height: auto;
    width: 100%;
    position: static;
    overflow-x: scroll;
    scrollbar-width: none;
    white-space: nowrap;
    padding: 8px 10px;
    border-bottom: 1px solid var(--iz-border-strong);
    border-right: none;
  }

  .sidenav a {
    padding: 4px 12px;
    margin: 0 4px 0 0;
    display: inline-block;
  }

  .sidenav .imagehere,
  .sidenav br,
  .sidenav p,
  .sidenav h2,
  .sidenav hr {
    display: none;
  }

  /* ===== BARRE DE RECHERCHE (téléphone / petit écran) =====
     Sous le menu, sur toute la largeur, les résultats s'ouvrent vers le bas. */
  header-component #search {
    position: relative;
    width: 100%;
    bottom: auto;
    padding: 8px 10px;
    background-color: var(--iz-deep);
    border-bottom: 1px solid var(--iz-border-strong);
  }

  header-component .search-resultats {
    top: 100%;
    bottom: auto;
    margin: 0 10px;
  }

}
      </style>

      <div class="sidenav">
        <div class="imagehere"></div>
        <h2>WIKI IZMIR</h2>
        <a href="/index.html">Izmir</a>
        <a href="/WIKI/autre/clan">Clans</a>
        <a href="/WIKI/autre/chrono">Chronologie</a>
        <a href="/WIKI/fiche/index">Personnages</a>
      </div>

      <div id="search"></div>
    `;

    // Charge la barre de recherche (une seule fois, même si la page l'a déjà)
    if (!document.querySelector('script[src*="search.js"]')) {
      var script = document.createElement("script");
      script.src = "/WIKI/search.js";
      document.head.appendChild(script);
    }
  }
}

customElements.define('header-component', Header);