// Coffre-fort : handouts rangés dans le bucket privé "handouts" de Supabase Storage.
// Un dossier par tag : handouts/<identifiant>/…, handouts/<clan>/…, handouts/public/…
// Supabase ne laisse lister que les dossiers du joueur (supabase/izmir.sql) ; les liens expirent après 1 h.
(function () {
  const gate = document.getElementById("gate");
  const content = document.getElementById("content");
  const vault = document.getElementById("vault");

  const BUCKET = "handouts";
  const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

  async function listFolder(client, folder) {
    const { data, error } = await client.storage
      .from(BUCKET)
      .list(folder, { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (error) {
      console.error(error);
      return [];
    }
    // les sous-dossiers (id vide) et le fichier fantôme de Supabase sont ignorés
    return data
      .filter((f) => f.id && f.name !== ".emptyFolderPlaceholder")
      .map((f) => ({ name: f.name, path: `${folder}/${f.name}` }));
  }

  function section(title, files, urls) {
    const box = document.createElement("div");
    box.className = "note";
    box.innerHTML = `<div class="title"></div><div class="vault-grid"></div>`;
    box.querySelector(".title").textContent = title;
    const grid = box.querySelector(".vault-grid");

    for (const f of files) {
      const a = document.createElement("a");
      a.className = "vault-item";
      a.href = urls[f.path] || "#";
      a.target = "_blank";
      a.rel = "noopener";

      if (IMAGE.test(f.name)) {
        const img = document.createElement("img");
        img.src = urls[f.path];
        img.alt = "";
        img.loading = "lazy";
        a.appendChild(img);
      } else {
        const icon = document.createElement("div");
        icon.className = "file-icon";
        icon.textContent = (f.name.split(".").pop() || "?").slice(0, 4);
        a.appendChild(icon);
      }
      const label = document.createElement("span");
      label.textContent = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      a.appendChild(label);
      grid.appendChild(a);
    }
    return box;
  }

  izmirAccount.onChange(async ({ client, user, username, tags, isAdmin, error }) => {
    content.hidden = !user;
    gate.hidden = !!user;
    vault.innerHTML = "";
    if (!user) {
      gate.textContent = error
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (en haut à droite) pour ouvrir ton coffre-fort.";
      return;
    }

    vault.innerHTML = `<div class="note muted">ouverture du coffre…</div>`;

    // l'admin voit tous les dossiers, les joueurs seulement les leurs (le sien en premier)
    let folders;
    if (isAdmin) {
      const { data } = await client.storage.from(BUCKET).list("", { limit: 500, sortBy: { column: "name", order: "asc" } });
      folders = (data || []).filter((f) => !f.id).map((f) => f.name);
    } else {
      folders = [...new Set([username.toLowerCase(), ...tags])];
    }

    const sections = [];
    for (const folder of folders) {
      const files = await listFolder(client, folder);
      if (files.length) sections.push({ folder, files });
    }

    vault.innerHTML = "";
    if (!sections.length) {
      vault.innerHTML = `<div class="note muted">Ton coffre est vide pour l'instant.</div>`;
      return;
    }

    const paths = sections.flatMap((s) => s.files.map((f) => f.path));
    const { data: signed } = await client.storage.from(BUCKET).createSignedUrls(paths, 3600);
    const urls = Object.fromEntries((signed || []).map((s) => [s.path, s.signedUrl]));

    for (const { folder, files } of sections) {
      const title = folder === username.toLowerCase() && !isAdmin
        ? "pour toi"
        : folder === "public" ? "pour tout le monde" : `pour : ${folder}`;
      vault.appendChild(section(title, files, urls));
    }
  });
})();
