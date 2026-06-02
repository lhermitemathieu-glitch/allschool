// ============================================================
// SCRAPER ACCE - Fiches détail (3 551 établissements)
// À coller dans la console sur acce.depp.education.fr
// ============================================================

(async () => {
  const BASE = "https://acce.depp.education.fr/acce_public/uai.php";
  const TOTAL = 3551;
  const BATCH_SIZE = 10;   // requêtes en parallèle
  const DELAY_MS = 300;    // pause entre chaque batch

  const FIELDS = ["Identifiant", "Académie", "Tél", "Fax", "Mèl", "Site WEB",
                  "Adresse", "Acheminement", "Etat", "Tutelle", "Secteur"];

  const results = [];

  function extractFiche(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const data = {};

    // Nom de l'établissement (titre en haut à gauche)
    const titre = doc.querySelector(".uai-title, h2, .fiche-title, .panel-title");
    data["Nom"] = titre ? titre.textContent.trim().replace(/\s+/g, " ") : "";

    // Champs label/valeur via span.field
    doc.querySelectorAll("span.field").forEach(span => {
      const label = span.textContent.trim();
      if (FIELDS.includes(label)) {
        const parentDiv = span.closest("div.col-4") || span.parentElement;
        const valueDiv = parentDiv?.nextElementSibling;
        data[label] = valueDiv ? valueDiv.textContent.trim().replace(/\s+/g, " ") : "";
      }
    });

    return data;
  }

  async function fetchFiche(ndx) {
    const resp = await fetch(`${BASE}?uai_mode=list&uai_ndx=${ndx}`);
    if (!resp.ok) return { _ndx: ndx, _error: resp.status };
    const html = await resp.text();
    const data = extractFiche(html);
    data["_ndx"] = ndx;
    return data;
  }

  // Traitement par batchs
  let done = 0;
  for (let start = 1; start <= TOTAL; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, TOTAL);
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const batch = await Promise.all(indices.map(fetchFiche));
    results.push(...batch);
    done += batch.length;

    if (done % 100 === 0 || done === TOTAL) {
      console.log(`Progression: ${done}/${TOTAL} (${Math.round(done/TOTAL*100)}%)`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nTerminé. ${results.length} fiches récupérées.`);

  // Export CSV
  const headers = ["_ndx", "Nom", ...FIELDS];
  const csvLines = [headers.join(",")];

  for (const row of results) {
    const line = headers.map(h => {
      const val = String(row[h] || "").replace(/"/g, '""');
      return `"${val}"`;
    }).join(",");
    csvLines.push(line);
  }

  const blob = new Blob(["﻿" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "acce_fiches_detail.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log("✓ CSV téléchargé : acce_fiches_detail.csv");
})();
