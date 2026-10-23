
(function () {
  const gate = document.getElementById("vj-gate");
  const content = document.getElementById("vj-content");
  const select = document.getElementById("player");
  const filter = document.getElementById("vj-filter");
  const summary = document.getElementById("summary");
  const result = document.getElementById("result");

  const norm = (s) => (s || "").toString().toLowerCase().trim();
  const plain = (s) => norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const GENRES = [
    ["evenement", "événements"],
    ["handout", "handouts"],
  ];

  let client = null;
  let players = [];
  let rows = [];
  let current = null;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }


  function tagsOf(p) {
    return ["public", p.username, p.clan, p.role, ...(Array.isArray(p.extra_tags) ? p.extra_tags : [])]
      .map(norm).filter(Boolean);
  }

  // pourquoi le joueur voit cette ligne
  function why(row, p) {
    const mine = tagsOf(p);
    if (p.is_admin) return "admin : voit tout";
    if (row.genre === "evenement" && !(row.tags || []).length) return "aucun tag : public";
    const hit = (row.tags || []).map(norm).filter((t) => mine.includes(t));
    if (hit.length) return `via ${hit.join(", ")}`;
    if (row.auteur && norm(row.auteur) === norm(p.username)) return "il en est l'auteur";
    return "";
  }

  async function show() {
    const p = players.find((x) => x.user_id === select.value);
    if (!p) return;
    current = p;
    summary.textContent = "chargement…";
    result.innerHTML = "";
    const { data, error } = await client.rpc("izmir_vue_joueur", { target: p.user_id });
    if (error) {
      console.error(error);
      summary.textContent = "Impossible de charger (le SQL de la section 8 est-il lancé ?).";
      return;
    }
    rows = data || [];
    render();
  }

  function render() {
    const p = current;
    const q = plain(filter.value);
    const shown = rows.filter((r) => !q || plain([r.titre, r.auteur, ...(r.tags || [])].join(" ")).includes(q));

    summary.innerHTML = "";
    summary.appendChild(el("div", "title", p.username));
    const tags = el("div", "tags");
    for (const t of tagsOf(p)) tags.appendChild(el("span", "tag", t));
    summary.appendChild(el("div", "muted", "ses tags :"));
    summary.appendChild(tags);
    summary.appendChild(el("div", "muted vj-counts",
      GENRES.map(([g, label]) => `${rows.filter((r) => r.genre === g).length} ${label}`).join(" · ")));

    result.innerHTML = "";
    for (const [g, label] of GENRES) {
      const list = shown.filter((r) => r.genre === g)
        .sort((a, b) => String(b.jour || "").localeCompare(String(a.jour || "")));
      const box = el("div", "note");
      box.appendChild(el("div", "title", `${label} (${list.length})`));
      if (!list.length) box.appendChild(el("div", "muted", "rien"));
      for (const r of list) {
        const line = el("div", "vj-row");
        line.appendChild(el("span", "vj-date", r.jour ? new Date(r.jour).toLocaleDateString("fr-FR") : "sans date"));
        const main = el("div", "vj-main");
        main.appendChild(el("div", "vj-title", r.titre || "sans titre"));
        const meta = [
          r.genre === "handout" && (r.chemin ? (/\.pdf$/i.test(r.chemin) ? "pdf" : "image") : "lettre écrite"),
          r.auteur && `de ${r.auteur}`,
          `tags : ${(r.tags || []).join(", ") || "aucun"}`,
        ].filter(Boolean).join(" · ");
        main.appendChild(el("div", "muted vj-meta", meta));
        line.appendChild(main);
        line.appendChild(el("span", "tag vj-why", why(r, p)));
        box.appendChild(line);
      }
      result.appendChild(box);
    }
  }

  select.addEventListener("change", show);
  filter.addEventListener("input", () => current && render());

  izmirAccount.onChange(async (acc) => {
    client = acc.client;
    const ok = acc.user && acc.isAdmin;
    content.hidden = !ok;
    gate.hidden = ok;
    if (!acc.user) {
      gate.textContent = acc.error
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (bouton « connexion » en haut à droite du bandeau) avec le compte admin.";
      return;
    }
    if (!acc.isAdmin) {
      gate.textContent = "Cette page est réservée à l'admin.";
      return;
    }

    const { data } = await client.from("profiles").select("user_id, username, clan, role, extra_tags, is_admin").order("username");
    players = (data || []).filter((p) => p.user_id && p.username);
    select.innerHTML = "";
    for (const p of players) {
      const o = el("option", null, `${p.username}${p.clan ? ` — ${p.clan}` : ""}${p.role ? `, ${p.role}` : ""}${p.is_admin ? " (admin)" : ""}`);
      o.value = p.user_id;
      select.appendChild(o);
    }
    // premier joueur non admin par défaut
    const first = players.find((p) => !p.is_admin) || players[0];
    if (first) {
      select.value = first.user_id;
      show();
    }
  });
})();
