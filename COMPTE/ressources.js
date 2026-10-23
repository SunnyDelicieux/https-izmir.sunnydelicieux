// Onglet « ressources » de l'espace joueur : les ressources du clan du joueur.
// Les données sont dans Supabase (tables ressources et ressources_sources, supabase/izmir.sql,
// section 9) : chaque joueur ne reçoit que celles de son clan, l'admin reçoit tout.
// Elles se modifient dans Supabase → Table Editor, jamais dans ce fichier (le dépôt est public).
(function () {
  const gate = document.getElementById("re-gate");
  const content = document.getElementById("re-content");
  const listBox = document.getElementById("re-list");
  const clanTitle = document.getElementById("re-clan");
  const clanLinks = document.getElementById("re-clans");
  const clanSide = document.getElementById("re-clans-box");
  if (!gate || !content || !listBox || !window.izmirAccount) return;

  let rows = [];
  let sources = [];
  let clanActif = null;

  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ●●○ : points disponibles pleins, points engagés vides
  function pips(plein, total, cls) {
    const box = el("span", "re-pips " + (cls || ""));
    for (let i = 0; i < total; i++) box.appendChild(el("i", i < plein ? "on" : "off"));
    return box;
  }

  const signe = (v) => (v == null ? "" : v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");

  function carte(r) {
    const card = el("div", "note re-card");
    const head = el("div", "re-head");
    head.appendChild(el("div", "title re-name", r.ressource));
    if (r.etat) head.appendChild(el("span", "re-etat", r.etat));
    card.appendChild(head);

    const stats = el("div", "re-stats");
    if (r.valeur_max != null) {
      const dispo = el("div", "re-stat");
      dispo.appendChild(el("span", "re-label", "disponible"));
      dispo.appendChild(pips(r.disponible ?? r.valeur_max, r.valeur_max));
      dispo.appendChild(el("span", "re-num", `${r.disponible ?? r.valeur_max} / ${r.valeur_max}`));
      stats.appendChild(dispo);
    }
    if (r.seuil != null) {
      const stress = r.stress || 0;
      const critique = stress >= r.seuil;
      const st = el("div", "re-stat" + (critique ? " critique" : ""));
      st.appendChild(el("span", "re-label", "stress"));
      st.appendChild(pips(stress, r.seuil, "stress"));
      st.appendChild(el("span", "re-num", `${stress} / ${r.seuil}` + (critique ? " · critique" : "")));
      stats.appendChild(st);
    }
    if (stats.childNodes.length) card.appendChild(stats);
    if (r.notes) card.appendChild(el("div", "re-notes", r.notes));

    const src = sources.filter((s) => norm(s.clan) === norm(r.clan) && norm(s.ressource) === norm(r.ressource));
    if (src.length) {
      const det = el("details", "re-sources");
      det.appendChild(el("summary", null, `provenance (${src.length})`));
      for (const s of src) {
        const li = el("div", "re-source");
        li.appendChild(el("span", "re-val" + ((s.valeur || 0) < 0 ? " neg" : ""), signe(s.valeur)));
        const txt = el("div", "re-src-txt");
        txt.appendChild(el("b", null, s.source));
        if (s.description) txt.appendChild(el("div", "re-src-desc", s.description));
        li.appendChild(txt);
        det.appendChild(li);
      }
      card.appendChild(det);
    }
    return card;
  }

  function render() {
    const clans = [...new Set(rows.map((r) => norm(r.clan)))].sort();
    if (!clans.includes(clanActif)) clanActif = clans[0] || null;

    // l'admin voit tous les clans : un bouton par clan dans la colonne de gauche
    clanSide.hidden = clans.length < 2;
    clanLinks.innerHTML = "";
    for (const c of clans) {
      const b = el("button", "tag" + (c === clanActif ? " active" : ""), c);
      b.type = "button";
      b.addEventListener("click", () => { clanActif = c; render(); });
      clanLinks.appendChild(b);
    }

    listBox.innerHTML = "";
    clanTitle.textContent = clanActif ? `ressources ${clanActif}` : "";
    const mine = rows.filter((r) => norm(r.clan) === clanActif);
    if (!mine.length) {
      listBox.appendChild(el("div", "muted", "Aucune ressource enregistrée pour ton clan pour l'instant."));
      return;
    }
    for (const r of mine) listBox.appendChild(carte(r));
  }

  async function load(client) {
    const [a, b] = await Promise.all([
      client.from("ressources").select("*").order("ordre").order("id"),
      client.from("ressources_sources").select("*").order("ordre").order("id"),
    ]);
    if (a.error) {
      console.error(a.error);
      gate.hidden = false;
      content.hidden = true;
      gate.textContent = /does not exist|schema cache/i.test(a.error.message || "")
        ? "Les ressources ne sont pas encore installées (supabase/izmir.sql, section 9)."
        : "Impossible de charger les ressources.";
      return;
    }
    rows = a.data || [];
    sources = b.error ? [] : b.data || [];
    gate.hidden = true;
    content.hidden = false;
    render();
  }

  izmirAccount.onChange((acc) => {
    rows = [];
    sources = [];
    if (!acc.user) {
      gate.hidden = false;
      content.hidden = true;
      clanSide.hidden = true;
      gate.textContent = "Connecte-toi pour voir les ressources de ton clan.";
      return;
    }
    clanActif = norm(acc.profile?.clan) || null;
    gate.hidden = false;
    gate.textContent = "chargement…";
    load(acc.client);
  });
})();
