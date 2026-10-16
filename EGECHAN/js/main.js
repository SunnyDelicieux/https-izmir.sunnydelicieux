/* ==========================================================
   MAIN — enchaînement des scènes
   ========================================================== */

const Scenes = {

    show(id) {
        document.querySelectorAll(".scene").forEach(s => s.classList.remove("active"));
        document.getElementById("scene-" + id).classList.add("active");
    },

    // Carton noir "ACTE I — ..." puis callback
    card(title, subtitle, done) {
        const card = document.getElementById("scene-card");
        card.querySelector(".card-title").textContent = title;
        card.querySelector(".card-sub").textContent = subtitle || "";
        this.show("card");
        setTimeout(done, 3200);
    },

    intro() {
        Save.scene = "intro";
        this.show("vn");
        VN.play(SCRIPT_INTRO, () => {
            this.card("ACTE I", "egechan.org", () => this.forum());
        });
    },

    forum() {
        Save.scene = "forum";
        document.title = "/izm/ - İzmir & Ege - egechan";
        this.show("forum");
        Forum.open();
    },

    inbox() {
        Save.scene = "inbox";
        document.title = "egechan :: panel staff";
        this.show("inbox");
        Inbox.open();
    }
};


/* --- Petite messagerie de fin d'acte 1 (teaser acte 2) --- */

const Inbox = {
    open() {
        const list = document.getElementById("inbox-msg");
        setTimeout(() => {
            list.innerHTML = "";
            document.getElementById("inbox-count").textContent = "(1)";
            const m = document.createElement("div");
            m.className = "pm unread";
            m.innerHTML = `<span class="pm-from">???</span><span class="pm-subj">(pas d'objet)</span><span class="pm-date">26/04/14 03:33</span>`;
            m.onclick = () => {
                m.classList.remove("unread");
                document.getElementById("inbox-read").innerHTML =
                    `<div class="pm-head">De : <b>???</b> — À : ege_35</div>
                     <div class="pm-body">je sais que tu es là.</div>
                     <div class="pm-tbc">ACTE II — à suivre</div>`;
            };
            list.appendChild(m);
        }, 2500);
    }
};


/* --- Démarrage --- */

window.addEventListener("DOMContentLoaded", () => {
    Save.load();

    const enter = document.getElementById("scene-enter");
    const music = document.getElementById("bg-music");
    music.src = CONFIG.music;

    enter.addEventListener("click", () => {
        music.volume = 0.25;
        music.play().catch(() => {});      // pas de fichier = pas de musique, pas grave
        const where = Save.scene;
        if (where === "inbox") Scenes.inbox();
        else if (where === "forum") Scenes.forum();
        else Scenes.intro();
    }, { once: true });
});
