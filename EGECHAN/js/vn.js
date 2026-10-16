/* ==========================================================
   VISUAL NOVEL — texte lettre par lettre
   VN.play(lignes, () => { ...suite... })
   Une ligne : { who: "hunter" | "inga" | null, text: "...", choices?: [...] }
   Clic / Espace / Entrée : finir la ligne, puis passer à la suivante.
   ========================================================== */

const VN = (() => {

    const el = {
        scene:   () => document.getElementById("scene-vn"),
        sprite:  () => document.getElementById("vn-sprite"),
        box:     () => document.getElementById("vn-box"),
        name:    () => document.getElementById("vn-name"),
        text:    () => document.getElementById("vn-text"),
        next:    () => document.getElementById("vn-next"),
        choices: () => document.getElementById("vn-choices")
    };

    // Silhouette de remplacement tant qu'il n'y a pas de vrai sprite
    const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 600">
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2a2a2a"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
          <ellipse cx="150" cy="120" rx="58" ry="70" fill="url(#g)"/>
          <path d="M40 600 C40 330 80 230 150 220 C220 230 260 330 260 600Z" fill="url(#g)"/>
          <text x="150" y="420" fill="#444" font-family="monospace" font-size="18" text-anchor="middle">SPRITE</text>
        </svg>`);

    let lines = [], index = 0, typing = false, timer = null, onDone = null, waitingChoice = false;

    function setSprite(who) {
        const img = el.sprite();
        if (!who || !CONFIG[who]) { img.classList.remove("show"); return; }
        const src = CONFIG[who].sprite;
        if (img.dataset.who !== who) {
            img.dataset.who = who;
            img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
            img.src = src;
        }
        img.classList.add("show");
    }

    function type(str) {
        const t = el.text();
        t.textContent = "";
        el.next().classList.remove("show");
        typing = true;
        let i = 0;
        clearInterval(timer);
        timer = setInterval(() => {
            t.textContent = str.slice(0, ++i);
            if (i >= str.length) finishTyping();
        }, CONFIG.typeSpeed);
    }

    function finishTyping() {
        clearInterval(timer);
        typing = false;
        el.text().textContent = lines[index].text;
        const line = lines[index];
        if (line.choices) showChoices(line.choices);
        else el.next().classList.add("show");
    }

    function showChoices(choices) {
        waitingChoice = true;
        const box = el.choices();
        box.innerHTML = "";
        choices.forEach(c => {
            const b = document.createElement("button");
            b.textContent = c.label;
            b.onclick = (e) => {
                e.stopPropagation();
                waitingChoice = false;
                box.innerHTML = "";
                if (c.then) lines.splice(index + 1, 0, ...c.then); // insère la réponse
                advance();
            };
            box.appendChild(b);
        });
    }

    function show() {
        const line = lines[index];
        setSprite(line.who);
        const who = line.who && CONFIG[line.who] ? CONFIG[line.who].name : "";
        el.name().textContent = who;
        el.name().style.visibility = who ? "visible" : "hidden";
        el.box().classList.toggle("thought", !line.who);
        type(line.text);
    }

    function advance() {
        if (waitingChoice) return;
        if (typing) { finishTyping(); return; }
        index++;
        if (index >= lines.length) { end(); return; }
        show();
    }

    function end() {
        document.removeEventListener("keydown", onKey);
        el.scene().removeEventListener("click", advance);
        const cb = onDone; onDone = null;
        if (cb) cb();
    }

    function onKey(e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); }
    }

    function play(script, done) {
        lines = script.map(l => ({ ...l }));
        index = 0;
        onDone = done;
        el.choices().innerHTML = "";
        el.scene().addEventListener("click", advance);
        document.addEventListener("keydown", onKey);
        show();
    }

    return { play, PLACEHOLDER };
})();
