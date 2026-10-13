#!/usr/bin/env python3
# Régénère DATA/search-index.js (la liste des pages et de leurs titres h1/h2
# pour la barre de recherche) et ajoute le script de recherche aux pages qui
# ne l'ont pas encore.
#
# Lancé automatiquement par GitHub à chaque envoi sur main
# (.github/workflows/search-index.yml). À la main :
#   python3 DATA/build-search-index.py

import html as htmllib
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


def headings(page_html):
    # texte des <h1> et <h2>, sans balises ni doublons, hors commentaires
    page_html = re.sub(r"<!--.*?-->", "", page_html, flags=re.DOTALL)
    found = []
    for m in re.finditer(r"<h([12])\b[^>]*>(.*?)</h\1\s*>", page_html, flags=re.IGNORECASE | re.DOTALL):
        text = re.sub(r"<[^>]+>", " ", m.group(2))
        text = " ".join(htmllib.unescape(text).split())
        if text and text not in found:
            found.append(text)
    return found


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

    html = path.read_text(encoding="utf-8")
    pages.append({"name": name, "folder": folder, "url": url, "headings": headings(html)})

    # ajoute la barre de recherche juste avant le premier </head>
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
titles = sum(len(p["headings"]) for p in pages)
print(f"{len(pages)} pages et {titles} titres indexés dans {out.relative_to(ROOT)}")
