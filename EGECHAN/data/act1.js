/* ==========================================================
   ACTE I — textes et logique du MP avec le modo "A."
   Le joueur écrit librement ; on cherche des mots-clés.
   Il doit dire : 1) la date de la prochaine liste (2 mai)
                  2) que egechan est dessus
   (dans un seul message ou en plusieurs, peu importe)
   ========================================================== */

/* --- Notes du chasseur (fenêtre notes.txt) --- */
const HUNTER_NOTES = `NOTES — ne pas laisser traîner

egechan.org
  compte : ege_35  (créé le 14/03, 31 posts, rien d'intéressant dedans)
  l'IP revient sur le board /izm/, toujours entre 2h et 5h du matin.
  les logs de connexion ne sont visibles que par les admins.
  → il me faut un accès admin.

staff
  "A." gère les comptes et la modération. méfiant.
  écrit en anglais, parfois en turc. jamais en journée.
  les autres modos ont l'air inactifs depuis 2013.

---

Ankara — rapport hebdo à rendre vendredi.
  ne RIEN écrire sur l'hypothèse descendant.
  ils me retireraient le dossier.

TİB / listes de blocage (copie du bureau — ne pas diffuser)
  liste 41 — appliquée le 14/04 — 212 sites (paris en ligne, streaming)
  liste 42 — prévue le 02/05   — 87 sites, dont egechan.org,
                                 4 forums étudiants (Ege Üni., DEÜ)
  liste 43 — en préparation, 16/05 — contenu inconnu

---

Basmane : rien.
Kemeraltı : rien.
Karşıyaka : rien.
Trois semaines de rien.

à acheter : café, piles pour la lampe UV, pansements.`;


/* --- Normalisation : minuscules, sans accents, ı→i --- */
function normalize(str) {
    return str.toLowerCase()
        .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
        .normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const MONTH_MAY   = "(mai|may|mayis|05)";
const MONTH_APRIL = "(avril|april|apr|nisan|04)";

const MATCH = {
    // la bonne date : 2 mai / may 2 / 2nd of may / 02/05 / 2 mayıs ...
    rightDate: new RegExp(
        `\\b0?2\\s*(nd|e|er)?\\s*(of\\s*)?${MONTH_MAY}\\b` +
        `|\\b${MONTH_MAY}\\s*0?2(nd)?\\b` +
        `|\\b0?2\\s*[\\/.\\-]\\s*0?5\\b`
    ),
    // les fausses pistes
    oldDate: new RegExp(`\\b14\\s*(th)?\\s*(of\\s*)?${MONTH_APRIL}\\b|\\b${MONTH_APRIL}\\s*14\\b|\\b14\\s*[\\/.\\-]\\s*0?4\\b|liste?\\s*41|list\\s*41`),
    lateDate: new RegExp(`\\b16\\s*(th)?\\s*(of\\s*)?${MONTH_MAY}\\b|\\b${MONTH_MAY}\\s*16\\b|\\b16\\s*[\\/.\\-]\\s*0?5\\b|liste?\\s*43|list\\s*43`),
    // "egechan est dessus"
    included: /egechan|ege chan|on it|on the list|you're on|you are on|we're on|we are on|listed|included|sur la liste|inclus|dedans|dessus|evet|listede|\bvar\b|\byes\b|\boui\b|\byep\b/,
    // "liste 42" compte comme la bonne date
    list42: /liste?\s*42|list\s*42|\b42\b/,
    // questions sur lui / méfiance
    who: /who are you|qui es[- ]tu|t'es qui|kimsin|sen kimsin|how do you know|comment tu sais|nereden biliyorsun/
};


/* --- Réponses du modo --- */
const MOD_REPLIES = {
    nothing: [
        "?",
        "si tu sais rien, me fais pas perdre mon temps.",
        "je t'ai demandé pour la liste. rien d'autre.",
        "ok et ?",
        "yazdığın hiçbir şey işime yaramıyor. une date. la liste. c'est tout."
    ],
    who: [
        "peu importe qui je suis. tu sais quelque chose ou pas ?",
        "c'est moi qui pose les questions. la liste. tu sais quoi ?"
    ],
    oldDate: [
        "le 14 c'est déjà passé, génie. on était pas dessus.",
        "ça c'est l'ancienne. je te parle de la PROCHAINE."
    ],
    lateDate: [
        "le 16 ? y a rien avant ? t'es sûr ?",
        "s'il y en a une le 16, il y en a une avant. et celle-là ?"
    ],
    onlyDate: [
        "le 2 mai. ok. et NOUS, on est dessus ou pas ?",
        "la date c'est utile. egechan est dessus ? oui ou non."
    ],
    onlyIncluded: [
        "on est dessus. ok. merde. quand ?",
        "il me faut une date. ça tombe quand ?"
    ],
    success: [
        "...",
        "le 2 mai. ça fait six jours.",
        "ok. faut que je déplace la board avant, et je peux pas être là 24h/24.",
        "ça te passe admin. aide-moi à déplacer les fils, touche pas au reste. et tu le partages pas.",
        "__LINK__",
        "teşekkürler."
    ]
};

const PROMOTE_URL = "http://egechan.org/staff/promote.php?u=ege_35&t=8f3ac91d07e2";


/* --- Analyse d'un message du joueur ---
   state = { date: bool, included: bool, tries: n }
   renvoie la liste des réponses du modo (et met à jour state) */
function modAnswer(text, state) {
    const t = normalize(text);
    const pick = (list) => list[(state.tries++) % list.length];

    const gaveDate = MATCH.rightDate.test(t) || MATCH.list42.test(t);
    const gaveIncl = MATCH.included.test(t);

    if (gaveDate) state.date = true;
    if (gaveIncl) state.included = true;

    if (state.date && state.included) { state.done = true; return MOD_REPLIES.success; }

    if (MATCH.who.test(t))       return [pick(MOD_REPLIES.who)];
    if (gaveDate)                return [pick(MOD_REPLIES.onlyDate)];
    if (MATCH.oldDate.test(t))   return [pick(MOD_REPLIES.oldDate)];
    if (MATCH.lateDate.test(t))  return [pick(MOD_REPLIES.lateDate)];
    if (gaveIncl)                return [pick(MOD_REPLIES.onlyIncluded)];
    return [pick(MOD_REPLIES.nothing)];
}
