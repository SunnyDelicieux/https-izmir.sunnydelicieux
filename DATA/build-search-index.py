#!/usr/bin/env python3
# Régénère DATA/search-index.js (la liste des pages pour la barre de recherche)
# et ajoute le script de recherche aux pages qui ne l'ont pas encore.
#
# À relancer après avoir ajouté, renommé ou supprimé une page :
#   python3 DATA/build-search-index.py

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# pages cachées ou techniques : pas dans la recherche, pas de barre dessus
EXCLUDE = [
    "header.html",
    "404.html",
    "legacy/",
    "SITE/FACTIONS/",
    "WIKI/template.html",
    "INGA/inga.html",
    "INGA/inga2.html",
]

SCRIPT_TAG = '<script src="/DATA/search.js" defer></script>'


def excluded(rel):
    return any(rel == e or rel.startswith(e) for e in EXCLUDE)


pages = []
for path in sorted(ROOT.rglob("*.html")):
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith(".") or excluded(rel):
        continue

    parts = rel.split("/")
    if parts[-1] == "index.html":
        name = parts[-2] if len(parts) > 1 else "index"
        url = "/" + "/".join(parts[:-1]) + ("/" if len(parts) > 1 else "")
        folder = "/".join(parts[:-2])
    else:
        name = parts[-1][: -len(".html")]
        url = "/" + rel
        folder = "/".join(parts[:-1])

    pages.append({"name": name, "folder": folder, "url": url})

    # ajoute la barre de recherche juste avant le premier </head>
    html = path.read_text(encoding="utf-8")
    if SCRIPT_TAG not in html:
        new_html, count = re.subn(
            r"^([ \t]*)</head>",
            lambda m: f"{m.group(1)}  {SCRIPT_TAG}\n{m.group(0)}",
            html, count=1, flags=re.IGNORECASE | re.MULTILINE,
        )
        if count:
            path.write_text(new_html, encoding="utf-8")

out = ROOT / "DATA" / "search-index.js"
out.write_text(
    "// Généré par DATA/build-search-index.py, ne pas modifier à la main.\n"
    "window.IZMIR_SEARCH_INDEX = "
    + json.dumps(pages, ensure_ascii=False, indent=1)
    + ";\n",
    encoding="utf-8",
)
print(f"{len(pages)} pages indexées dans {out.relative_to(ROOT)}")
