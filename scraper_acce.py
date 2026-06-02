#!/usr/bin/env python3
"""
Scraper ACCE - Établissements d'apprentissage
Scrape les 8 pages de résultats de recherche (mot-clé: apprentis)
"""

import requests
from bs4 import BeautifulSoup
import csv
import time
import re

BASE_URL = "https://www.education.gouv.fr/acce_public/search.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

session = requests.Session()
session.headers.update(HEADERS)


def extract_table_data(html):
    """Extrait les lignes de la table de résultats (index 28)."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")

    print(f"  Nombre de tables trouvées: {len(tables)}")

    if len(tables) <= 28:
        print(f"  ATTENTION: moins de 29 tables trouvées, on prend la dernière")
        target = tables[-1] if tables else None
    else:
        target = tables[28]

    if not target:
        return []

    rows = []
    for tr in target.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if not cells:
            continue
        row = [c.get_text(strip=True) for c in cells]
        # Récupérer aussi les liens (uai_ndx)
        links = tr.find_all("a", href=True)
        uai_ndx = ""
        for link in links:
            m = re.search(r"uai_ndx=(\d+)", link["href"])
            if m:
                uai_ndx = m.group(1)
                break
        row.append(uai_ndx)
        rows.append(row)

    return rows


def fetch_page_1():
    """Première requête : GET pour obtenir les cookies, puis POST avec le mot-clé."""
    print("Fetching page 1 (recherche initiale)...")

    # GET d'abord pour initialiser la session et obtenir les cookies
    resp_get = session.get(BASE_URL, timeout=30)
    print(f"  GET initial: {resp_get.status_code}")

    session.headers["Referer"] = BASE_URL

    data = {
        "rech_txt": "apprentis",
        "rech_type_txt": "libelle_ameli",
        "submit": "Rechercher",
    }
    resp = session.post(BASE_URL, data=data, timeout=30)
    resp.raise_for_status()
    print(f"  Status: {resp.status_code}, taille: {len(resp.text)} chars")
    return resp.text


def fetch_page_n(n, html_page1=None):
    """Pages suivantes : simuler doPaginate(n) — probablement un POST avec 'page'."""
    print(f"Fetching page {n}...")

    # On essaie de trouver les inputs cachés dans la page 1 pour les renvoyer
    hidden_data = {}
    if html_page1:
        soup = BeautifulSoup(html_page1, "html.parser")
        form = soup.find("form")
        if form:
            for inp in form.find_all("input", {"type": "hidden"}):
                name = inp.get("name")
                value = inp.get("value", "")
                if name:
                    hidden_data[name] = value

    data = {
        **hidden_data,
        "rech_txt": "apprentis",
        "rech_type_txt": "libelle_ameli",
        "page": str(n),
        "pageno": str(n),
        "goto_page": str(n),
    }

    resp = session.post(BASE_URL, data=data, timeout=30)
    resp.raise_for_status()
    print(f"  Status: {resp.status_code}, taille: {len(resp.text)} chars")
    return resp.text


def detect_pagination_param(html):
    """Analyse le JS pour trouver comment doPaginate fonctionne."""
    matches = re.findall(r"doPaginate[^;\"'<]{0,300}", html)
    form_matches = re.findall(r"function doPaginate[^}]{0,500}", html)
    print("\n--- doPaginate JS ---")
    for m in form_matches[:3]:
        print(m)
    print("--- appels doPaginate ---")
    for m in matches[:5]:
        print(m)

    # Chercher les inputs cachés
    soup = BeautifulSoup(html, "html.parser")
    forms = soup.find_all("form")
    print(f"\n{len(forms)} formulaire(s) trouvé(s)")
    for i, f in enumerate(forms[:3]):
        print(f"  Form {i}: action={f.get('action')}, method={f.get('method')}")
        for inp in f.find_all("input"):
            print(f"    input: name={inp.get('name')}, type={inp.get('type')}, value={inp.get('value','')[:50]}")


def main():
    all_rows = []

    # Page 1
    html1 = fetch_page_1()

    # Analyse de la pagination
    detect_pagination_param(html1)

    rows1 = extract_table_data(html1)
    print(f"  Lignes extraites page 1: {len(rows1)}")
    all_rows.extend(rows1)

    # Sauvegarde intermédiaire pour debug
    with open("debug_page1.html", "w", encoding="utf-8") as f:
        f.write(html1)
    print("  Sauvegardé debug_page1.html")

    # Pages 2 à 8
    for page_num in range(2, 9):
        time.sleep(1.5)  # politesse
        try:
            html_n = fetch_page_n(page_num, html1)
            rows_n = extract_table_data(html_n)
            print(f"  Lignes extraites page {page_num}: {len(rows_n)}")
            all_rows.extend(rows_n)
        except Exception as e:
            print(f"  ERREUR page {page_num}: {e}")

    print(f"\nTotal lignes: {len(all_rows)}")

    # Export CSV
    output_file = "acce_apprentissage_liste.csv"
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for row in all_rows:
            writer.writerow(row)

    print(f"Exporté: {output_file}")


if __name__ == "__main__":
    main()
