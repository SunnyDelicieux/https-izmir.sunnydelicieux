// Thème Halloween (essai) : chargé par DATA/barre.js seulement quand le thème est actif.
// Beaucoup de pages ont leurs propres couleurs brunes/dorées écrites en dur.
// Plutôt que de les reprendre une à une, on relit toutes les feuilles de style
// et on recrée chaque règle colorée en version rouge, sous body.halloween:not(.light).
// Les images ne sont pas touchées. Le mode jour non plus.
(function () {
  const PREFIXE = "body.halloween:not(.light)";

  // ── couleurs ──
  function enRgb(t) {
    let m = t.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let h = m[1];
      if (h.length <= 4) h = h.split("").map(c => c + c).join("");
      const n = parseInt(h.slice(0, 6), 16);
      return [n >> 16, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
    }
    m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
    if (m) {
      let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [+m[1], +m[2], +m[3], a];
    }
    return null;
  }

  // brun / or -> noir et rouge, en gardant la luminosité
  function rougit(t) {
    const c = enRgb(t);
    if (!c) return t;
    let [r, g, b, a] = c.map((v, i) => i < 3 ? v / 255 : v);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (d < 0.02) return t;                                   // gris, noir, blanc
    let s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    if (h < 12 || h > 62) return t;                           // déjà rouge, ou vert/bleu : on laisse
    h = 0;                                                    // tout passe au rouge
    s *= l < 0.2 ? 0.35 : l > 0.6 ? 0.2 : 1;                  // fonds sombres -> noirs, textes clairs -> neutres
    const k = n => (n + h / 30) % 12, f = n => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    const [R, G, B] = [f(0), f(8), f(4)].map(v => Math.round(v * 255));
    return a < 1 ? `rgba(${R}, ${G}, ${B}, ${+a.toFixed(3)})` : `rgb(${R}, ${G}, ${B})`;
  }

  const COULEUR = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;
  const rougitValeur = v => v.replace(COULEUR, rougit);

  // ── sélecteurs ──
  function decoupe(sel) {                                     // coupe sur les virgules hors parenthèses
    const parts = []; let prof = 0, cur = "";
    for (const ch of sel) {
      if (ch === "(") prof++; else if (ch === ")") prof--;
      if (ch === "," && !prof) { parts.push(cur); cur = ""; } else cur += ch;
    }
    return parts.concat(cur).map(s => s.trim()).filter(Boolean);
  }
  function prefixe(sel) {
    if (/(^|[^\w-])\.light\b/.test(sel)) return "";           // règles du mode jour : on n'y touche pas
    return decoupe(sel).map(s => {
      if (/^(html|:root)\b/i.test(s)) return null;
      if (/^body\b/i.test(s)) return s.replace(/^body/i, PREFIXE);
      return PREFIXE + " " + s;
    }).filter(Boolean).join(", ");
  }

  // ── feuilles de style ──
  function regles(liste, sortie) {
    for (const r of liste) {
      if (r.styleSheet) { try { regles(r.styleSheet.cssRules, sortie); } catch (e) {} continue; }
      if (r.media && r.cssRules) {
        const dedans = []; regles(r.cssRules, dedans);
        if (dedans.length) sortie.push(`@media ${r.media.mediaText} {\n${dedans.join("\n")}\n}`);
        continue;
      }
      if (!r.selectorText || !r.style) continue;
      const decl = [], racine = [];
      const surRacine = !/\.light\b/.test(r.selectorText) && decoupe(r.selectorText).some(s => /^(html|:root|body)$/i.test(s));
      for (let i = 0; i < r.style.length; i++) {
        const p = r.style[i];
        if (p.startsWith("--")) {
          // --iz-* : réglées dans halloween.css. Les autres (--wiki-*…) sont redéclarées sur body
          // pour que leurs var(--iz-…) prennent les valeurs rouges.
          if (surRacine && !p.startsWith("--iz-")) racine.push(`${p}: ${rougitValeur(r.style.getPropertyValue(p))};`);
          continue;
        }
        const v = r.style.getPropertyValue(p);
        if (!/#|rgb/i.test(v)) continue;
        const nv = rougitValeur(v);
        if (nv !== v) decl.push(`${p}: ${nv}${r.style.getPropertyPriority(p) ? " !important" : ""};`);
      }
      if (racine.length) sortie.unshift(`${PREFIXE} { ${racine.join(" ")} }`);
      if (!decl.length) continue;
      const sel = prefixe(r.selectorText);
      if (sel) sortie.push(`${sel} { ${decl.join(" ")} }`);
    }
  }

  function feuilles() {
    const sortie = [];
    for (const f of document.styleSheets) {
      if (f.ownerNode && f.ownerNode.id === "halloween-auto") continue;
      if (f.href && /halloween\.css/.test(f.href)) continue;
      try { regles(f.cssRules, sortie); } catch (e) {}       // feuilles d'un autre site : illisibles, tant pis
    }
    let style = document.getElementById("halloween-auto");
    if (!style) {
      style = document.createElement("style");
      style.id = "halloween-auto";
      document.head.appendChild(style);
    }
    style.textContent = sortie.join("\n");
  }

  // ── styles écrits dans les balises (style="…") ──
  const inline = [];
  function balises() {
    document.querySelectorAll("[style]").forEach(el => {
      if (el.dataset.halloween) return;
      el.dataset.halloween = "1";
      for (let i = 0; i < el.style.length; i++) {
        const p = el.style[i], v = el.style.getPropertyValue(p);
        if (!/#|rgb/i.test(v)) continue;
        const nv = rougitValeur(v);
        if (nv !== v) inline.push([el, p, v, nv, el.style.getPropertyPriority(p)]);
      }
    });
    applique();
  }
  function applique() {
    const rouge = !document.body.classList.contains("light");
    inline.forEach(([el, p, v, nv, prio]) => el.style.setProperty(p, rouge ? nv : v, prio));
  }

  // le wiki ne charge pas DATA/izmir.css, donc pas halloween.css non plus
  if (![...document.styleSheets].some(f => f.href && /(halloween|izmir)\.css/.test(f.href))) {
    const lien = document.createElement("link");
    lien.rel = "stylesheet";
    lien.href = "/DATA/halloween.css";
    document.head.appendChild(lien);
  }

  function tout() { feuilles(); balises(); }
  tout();
  addEventListener("load", tout);                             // feuilles arrivées après coup
  new MutationObserver(applique).observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();
