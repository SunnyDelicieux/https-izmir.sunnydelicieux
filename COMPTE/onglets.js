
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
