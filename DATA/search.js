// Barre de recherche : cherche dans le nom des pages du site (liste dans search-index.js)
(function () {
  const MAX_RESULTS = 8;

  // minuscules, sans accents, "ı" turc -> "i", tirets/underscores -> espaces
  const norm = (s) => (s || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[-_]+/g, " ")
    .trim();

  function score(page, q) {
    const name = norm(page.name);
    const folder = norm(page.folder);
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    if (folder.includes(q)) return 3;
    return -1;
  }

  function search(index, query) {
    const q = norm(query);
    if (!q) return [];
    return index
      .map((page) => ({ page, s: score(page, q) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s || a.page.name.localeCompare(b.page.name))
      .slice(0, MAX_RESULTS)
      .map((r) => r.page);
  }

  const CSS = `
.izs-box {
  position: fixed; top: 10px; right: 10px; z-index: 9999;
  width: 230px; max-width: calc(100vw - 20px);
  font: 12px/1.3 Arial, Tahoma, Verdana, sans-serif; letter-spacing: 0.3px;
}
.izs-input {
  width: 100%; box-sizing: border-box; padding: 6px 9px;
  background: rgba(28, 18, 8, 0.95); color: #e8dcc0;
  border: 1px solid #3a2810; border-radius: 0; outline: none;
  font: inherit;
}
.izs-input::placeholder { color: #a08a68; }
.izs-input:focus { border-color: #c09050; }
.izs-results {
  margin: 2px 0 0; padding: 0; list-style: none;
  background: rgba(28, 18, 8, 0.97); border: 1px solid #3a2810;
  max-height: 60vh; overflow-y: auto;
}
.izs-results:empty { display: none; }
.izs-results a {
  display: block; padding: 6px 9px; text-decoration: none;
  color: #e8dcc0; border-bottom: 1px solid #2a1b0c;
}
.izs-results li:last-child a { border-bottom: none; }
.izs-results a.izs-active, .izs-results a:hover { background: #3a2810; color: #d4aa72; }
.izs-folder { display: block; font-size: 10px; opacity: 0.6; }
.izs-none { padding: 6px 9px; color: #a08a68; }

body.light .izs-input, body.light .izs-results { background: rgba(245, 232, 215, 0.98); color: #2a1a0e; border-color: #c8906a; }
body.light .izs-input::placeholder { color: #8b6a4a; }
body.light .izs-input:focus { border-color: #8b4a18; }
body.light .izs-results a { color: #2a1a0e; border-bottom-color: #e0c8a8; }
body.light .izs-results a.izs-active, body.light .izs-results a:hover { background: #ead8c0; color: #8b4a18; }
body.light .izs-none { color: #8b6a4a; }
`;

  function init() {
    if (document.querySelector(".izs-box")) return;

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const box = document.createElement("div");
    box.className = "izs-box";
    box.setAttribute("role", "search");
    box.innerHTML = `
      <input class="izs-input" type="search" placeholder="rechercher une page…" aria-label="Rechercher une page" autocomplete="off">
      <ul class="izs-results"></ul>
    `;
    document.body.appendChild(box);

    const input = box.querySelector(".izs-input");
    const list = box.querySelector(".izs-results");
    let index = null;
    let active = -1;

    // la liste des pages n'est chargée qu'au premier clic dans la barre
    function loadIndex() {
      if (index) return Promise.resolve(index);
      return new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "/DATA/search-index.js";
        s.onload = () => resolve(index = window.IZMIR_SEARCH_INDEX || []);
        s.onerror = () => resolve(index = []);
        document.head.appendChild(s);
      });
    }

    function setActive(i) {
      const links = list.querySelectorAll("a");
      links.forEach((a) => a.classList.remove("izs-active"));
      active = links.length ? (i + links.length) % links.length : -1;
      if (active >= 0) {
        links[active].classList.add("izs-active");
        links[active].scrollIntoView({ block: "nearest" });
      }
    }

    function render() {
      list.innerHTML = "";
      active = -1;
      if (!input.value.trim()) return;

      const results = search(index || [], input.value);
      if (!results.length) {
        list.innerHTML = `<li class="izs-none">Aucune page trouvée</li>`;
        return;
      }

      for (const page of results) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = page.url;
        a.textContent = page.name;
        const folder = document.createElement("span");
        folder.className = "izs-folder";
        folder.textContent = page.folder || "accueil du site";
        a.appendChild(folder);
        li.appendChild(a);
        list.appendChild(li);
      }
      setActive(0);
    }

    input.addEventListener("focus", () => loadIndex().then(render));
    input.addEventListener("input", () => loadIndex().then(render));

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") {
        const link = list.querySelectorAll("a")[active];
        if (link) location.href = link.href;
      }
      else if (e.key === "Escape") { input.value = ""; render(); input.blur(); }
    });

    // clic ailleurs : on referme la liste
    document.addEventListener("click", (e) => {
      if (!box.contains(e.target)) list.innerHTML = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
