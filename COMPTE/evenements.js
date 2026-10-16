// Liste de tous les événements du calendrier visibles par le joueur connecté.
// Le tri "qui voit quoi" est fait par Supabase (supabase/izmir.sql) : on n'affiche que ce qu'il renvoie.
(function () {
  const gate = document.getElementById("gate");
  const content = document.getElementById("content");
  const list = document.getElementById("list");
  const filter = document.getElementById("filter");
  const count = document.getElementById("count");
  const yearLinks = document.getElementById("year-links");

  const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  let events = [];

  // "2014-03-07..." -> { y: 2014, m: 2, d: 7 }
  function parts(dateStr) {
    const iso = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return { y: +iso[1], m: +iso[2] - 1, d: +iso[3] };
    const d = new Date(dateStr);
    return isNaN(d) ? null : { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
  }

  function tagsOf(e) {
    const raw = e.permissions;
    return (Array.isArray(raw) ? raw : raw ? [raw] : []).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
  }

  function render() {
    const q = norm(filter.value.trim());
    const shown = events.filter((e) =>
      !q || norm([e.titre, e.desc, e.date, ...tagsOf(e)].join(" ")).includes(q)
    );

    list.innerHTML = "";
    yearLinks.innerHTML = "";
    count.textContent = `${shown.length} événement${shown.length > 1 ? "s" : ""}`;

    if (!shown.length) {
      list.innerHTML = `<div class="note muted">Aucun événement.</div>`;
      return;
    }

    let year = null, month = null;
    for (const e of shown) {
      const p = e._p;
      const y = p ? p.y : "sans date";

      if (y !== year) {
        year = y; month = null;
        const h = document.createElement("div");
        h.className = "ev-year";
        h.id = `annee-${y}`;
        h.textContent = y;
        list.appendChild(h);

        const a = document.createElement("a");
        a.href = `#annee-${y}`;
        a.textContent = y;
        yearLinks.appendChild(a);
      }
      if (p && p.m !== month) {
        month = p.m;
        const h = document.createElement("div");
        h.className = "ev-month";
        h.textContent = MONTHS[p.m];
        list.appendChild(h);
      }

      const div = document.createElement("div");
      div.className = "note ev";
      div.innerHTML = `
        <div class="ev-date">${p ? p.d : "?"}<small>${p ? MONTHS[p.m].slice(0, 4) : ""}</small></div>
        <div>
          <div class="title"></div>
          <div class="desc">${e.desc || ""}</div>
          <div class="tags"></div>
        </div>`;
      div.querySelector(".title").textContent = e.titre || "sans titre";
      const tags = div.querySelector(".tags");
      for (const t of tagsOf(e).length ? tagsOf(e) : ["public"]) {
        const s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        tags.appendChild(s);
      }
      if (e.image) {
        const img = document.createElement("img");
        img.src = e.image;
        img.alt = "";
        img.loading = "lazy";
        div.lastElementChild.insertBefore(img, tags);
      }
      list.appendChild(div);
    }
  }

  filter.addEventListener("input", render);

  izmirAccount.onChange(async ({ client, user, error: loadError }) => {
    content.hidden = !user;
    gate.hidden = !!user;
    if (!user) {
      gate.textContent = loadError
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (en haut à droite) pour voir tes événements.";
      events = [];
      return;
    }

    const { data, error } = await client.from("Calendar").select("*");
    if (error) {
      console.error(error);
      list.innerHTML = `<div class="note">Impossible de charger le calendrier.</div>`;
      return;
    }

    events = (data || [])
      .map((e) => ({ ...e, _p: parts(e.date) }))
      .sort((a, b) => {
        if (!a._p) return 1;
        if (!b._p) return -1;
        return a._p.y - b._p.y || a._p.m - b._p.m || a._p.d - b._p.d;
      });
    render();
  });
})();
