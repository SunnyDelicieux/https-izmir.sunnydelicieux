// Lecteur de handouts (coffre-fort) : affiche un PDF ou une image par-dessus la page,
// aux couleurs du site. Les PDF sont dessinés par PDF.js : le texte reste sélectionnable
// et les liens restent cliquables, contrairement à une conversion en image.
//
//   izmirLecteur.open({ title, url, kind: "pdf" | "image", download })
//   izmirLecteur.open({ title, kind: "texte", html, author })   -> lettre écrite sur le site
//   izmirLecteur.cover(url, canvas)  -> dessine la 1re page du PDF dans un <canvas> (vignette)
//   izmirLecteur.thumb(doc, n, canvas) -> idem pour la page n d'un PDF déjà chargé avec pdfjs()
(function () {
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  let pdfjsPromise = null;
  function pdfjs() {
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      const s = document.createElement("script");
      s.src = PDFJS;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error("PDF.js introuvable"));
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  }

  // un même PDF n'est téléchargé qu'une fois (vignette puis lecteur)
  const docs = new Map();
  function loadDoc(url) {
    if (!docs.has(url)) docs.set(url, pdfjs().then((lib) => lib.getDocument({ url }).promise));
    return docs.get(url);
  }

  // dessine une page dans un canvas net sur les écrans haute densité
  async function paint(page, canvas, scale) {
    const ratio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale });
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
    }).promise;
    return viewport;
  }

  async function cover(url, canvas) {
    const doc = await loadDoc(url);
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    // la vignette fait ~280 px de large, assez pour rester nette dans la grille
    await paint(page, canvas, 280 / base.width);
    return doc.numPages;
  }

  // ── Lecteur ───────────────────────────────────────────────────────────────

  let overlay = null;
  let current = null; // { token } : chaque ouverture annule le rendu de la précédente

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function build() {
    overlay = el("div", "lx");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="lx-bar">
        <div class="lx-title"></div>
        <div class="lx-info"></div>
        <div class="lx-tools">
          <button type="button" class="lx-btn" data-zoom="-1" title="dézoomer" aria-label="Dézoomer">−</button>
          <button type="button" class="lx-btn" data-zoom="0" title="taille normale" aria-label="Taille normale">100 %</button>
          <button type="button" class="lx-btn" data-zoom="1" title="zoomer" aria-label="Zoomer">+</button>
          <a class="lx-btn" data-open target="_blank" rel="noopener" title="ouvrir dans un nouvel onglet">ouvrir ↗</a>
          <a class="lx-btn" data-download title="télécharger">télécharger</a>
          <button type="button" class="lx-btn lx-close" title="fermer (Échap)" aria-label="Fermer">✕</button>
        </div>
      </div>
      <div class="lx-body"><div class="lx-pages"></div></div>`;
    document.body.appendChild(overlay);

    overlay.querySelector(".lx-close").addEventListener("click", close);
    // clic sur le fond sombre (pas sur une page) : on ferme
    overlay.querySelector(".lx-body").addEventListener("click", (e) => {
      if (e.target.classList.contains("lx-body") || e.target.classList.contains("lx-pages")) close();
    });
    overlay.querySelectorAll("[data-zoom]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!current) return;
        const step = +b.dataset.zoom;
        current.zoom = step === 0 ? 1 : Math.min(3, Math.max(0.5, current.zoom + step * 0.25));
        current.rerender();
      })
    );
    document.addEventListener("keydown", (e) => {
      if (overlay.hidden) return;
      if (e.key === "Escape") close();
      if ((e.key === "+" || e.key === "=") && current) overlay.querySelector('[data-zoom="1"]').click();
      if (e.key === "-" && current) overlay.querySelector('[data-zoom="-1"]').click();
    });
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.querySelector(".lx-pages").innerHTML = "";
    document.documentElement.classList.remove("lx-lock");
    current?.observer?.disconnect();
    current = null;
    window.removeEventListener("resize", onResize);
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => current?.rerender(), 200);
  }

  async function open({ title, url, kind, download, html, author }) {
    if (!overlay) build();
    close();
    overlay.hidden = false;
    document.documentElement.classList.add("lx-lock");
    overlay.querySelector(".lx-title").textContent = title;
    overlay.querySelector(".lx-info").textContent = "";
    const openLink = overlay.querySelector("[data-open]");
    const dl = overlay.querySelector("[data-download]");
    openLink.hidden = dl.hidden = !url;
    if (url) {
      openLink.href = url;
      dl.href = download || url;
    }
    overlay.querySelectorAll("[data-zoom]").forEach((b) => (b.hidden = kind !== "pdf"));
    overlay.querySelector(".lx-close").focus();

    const pages = overlay.querySelector(".lx-pages");
    const state = (current = { zoom: 1, rerender: () => {} });

    // lettre écrite sur le site : "html" est déjà nettoyé (izmirPartage.format)
    if (kind === "texte") {
      const sheet = el("article", "lx-letter");
      sheet.appendChild(el("h2", "lx-letter-title", title));
      if (author) sheet.appendChild(el("div", "lx-letter-author", `de ${author}`));
      const body = el("div", "lx-letter-body");
      body.innerHTML = html || "";
      sheet.appendChild(body);
      pages.appendChild(sheet);
      return;
    }

    if (kind !== "pdf") {
      const img = el("img", "lx-image");
      img.src = url;
      img.alt = title;
      pages.appendChild(img);
      return;
    }

    pages.appendChild(el("div", "lx-loading", "ouverture du document…"));
    let doc;
    try {
      doc = await loadDoc(url);
    } catch (err) {
      console.error(err);
      if (current === state) pages.innerHTML = `<div class="lx-loading">Impossible d'afficher ce PDF ici : utilise « ouvrir ↗ ».</div>`;
      return;
    }
    if (current !== state) return;

    const n = doc.numPages;
    overlay.querySelector(".lx-info").textContent = `${n} page${n > 1 ? "s" : ""}`;
    window.addEventListener("resize", onResize);

    state.rerender = () => {
      state.observer?.disconnect();
      pages.innerHTML = "";
      overlay.querySelector('[data-zoom="0"]').textContent = `${Math.round(state.zoom * 100)} %`;
      const width = Math.min(pages.clientWidth || 800, 900) * state.zoom;

      // chaque page est dessinée seulement quand elle approche de l'écran
      state.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          state.observer.unobserve(entry.target);
          renderPage(doc, +entry.target.dataset.page, entry.target, width, state);
        }
      }, { root: overlay.querySelector(".lx-body"), rootMargin: "600px 0px" });

      for (let i = 1; i <= n; i++) {
        const slot = el("div", "lx-page");
        slot.dataset.page = i;
        // taille provisoire (format A4) pour que le défilement ne saute pas
        slot.style.width = `${width}px`;
        slot.style.height = `${width * 1.414}px`;
        pages.appendChild(slot);
        state.observer.observe(slot);
      }
    };
    state.rerender();
  }

  async function renderPage(doc, num, slot, width, state) {
    const page = await doc.getPage(num);
    if (current !== state) return;
    const scale = width / page.getViewport({ scale: 1 }).width;

    const canvas = el("canvas");
    const viewport = await paint(page, canvas, scale);
    if (current !== state) return;
    slot.style.height = `${Math.floor(viewport.height)}px`;
    slot.style.width = `${Math.floor(viewport.width)}px`;
    slot.innerHTML = "";
    slot.appendChild(canvas);

    // texte invisible par-dessus le dessin : sélection, copier-coller, recherche Ctrl+F
    const textLayer = el("div", "lx-text");
    textLayer.style.setProperty("--scale-factor", scale);
    slot.appendChild(textLayer);
    const textContent = await page.getTextContent();
    await window.pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: textLayer,
      viewport,
      textDivs: [],
    }).promise;

    // liens du PDF (vers un site) : rendus cliquables
    const annots = await page.getAnnotations();
    for (const a of annots) {
      if (a.subtype !== "Link" || !a.url) continue;
      const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(a.rect);
      const link = el("a", "lx-link");
      link.href = a.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.title = a.url;
      Object.assign(link.style, {
        left: `${Math.min(x1, x2)}px`,
        top: `${Math.min(y1, y2)}px`,
        width: `${Math.abs(x2 - x1)}px`,
        height: `${Math.abs(y2 - y1)}px`,
      });
      slot.appendChild(link);
    }
  }

  // pour la page d'envoi (COMPTE/handouts.js) : vignette de n'importe quelle page d'un PDF déjà ouvert
  async function thumb(doc, num, canvas, width = 280) {
    const page = await doc.getPage(num);
    await paint(page, canvas, width / page.getViewport({ scale: 1 }).width);
  }

  window.izmirLecteur = { open, close, cover, thumb, pdfjs };
})();
