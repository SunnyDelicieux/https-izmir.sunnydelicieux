# egechan — ARG Inga (İzmir, 2014)

Jeu complémentaire au site İzmir. Histoire dirigée, une seule page, sans framework : ça tourne tel quel sur GitHub Pages.

## Lancer en local
Ouvrir `index.html` dans un navigateur, ou mieux :
```
python3 -m http.server
```
puis http://localhost:8000. Ajouter `?reset` à l'URL pour effacer la sauvegarde.

## Arborescence
```
index.html        toutes les scènes (le forum est écrit en HTML ici, exprès : indices dans le code source)
css/main.css      enter, cartons d'acte, visual novel, messagerie
css/forum.css     la board (style de izmir.html) + faux navigateur
js/config.js      noms, sprites, compte du joueur, vitesse du texte
js/save.js        sauvegarde localStorage
js/vn.js          texte lettre par lettre, sprites, choix
js/forum.js       index / fils, >>liens, images, notes, MP avec le modo
js/main.js        enchaînement des scènes
data/intro.js     monologue du chasseur
data/act1.js      notes du chasseur + mots-clés et réponses du modo
assets/           tes images (voir plus bas)
```

## Assets attendus (tout est optionnel, un placeholder s'affiche sinon)
- `assets/sprites/chasseur.png`, `assets/sprites/inga.png`
- `assets/bg.mp3`
- `assets/forum/quicksandtourist.png` : l'avatar de la board
- `assets/forum/` : (ancien forum, plus utilisé)
  `boyoz_vs_kumru_FINAL.jpg`, `tfw_night_shift.png`, `buca_1964.jpg`,
  `vapur_1971.jpg`, `dzitheni.jpg`, `doge_cup.jpg`, `alsancak_duvar.jpg`
- `assets/rooms/chambre-1.png`, `chambre-2.png` (copiées depuis ton site, pour l'acte 3)

## Choix de dialogues (prêt pour l'acte 2)
Dans un script VN, une ligne peut proposer des choix :
```js
{ who: "inga", text: "Tu me cherches ?", choices: [
    { label: "Oui.", then: [ { who: "inga", text: "Mauvaise réponse." } ] },
    { label: "…",    then: [ { who: "inga", text: "Timide." } ] }
]}
```

---

## ⚠ SOLUTION ACTE I (spoiler, pour toi)
Le joueur est déjà connecté avec le compte du chasseur, `ege_35`. Il lui faut l'admin.

1. Le fil **Nouvelle block list ?** (texte encore à écrire) : le modo « B. #mod » cherche des infos sur la prochaine liste de blocage du TİB, et demande qu'on lui écrive en MP.
2. Le bouton **notes.txt** (en haut à droite) contient les notes du chasseur, dont les trois listes TİB. La bonne est la 42 : prévue le 02/05, avec egechan.org dedans.
3. On clique sur le nom **B. #mod** pour lui écrire, librement. Il faut lui dire **la date** (2 mai, may 2, 02/05, 2 mayıs, liste 42…) **et que egechan est sur la liste** (egechan, on the list, oui, yes, evet…), en un ou plusieurs messages.
   Le 14/04 et le 16/05 sont des fausses pistes, avec des réponses dédiées.
4. Il envoie un lien `promote.php` : un clic, et le compte passe admin → panel staff → « je sais que tu es là. »

Les mots-clés et les répliques du modo sont dans `data/act1.js` (objets `MATCH` et `MOD_REPLIES`).
