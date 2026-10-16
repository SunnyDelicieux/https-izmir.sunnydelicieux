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
      const kind = PDF.test(f.name) ? "pdf" : IMAGE.test(f.name) ? "image" : "file";

      const a = document.createElement("a");
      a.className = "vault-item";
      a.href = url || "#";
      a.target = "_blank";
      a.rel = "noopener";

      const thumb = document.createElement("div");
      thumb.className = "vault-thumb";
      if (kind === "image") {
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

      // PDF et images : lecteur intégré ; les autres fichiers s'ouvrent dans un onglet
      if (kind !== "file" && url) {
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

  izmirAccount.onChange(async ({ client, user, username, tags, isAdmin, error }) => {
    content.hidden = !user;
    gate.hidden = !!user;
    vault.innerHTML = "";
    if (!user) {
      gate.textContent = error
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (bouton « connexion » au bout du menu) pour ouvrir ton coffre-fort.";
      return;
    }

    vault.innerHTML = `<div class="note muted">ouverture du coffre…</div>`;

    const sections = [];

    // lettres découpées depuis un PDF (page "gérer les handouts") : Supabase ne renvoie que celles du joueur
    const { data: letters } = await client.from("handouts").select("*").order("created_at", { ascending: false });
    if (letters?.length) {
      sections.push({
        title: "lettres",
        files: letters.map((h) => ({
          name: h.path.split("/").pop(),
          path: h.path,
          title: h.titre,
          meta: isAdmin ? `pdf · ${(h.tags || []).join(", ") || "sans tag"}` : null,
        })),
      });
    }

    // fichiers déposés à la main dans un dossier au nom d'un tag
    // l'admin voit tous les dossiers, les joueurs seulement les leurs (le sien en premier)
    let folders;
    if (isAdmin) {
      const { data } = await client.storage.from(BUCKET).list("", { limit: 500, sortBy: { column: "name", order: "asc" } });
      folders = (data || []).filter((f) => !f.id && f.name !== "lettres").map((f) => f.name);
    } else {
      folders = [...new Set([username.toLowerCase(), ...tags])];
    }

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

    for (const { title, folder, files } of sections) {
      const heading = title
        || (folder === username.toLowerCase() && !isAdmin ? "pour toi"
          : folder === "public" ? "pour tout le monde" : `pour : ${folder}`);
      vault.appendChild(section(heading, files, urls));
    }
  });
})();
