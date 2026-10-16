window.addEventListener("DOMContentLoaded", async () => {

// GERER LES EVENTS
// connexion : bouton en haut à droite (DATA/account.js)
// qui voit quoi : décidé par Supabase (supabase/izmir.sql), le navigateur ne reçoit que les événements autorisés
  const grid = document.getElementById("grid");
  const header = document.getElementById("calendar-header");
  const loginStatus = document.getElementById("login-status");
  const viewer = document.getElementById("event-viewer");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");

  if (!grid) {
    console.error("Missing #grid");
    return;
  }

  let events = [];
  let selectedKey = null;

  let viewYear = 2014;
  let viewMonth = new Date().getMonth();


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

  async function loadEvents(client) {
    const { data, error } = await client
      .from("Calendar")
      .select("*");

    if (error) {
      console.error("Load events error:", error);
      return [];
    }

    return data || [];
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

    render(events);
  }

  prevBtn?.addEventListener("click", () => changeMonth(-1));
  nextBtn?.addEventListener("click", () => changeMonth(1));

// it's tea time INNIT ? (aha...)

  render(events);

  izmirAccount.onChange(async ({ client, user, username, profile, error }) => {
    if (error) {
      if (loginStatus) loginStatus.textContent = "Connexion au serveur impossible";
      return;
    }

    if (loginStatus) {
      loginStatus.textContent = !user
        ? "Visiteur : événements publics"
        : profile
          ? `✔ ${username}${profile.clan ? ` (${profile.clan})` : ""}`
          : "Compte authentifié, profil introuvable";
    }

    events = await loadEvents(client);
    selectedKey = null;
    if (viewer) viewer.innerHTML = "";
    render(events);
  });

});
