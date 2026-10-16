// Outils communs pour ce que les joueurs créent (événements, lettres, fichiers) :
//   izmirPartage.tags(acc)                 -> { mine: [...], players: [...] } tags que ce compte peut utiliser
//   izmirPartage.editor(selected, groups)  -> rangées de tags cliquables (selected : un Set)
//   izmirPartage.format(text)              -> HTML sûr : texte échappé, **gras**, *italique*, retours à la ligne
// Les règles qui comptent vraiment sont dans Supabase (supabase/izmir.sql, section 7) :
// ce fichier ne fait que proposer les bons choix.
(function () {
  const norm = (s) => (s || "").toString().toLowerCase().trim();

  let usernamesPromise = null;

  // ses propres tags + le pseudo de chaque joueur (pour écrire à quelqu'un en particulier)
  async function tags(acc) {
    if (!usernamesPromise) {
      usernamesPromise = acc.client.rpc("izmir_usernames").then(({ data }) => (data || []).map((r) =>
        norm(typeof r === "string" ? r : r.izmir_usernames)));
    }
    const players = (await usernamesPromise).filter((u) => u && u !== norm(acc.username));
    let mine = [...new Set(acc.tags)].filter((t) => t !== "public" && t !== norm(acc.username));
    if (acc.isAdmin) {
      // l'admin peut viser n'importe quel groupe : tous les clans, rôles, extra_tags
      const { data } = await acc.client.from("profiles").select("clan, role, extra_tags");
      const groups = new Set();
      for (const p of data || []) {
        for (const t of [p.clan, p.role, ...(Array.isArray(p.extra_tags) ? p.extra_tags : [])]) if (norm(t)) groups.add(norm(t));
      }
      mine = [...groups].sort();
    }
    return { mine: [...(acc.isAdmin ? [] : [norm(acc.username)]), ...mine, "public"], players };
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // groups : [{ label, tags: [...] }]
  function editor(selected, groups, onChange) {
    const box = el("div", "share-editor");
    const draw = () => {
      box.innerHTML = "";
      for (const g of groups) {
        if (!g.tags.length) continue;
        const row = el("div", "share-row");
        row.appendChild(el("span", "share-label", g.label));
        const chips = el("div", "tags");
        for (const t of g.tags) {
          const b = el("button", "tag" + (selected.has(t) ? " active" : ""), t);
          b.type = "button";
          b.addEventListener("click", () => {
            selected.has(t) ? selected.delete(t) : selected.add(t);
            draw();
            onChange?.();
          });
          chips.appendChild(b);
        }
        row.appendChild(chips);
        box.appendChild(row);
      }
    };
    draw();
    return box;
  }

  function escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // jamais de HTML venant d'un joueur : on échappe tout, puis on remet seulement gras / italique
  function format(text) {
    return escape(text)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<i>$2</i>")
      .replace(/\n/g, "<br>");
  }

  window.izmirPartage = { tags, editor, format, escape };
})();
