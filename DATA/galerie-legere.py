# Génère les versions légères de la galerie :
#   GALLERIE/web/    -> version zoom (2000 px max, WebP)
#   GALLERIE/thumbs/ -> miniature de la grille (600 px max, WebP)
# Même arborescence que GALLERIE/dessin/, seules les images nouvelles ou modifiées sont refaites.
# Usage depuis la racine du dépôt : pip install pillow && python3 DATA/galerie-legere.py
from pathlib import Path
from PIL import Image, ImageOps

RACINE = Path("GALLERIE")
FORMATS = {".png", ".jpg", ".jpeg", ".webp"}   # les .gif animés restent tels quels

for f in sorted((RACINE / "dessin").rglob("*")):
    if f.suffix.lower() not in FORMATS:
        continue
    # un .webp qui a le même nom qu'un .png/.jpg donnerait la même sortie : on garde l'autre
    if f.suffix.lower() == ".webp" and any(
        f.with_suffix(ext).exists() for ext in FORMATS - {".webp"}
    ):
        print("ignoré (doublon de nom)", f)
        continue
    rel = f.relative_to(RACINE)                 # ex : dessin/sun/poster.png
    for dossier, taille, qualite in (("web", 2000, 85), ("thumbs", 600, 80)):
        sortie = (RACINE / dossier / rel).with_suffix(".webp")
        if sortie.exists() and sortie.stat().st_mtime >= f.stat().st_mtime:
            continue                            # déjà à jour
        sortie.parent.mkdir(parents=True, exist_ok=True)
        im = ImageOps.exif_transpose(Image.open(f))   # remet droites les photos tournées
        im.thumbnail((taille, taille))
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA")
        im.save(sortie, "WEBP", quality=qualite, method=6)
        print("ok", sortie)
