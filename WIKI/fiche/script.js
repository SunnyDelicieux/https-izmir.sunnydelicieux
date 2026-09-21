function pageAleatoire() {
    const pages = [
        "/toreador/pnj/nafissa.html",
        "/toreador/pnj/ines.html",
        "/toreador/pnj/max.html",
        "/toreador/pnj/maliha.html",
        "/toreador/pnj/aylin.html",
        "/toreador/pnj/angelos.html",
        "/toreador/pnj/kejal.html",
        "/tremere/pnj/esen.html",
        "/tremere/pnj/dimitrios.html",
        "/tremere/pnj/sophia.html",
        "/tremere/pnj/tarik.html",
        "/tremere/pnj/mariko.html",
        "/tremere/pnj/eleni-paschalia.html",
        "/brujah/pnj/henri.html",
        "/brujah/pnj/baran.html",
        "/brujah/pnj/kaadir.html",
        "/brujah/pnj/gabriel.html",
        "/brujah/pnj/emine.html",
        "/brujah/pnj/essil.html",
        "/brujah/pnj/anna-petrova.html",
        "/ventrue/pnj/kerem.html",
        "/ventrue/pnj/louisa.html",
        "/autre/pnj/kushi.html",
        "/autre/pnj/camil.html",
        "/autre/pnj/idia.html",
        "/autre/pnj/atam.html",
        "/autre/pnj/nebetta.html",
        "/autre/pnj/inga.html",
        "/autre/pnj/meryem.html",
        "/autre/pnj/nour.html"
    ];

    const pageChoisie = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = pageChoisie;
}