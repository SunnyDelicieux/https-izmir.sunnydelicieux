// Gérer les handouts (admin) : découpe un PDF en une lettre par page, tague chaque lettre,
// l'envoie dans Supabase (bucket "handouts", dossier lettres/ + table "handouts"),
// et permet de changer plus tard les tags d'une lettre pour la partager à d'autres.
// Règles de sécurité : supabase/izmir.sql, section 6.
(function () {
  const PDFLIB = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
  const BUCKET = "handouts";

  const gate = document.getElementById("gate");
  const content = document.getElementById("content");
  const fileInput = document.getElementById("file");
  const drop = document.getElementById("drop");
  const dropText = document.getElementById("drop-text");
  const split = document.getElementById("split");
  const pagesBox = document.getElementById("pages");
  const bulkTags = document.getElementById("bulk-tags");
  const sendBtn = document.getElementById("send");
  const cancelBtn = document.getElementById("cancel");
  const sendMsg = document.getElementById("send-msg");
  const sentBox = document.getElementById("sent");
  const filter = document.getElementById("filter");
  const count = document.getElementById("count");

  const norm = (s) => (s || "").toString().toLowerCase().trim();
  const plain = (s) => norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "");

  let client = null;
  let known = ["public"];  // tous les tags proposés (pseudos, clans, rôles…)
  let pending = null;      // PDF en cours de découpe : { file, bytes, doc, pages: [{ num, keep, titre, tags:Set }] }
  let sent = [];           // lettres déjà envoyées

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  let pdfLibPromise = null;
  function pdfLib() {
    if (pdfLibPromise) return pdfLibPromise;
    pdfLibPromise = new Promise((resolve, reject) => {
      if (window.PDFLib) return resolve(window.PDFLib);
      const s = document.createElement("script");
      s.src = PDFLIB;
      s.onload = () => resolve(window.PDFLib);
      s.onerror = () => reject(new Error("pdf-lib introuvable"));
      document.head.appendChild(s);
    });
    return pdfLibPromise;
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  async function loadKnownTags() {
    const { data } = await client.from("profiles").select("username, clan, role, extra_tags");
    const set = new Set(["public"]);
    for (const p of data || []) {
      for (const t of [p.username, p.clan, p.role, ...(Array.isArray(p.extra_tags) ? p.extra_tags : [])]) {
        if (norm(t)) set.add(norm(t));
      }
    }
    for (const h of sent) for (const t of h.tags || []) set.add(norm(t));
    // pseudos d'abord (ceux qui ne sont ni clan ni rôle), puis le reste, "public" en dernier
    const groups = new Set((data || []).flatMap((p) => [norm(p.clan), norm(p.role), ...(p.extra_tags || []).map(norm)]));
    known = [...set].sort((a, b) =>
      (a === "public") - (b === "public") || groups.has(a) - groups.has(b) || a.localeCompare(b)
    );
  }

  // une rangée de tags cliquables ; "+" pour en ajouter un nouveau
  function tagEditor(selected, onChange) {
    const box = el("div", "tags tag-editor");
    const draw = () => {
      box.innerHTML = "";
      const all = [...new Set([...known, ...selected])];
      for (const t of all) {
        const b = el("button", "tag" + (selected.has(t) ? " active" : ""), t);
        b.type = "button";
        b.addEventListener("click", () => {
          selected.has(t) ? selected.delete(t) : selected.add(t);
          draw();
          onChange?.();
        });
        box.appendChild(b);
      }
      const add = el("button", "tag tag-add", "+");
      add.type = "button";
      add.title = "ajouter un autre tag";
      add.addEventListener("click", () => {
        const t = norm(prompt("Nouveau tag (pseudo, clan, rôle…) :"));
        if (!t) return;
        if (!known.includes(t)) known.push(t);
        selected.add(t);
        draw();
        onChange?.();
      });
      box.appendChild(add);
    };
    draw();
    return box;
  }

  // ── 1. Découper un PDF ────────────────────────────────────────────────────

  async function openPdf(file) {
    if (!file || !/\.pdf$/i.test(file.name)) {
      dropText.textContent = "ce n'est pas un PDF — clique ou glisse un PDF ici";
      return;
    }
    dropText.textContent = `ouverture de ${file.name}…`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const lib = await izmirLecteur.pdfjs();
    // pdf.js garde le tableau : on lui en donne une copie, l'original servira au découpage
    const doc = await lib.getDocument({ data: bytes.slice() }).promise;
    const base = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");

    pending = {
      file,
      bytes,
      doc,
      bulk: new Set(),
      pages: Array.from({ length: doc.numPages }, (_, i) => ({
        num: i + 1,
        keep: true,
        titre: doc.numPages > 1 ? `${base} — ${i + 1}` : base,
        tags: new Set(),
      })),
    };
    dropText.textContent = `${file.name} · ${doc.numPages} page${doc.numPages > 1 ? "s" : ""} — clique pour en choisir un autre`;
    renderPending();
  }

  function renderPending() {
    split.hidden = !pending;
    sendMsg.textContent = "";
    if (!pending) return;

    // tags communs : cliquer un tag l'ajoute (ou l'enlève) sur toutes les pages
    bulkTags.innerHTML = "";
    bulkTags.appendChild(tagEditor(pending.bulk, () => {
      const before = pending.lastBulk;
      for (const p of pending.pages) {
        for (const t of pending.bulk) if (!before.has(t)) p.tags.add(t);     // tag ajouté
        for (const t of before) if (!pending.bulk.has(t)) p.tags.delete(t);  // tag retiré
      }
      pending.lastBulk = new Set(pending.bulk);
      drawPages();
    }));
    pending.lastBulk = new Set(pending.bulk);
    drawPages();
  }

  function drawPages() {
    pagesBox.innerHTML = "";
    for (const p of pending.pages) {
      const card = el("div", "page-card" + (p.keep ? "" : " skipped"));

      const thumb = el("div", "vault-thumb");
      const canvas = el("canvas");
      thumb.appendChild(canvas);
      izmirLecteur.thumb(pending.doc, p.num, canvas).then(() => canvas.classList.add("ready"));
      card.appendChild(thumb);

      const head = el("label", "page-keep");
      const keep = el("input");
      keep.type = "checkbox";
      keep.checked = p.keep;
      keep.addEventListener("change", () => {
        p.keep = keep.checked;
        card.classList.toggle("skipped", !p.keep);
        updateSendLabel();
      });
      head.append(keep, ` page ${p.num}`);
      card.appendChild(head);

      const titre = el("input", "input");
      titre.value = p.titre;
      titre.placeholder = "titre de la lettre";
      titre.addEventListener("input", () => (p.titre = titre.value));
      card.appendChild(titre);

      card.appendChild(tagEditor(p.tags, updateSendLabel));
      pagesBox.appendChild(card);
    }
    updateSendLabel();
  }

  function updateSendLabel() {
    const kept = pending.pages.filter((p) => p.keep);
    const untagged = kept.filter((p) => !p.tags.size).length;
    sendBtn.textContent = `envoyer ${kept.length} lettre${kept.length > 1 ? "s" : ""}`;
    sendBtn.disabled = !kept.length;
    sendMsg.textContent = untagged
      ? `${untagged} lettre${untagged > 1 ? "s" : ""} sans tag : visible${untagged > 1 ? "s" : ""} par l'admin seulement`
      : "";
  }

  async function send() {
    const kept = pending.pages.filter((p) => p.keep);
    if (!kept.length) return;
    sendBtn.disabled = cancelBtn.disabled = true;

    const { PDFDocument } = await pdfLib();
    const source = await PDFDocument.load(pending.bytes);
    let done = 0;
    const failed = [];

    for (const p of kept) {
      sendMsg.textContent = `envoi ${done + 1} / ${kept.length}…`;
      try {
        // une page = un PDF : le dessin, le texte et les liens sont copiés tels quels
        const out = await PDFDocument.create();
        const [page] = await out.copyPages(source, [p.num - 1]);
        out.addPage(page);
        out.setTitle(p.titre);
        const bytes = await out.save();

        const path = `lettres/${crypto.randomUUID()}.pdf`;
        const up = await client.storage.from(BUCKET).upload(path, new Blob([bytes], { type: "application/pdf" }), {
          contentType: "application/pdf",
        });
        if (up.error) throw up.error;

        const ins = await client.from("handouts").insert({
          titre: p.titre.trim() || `page ${p.num}`,
          path,
          tags: [...p.tags],
          source: pending.file.name,
          page: p.num,
        });
        if (ins.error) {
          await client.storage.from(BUCKET).remove([path]); // pas de fichier orphelin
          throw ins.error;
        }
        done++;
      } catch (err) {
        console.error(err);
        failed.push(p.num);
      }
    }

    sendBtn.disabled = cancelBtn.disabled = false;
    if (failed.length) {
      // on garde seulement les pages qui ont échoué, pour réessayer
      pending.pages = pending.pages.filter((p) => failed.includes(p.num));
      drawPages();
      sendMsg.textContent = `${done} envoyée${done > 1 ? "s" : ""}, échec pour la page ${failed.join(", ")} : réessaie`;
    } else {
      pending = null;
      fileInput.value = "";
      dropText.textContent = `${done} lettre${done > 1 ? "s" : ""} envoyée${done > 1 ? "s" : ""} ✔ — clique ou glisse un autre PDF`;
      renderPending();
    }
    loadSent();
  }

  fileInput.addEventListener("change", () => openPdf(fileInput.files[0]));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    openPdf(e.dataTransfer.files[0]);
  });
  sendBtn.addEventListener("click", send);
  cancelBtn.addEventListener("click", () => {
    pending = null;
    fileInput.value = "";
    dropText.textContent = "clique ou glisse un PDF ici";
    renderPending();
  });

  // ── 2. Lettres envoyées : retaguer, renommer, supprimer ──────────────────

  async function loadSent() {
    const { data, error } = await client.from("handouts").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      sentBox.innerHTML = `<div class="note muted">Impossible de charger les lettres (le SQL de la section 6 est-il lancé ?).</div>`;
      return;
    }
    sent = data || [];
    const paths = sent.map((h) => h.path);
    const { data: signed } = paths.length
      ? await client.storage.from(BUCKET).createSignedUrls(paths, 3600)
      : { data: [] };
    const urls = Object.fromEntries((signed || []).map((s) => [s.path, s.signedUrl]));
    for (const h of sent) h._url = urls[h.path];
    renderSent();
  }

  function renderSent() {
    const q = plain(filter.value);
    const shown = sent.filter((h) => !q || plain([h.titre, h.source, ...(h.tags || [])].join(" ")).includes(q));
    count.textContent = `${shown.length} lettre${shown.length > 1 ? "s" : ""}`;
    sentBox.innerHTML = "";
    if (!shown.length) {
      sentBox.appendChild(el("div", "note muted", sent.length ? "Aucune lettre ne correspond." : "Aucune lettre envoyée pour l'instant."));
      return;
    }

    for (const h of shown) {
      const row = el("div", "note sent-row");
      const tags = new Set((h.tags || []).map(norm));

      const thumb = el("button", "sent-thumb");
      thumb.type = "button";
      thumb.title = "lire";
      if (h._url) {
        const canvas = el("canvas");
        thumb.appendChild(canvas);
        izmirLecteur.cover(h._url, canvas).then(() => canvas.classList.add("ready")).catch(() => {});
        thumb.addEventListener("click", () => izmirLecteur.open({ title: h.titre, url: h._url, kind: "pdf" }));
      }
      row.appendChild(thumb);

      const body = el("div", "sent-body");
      const titre = el("input", "input");
      titre.value = h.titre;
      body.appendChild(titre);
      body.appendChild(el("div", "muted sent-meta",
        [h.source && `${h.source}${h.page ? `, page ${h.page}` : ""}`, new Date(h.created_at).toLocaleDateString("fr-FR")]
          .filter(Boolean).join(" · ")));

      const actions = el("div", "row-btns");
      const save = el("button", "btn", "enregistrer");
      save.type = "button";
      save.hidden = true;
      const markDirty = () => (save.hidden = false);
      titre.addEventListener("input", markDirty);
      body.appendChild(tagEditor(tags, markDirty));

      save.addEventListener("click", async () => {
        save.disabled = true;
        const { error } = await client.from("handouts")
          .update({ titre: titre.value.trim() || h.titre, tags: [...tags] })
          .eq("id", h.id);
        save.disabled = false;
        if (error) { console.error(error); save.textContent = "échec, réessayer"; return; }
        h.titre = titre.value.trim() || h.titre;
        h.tags = [...tags];
        save.hidden = true;
        save.textContent = "enregistrer";
      });

      const del = el("button", "btn", "supprimer");
      del.type = "button";
      del.addEventListener("click", async () => {
        if (!confirm(`Supprimer « ${h.titre} » ? Les joueurs ne la verront plus.`)) return;
        del.disabled = true;
        const { error } = await client.from("handouts").delete().eq("id", h.id);
        if (error) { console.error(error); del.disabled = false; del.textContent = "échec"; return; }
        await client.storage.from(BUCKET).remove([h.path]);
        sent = sent.filter((x) => x.id !== h.id);
        renderSent();
      });

      actions.append(save, del);
      body.appendChild(actions);
      row.appendChild(body);
      sentBox.appendChild(row);
    }
  }

  filter.addEventListener("input", renderSent);

  // ── Accès : admin seulement ───────────────────────────────────────────────

  izmirAccount.onChange(async (acc) => {
    client = acc.client;
    const ok = acc.user && acc.isAdmin;
    content.hidden = !ok;
    gate.hidden = ok;
    if (!acc.user) {
      gate.textContent = acc.error
        ? "Connexion au serveur impossible, réessaie plus tard."
        : "Connecte-toi (bouton « connexion » au bout du menu) avec le compte admin.";
      return;
    }
    if (!acc.isAdmin) {
      gate.textContent = "Cette page est réservée à l'admin.";
      return;
    }
    await loadSent();
    await loadKnownTags();
    renderSent();
    if (pending) renderPending();
  });
})();
