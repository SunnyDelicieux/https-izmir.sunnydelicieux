// Coffre-fort : les handouts du joueur (table "handouts" + fichiers du bucket privé "handouts").
// Supabase ne renvoie que ceux que le joueur a le droit de voir (supabase/izmir.sql) ;
// les liens vers les fichiers expirent au bout d'une heure.
(function () {
  const gate = document.getElementById("gate");
  const content = document.getElementById("content");
  const vault = document.getElementById("vault");

  const BUCKET = "handouts";
  const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

  const PDF = /\.pdf$/i;
  const label = (name) => name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

  // vignettes des PDF : dessinées seulement quand elles arrivent à l'écran
  const covers = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      covers.unobserve(entry.target);
      const canvas = entry.target;
      izmirLecteur.cover(canvas.dataset.url, canvas)
        .then((n) => {
          const meta = canvas.closest(".vault-item").querySelector(".vault-meta");
          if (meta.textContent === "pdf") meta.textContent = `pdf · ${n} page${n > 1 ? "s" : ""}`;
          canvas.classList.add("ready");
        })
        .catch((err) => {
          console.error(err);
          canvas.replaceWith(Object.assign(document.createElement("div"), { className: "file-icon", textContent: "pdf" }));
        });
    }
  }, { rootMargin: "200px" });

  function section(title, files, urls) {
    const box = document.createElement("div");
    box.className = "note";
    box.innerHTML = `<div class="title"></div><div class="vault-grid"></div>`;
    box.querySelector(".title").textContent = title;
    const grid = box.querySelector(".vault-grid");

    for (const f of files) {
      const url = urls[f.path];
      const kind = f.kind || (PDF.test(f.name) ? "pdf" : IMAGE.test(f.name) ? "image" : "file");

      const a = document.createElement("a");
      a.className = "vault-item";
      a.href = url || "#";
      a.target = "_blank";
      a.rel = "noopener";

      const thumb = document.createElement("div");
      thumb.className = "vault-thumb";
      if (kind === "texte") {
        // aperçu d'une lettre écrite : le début du texte, sur une feuille
        const sheet = document.createElement("div");
        sheet.className = "letter-thumb";
        sheet.innerHTML = izmirPartage.format((f.contenu || "").slice(0, 400));
        thumb.appendChild(sheet);
      } else if (kind === "image") {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        img.loading = "lazy";
        thumb.appendChild(img);
      } else if (kind === "pdf" && url) {
        const canvas = document.createElement("canvas");
        canvas.dataset.url = url;
        thumb.appendChild(canvas);
        covers.observe(canvas);
      } else {
        const icon = document.createElement("div");
        icon.className = "file-icon";
        icon.textContent = (f.name.split(".").pop() || "?").slice(0, 4);
        thumb.appendChild(icon);
      }
      a.appendChild(thumb);

      const name = document.createElement("span");
      name.className = "vault-name";
      name.textContent = f.title || label(f.name);
      a.appendChild(name);
      const meta = document.createElement("span");
      meta.className = "vault-meta";
      meta.textContent = f.meta || (kind === "file" ? f.name.split(".").pop() : kind);
      a.appendChild(meta);

      // ses propres créations (ou tout, pour l'admin) : modifier / supprimer
      if (f.row && account && (account.isAdmin || f.row.author === account.user.id)) {
        const tools = document.createElement("span");
        tools.className = "vault-tools";
        const edit = Object.assign(document.createElement("button"), { type: "button", textContent: "modifier", className: "tl-more" });
        const del = Object.assign(document.createElement("button"), { type: "button", textContent: "supprimer", className: "tl-more" });
        edit.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openForm(f.row.path ? "fichier" : "texte", f.row); });
        del.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!confirm(`Supprimer « ${f.title} » ? Plus personne ne pourra le voir.`)) return;
          const { error } = await account.client.from("handouts").delete().eq("id", f.row.id);
          if (error) { console.error(error); del.textContent = "échec"; return; }
          if (f.row.path) await account.client.storage.from(BUCKET).remove([f.row.path]);
          refresh();
        });
        tools.append(edit, del);
        a.appendChild(tools);
      }

      if (kind === "texte") {
        a.href = "#";
        a.removeAttribute("target");
        a.addEventListener("click", (e) => {
          e.preventDefault();
          izmirLecteur.open({ title: f.title, kind: "texte", html: izmirPartage.format(f.contenu), author: f.row?.author_name });
        });
      }

      // PDF et images : lecteur intégré ; les autres fichiers s'ouvrent dans un onglet
      if ((kind === "pdf" || kind === "image") && url) {
        a.addEventListener("click", (e) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // ctrl+clic : nouvel onglet
          e.preventDefault();
          izmirLecteur.open({
            title: f.title || label(f.name),
            url,
            kind,
            download: `${url}&download=${encodeURIComponent(f.title ? `${f.title}.pdf` : f.name)}`,
          });
        });
      }
      grid.appendChild(a);
    }
    return box;
  }

  let run = 0; // seul le dernier chargement a le droit d'afficher (pas de doublons)
  let account = null;
  const refresh = () => account && show(account);

  izmirAccount.onChange((acc) => {
    account = acc;
    hForm.hidden = true;
    show(acc);
  });

  async function show({ client, user, isAdmin, error }) {
    const mine = ++run;
    content.hidden = !user;
    gate.hidden = !!user;
    vault.innerHTML = "";
    if (!user) {
      gate.textContent = error
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (bouton « connexion » en haut à droite du bandeau) pour ouvrir ton coffre-fort.";
      return;
    }

    vault.innerHTML = `<div class="note muted">ouverture du coffre…</div>`;

    const sections = [];

    // tous les handouts (découpés depuis un PDF, écrits ou envoyés par les joueurs) : Supabase ne renvoie que ceux du joueur
    const { data: letters } = await client.from("handouts").select("*").order("created_at", { ascending: false });
    if (letters?.length) {
      sections.push({
        title: "handouts",
        files: letters.map((h) => ({
          name: h.path ? h.path.split("/").pop() : "",
          path: h.path,
          kind: h.path ? null : "texte",
          contenu: h.contenu,
          title: h.titre,
          row: h,
          meta: [
            h.path ? (PDF.test(h.path) ? "pdf" : "image") : "lettre",
            h.author_name && (h.author === user.id ? "de toi" : `de ${h.author_name}`),
            (isAdmin || h.author === user.id) && `→ ${(h.tags || []).join(", ")}`,
          ].filter(Boolean).join(" · "),
        })),
      });
    }

    if (mine !== run) return;
    vault.innerHTML = "";
    if (!sections.length) {
      vault.innerHTML = `<div class="note muted">Ton coffre est vide pour l'instant.</div>`;
      return;
    }

    const paths = sections.flatMap((s) => s.files.map((f) => f.path)).filter(Boolean);
    const { data: signed } = paths.length
      ? await client.storage.from(BUCKET).createSignedUrls(paths, 3600)
      : { data: [] };
    const urls = Object.fromEntries((signed || []).map((s) => [s.path, s.signedUrl]));
    if (mine !== run) return;
    vault.innerHTML = "";

    for (const { title, files } of sections) vault.appendChild(section(title, files, urls));
  }

  // ── Écrire une lettre / envoyer un fichier ────────────────────────────────

  const hForm = document.getElementById("h-form");
  const hTitle = document.getElementById("h-form-title");
  const hTags = document.getElementById("h-tags");
  const hMsg = document.getElementById("h-msg");
  const textField = document.getElementById("h-text-field");
  const fileField = document.getElementById("h-file-field");
  const MAX = 10 * 1024 * 1024;
  let mode = "texte";
  let editing = null;
  let chosen = new Set();

  async function openForm(kind, row = null) {
    mode = kind;
    editing = row;
    chosen = new Set(row?.tags || []);
    hTitle.textContent = row ? "modifier" : kind === "texte" ? "écrire une lettre" : "envoyer un fichier";
    textField.hidden = kind !== "texte";
    fileField.hidden = kind !== "fichier" || !!row; // le fichier d'un envoi ne se change pas
    hForm.titre.value = row?.titre || "";
    hForm.contenu.value = row?.contenu || "";
    hForm.file.value = "";
    hMsg.textContent = "";
    hTags.innerHTML = "";
    const { mine, players } = await izmirPartage.tags(account);
    hTags.appendChild(izmirPartage.editor(chosen, [
      { label: account.isAdmin ? "groupes" : "mes groupes", tags: mine },
      { label: "joueurs", tags: players },
    ]));
    hForm.hidden = false;
    hForm.scrollIntoView({ behavior: "smooth", block: "start" });
    hForm.titre.focus();
  }

  // titre proposé à partir du nom du fichier
  hForm.file.addEventListener("change", () => {
    const f = hForm.file.files[0];
    if (f && !hForm.titre.value) hForm.titre.value = label(f.name);
  });

  hForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { client, user } = account;
    const titre = hForm.titre.value.trim();
    if (!chosen.size) { hMsg.textContent = "Choisis au moins un tag (qui peut le voir)."; return; }

    hMsg.textContent = "enregistrement…";
    let error;

    if (editing) {
      ({ error } = await client.from("handouts").update({
        titre,
        tags: [...chosen],
        ...(mode === "texte" ? { contenu: hForm.contenu.value } : {}),
      }).eq("id", editing.id));
    } else if (mode === "texte") {
      if (!hForm.contenu.value.trim()) { hMsg.textContent = "La lettre est vide."; return; }
      ({ error } = await client.from("handouts").insert({ titre, contenu: hForm.contenu.value, tags: [...chosen] }));
    } else {
      const file = hForm.file.files[0];
      if (!file) { hMsg.textContent = "Choisis un fichier."; return; }
      if (file.size > MAX) { hMsg.textContent = "Fichier trop lourd (10 Mo maximum)."; return; }
      if (!/^(image\/(png|jpeg|webp|gif)|application\/pdf)$/.test(file.type)) { hMsg.textContent = "Seulement des images ou des PDF."; return; }
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `joueurs/${user.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      hMsg.textContent = "envoi du fichier…";
      ({ error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type }));
      if (!error) {
        ({ error } = await client.from("handouts").insert({ titre, path, tags: [...chosen], source: file.name }));
        if (error) await client.storage.from(BUCKET).remove([path]); // pas de fichier orphelin
      }
    }

    if (error) {
      console.error(error);
      const m = error.message || "";
      hMsg.textContent = /row-level security|violates/i.test(m)
        ? "Refusé : tu ne peux utiliser que tes propres tags ou des pseudos de joueurs. (Le SQL de la section 7 est-il lancé ?)"
        : /size|too large|exceeded/i.test(m) ? "Fichier trop lourd (10 Mo maximum)."
        : /mime|type/i.test(m) ? "Type de fichier refusé (images ou PDF seulement)."
        : "L'enregistrement a échoué, réessaie.";
      return;
    }
    hForm.hidden = true;
    refresh();
  });

  document.getElementById("h-cancel").addEventListener("click", () => (hForm.hidden = true));
  document.getElementById("new-letter").addEventListener("click", () => openForm("texte"));
  document.getElementById("new-file").addEventListener("click", () => openForm("fichier"));
})();
