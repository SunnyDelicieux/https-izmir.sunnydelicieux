
(function () {
  const status = document.getElementById("ev-status");
  const list = document.getElementById("ev-list");
  const gridBox = document.getElementById("ev-grid");
  const dayBox = document.getElementById("ev-day");
  const filter = document.getElementById("ev-filter");
  const count = document.getElementById("ev-count");
  const sortBtn = document.getElementById("ev-sort");
  const newBtn = document.getElementById("ev-new");
  const viewBtns = document.querySelectorAll("[data-view]");
  const yearLinks = document.getElementById("year-links");
  const tagLinks = document.getElementById("tag-links");

  const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const DAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const VIEW_KEY = "izmir-calendrier-vue";

  let events = [];
  let newestFirst = true;
  let activeTag = null;
  let view = "grille";
  let month = null;       // { y, m } affiché dans la grille
  let selectedDay = null; // "2014-03-02"

  // Badges secrets : ouvrir un de ces événements (ou cliquer sur son jour) donne le badge.
  // titre = début du titre (sans majuscules ni accents), annee = année de l'événement.
  const BADGES_EVENEMENTS = [
    { badge: "pyramide", titre: "la seconde in", annee: "2008" },
  ];
  const sansAccent = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  function badgeSecret(e) {
    const titre = sansAccent(e.titre);
    for (const r of BADGES_EVENEMENTS) {
      if (titre.startsWith(r.titre) && String(e.date || "").startsWith(r.annee)) window.izmirBadges?.gagner(r.badge);
    }
  }
  const opened = new Set(); // fiches dépliées, gardées quand on filtre

  try { view = localStorage.getItem(VIEW_KEY) === "liste" ? "liste" : "grille"; } catch (e) {}

  // "2014-03-07..." -> { y: 2014, m: 2, d: 7, wd: 5 }
  function parts(dateStr) {
    if (!dateStr) return null;
    const iso = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : new Date(dateStr);
    return isNaN(d) ? null : { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), wd: d.getDay(), t: d.getTime() };
  }
  const keyOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

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

  // événements après filtre (tag + texte), communs aux deux vues
  function filtered() {
    const q = norm(filter.value.trim());
    return sorted().filter((e) =>
      (!activeTag || tagsOf(e).includes(activeTag)) &&
      (!q || norm([e.titre, e.desc, e.date, e.author_name, ...tagsOf(e)].join(" ")).includes(q))
    );
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
    if (e.author_name) text.appendChild(el("div", "ev-author", `par ${e.author_name}`));

    const tags = el("div", "tags");
    for (const t of tagsOf(e)) {
      const b = el("button", izmirPartage.tagClass(t) + (t === activeTag ? " active" : ""), t);
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
    // texte d'un joueur : jamais interprété comme du HTML (seulement **gras** / *italique*)
    desc.innerHTML = e.author ? izmirPartage.format(e.desc) : (e.desc || "");
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
      if (open) badgeSecret(e);
      more.textContent = open ? "replier" : "lire la suite";
    };
    more.addEventListener("click", (ev) => { ev.stopPropagation(); toggle(); });
    box.addEventListener("click", (ev) => {
      if (!box.classList.contains("open") && !ev.target.closest("a")) toggle();
    });
    if (box.classList.contains("open")) more.textContent = "replier";

    // ses propres événements (ou tous pour l'admin) : modifier / supprimer
    if (account?.user && (account.isAdmin || (e.author && e.author === account.user.id))) {
      const actions = el("div", "tl-actions");
      const edit = el("button", "tl-more", "modifier");
      edit.type = "button";
      edit.addEventListener("click", (ev) => { ev.stopPropagation(); openForm(e); });
      const del = el("button", "tl-more", "supprimer");
      del.type = "button";
      del.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        if (!confirm(`Supprimer « ${e.titre || "sans titre"} » ?`)) return;
        const { error } = await account.client.from("Calendar").delete().eq("id", e.id);
        if (error) { console.error(error); del.textContent = "échec"; return; }
        load();
      });
      actions.append(edit, del);
      box.appendChild(actions);
    }

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

  // ── Colonne de gauche : années et tags ────────────────────────────────────

  function renderSidebar() {
    yearLinks.innerHTML = "";
    const years = new Map();
    for (const e of sorted()) {
      const y = e._p ? e._p.y : "sans date";
      years.set(y, (years.get(y) || 0) + 1);
    }
    for (const [y, n] of years) {
      const a = el("a", null, y);
      a.href = "#calendrier";
      a.title = `${n} événement${n > 1 ? "s" : ""}`;
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (view === "grille" && y !== "sans date") {
          // en grille : on saute au premier mois de l'année qui a un événement
          const first = sorted().filter((x) => x._p && x._p.y === y).pop();
          month = { y, m: first ? first._p.m : 0 };
          selectedDay = null;
          render();
        } else {
          document.getElementById(`annee-${y}`)?.scrollIntoView({ behavior: "smooth" });
        }
      });
      yearLinks.appendChild(a);
    }

    tagLinks.innerHTML = "";
    const tags = new Map();
    for (const e of events) for (const t of tagsOf(e)) tags.set(t, (tags.get(t) || 0) + 1);
    for (const [t, n] of [...tags].sort((a, b) => b[1] - a[1])) {
      const b = el("button", izmirPartage.tagClass(t) + (t === activeTag ? " active" : ""), `${t} · ${n}`);
      b.type = "button";
      b.addEventListener("click", () => setTag(t === activeTag ? null : t));
      tagLinks.appendChild(b);
    }
  }

  function setTag(t) {
    activeTag = t;
    render();
  }

  // ── Vue liste (frise) ─────────────────────────────────────────────────────

  function renderList(shown) {
    list.innerHTML = "";
    if (!shown.length) {
      list.appendChild(el("div", "empty", activeTag || filter.value ? "Aucun événement ne correspond." : "Aucun événement pour l'instant."));
      return;
    }
    let year = null, m = null, section = null;
    for (const e of shown) {
      const p = e._p;
      const y = p ? p.y : "sans date";
      if (y !== year) {
        year = y; m = null;
        section = el("section", "tl-year");
        const h = el("div", "ev-year", y);
        h.id = `annee-${y}`;
        section.appendChild(h);
        list.appendChild(section);
      }
      if (p && p.m !== m) {
        m = p.m;
        section.appendChild(el("div", "ev-month", MONTHS[p.m]));
      }
      section.appendChild(card(e));
    }
  }

  // ── Vue grille (un mois) ──────────────────────────────────────────────────

  function renderGrid(shown) {
    gridBox.innerHTML = "";
    dayBox.innerHTML = "";
    if (!month) {
      const latest = shown.find((e) => e._p) || sorted().find((e) => e._p);
      const p = latest?._p;
      month = p ? { y: p.y, m: p.m } : { y: 2014, m: new Date().getMonth() };
    }
    const { y, m } = month;

    const nav = el("div", "cal-nav");
    const prev = el("button", "btn", "◀");
    const next = el("button", "btn", "▶");
    prev.type = next.type = "button";
    prev.title = "mois précédent";
    next.title = "mois suivant";
    prev.addEventListener("click", () => moveMonth(-1));
    next.addEventListener("click", () => moveMonth(1));
    nav.append(prev, el("div", "cal-month", `${MONTHS[m]} ${y}`), next);
    gridBox.appendChild(nav);

    // événements du mois, rangés par jour
    const byDay = new Map();
    for (const e of shown) {
      if (!e._p || e._p.y !== y || e._p.m !== m) continue;
      const k = keyOf(y, m, e._p.d);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(e);
    }

    const grid = el("div", "cal-grid");
    for (const d of ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]) grid.appendChild(el("div", "cal-weekday", d));
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) grid.appendChild(el("div", "cal-day empty"));
    const days = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const k = keyOf(y, m, d);
      const evs = byDay.get(k) || [];
      const cell = el("button", "cal-day" + (evs.length ? " has" : "") + (k === selectedDay ? " selected" : ""));
      cell.type = "button";
      cell.appendChild(el("span", "cal-num", d));
      if (evs.length) {
        // les premiers titres, en petit, pour voir d'un coup d'œil
        for (const e of evs.slice(0, 2)) cell.appendChild(el("span", "cal-title", e.titre || "sans titre"));
        if (evs.length > 2) cell.appendChild(el("span", "cal-more", `+${evs.length - 2}`));
      }
      cell.addEventListener("click", () => {
        selectedDay = selectedDay === k ? null : k;
        if (selectedDay) evs.forEach(badgeSecret);
        render();
      });
      grid.appendChild(cell);
    }
    gridBox.appendChild(grid);

    // sous la grille : le jour choisi, sinon tout le mois
    const picked = selectedDay ? byDay.get(selectedDay) || [] : [...byDay.values()].flat();
    const label = selectedDay
      ? `${+selectedDay.slice(8)} ${MONTHS[m]} ${y}`
      : `${MONTHS[m]} ${y}`;
    dayBox.appendChild(el("div", "ev-month", picked.length ? label : `${label} : aucun événement`));
    const ordered = [...picked].sort((a, b) => a._p.t - b._p.t);
    for (const e of ordered) dayBox.appendChild(card(e));
  }

  function moveMonth(delta) {
    let { y, m } = month;
    m += delta;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    month = { y, m };
    selectedDay = null;
    render();
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  function render() {
    const shown = filtered();
    renderSidebar();
    count.textContent = `${shown.length} événement${shown.length > 1 ? "s" : ""}` + (activeTag ? ` · ${activeTag}` : "");
    for (const b of viewBtns) b.classList.toggle("active", b.dataset.view === view);
    sortBtn.hidden = view !== "liste";
    list.hidden = view !== "liste";
    gridBox.hidden = dayBox.hidden = view !== "grille";
    view === "liste" ? renderList(shown) : renderGrid(shown);
  }

  filter.addEventListener("input", render);
  sortBtn.addEventListener("click", () => {
    newestFirst = !newestFirst;
    sortBtn.textContent = newestFirst ? "↓ plus récent d'abord" : "↑ plus ancien d'abord";
    render();
  });
  for (const b of viewBtns) {
    b.addEventListener("click", () => {
      view = b.dataset.view;
      try { localStorage.setItem(VIEW_KEY, view); } catch (e) {}
      render();
    });
  }

  // ── Créer / modifier un événement ─────────────────────────────────────────

  const form = document.getElementById("event-form");
  const formTitle = document.getElementById("form-title");
  const formTags = document.getElementById("ev-tags");
  const formMsg = document.getElementById("ev-msg");
  let editing = null;   // événement en cours de modification (null = nouveau)
  let chosen = new Set();

  async function openForm(e = null) {
    editing = e;
    chosen = new Set(e ? tagsOf(e).filter((t) => !(t === "public" && !e.permissions?.length)) : []);
    formTitle.textContent = e ? "modifier l'événement" : "nouvel événement";
    form.titre.value = e?.titre || "";
    // nouvel événement : date du jour choisi dans la grille, s'il y en a un
    form.date.value = e?.date ? String(e.date).slice(0, 10) : selectedDay || "";
    form.desc.value = e?.desc || "";
    formMsg.textContent = "";
    formTags.innerHTML = "";
    const { mine, players } = await izmirPartage.tags(account);
    formTags.appendChild(izmirPartage.editor(chosen, [
      { label: account.isAdmin ? "groupes" : "mes groupes", tags: mine },
      { label: "joueurs", tags: players },
    ]));
    form.hidden = false;
    form.titre.focus();
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!chosen.size) {
      formMsg.textContent = "Choisis au moins un tag (qui peut voir l'événement).";
      return;
    }
    const row = {
      titre: form.titre.value.trim(),
      date: form.date.value,
      desc: form.desc.value.trim() || null,
      permissions: [...chosen],
    };
    formMsg.textContent = "enregistrement…";
    const { error } = editing
      ? await account.client.from("Calendar").update(row).eq("id", editing.id)
      : await account.client.from("Calendar").insert(row);
    if (error) {
      console.error(error);
      formMsg.textContent = /row-level security|violates/i.test(error.message || "")
        ? "Refusé : tu ne peux utiliser que tes propres tags ou des pseudos de joueurs."
        : "L'enregistrement a échoué, réessaie.";
      return;
    }
    form.hidden = true;
    load();
  });

  document.getElementById("ev-cancel").addEventListener("click", () => (form.hidden = true));
  newBtn.addEventListener("click", () => openForm());

  // ── Chargement ────────────────────────────────────────────────────────────

  let account = null;

  async function load() {
    const { data, error } = await account.client.from("Calendar").select("*");
    if (error) {
      console.error(error);
      status.hidden = false;
      status.textContent = "Impossible de charger le calendrier.";
      return;
    }
    if (account.user) status.hidden = true; // le visiteur garde son message
    events = (data || []).map((e) => ({ ...e, _p: parts(e.date) }));
    if (account.user) await izmirPartage.tags(account).catch(() => {}); // pour colorer les pseudos de joueurs
    render();
  }

  izmirAccount.onChange(async (acc) => {
    account = acc;
    form.hidden = true;
    newBtn.hidden = !acc.user; // seuls les joueurs connectés créent des événements
    if (acc.error) {
      status.hidden = false;
      status.textContent = "Connexion au serveur impossible, réessaie plus tard.";
      return;
    }
    status.hidden = !!acc.user;
    if (!acc.user) status.textContent = "Visiteur : seulement les événements publics. Connecte-toi pour voir les tiens.";
    activeTag = null;
    month = null;
    selectedDay = null;
    load();
  });
})();
