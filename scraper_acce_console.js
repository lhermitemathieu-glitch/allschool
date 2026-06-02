// ============================================================
// SCRAPER ACCE - À coller dans la console DevTools
// Depuis n'importe quelle page sur education.gouv.fr
// ============================================================

(async () => {
  const BASE = "https://www.education.gouv.fr/acce_public/search.php";
  const TOTAL_PAGES = 8;
  const allRows = [];

  // Récupère le HTML d'une page de résultats
  async function fetchPage(pageNum) {
    const body = new URLSearchParams({
      action: "search",
      sub_action: "query",
      page: String(pageNum),
      page_size: "500",
      sort: "",
      layer_mode: "standard",
      requete_mode: "show",
      facet_mode: "show",
      list_mode: "list",
      mode: "simple",
      simple_public: "apprentis",
      localisation: "",
    });

    const resp = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status} page ${pageNum}`);
    return resp.text();
  }

  // Extrait les lignes de la table de résultats
  function extractRows(html, pageNum) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");
    console.log(`  Page ${pageNum}: ${tables.length} tables trouvées`);

    // Chercher la table contenant des liens vers uai.php
    let target = null;
    for (const t of tables) {
      if (t.innerHTML.includes("uai.php")) {
        target = t;
        break;
      }
    }

    // Fallback: table index 28
    if (!target && tables.length > 28) {
      target = tables[28];
    }

    if (!target) {
      console.warn(`  Page ${pageNum}: table de résultats introuvable`);
      // Sauvegarder le HTML pour debug
      if (pageNum === 1) {
        const blob = new Blob([html], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "debug_page1_acce.html";
        a.click();
      }
      return [];
    }

    const rows = [];
    const trs = target.querySelectorAll("tr");

    for (const tr of trs) {
      const cells = tr.querySelectorAll("td, th");
      if (cells.length === 0) continue;

      const cellTexts = Array.from(cells).map(c => c.textContent.trim().replace(/\s+/g, " "));

      // Récupérer uai_ndx depuis les liens
      let uaiNdx = "";
      const links = tr.querySelectorAll("a[href]");
      for (const a of links) {
        const m = a.href.match(/uai_ndx=(\d+)/);
        if (m) { uaiNdx = m[1]; break; }
      }

      rows.push([...cellTexts, uaiNdx]);
    }

    console.log(`  Page ${pageNum}: ${rows.length} lignes extraites`);
    return rows;
  }

  // Scraping des 8 pages
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    console.log(`Fetching page ${p}/${TOTAL_PAGES}...`);
    try {
      const html = await fetchPage(p);
      const rows = extractRows(html, p);
      allRows.push(...rows);
      await new Promise(r => setTimeout(r, 800)); // pause polie
    } catch (e) {
      console.error(`Erreur page ${p}:`, e);
    }
  }

  console.log(`\nTotal lignes: ${allRows.length}`);

  // Export CSV
  const csvContent = allRows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "acce_apprentissage_liste.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log("✓ Téléchargement du CSV lancé !");
})();
