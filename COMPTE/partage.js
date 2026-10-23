
(function () {
  const norm = (s) => (s || "").toString().toLowerCase().trim();

  let usernamesPromise = null;
  let knownPlayers = new Set();

  function tagClass(t) {
    t = norm(t);
    if (t === "public") return "tag tag--public";
    if (knownPlayers.has(t)) return "tag tag--joueur";
    return "tag tag--groupe";
  }

  function chips(tags) {
    const box = document.createElement("div");
    box.className = "tags";
    for (const t of tags || []) {
      const s = document.createElement("span");
      s.className = tagClass(t);
      s.textContent = t;
      box.appendChild(s);
    }
    return box;
  }


  async function tags(acc) {
    if (!usernamesPromise) {
      usernamesPromise = acc.client.rpc("izmir_usernames").then(({ data }) => (data || []).map((r) =>
        norm(typeof r === "string" ? r : r.izmir_usernames)));
    }
    const all = await usernamesPromise;
    knownPlayers = new Set(all);
    const players = all.filter((u) => u && u !== norm(acc.username));
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

  function editor(selected, groups, onChange) {
    const box = el("div", "share-editor");
    const draw = () => {
      box.innerHTML = "";
      for (const g of groups) {
        if (!g.tags.length) continue;
        const row = el("div", "share-row");
        row.appendChild(el("span", "share-label", g.label));
        const list = el("div", "tags");
        for (const t of g.tags) {
          const b = el("button", tagClass(t) + (selected.has(t) ? " active" : ""), t);
          b.type = "button";
          b.addEventListener("click", () => {
            selected.has(t) ? selected.delete(t) : selected.add(t);
            draw();
            onChange?.();
          });
          list.appendChild(b);
        }
        row.appendChild(list);
        box.appendChild(row);
      }
    };
    draw();
    return box;
  }

  function escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function format(text) {
    return escape(text)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<i>$2</i>")
      .replace(/\n/g, "<br>");
  }
  function setupModals() {
    const forms = [...document.querySelectorAll(".modal-form")];
    if (!forms.length) return;
    const backdrop = el("div", "modal-backdrop");
    backdrop.hidden = true;
    document.body.appendChild(backdrop);

    const sync = () => {
      const open = forms.some((f) => !f.hidden);
      backdrop.hidden = !open;
      document.documentElement.classList.toggle("modal-lock", open);
    };
    const closeAll = () => forms.forEach((f) => (f.hidden = true));

    for (const f of forms) {
      new MutationObserver(sync).observe(f, { attributes: true, attributeFilter: ["hidden"] });
      // bouton ✕ en haut à droite
      const x = el("button", "modal-close", "✕");
      x.type = "button";
      x.setAttribute("aria-label", "Fermer");
      x.addEventListener("click", () => (f.hidden = true));
      f.prepend(x);
    }
    backdrop.addEventListener("click", closeAll);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && forms.some((f) => !f.hidden) && !document.querySelector(".lx:not([hidden])")) closeAll();
    });
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupModals);
  else setupModals();

  window.izmirPartage = { tags, editor, format, escape, tagClass, chips };
})();
