window.addEventListener("DOMContentLoaded", async () => {

// LOGIN POUR SUPABASE (si tu lis ça, les piques pas stp TT)
  const supabase = window.supabase.createClient(
    "https://bbxuycsmyowwsjrcdrsd.supabase.co",
    "sb_publishable_IvC70lWI8ymTVMaAnF76Uw_9CEKbexj"
  );
// GERER LES EVENTS
  const grid = document.getElementById("grid");
  const loginBtn = document.getElementById("loginBtn");
  const usernameInput = document.getElementById("usernameInput");
  const passwordInput = document.getElementById("passwordInput");
  const logoutBtn = document.getElementById("logoutBtn");
  const header = document.getElementById("calendar-header");
  const loginStatus = document.getElementById("login-status");
  const viewer = document.getElementById("event-viewer");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");

  if (!grid) {
    console.error("Missing #grid");
    return;
  }

  // domaine des emails des comptes Supabase (ex : "kaadir" -> "kaadir@<domaine>")
  const LOGIN_DOMAIN = "izmir.local";

  let events = [];
  let selectedKey = null;
  let player = null;

  let viewYear = 2014;
  let viewMonth = new Date().getMonth();

  const norm = (s) => (s || "").toLowerCase().trim();


  function toKey(dateStr) {
  if (!dateStr) return null;

  const iso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const d = new Date(dateStr);
  if (isNaN(d)) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

  async function loadEvents() {
    const { data, error } = await supabase
      .from("Calendar")
      .select("*");

    if (error) {
      console.error("Load events error:", error);
      return [];
    }

    return data || [];
  }

// PROFIL LIE AU COMPTE SUPABASE AUTH
  async function loadProfile(user) {

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return null;
    }

    const p = data;

    return {
      ...p,
      clan: norm(p.clan),
      role: norm(p.role),
      extra_tags: Array.isArray(p.extra_tags)
        ? p.extra_tags.map(norm)
        : []
    };
  }

// LES PERMS
  function canSee(event, player) {

  const raw = event.permissions;

  const tags = Array.isArray(raw)
    ? raw.map(norm)
    : typeof raw === "string"
      ? [norm(raw)]
      : [];

  // 💥 PUBLIC RULE FIX (IMPORTANT)
  const isPublic = tags.length === 0 || tags.includes("public");

  // guest
  if (!player) return isPublic;

  // admin
  if (player.is_admin) return true;

  const playerTags = [
    "public",
    player.clan,
    player.role,
    ...player.extra_tags
  ].map(norm);


  if (isPublic) return true;

  return tags.some(t => playerTags.includes(t));
}

// METTRE LES INFOS SUR LA SIDEBAR

  function renderSidebar(dayEvents) {

  if (!viewer) return;

  viewer.innerHTML = "";

  if (!dayEvents.length) {
    viewer.innerHTML = `<div class="note">Aucun événement</div>`;
    return;
  }

  for (const e of dayEvents) {

    const div = document.createElement("div");
    div.className = "note";

    const imgHTML = e.image
      ? `<img src="${e.image}" class="event-image" alt="event image">`
      : "";

    div.innerHTML = `
      ${imgHTML}
      <div class="title">${e.titre || "Untitled"}</div>
      <div class="meta">${e.date || ""}</div>
      <div class="desc">${e.desc || ""}</div>
    `;

    viewer.appendChild(div);
  }
}

// LE CALENDRIER (touche pas)
  function render(list) {

    grid.innerHTML = "";

    const monthName = new Date(viewYear, viewMonth)
      .toLocaleString("fr-FR", { month: "long" });

    if (header) header.textContent = `${monthName} ${viewYear}`;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (const name of ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]) {
      const head = document.createElement("div");
      head.className = "weekday";
      head.textContent = name;
      grid.appendChild(head);
    }

    const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {

      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const dayEvents = list.filter(e => toKey(e.date) === key);

      const cell = document.createElement("div");
      cell.className = "day";
      if (key === selectedKey) cell.classList.add("selected");

      const num = document.createElement("div");
      num.textContent = day;
      cell.appendChild(num);

      if (dayEvents.length) {
        const badge = document.createElement("span");
        badge.textContent = dayEvents.length;
        cell.appendChild(badge);
      }

      cell.addEventListener("click", () => {
        selectedKey = key;
        grid.querySelector(".day.selected")?.classList.remove("selected");
        cell.classList.add("selected");
        renderSidebar(dayEvents);
      });

      grid.appendChild(cell);
    }
  }

 //  Bouton pour se déplacer entre les mois (:3)
  function changeMonth(delta) {

    viewMonth += delta;

    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }

    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }

    selectedKey = null;
    if (viewer) viewer.innerHTML = "";

    render(events.filter(e => canSee(e, player)));
  }

  prevBtn?.addEventListener("click", () => changeMonth(-1));
  nextBtn?.addEventListener("click", () => changeMonth(1));

// it's tea time INNIT ? (aha...)

  events = await loadEvents();

  render(events.filter(e => canSee(e, null)));

  async function applySession(session) {
    player = session?.user ? await loadProfile(session.user) : null;

    if (session?.user && !player) {
      loginStatus.textContent = "Compte authentifié, profil introuvable";
      return;
    }

    if (player) {
      loginStatus.textContent = `✔ ${player.username || session.user.email} (${player.clan})`;
      loginBtn.hidden = true;
      usernameInput.hidden = true;
      passwordInput.hidden = true;
      logoutBtn.hidden = false;
    } else {
      loginStatus.textContent = "Visiteur : événements publics";
      loginBtn.hidden = false;
      usernameInput.hidden = false;
      passwordInput.hidden = false;
      logoutBtn.hidden = true;
    }

    render(events.filter(e => canSee(e, player)));
  }

  loginBtn?.addEventListener("click", async () => {
    const login = usernameInput.value.trim();
    const password = passwordInput.value;

    // Supabase Auth veut un email : un identifiant sans "@" est complété avec LOGIN_DOMAIN
    const email = login.includes("@") ? login : `${login}@${LOGIN_DOMAIN}`;

    loginStatus.textContent = "Connexion...";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      loginStatus.textContent = "❌ Identifiants invalides";
      return;
    }

    await applySession(data.session);
  });

  passwordInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    await applySession(null);
  });

  const { data: { session } } = await supabase.auth.getSession();
  await applySession(session);

});