// Signalements (table "tickets", supabase/izmir.sql). Le mail est envoyé par Supabase (supabase/functions/ticket-mail).
// Deux usages, selon data-scope sur #tickets :
//   "mine" (espace joueur) : formulaire + ses propres signalements et les réponses
//   "all"  (espace MJ)     : tous les signalements, avec réponse et statut (admin seulement)
(function () {
  const gate = document.getElementById("si-gate");
  const content = document.getElementById("si-content");
  const form = document.getElementById("ticket-form");
  const msg = document.getElementById("form-msg");
  const ticketsBox = document.getElementById("tickets");
  const ticketsTitle = document.getElementById("tickets-title");

  const STATUTS = ["nouveau", "en cours", "réglé"];
  const all = ticketsBox.dataset.scope === "all";
  let account = null;

  // page d'où vient le joueur (passée par le menu du compte)
  const from = new URLSearchParams(location.search).get("page");
  if (form && from && from.startsWith("/") && !from.startsWith("/COMPTE/")) form.page.value = from;

  function when(iso) {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }

  async function loadTickets() {
    const { client, user } = account;
    const isAdmin = all && account.isAdmin; // outils de réponse : espace MJ seulement
    if (ticketsTitle) ticketsTitle.textContent = all ? "tous les signalements" : "mes signalements";

    let query = client.from("tickets").select("*").order("created_at", { ascending: false }).limit(100);
    if (!all) query = query.eq("user_id", user.id); // l'admin aussi ne voit ici que les siens
    const { data, error } = await query;

    ticketsBox.innerHTML = "";
    if (error) {
      console.error(error);
      ticketsBox.innerHTML = `<div class="empty">Impossible de charger les signalements.</div>`;
      return;
    }
    if (!data.length) {
      ticketsBox.innerHTML = `<div class="empty">Aucun signalement pour l'instant.</div>`;
      return;
    }

    for (const t of data) {
      const div = document.createElement("div");
      div.className = "note ticket";
      div.innerHTML = `
        <span class="tag statut"></span>
        <div class="title"></div>
        <div class="meta"></div>
        <div class="msg"></div>`;
      const statut = div.querySelector(".statut");
      statut.textContent = t.statut;
      statut.classList.add(`statut-${t.statut.replace(/ /g, "-")}`);
      div.querySelector(".title").textContent = t.categorie;
      div.querySelector(".meta").textContent =
        [isAdmin ? t.username : null, when(t.created_at), t.page].filter(Boolean).join(" · ");
      div.querySelector(".msg").textContent = t.message;

      if (t.reponse) {
        const r = document.createElement("div");
        r.className = "reply";
        r.textContent = t.reponse;
        div.appendChild(r);
      }

      if (isAdmin) div.appendChild(adminTools(t));
      ticketsBox.appendChild(div);
    }
  }

  // réponse + statut, pour l'admin
  function adminTools(t) {
    const box = document.createElement("div");
    box.className = "ticket-admin field";
    box.innerHTML = `
      <textarea placeholder="réponse au joueur…" style="min-height:50px"></textarea>
      <div class="row-btns"></div>`;
    const area = box.querySelector("textarea");
    area.value = t.reponse || "";
    const btns = box.querySelector(".row-btns");

    for (const s of STATUTS) {
      const b = document.createElement("button");
      b.className = "btn";
      b.type = "button";
      b.textContent = s === t.statut ? `✔ ${s}` : s;
      b.addEventListener("click", async () => {
        b.disabled = true;
        const { error } = await account.client
          .from("tickets")
          .update({ statut: s, reponse: area.value.trim() || null })
          .eq("id", t.id);
        if (error) {
          console.error(error);
          b.disabled = false;
          b.textContent = "échec";
          return;
        }
        loadTickets();
      });
      btns.appendChild(b);
    }
    return box;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = form.message.value.trim();
    if (!message) return;

    const button = form.querySelector("button");
    button.disabled = true;
    msg.textContent = "envoi…";

    const { error } = await account.client.from("tickets").insert({
      categorie: form.categorie.value,
      page: form.page.value.trim() || null,
      message,
    });

    button.disabled = false;
    if (error) {
      console.error(error);
      msg.textContent = "L'envoi a échoué, réessaie plus tard.";
      return;
    }
    msg.textContent = "Merci, c'est envoyé ✔";
    form.message.value = "";
    loadTickets();
  });

  izmirAccount.onChange((acc) => {
    account = acc;
    content.hidden = !acc.user;
    gate.hidden = !!acc.user;
    if (!acc.user) {
      gate.textContent = acc.error
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (bouton « connexion » en haut à droite du bandeau) pour signaler une erreur.";
      return;
    }
    if (all && !acc.isAdmin) {
      content.hidden = true;
      gate.hidden = false;
      gate.textContent = "Réservé à l'admin.";
      return;
    }
    if (msg) msg.textContent = "";
    loadTickets();
  });
})();
