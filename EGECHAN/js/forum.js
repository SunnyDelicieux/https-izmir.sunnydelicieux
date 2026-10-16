/* ==========================================================
   FORUM — la board de l'acte 1
   Les fils sont écrits en HTML dans index.html (style de izmir.html).
   Le joueur est connecté avec son compte (ege_35) ; il doit
   obtenir l'admin en aidant le modo "B." par MP.
   ========================================================== */

const Forum = (() => {

    const BASE = "http://egechan.org/izm/";
    let ready = false;

    const $  = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    function setUrl(u) { $("#url-bar").textContent = u; }

    /* ---------- >>liens : href="#p123" → scroll dans la board ---------- */

    function quoteLinks() {
        $$('#forum a[href^="#p"]').forEach(a => a.addEventListener("click", e => {
            e.preventDefault();
            const target = document.getElementById(a.getAttribute("href").slice(1));
            if (!target) return;
            target.scrollIntoView({ block: "center" });
            target.classList.add("highlight");
            setTimeout(() => target.classList.remove("highlight"), 1500);
        }));
        // les liens morts (\a\, \pol\…) ne rechargent pas la page
        $$('#forum a[href="#"]:not(.pm-target):not(#inbox-link)').forEach(a =>
            a.addEventListener("click", e => e.preventDefault()));
    }

    /* ---------- notes.txt (notes du chasseur) ---------- */

    function notes() {
        $("#notes-text").textContent = HUNTER_NOTES;
        $("#btn-notes").addEventListener("click", () => $("#notes-win").classList.toggle("open"));
        $("#notes-close").addEventListener("click", () => $("#notes-win").classList.remove("open"));
    }

    /* ---------- Messagerie privée ---------- */

    // historique : [{from: "me"|"mod"|"sys", text}]
    const log   = () => Save.get("pm_log", []);
    const state = () => Save.get("pm_state", { date: false, included: false, tries: 0, done: false });

    function renderPM() {
        const box = $("#pm-messages");
        box.innerHTML = "";
        const l = log();
        if (!l.length) {
            box.innerHTML = `<div class="pm-empty">Aucun message.</div>`;
        }
        l.forEach(m => box.appendChild(bubble(m)));
        box.scrollTop = box.scrollHeight;
        $("#pm-input").disabled = state().done;
        $("#pm-send").disabled  = state().done;
        updateInboxCount();
    }

    function bubble(m) {
        const d = document.createElement("div");
        d.className = "pm-line " + (m.from === "mod" ? "them" : m.from);
        const who = m.from === "me" ? CONFIG.playerAccount : (m.from === "mod" ? "B. #mod" : "");
        if (m.text === "__LINK__") {
            d.innerHTML = `<span class="pm-who">${who}</span><a href="#" class="promote-link">${PROMOTE_URL}</a>`;
            d.querySelector("a").addEventListener("click", e => { e.preventDefault(); promote(); });
        } else {
            d.innerHTML = `<span class="pm-who"></span><span class="pm-txt"></span>`;
            d.querySelector(".pm-who").textContent = who;
            d.querySelector(".pm-txt").textContent = m.text;
        }
        return d;
    }

    function push(from, text) {
        const l = log(); l.push({ from, text }); Save.set("pm_log", l);
        $("#pm-messages .pm-empty")?.remove();
        const box = $("#pm-messages");
        box.appendChild(bubble({ from, text }));
        box.scrollTop = box.scrollHeight;
    }

    function openPM() {
        $("#pm-win").classList.add("open");
        renderPM();
        if (!state().done) $("#pm-input").focus();
    }

    let busy = false;

    function send(e) {
        e.preventDefault();
        if (busy) return;
        const input = $("#pm-input");
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        push("me", text);

        const st = state();
        const answers = modAnswer(text, st);
        Save.set("pm_state", st);

        // le modo "tape" ses réponses une par une
        busy = true;
        $("#pm-typing").classList.add("show");
        let delay = 1400 + Math.random() * 1200;
        answers.forEach((a, i) => {
            setTimeout(() => {
                push("mod", a);
                if (i === answers.length - 1) {
                    busy = false;
                    $("#pm-typing").classList.remove("show");
                    renderPM();
                }
            }, delay);
            delay += 900 + a.length * 25;
        });
    }

    function updateInboxCount() {
        const n = log().filter(m => m.from === "mod").length;
        $("#inbox-link").textContent = n ? `Messages (${n})` : "Messages";
    }

    /* ---------- Promotion admin ---------- */

    function promote() {
        setUrl(PROMOTE_URL);
        $("#pm-win").classList.remove("open");
        const p = $("#promote-screen");
        p.classList.add("open");
        Save.flag("act1_admin", true);
        setTimeout(() => Scenes.inbox(), 3500);
    }

    /* ---------- Init ---------- */

    function open() {
        if (!ready) {
            ready = true;
            quoteLinks();
            notes();

            // ouvrir un MP : cliquer sur le nom du modo, ou Messages
            $$(".pm-target").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openPM(); }));
            $("#inbox-link").addEventListener("click", e => { e.preventDefault(); openPM(); });
            $("#pm-close").addEventListener("click", () => $("#pm-win").classList.remove("open"));
            $("#pm-form").addEventListener("submit", send);
            $("#pm-input").addEventListener("keydown", e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
            });
            $("#btn-back").addEventListener("click", () => { $("#forum .content").scrollTop = 0; });
            updateInboxCount();
        }
        setUrl(BASE);
    }

    return { open };
})();
