const SUPABASE_URL = "https://bbxuycsmyowwsjrcdrsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IvC70lWI8ymTVMaAnF76Uw_9CEKbexj";

async function getDailyConversation() {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_daily_conversation_data`,
        {
            method: "POST",
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: "{}"
        }
    );

    if (!response.ok) {
        throw new Error(`Supabase ${response.status}`);
    }

    return await response.json();
}

const characters = [
    "nour.png",
    "anna.png",
    "eleni.png",
    "sophia.png"
];

const dialogueBox = document.getElementById("dialogue-box");
const speaker = document.getElementById("speaker");
const dialogueText = document.getElementById("dialogue-text");
const characterLayer = document.getElementById("characters");
const nebetta = document.getElementById("nebetta");

let dialogueLines = [];
let dialogueIndex = 0;
let loading = false;
let thinking = false;
let typingTimer = null;

function placeCharacter(sprite, slotNumber, conversation = false) {
    const slot = document.querySelector(
        `.character-slot[data-slot="${slotNumber}"]`
    );

    if (!slot) return;

    slot.innerHTML = "";
    slot.classList.toggle("conversation-npc", conversation);

    const img = document.createElement("img");
    img.src = `img/${sprite}`;
    img.alt = "";

    slot.appendChild(img);
}

function setupAmbientCharacters(excludedSprite = null) {
    const slots = document.querySelectorAll(".character-slot");
    const available = characters.filter(sprite => sprite !== excludedSprite);

    slots.forEach(slot => {
        slot.innerHTML = "";
        slot.classList.remove("conversation-npc");
    });

    slots.forEach(slot => {
        if (Math.random() >= 0.3 || !available.length) return;

        const index = Math.floor(Math.random() * available.length);
        const sprite = available.splice(index, 1)[0];

        placeCharacter(sprite, slot.dataset.slot);
    });
}

function setupConversationNPC(npc) {
    if (!npc || !npc.sprite || npc.slot === undefined) return;

    placeCharacter(npc.sprite, npc.slot, true);
}

function enterConversationMode() {
    characterLayer.classList.add("talking");
}

function exitConversationMode() {
    characterLayer.classList.remove("talking");
}

function showRoom() {
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }

    exitConversationMode();
    dialogueBox.classList.remove("active");

    dialogueLines = [];
    dialogueIndex = 0;

    setupAmbientCharacters();
}

function showDialogue() {
    dialogueBox.classList.add("active");
}

function showCurrentLine() {
    if (dialogueIndex >= dialogueLines.length) {
        showRoom();
        return;
    }

    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }

    const line = dialogueLines[dialogueIndex];

    speaker.textContent = line.speaker;
    dialogueText.textContent = "";

    let i = 0;

    typingTimer = setInterval(() => {
        dialogueText.textContent += line.text[i];
        i++;

        if (i >= line.text.length) {
            clearInterval(typingTimer);
            typingTimer = null;
        }
    }, 19);
}

const OUTRO = [
    {
        speaker: "Nebetta",
        text: "Maintenant oust, j'ai à faire."
    },
    {
        speaker: "Nebetta",
        text: "Mais promet moi de revenir demain, j'adore te voir égayer les lieux."
    }
];

nebetta.addEventListener("click", async () => {
    if (loading || dialogueBox.classList.contains("active")) return;

    loading = true;
    thinking = true;

    showDialogue();

    speaker.textContent = "Nebetta";
    dialogueText.textContent = "Laisse-moi réfléchir...";

    try {
        const conversation = await getDailyConversation();

        console.log("CONVERSATION :", conversation);

        if (
            !conversation ||
            !conversation.lines ||
            (
                !Array.isArray(conversation.lines) &&
                !Array.isArray(conversation.lines.lines)
            )
        ) {
            throw new Error("Réponse Supabase invalide.");
        }

        const conversationData = Array.isArray(conversation.lines)
            ? {
                npc: null,
                lines: conversation.lines
            }
            : conversation.lines;

        const npc = conversationData.npc || null;

        setupAmbientCharacters(
            npc ? npc.sprite : null
        );

        setupConversationNPC(npc);
        enterConversationMode();

        dialogueLines = [
            ...conversationData.lines,
            ...OUTRO
        ];

        dialogueIndex = 0;

    } catch (error) {
        console.error("ERREUR NEBETTA :", error);

        dialogueLines = [
            {
                speaker: "Nebetta",
                text: "Je n'arrive pas à me souvenir..."
            },
            {
                speaker: "Nebetta",
                text: "Reviens plus tard."
            }
        ];

        dialogueIndex = 0;
        enterConversationMode();

    } finally {
        loading = false;
    }
});

dialogueBox.addEventListener("click", () => {
    if (loading) return;

    if (thinking) {
        thinking = false;
        showCurrentLine();
        return;
    }

    dialogueIndex++;
    showCurrentLine();
});

setupAmbientCharacters();
