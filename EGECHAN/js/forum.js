/* ==========================================================
   FORUM — imageboard de l'acte 1
   Les fils sont écrits en HTML dans index.html.
   Le joueur est connecté avec son compte (ege_35) ; il doit
   obtenir l'admin en aidant le modo "A." par MP.
   ========================================================== */

const Forum = (() => {

    const BASE = "http://egechan.org/izm/";
    let ready = false;

    const $  = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    /* ---------- Vues index / fil ---------- */

    function showIndex() {
        $("#forum").classList.remove("thread-mode");
        $$(".thread").forEach(t => {
            t.classList.remove("open");
            const replies = $$(".replyContainer", t);
            replies.forEach((r, i) => r.classList.toggle("folded", i < replies.length - 2));
            const omitted = replies.length - 2;
            const note = $(".omitted", t);
            if (note) note.textContent = omitted > 0
                ? `${omitted} réponses masquées. Cliquez sur Répondre pour tout voir.` : "";
        });
        setUrl(BASE);
        $("#forum-scroll").scrollTop = 0;
    }

    function showThread(id) {
        $("#forum").classList.add("thread-mode");
        $$(".thread").forEach(t => {
            t.classList.toggle("open", t.dataset.thread === id);
            $$(".replyContainer", t).forEach(r => r.classList.remove("folded"));
        });
        setUrl(BASE + "res/" + id + ".html");
        $("#forum-scroll").scrollTop = 0;
    }

    function setUrl(u) { $("#url-bar").textContent = u; }

    /* ---------- Images : assets/forum/<fichier> sinon placeholder ---------- */

    function loadImages() {
        $$(".ph[data-file]").forEach(ph => {
            ph.style.width  = (ph.dataset.w || 250) + "px";
            ph.style.height = (ph.dataset.h || 180) + "px";
            const img = new Image();
            img.onload = () => {
                img.className = "thumb";
                img.style.maxWidth = (ph.dataset.w || 250) + "px";
                ph.replaceWith(img);
            };
            img.src = "assets/forum/" + ph.dataset.file;
        });
    }

    /* ---------- >>liens ---------- */

    function quoteLinks() {
        $$("a.quotelink").forEach(a => a.addEventListener("click", e => {
            e.preventDefault();
            const target = document.getElementById("p" + a.textContent.replace(/\D/g, ""));
            if (!target) return;
            target.scrollIntoView({ block: "center" });
            target.classList.add("highlight");
            setTimeout(() => target.classList.remove("highlight"), 1500);
        }));
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
        const who = m.from === "me" ? CONFIG.playerAccount : (m.from === "mod" ? "A. ## Mod" : "");
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
            loadImages();
            quoteLinks();
            notes();

            $$(".replylink").forEach(a => a.addEventListener("click", e => {
                e.preventDefault();
                showThread(a.closest(".thread").dataset.thread);
            }));
            $$(".return-link").forEach(a => a.addEventListener("click", e => {
                e.preventDefault(); showIndex();
            }));
            $("#btn-back").addEventListener("click", showIndex);

            // ouvrir un MP : cliquer sur le nom du modo, ou Inbox
            $$(".pm-target").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openPM(); }));
            $("#inbox-link").addEventListener("click", e => { e.preventDefault(); openPM(); });
            $("#pm-close").addEventListener("click", () => $("#pm-win").classList.remove("open"));
            $("#pm-form").addEventListener("submit", send);
            $("#pm-input").addEventListener("keydown", e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
            });
            updateInboxCount();
        }
        showIndex();
    }

    return { open };
})();
