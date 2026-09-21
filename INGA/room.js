
const room = document.getElementById("room");
const dialog = document.getElementById("dialog");
const text = document.getElementById("text");
const speaker = document.getElementById("speaker");

const ingaPortrait =
    "https://i.postimg.cc/Zn8ZdS2Q/image-2026-09-03-100531968.png";

const catImage =
    "https://i.postimg.cc/yx3hXVzt/image.png";

const paperImage =
    "https://i.postimg.cc/C5LqKScr/image.png";

const seen = {};


/* =========================
   DIALOGUES
========================= */

function talk(id) {

    const dialogue = dialogues[id];

    if (!dialogue) return;

    hideFocusItem();

    speaker.src = ingaPortrait;

    // Travail : first → repeat → reste sur le dernier
    if (id === "travail") {

        const list = [
            dialogue.first,
            ...dialogue.repeat
        ];

        const index = seen[id] || 0;

        text.textContent = list[Math.min(index, list.length - 1)];

        if (index < list.length - 1) {
            seen[id] = index + 1;
        }

    } else {

        // Autres dialogues : first puis boucle sur repeat
        if (seen[id] === undefined) {

            text.textContent = dialogue.first;
            seen[id] = 0;

        } else {

            const list = dialogue.repeat;

            text.textContent = list[seen[id]];

            seen[id]++;

            if (seen[id] >= list.length) {
                seen[id] = 0;
            }
        }
    }

    dialog.style.display = "block";


    // Objets en gros plan
    if (id === "chat") {
        showFocusItem(catImage);
    }

    if (id === "poster") {
        showFocusItem(paperImage);
    }
}


/* =========================
   OBJET EN GROS PLAN
========================= */

function showFocusItem(image) {

    let item = document.getElementById("focus-item");

    if (!item) {
        item = document.createElement("img");
        item.id = "focus-item";
        room.appendChild(item);
    }

    item.src = image;
    item.style.display = "block";
}


function hideFocusItem() {

    const item = document.getElementById("focus-item");

    if (item) {
        item.style.display = "none";
    }
}


/* =========================
   FERMER LE DIALOGUE
========================= */

dialog.addEventListener("click", () => {

    dialog.style.display = "none";

    hideFocusItem();
});


/* =========================
   ÉTOILES
========================= */

document.querySelectorAll("area").forEach(area => {

    const coords = area.coords.split(",").map(Number);

    const x = (coords[0] + coords[2]) / 2;
    const y = (coords[1] + coords[3]) / 2;

    const star = document.createElement("div");

    star.className = "hint";
    star.textContent = "✦";

    star.style.left = `${x}px`;
    star.style.top = `${y}px`;

    room.appendChild(star);

    area.addEventListener("mouseenter", () => {
        star.classList.add("glow");
    });

    area.addEventListener("mouseleave", () => {
        star.classList.remove("glow");
    });
});


/* =========================
   PAGES INTERNES
========================= */

function openPage(page) {

    const viewer = document.getElementById("page-viewer");
    const frame = document.getElementById("page-frame");

    frame.src = page;
    viewer.style.display = "block";
}


function closePage() {

    const viewer = document.getElementById("page-viewer");
    const frame = document.getElementById("page-frame");

    frame.src = "about:blank";
    viewer.style.display = "none";
}

