// Liste de tous les événements du calendrier visibles par le joueur connecté, en frise.
// Le tri "qui voit quoi" est fait par Supabase (supabase/izmir.sql) : on n'affiche que ce qu'il renvoie.
(function () {
  const gate = document.getElementById("gate");
  const content = document.getElementById("content");
  const list = document.getElementById("list");
  const filter = document.getElementById("filter");
  const count = document.getElementById("count");
  const sortBtn = document.getElementById("sort");
  const yearLinks = document.getElementById("year-links");
  const tagLinks = document.getElementById("tag-links");

  const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const DAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  let events = [];
  let newestFirst = true;
  let activeTag = null;
  const opened = new Set(); // fiches dépliées, gardées quand on filtre

  // "2014-03-07..." -> { y: 2014, m: 2, d: 7, wd: 5 }
  function parts(dateStr) {
    if (!dateStr) return null;
    const iso = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : new Date(dateStr);
    return isNaN(d) ? null : { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), wd: d.getDay(), t: d.getTime() };
  }

  function tagsOf(e) {
    const raw = e.permissions;
    const tags = (Array.isArray(raw) ? raw : raw ? [raw] : []).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
    return tags.length ? tags : ["public"];
  }

  function sorted() {
    const dir = newestFirst ? -1 : 1;
    return [...events].sort((a, b) => {
      if (!a._p) return 1; // sans date : toujours à la fin
      if (!b._p) return -1;
      return dir * (a._p.t - b._p.t);
    });
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function card(e) {
    const p = e._p;
    const key = e.id ?? `${e.date}-${e.titre}`;
    const item = el("div", "tl-item");

    const date = el("div", "tl-date");
    date.innerHTML = p
      ? `<b>${p.d}</b><span>${MONTHS[p.m].slice(0, 4)}.</span><small>${DAYS[p.wd]}</small>`
      : `<b>?</b>`;
    item.appendChild(date);

    const box = el("div", "note tl-card");
    if (opened.has(key)) box.classList.add("open");

    const head = el("div", "tl-head");
    if (e.image) {
      const thumb = el("img", "tl-thumb");
      thumb.src = e.image;
      thumb.alt = "";
      thumb.loading = "lazy";
      head.appendChild(thumb);
    }
    const text = el("div", "tl-text");
    text.appendChild(el("div", "title", e.titre || "sans titre"));

    const tags = el("div", "tags");
    for (const t of tagsOf(e)) {
      const b = el("button", "tag" + (t === activeTag ? " active" : ""), t);
      b.type = "button";
      b.title = `voir seulement « ${t} »`;
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setTag(t === activeTag ? null : t);
      });
      tags.appendChild(b);
    }
    text.appendChild(tags);
    head.appendChild(text);
    box.appendChild(head);

    const desc = el("div", "desc");
    desc.innerHTML = e.desc || "";
    box.appendChild(desc);

    if (e.image) {
      const big = el("img", "tl-image");
      big.src = e.image;
      big.alt = "";
      big.loading = "lazy";
      box.appendChild(big);
    }

    // fiche repliée par défaut : on la déplie si elle a de quoi l'être
    const more = el("button", "tl-more", "lire la suite");
    more.type = "button";
    box.appendChild(more);
    const toggle = () => {
      const open = box.classList.toggle("open");
      open ? opened.add(key) : opened.delete(key);
      more.textContent = open ? "replier" : "lire la suite";
    };
    more.addEventListener("click", (ev) => { ev.stopPropagation(); toggle(); });
    box.addEventListener("click", (ev) => {
      if (!box.classList.contains("open") && !ev.target.closest("a")) toggle();
    });
    if (box.classList.contains("open")) more.textContent = "replier";

    item.appendChild(box);
    // une fois affichée : pas de bouton si tout tient déjà
    requestAnimationFrame(() => {
      if (!e.image && desc.scrollHeight <= desc.clientHeight + 2 && !box.classList.contains("open")) {
        more.hidden = true;
        box.classList.add("short");
      }
    });
    return item;
  }

  function renderSidebar() {
    // années (avec leur nombre d'événements)
    yearLinks.innerHTML = "";
    const years = new Map();
    for (const e of sorted()) {
      const y = e._p ? e._p.y : "sans date";
      years.set(y, (years.get(y) || 0) + 1);
    }
    for (const [y, n] of years) {
      const a = el("a", null, y);
      a.href = `#annee-${y}`;
      a.title = `${n} événement${n > 1 ? "s" : ""}`;
      yearLinks.appendChild(a);
    }

    // tags (pour filtrer d'un clic)
    tagLinks.innerHTML = "";
    const tags = new Map();
    for (const e of events) for (const t of tagsOf(e)) tags.set(t, (tags.get(t) || 0) + 1);
    for (const [t, n] of [...tags].sort((a, b) => b[1] - a[1])) {
      const b = el("button", "tag" + (t === activeTag ? " active" : ""), `${t} · ${n}`);
      b.type = "button";
      b.addEventListener("click", () => setTag(t === activeTag ? null : t));
      tagLinks.appendChild(b);
    }
  }

  function setTag(t) {
    activeTag = t;
    render();
  }

  function render() {
    const q = norm(filter.value.trim());
    const shown = sorted().filter((e) =>
      (!activeTag || tagsOf(e).includes(activeTag)) &&
      (!q || norm([e.titre, e.desc, e.date, ...tagsOf(e)].join(" ")).includes(q))
    );

    renderSidebar();
    list.innerHTML = "";
    count.textContent = `${shown.length} événement${shown.length > 1 ? "s" : ""}` + (activeTag ? ` · ${activeTag}` : "");

    if (!shown.length) {
      list.appendChild(el("div", "note muted", "Aucun événement."));
      return;
    }

    let year = null, month = null, section = null;
    for (const e of shown) {
      const p = e._p;
      const y = p ? p.y : "sans date";

      if (y !== year) {
        year = y; month = null;
        section = el("section", "tl-year");
        const h = el("div", "ev-year", y);
        h.id = `annee-${y}`;
        section.appendChild(h);
        list.appendChild(section);
      }
      if (p && p.m !== month) {
        month = p.m;
        section.appendChild(el("div", "ev-month", MONTHS[p.m]));
      }
      section.appendChild(card(e));
    }
  }

  filter.addEventListener("input", render);
  sortBtn.addEventListener("click", () => {
    newestFirst = !newestFirst;
    sortBtn.textContent = newestFirst ? "↓ plus récent d'abord" : "↑ plus ancien d'abord";
    render();
  });

  izmirAccount.onChange(async ({ client, user, error: loadError }) => {
    content.hidden = !user;
    gate.hidden = !!user;
    if (!user) {
      gate.textContent = loadError
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (bouton « connexion » au bout du menu) pour voir tes événements.";
      events = [];
      return;
    }

    const { data, error } = await client.from("Calendar").select("*");
    if (error) {
      console.error(error);
      list.innerHTML = `<div class="note">Impossible de charger le calendrier.</div>`;
      return;
    }

    events = (data || []).map((e) => ({ ...e, _p: parts(e.date) }));
    activeTag = null;
    render();
  });
})();
