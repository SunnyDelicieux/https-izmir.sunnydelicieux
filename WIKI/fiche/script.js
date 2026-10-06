function pageAleatoire() {
    const pages = [
        "/wiki/toreador/pnj/nafissa.html",
        "/wiki/toreador/pnj/ines.html",
        "/wiki/toreador/pnj/max.html",
        "/wiki/toreador/pnj/maliha.html",
        "/wiki/toreador/pnj/aylin.html",
        "/wiki/toreador/pnj/angelos.html",
        "/wiki/toreador/pnj/kejal.html",
        "/wiki/tremere/pnj/esen.html",
        "/wiki/tremere/pnj/dimitrios.html",
        "/wiki/tremere/pnj/sophia.html",
        "/wiki/tremere/pnj/tarik.html",
        "/wiki/tremere/pnj/mariko.html",
        "/wiki/tremere/pnj/eleni-paschalia.html",
        "/wiki/brujah/pnj/henri.html",
        "/wiki/brujah/pnj/baran.html",
        "/wiki/brujah/pnj/kaadir.html",
        "/wiki/brujah/pnj/gabriel.html",
        "/wiki/brujah/pnj/emine.html",
        "/wiki/brujah/pnj/essil.html",
        "/wiki/brujah/pnj/anna-petrova.html",
        "/wiki/ventrue/pnj/kerem.html",
        "/wiki/ventrue/pnj/louisa.html",
        "/wiki/autre/pnj/kushi.html",
        "/wiki/autre/pnj/camil.html",
        "/wiki/autre/pnj/idia.html",
        "/wiki/autre/pnj/atam.html",
        "/wiki/autre/pnj/nebetta.html",
        "/wiki/autre/pnj/inga.html",
        "/wiki/autre/pnj/meryem.html",
        "/wiki/autre/pnj/nour.html"
    ];

    const pageChoisie = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = pageChoisie;
}