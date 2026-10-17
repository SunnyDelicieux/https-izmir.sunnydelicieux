// Barre de navigation unique en haut de page : titre, menu, recherche, jour/nuit, compte.
// Le menu est repris de header.html (un seul endroit à modifier pour ajouter une page).
// À charger juste après <body> : <script src="/DATA/barre.js"></script>
(function () {
  if (document.getElementById("iz-barre")) return;
  const CSS = `
#iz-barre {
  position: sticky; top: 0; z-index: 9000;
  margin: 0 0 24px;
  background: rgba(20, 12, 4, 0.97);
  border-bottom: 1px dashed #4a3018;
  font: italic 14px Georgia, serif; letter-spacing: 0.5px;
}
.izb-ligne {
  max-width: 960px; margin: auto; padding: 0;
  display: flex; align-items: center; gap: 14px;
}
.izb-titre {
  flex: none; color: #e8dfc8; text-decoration: none; letter-spacing: 1.5px; font-size: 15px;
}
.izb-titre:hover { color: #d4aa72; }
.izb-menu { display: flex; align-items: center; flex-wrap: wrap; gap: 0; flex: 1; min-width: 0; }
.izb-menu > a, .izb-menu .navi-parent {
  display: block; padding: 12px 9px; color: #c8b898; text-decoration: none; cursor: pointer;
  text-transform: lowercase; white-space: nowrap;
  background: none; border: none; font: inherit; letter-spacing: inherit;
}
.izb-menu > .navi-group { position: static; display: flex; align-items: center; }
.izb-menu > a { display: flex; align-items: center; }
.izb-menu > * + *::before {
  content: "·"; display: inline-block; margin: 0 2px 0 -2px; color: #5a3c1c; font-style: normal; pointer-events: none;
}
#iz-barre, #iz-barre * { font-family: Georgia, serif; }
#iz-barre .izb-menu > a, #iz-barre .izb-menu .navi-parent, #iz-barre .iza-btn { font-size: 14px; line-height: 1.4; }
#iz-barre .izb-menu .navi-sub a { font-size: 14px; line-height: 1.5; }
#iz-barre .izb-menu .navi-titre { font-family: Arial, Tahoma, sans-serif; font-size: 10.5px; line-height: 1.4; }
#iz-barre .izb-titre { font-size: 15px; line-height: 1.4; }
#iz-barre .izs-input { font-size: 12px; line-height: 1.3; height: auto; }
body.light #iz-barre .izs-input, body.light #iz-barre .izs-results { background: #fbf3e8; color: #2a1a0e; border-color: #c8906a; }
/* annule le style « bouton » du menu du bandeau (DATA/izmir.css) */
#iz-barre .izb-menu > a, #iz-barre .izb-menu .navi-parent,
#iz-barre .izb-menu .navi-group:hover .navi-parent, #iz-barre .izb-menu .navi-group:has(.active) .navi-parent {
  background: none; border: none; border-radius: 0; box-shadow: none;
}
#iz-barre .izs-input, #iz-barre .izs-results { font-family: Arial, Tahoma, Verdana, sans-serif; font-style: normal; }
.izb-menu .navi-parent::after {
  content: "▾"; display: inline-block; margin-left: 4px; font-size: 9px; font-style: normal;
  line-height: 1; vertical-align: middle; color: #7a5028;
}
.izb-menu > a:hover, .izb-menu .navi-group:hover .navi-parent, .izb-menu .navi-group.izb-ouvert .navi-parent { color: #d4aa72; }
.izb-menu > a.active, .izb-menu .navi-group.izb-ici .navi-parent { color: #c09050; text-decoration: underline; text-underline-offset: 5px; text-decoration-color: #7a5028; }
/* méga-menu : au survol d'une rubrique, un panneau sur toute la largeur, en colonnes */
.izb-menu .navi-sub {
  display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 9100;
  padding: 18px 0 20px;
  background: #1a1006; border: none; border-radius: 0; border-bottom: 1px dashed #4a3018; box-shadow: 0 10px 18px rgba(0, 0, 0, 0.45);
}
.izb-menu .navi-group:hover .navi-sub, .izb-menu .navi-group.izb-ouvert .navi-sub {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 210px)); justify-content: center; gap: 10px 34px;
}
.izb-menu .navi-col { display: flex; flex-direction: column; gap: 1px; }
.izb-menu .navi-titre {
  margin: 0 0 6px; padding: 0 0 5px 8px; color: #c09050; border-bottom: 1px dotted #4a3018;
  font-size: 12px; font-style: normal; letter-spacing: 2px; text-transform: uppercase;
}
.izb-menu .navi-sub a {
  display: block; padding: 3px 8px; color: #c8b898; text-decoration: none; text-transform: none; white-space: nowrap;
}
.izb-menu .navi-sub a:hover { color: #d4aa72; background: #2e1e0e; }
.izb-menu .navi-sub a.active { color: #c09050; text-decoration: underline; text-underline-offset: 4px; }
.izb-outils { flex: none; display: flex; align-items: center; gap: 4px; }
#iz-barre #iz-topbar { position: static; max-width: none; }
#iz-barre .izs-box { width: 150px; flex-basis: 150px; }
#iz-barre .izs-input { padding: 4px 8px; }
#iz-barre .izs-results { position: absolute; width: 260px; right: 0; }
#iz-barre .izs-box { position: relative; }
.izb-theme {
  flex: none; padding: 4px 6px; cursor: pointer; color: #c09050;
  background: none; border: none; font: inherit; font-style: normal;
}
.izb-theme:hover { color: #d4aa72; }

/* le menu en boutons du bandeau et le bouton jour/nuit de la colonne : remplacés par la barre */
/* bandeau « İzmir by Night / un projet de Sunny » : seulement sur l'accueil du site */
body.avec-barre:not(.page-accueil) #site-header { display: none; }
body.avec-barre #site-header .navi,
body.avec-barre .sidebar #theme-toggle,
body.avec-barre > header:has(h1),
body.avec-barre > footer:has(a[href*="fiche/index"]) { display: none; }

body.light #iz-barre { background: rgba(245, 232, 215, 0.97); border-bottom-color: #c8906a; }
body.light .izb-titre { color: #2a1a0e; }
body.light .izb-menu > a, body.light .izb-menu .navi-parent, body.light .izb-menu .navi-sub a { color: #3a2010; }
body.light .izb-menu > a:hover, body.light .izb-menu .navi-group:hover .navi-parent,
body.light .izb-menu .navi-sub a:hover, body.light .izb-theme:hover { color: #8b4a18; }
body.light .izb-menu > a.active, body.light .izb-menu .navi-group.izb-ici .navi-parent, body.light .izb-theme { color: #8b4a18; }
body.light .izb-menu .navi-sub { background: #f3e5d2; border-color: #c8906a; box-shadow: 0 10px 18px rgba(90, 45, 15, 0.18); }
body.light .izb-menu .navi-titre { color: #8b4a18; border-color: #c8906a; }
body.light .izb-menu .navi-sub a:hover { background: #dfc0a0; }

@media (max-width: 860px) {
  #iz-barre { padding: 0 12px; }
  .izb-ligne { flex-wrap: wrap; gap: 6px 12px; }
  .izb-titre { order: 1; }
  .izb-outils { order: 2; margin-left: auto; }
  .izb-menu { order: 3; flex-basis: 100%; }
  .izb-menu > * + *::before { display: none; }
  #iz-barre .izs-box { width: 120px; flex-basis: 120px; }
  /* au doigt : la rubrique s'ouvre au toucher */
  .izb-menu .navi-group:hover .navi-sub { display: none; }
  .izb-menu .navi-group.izb-ouvert .navi-sub { display: grid; grid-template-columns: 1fr 1fr; justify-content: stretch; gap: 14px 16px; padding: 14px 16px; }
  .izb-menu > a, .izb-menu .navi-parent { padding: 8px 9px; }
  .izb-ligne { padding: 6px 0 0; }
}
`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.classList.add("avec-barre");
  // Cloudflare sert /accueil.html à l'adresse /accueil
  if (/^\/accueil(\.html)?$/.test(location.pathname)) document.body.classList.add("page-accueil");

  const barre = document.createElement("nav");
  barre.id = "iz-barre";
  barre.setAttribute("aria-label", "Navigation du site");
  barre.innerHTML = `
    <div class="izb-ligne">
      <a class="izb-titre" href="/accueil.html">İzmir by Night</a>
      <div class="izb-menu"></div>
      <div class="izb-outils">
        <div id="iz-topbar"></div>
        <button class="izb-theme" type="button" aria-label="Changer de thème"></button>
        <span id="iz-barre-compte"></span>
      </div>
    </div>`;
  document.body.prepend(barre);

  // recherche ou compte déjà posés en haut à droite (chargés avant la barre) : on les range dedans
  const ancienne = [...document.querySelectorAll("#iz-topbar")].find((x) => !barre.contains(x));
  if (ancienne) {
    ancienne.querySelectorAll(".izs-box").forEach((x) => barre.querySelector("#iz-topbar").appendChild(x));
    ancienne.querySelectorAll(".iza-box").forEach((x) => {
      x.className = x.className.replace(/iza-box--\w+/g, "") + " iza-box--barre";
      barre.querySelector("#iz-barre-compte").appendChild(x);
    });
    ancienne.remove();
  }

  // la barre touche les bords de la fenêtre, quelle que soit la marge de la page
  const caler = () => {
    const cs = getComputedStyle(document.body);
    barre.style.marginTop = `-${cs.paddingTop}`;
    barre.style.marginLeft = `-${cs.paddingLeft}`;
    barre.style.marginRight = `-${cs.paddingRight}`;
  };
  caler();
  addEventListener("resize", caler);

  // jour / nuit
  const theme = barre.querySelector(".izb-theme");
  const label = () => {
    const light = document.body.classList.contains("light");
    theme.textContent = light ? "☾" : "☀";
    theme.title = light ? "passer en mode nuit" : "passer en mode jour";
  };
  try { if (localStorage.getItem("izmir-theme") === "light") document.body.classList.add("light"); } catch (e) {}
  label();
  theme.addEventListener("click", () => {
    const light = document.body.classList.toggle("light");
    try { localStorage.setItem("izmir-theme", light ? "light" : "dark"); } catch (e) {}
    label();
    if (typeof updateThemeButton === "function") updateThemeButton();
  });

  // le menu : repris de header.html
  const samePage = (href) => {
    const clean = (p) => p.split("#")[0].replace(/(\.html|\/)$/, "").replace(/\/index$/, "");
    return clean(location.pathname) === clean(new URL(href, location.origin).pathname);
  };
  fetch("/header.html").then((r) => r.text()).then((html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const navi = tmp.querySelector(".navi");
    if (!navi) return;
    const menu = barre.querySelector(".izb-menu");
    for (const el of [...navi.children]) menu.appendChild(el);
    for (const a of menu.querySelectorAll("a")) {
      if (samePage(a.getAttribute("href"))) {
        a.classList.add("active");
        a.closest(".navi-group")?.classList.add("izb-ici");
      }
    }
    const groups = [...menu.querySelectorAll(".navi-group")];
    for (const g of groups) {
      g.querySelector(".navi-parent").addEventListener("click", () => {
        const open = !g.classList.contains("izb-ouvert");
        groups.forEach((x) => x.classList.remove("izb-ouvert"));
        g.classList.toggle("izb-ouvert", open);
      });
    }
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".izb-menu .navi-group")) groups.forEach((x) => x.classList.remove("izb-ouvert"));
    });
  }).catch(() => {});
})();
