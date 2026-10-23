// Badges secrets : cliquer sur un texte marqué <span data-badge="identifiant"> donne le badge
// au joueur connecté (rien ne se passe si personne n'est connecté).
// Marche aussi en cliquant sur l'entrée du sommaire qui mène au titre contenant ce texte.
// Seuls les badges autorisés dans izmir_gagner_badge (supabase/izmir.sql) peuvent être gagnés ainsi.
(function () {
  const dejaEnvoye = new Set();

  function gagner(badge) {
    const account = window.izmirAccount;
    if (!badge || dejaEnvoye.has(badge) || !account?.state?.user) return;
    dejaEnvoye.add(badge);
    account.load()
      .then((client) => client.rpc("izmir_gagner_badge", { badge }))
      .catch(() => dejaEnvoye.delete(badge));
  }

  document.addEventListener("click", (e) => {
    const direct = e.target.closest("[data-badge]");
    if (direct) return gagner(direct.dataset.badge);
    // lien du sommaire vers un titre qui contient un badge
    const lien = e.target.closest('a[href^="#"]');
    if (!lien) return;
    const cible = document.getElementById(decodeURIComponent(lien.getAttribute("href").slice(1)));
    const marque = cible?.querySelector("[data-badge]");
    if (marque) gagner(marque.dataset.badge);
  });
})();
