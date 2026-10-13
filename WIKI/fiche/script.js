function pageAleatoire() {
    const pages = [
        "/WIKI/toreador/pnj/nafissa.html",
        "/WIKI/toreador/pnj/ines.html",
        "/WIKI/toreador/pnj/max.html",
        "/WIKI/toreador/pnj/maliha.html",
        "/WIKI/toreador/pnj/aylin.html",
        "/WIKI/toreador/pnj/angelos.html",
        "/WIKI/toreador/pnj/kejal.html",
        "/WIKI/tremere/pnj/esen.html",
        "/WIKI/tremere/pnj/dimitrios.html",
        "/WIKI/tremere/pnj/sophia.html",
        "/WIKI/tremere/pnj/tarik.html",
        "/WIKI/tremere/pnj/mariko.html",
        "/WIKI/tremere/pnj/eleni-paschalia.html",
        "/WIKI/brujah/pnj/henri.html",
        "/WIKI/brujah/pnj/baran.html",
        "/WIKI/brujah/pnj/kaadir.html",
        "/WIKI/brujah/pnj/gabriel.html",
        "/WIKI/brujah/pnj/emine.html",
        "/WIKI/brujah/pnj/essil.html",
        "/WIKI/brujah/pnj/anna-petrova.html",
        "/WIKI/ventrue/pnj/kerem.html",
        "/WIKI/ventrue/pnj/louisa.html",
        "/WIKI/autre/pnj/kushi.html",
        "/WIKI/autre/pnj/camil.html",
        "/WIKI/autre/pnj/idia.html",
        "/WIKI/autre/pnj/atam.html",
        "/WIKI/autre/pnj/nebetta.html",
        "/WIKI/autre/pnj/inga.html",
        "/WIKI/autre/pnj/meryem.html",
        "/WIKI/autre/pnj/nour.html"
    ];

    const pageChoisie = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = pageChoisie;
}