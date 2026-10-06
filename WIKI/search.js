/* =========================================================
  <div id="search"></div> 
   ========================================================= */

var PAGES = [
  { titre: "Izmir",        url: "/index.html" },
  { titre: "Clans",        url: "/WIKI/autre/clan" },
  { titre: "Chronologie",  url: "/WIKI/autre/chrono" },
  { titre: "Personnages",  url: "/WIKI/fiche/index" },
  { titre: "Uyanık Göz",   url: "/WIKI/autre/uyanik-goz.html" }, // 
  // { titre: "Autre page", url: "/WIKI/dossier/autre-page.html" },
];


var textesDesPages = null; // rempli au premier essai de recherche

// Enlève les accents et met en minuscules : "Göz" -> "goz"
function normaliser(texte) {
  return texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

// Télécharge toutes les pages une seule fois et garde leur texte
function chargerPages() {
  if (textesDesPages) return Promise.resolve(textesDesPages);

  return Promise.all(PAGES.map(function (page) {
    return fetch(page.url)
      .then(function (reponse) { return reponse.ok ? reponse.text() : ""; })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var zone = doc.getElementById("contents") || doc.body;
        var texte = zone ? zone.textContent.replace(/\s+/g, " ").trim() : "";
        return { titre: page.titre, url: page.url, texte: texte };
      })
      .catch(function () {
        return { titre: page.titre, url: page.url, texte: "" };
      });
  })).then(function (resultats) {
    textesDesPages = resultats;
    return resultats;
  });
}

// Petit extrait du texte autour du mot trouvé
function extrait(texte, position, longueurMot) {
  var debut = Math.max(0, position - 60);
  var fin = Math.min(texte.length, position + longueurMot + 60);
  return (debut > 0 ? "…" : "") + texte.slice(debut, fin) + (fin < texte.length ? "…" : "");
}

function echapper(texte) {
  var div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML;
}

function rechercher(requete, zoneResultats) {
  var mot = normaliser(requete.trim());
  if (mot.length < 2) {
    zoneResultats.innerHTML = "";
    return;
  }

  chargerPages().then(function (pages) {
    var trouves = [];

    pages.forEach(function (page) {
      var dansTitre = normaliser(page.titre).indexOf(mot) !== -1;
      var pos = normaliser(page.texte).indexOf(mot);
      if (dansTitre || pos !== -1) {
        trouves.push({
          page: page,
          score: dansTitre ? 2 : 1, // les titres passent en premier
          extrait: pos !== -1 ? extrait(page.texte, pos, mot.length) : ""
        });
      }
    });

    trouves.sort(function (a, b) { return b.score - a.score; });

    if (trouves.length === 0) {
      zoneResultats.innerHTML = '<p class="search-vide">Aucun résultat.</p>';
      return;
    }

    zoneResultats.innerHTML = trouves.map(function (r) {
      return '<a class="search-resultat" href="' + r.page.url + '">' +
        "<strong>" + echapper(r.page.titre) + "</strong>" +
        (r.extrait ? "<span>" + echapper(r.extrait) + "</span>" : "") +
        "</a>";
    }).join("");
  });
}

// Crée la barre dans chaque <div id="search"></div>
function installerRecherche() {
  var conteneur = document.getElementById("search");
  if (!conteneur) return;

  conteneur.innerHTML =
    '<input type="search" class="search-champ" placeholder="Rechercher dans le wiki…" aria-label="Rechercher">' +
    '<div class="search-resultats"></div>';

  var champ = conteneur.querySelector(".search-champ");
  var zone = conteneur.querySelector(".search-resultats");
  var minuteur;

  champ.addEventListener("input", function () {
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { rechercher(champ.value, zone); }, 200);
  });

  // Styles de base (tu peux les déplacer dans wikitemplate.css)
  var style = document.createElement("style");
  style.textContent =
    "#search{position:relative;max-width:320px}" +
    ".search-champ{width:100%;padding:6px 10px;box-sizing:border-box}" +
    ".search-resultats{position:absolute;left:0;right:0;z-index:10;background:#fff;color:#222;" +
    "max-height:60vh;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.25)}" +
    ".search-resultat{display:block;padding:8px 10px;text-decoration:none;color:inherit;border-bottom:1px solid #eee}" +
    ".search-resultat:hover{background:#f0f0f0}" +
    ".search-resultat span{display:block;font-size:.85em;color:#555}" +
    ".search-vide{padding:8px 10px;margin:0}";
  document.head.appendChild(style);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installerRecherche);
} else {
  installerRecherche();
}