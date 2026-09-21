const chatWindow = document.getElementById("chat-window");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-text");

const history = [
    ["them", "Je vais te bannir de la guilde si tu continue à jouer 15h par jour."],
    ["me", "C'est contreproductif non ? Surtout venant de toi"],
    ["them", "Ce n'est juste pas possible, je sais que tu partages ton compte à quelqu'un d'autre."],
    ["them", "C'est contre les pratique de la guilde."],
    ["me", "Non je te jure, je laisserais jamais quelqu'un d'autre toucher à mon compte"],
    ["me", "t'es juste jaloux que tu manque de discipline"],
    ["them", "Toi ? Avoir de la discipline ? Fais moi rire."],
    ["me", "on pourrais se faire un visio un de ces quatre"],
    ["me", "je te montrerai"],
    ["me", "t'es là ?"],
    ["me", "t'es juste jaloux. Je retourne farmer d'ailleurs."]
];

const normalReplies = [
    "Je travaille, laisses moi tranquille.",
    "Trouves toi une occupation.",
    "Pas aujourd'hui.",
    "J'ai pas le temps.",
    "Non.",
    "Tu peux arrêter de m'écrire ?",
    "Je suis occupé."
];


function addMessage(text, side) {
    const message = document.createElement("div");

    message.className = `chat-message ${side}`;
    message.textContent = text;

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function openChat() {
    chatWindow.classList.add("open");
    chatMessages.innerHTML = "";

    history.forEach(([side, text]) => {
        addMessage(text, side);
    });

    chatInput.focus();
}


document.getElementById("open-chat").addEventListener("click", openChat);


document.getElementById("chat-close").addEventListener("click", () => {
    chatWindow.classList.remove("open");
});


chatForm.addEventListener("submit", event => {
    event.preventDefault();

    const text = chatInput.value.trim();

    if (!text) return;

    addMessage(text, "me");
    chatInput.value = "";


    /* SPECIAL ZACHARIAS INTERACTION */

    if (text.toLowerCase().includes("zacharias")) {

        setTimeout(() => {
            addMessage(
                "Inga, si tu veux me doxx, on est deux à pouvoir jouer à ce jeu.",
                "them"
            );
        }, 800);

        setTimeout(() => {
            addMessage(
                "Je suis à ça de trouver sur quel serveur tu as le cache de ta camera, sale gosse.",
                "me"
            );
        }, 1800);

        setTimeout(() => {
            addMessage(
                "Continue à essayer, sur ce terrain je gagnerai.",
                "them"
            );
        }, 2800);

        return;
    }


    /* NORMAL RESPONSE */

    setTimeout(() => {
        const reply =
            normalReplies[Math.floor(Math.random() * normalReplies.length)];

        addMessage(reply, "them");
    }, 800);
});
