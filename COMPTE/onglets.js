// Onglets des espaces joueur et MJ.
// Les liens <nav class="tabs"><a href="#nom"> montrent les blocs data-tab="nom"
// (dans la page ET dans la colonne de gauche) et cachent les autres.
// L'onglet est dans l'adresse (#calendrier, #coffre…) : on peut y faire un lien direct.
(function () {
  const links = [...document.querySelectorAll(".tabs a[href^='#']")];
  const names = links.map((a) => a.getAttribute("href").slice(1));

  function show() {
    const wanted = location.hash.slice(1);
    const name = names.includes(wanted) ? wanted : names[0];
    for (const a of links) a.classList.toggle("active", a.getAttribute("href") === `#${name}`);
    for (const block of document.querySelectorAll("[data-tab]")) block.hidden = block.dataset.tab !== name;
    // fenêtres de formulaire d'un autre onglet : fermées
    for (const f of document.querySelectorAll(".modal-form")) if (!f.closest(`[data-tab="${name}"]`)) f.hidden = true;
  }

  window.addEventListener("hashchange", () => {
    show();
    window.scrollTo({ top: 0 });
  });
  show();
})();
