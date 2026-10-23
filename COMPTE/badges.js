// Badges de l'espace joueur : une rangée de blinkies dans la colonne de gauche.
//
// Chaque joueur ne voit que SES badges (rien n'est montré aux autres).
//
// Pour ajouter un badge :
//   1. mettre le blinkie (150 × 20 px) dans /img/blinkies/badges/
//   2. ajouter une ligne dans la liste BADGES ci-dessous
//
// Trois sortes de badges :
//   - automatique : { compte: "lettres" | "evenements" | "signalements", min: nombre }
//       lettres       = lettres écrites dans le coffre-fort (pas les fichiers envoyés)
//       evenements    = événements ajoutés au calendrier
//       signalements  = erreurs signalées
//   - dans la fiche du joueur : { main: true }
//       à donner dans Supabase → Table Editor → profiles → colonne « badges » du joueur,
//       en ajoutant l'identifiant du badge, ex : {pigeon}  ou  {pigeon,nebetta}
//   - badge secret gagné en cliquant quelque part : { main: true } aussi, puis
//       1. ajouter son identifiant à la liste de izmir_gagner_badge (supabase/izmir.sql)
//       2. sur la page, entourer le texte à cliquer : <span data-badge="identifiant">…</span>
//          et charger /DATA/badges-secrets.js (voir WIKI/tremere/index.html)
(function () {
  const BADGES = [
    { id: "writer", image: "/img/blinkies/badges/writer.gif", nom: "writer",
      desc: "A écrit une lettre dans le coffre-fort.", compte: "lettres", min: 1 },
    { id: "database", image: "/img/blinkies/badges/database.gif", nom: "i love my database",
      desc: "A posté une date sur le calendrier.", compte: "evenements", min: 1 },
    { id: "actually", image: "/img/blinkies/badges/actually.gif", nom: "actually…",
      desc: "A envoyé un signalement sur le site.", compte: "signalements", min: 1 },
    { id: "pyramide", image: "/img/blinkies/badges/pyramide.gif", nom: "remember 2008",
      desc: "A cliqué sur la chute de la Pyramide.", main: true },
    { id: "nebetta", image: "/img/blinkies/badges/nebetta.gif", nom: "Nebetta's darling",
      desc: "A écrit une rumeur de Nebetta.", main: true },
    { id: "inga", image: "/img/blinkies/badges/inga.gif", nom: "cyber genius",
      desc: "A fini le jeu d'Inga.", main: true },
    { id: "pigeon", image: "/img/blinkies/badges/pigeon.gif", nom: "protect the pigeon",
      desc: "Badge donné par la MJ.", main: true },
  ];

  const box = document.getElementById("badges");
  const list = document.getElementById("badges-list");
  if (!box || !list || !window.izmirAccount) return;

  // nombre de lignes créées par le joueur (Supabase ne renvoie que ce qu'il a le droit de voir)
  async function compter(client, uid) {
    const n = async (query) => {
      const { count, error } = await query;
      return error ? 0 : count || 0;
    };
    const opts = { count: "exact", head: true };
    const [lettres, evenements, signalements] = await Promise.all([
      n(client.from("handouts").select("id", opts).eq("author", uid).not("contenu", "is", null)),
      n(client.from("Calendar").select("id", opts).eq("author", uid)),
      n(client.from("tickets").select("id", opts).eq("user_id", uid)),
    ]);
    return { lettres, evenements, signalements };
  }

  function afficher(gagnes) {
    list.innerHTML = "";
    if (!gagnes.length) {
      list.innerHTML = '<div class="side-hint">aucun badge pour l\'instant…</div>';
      return;
    }
    for (const b of gagnes) {
      const img = document.createElement("img");
      img.src = b.image;
      img.alt = b.nom;
      img.title = `${b.nom} : ${b.desc}`;
      img.width = 150;
      img.height = 20;
      img.className = "badge-img";
      list.appendChild(img);
    }
  }

  izmirAccount.onChange(async ({ client, user, profile }) => {
    box.hidden = !user;
    if (!user) return;
    const totaux = await compter(client, user.id);
    const donnes = (Array.isArray(profile?.badges) ? profile.badges : []).map((t) => String(t).toLowerCase().trim());
    afficher(BADGES.filter((b) => (b.main ? donnes.includes(b.id) : (totaux[b.compte] || 0) >= b.min)));
  });
})();
