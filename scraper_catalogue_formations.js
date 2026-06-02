// ============================================================
// SCRAPER Catalogue Apprentissage - 66 971 formations
// À coller dans la console du navigateur (n'importe quelle page)
// ============================================================

(async () => {
  const BASE = "https://catalogue-apprentissage.intercariforef.org/api/v1/entity/formations";
  const PAGE_SIZE = 1000;

  // Récupère le nombre total de formations
  const firstResp = await fetch(`${BASE}?limit=1`);
  const firstData = await firstResp.json();
  const total = firstData.pagination.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log(`Total formations: ${total} — ${totalPages} pages à récupérer`);

  const allFormations = [];

  for (let page = 1; page <= totalPages; page++) {
    const url = `${BASE}?limit=${PAGE_SIZE}&page=${page}`;
    const resp = await fetch(url);
    const data = await resp.json();
    allFormations.push(...data.formations);
    console.log(`Page ${page}/${totalPages} — ${allFormations.length}/${total} formations`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nTerminé. ${allFormations.length} formations récupérées.`);

  // Export CSV
  const headers = [
    "UAI gestionnaire",
    "Adresse gestionnaire",
    "Code postal gestionnaire",
    "Localité gestionnaire",
    "Raison sociale gestionnaire",
    "Raison sociale formateur",
    "Nom de la formation",
    "Diplôme",
    "Niveau",
    "URL ONISEP",
    "Type certif",
    "Localité formation",
    "Modalités évaluation",
  ];

  const csvLines = [headers.join(",")];

  for (const f of allFormations) {
    const row = [
      f.etablissement_gestionnaire_uai,
      f.etablissement_gestionnaire_adresse,
      f.etablissement_gestionnaire_code_postal,
      f.etablissement_gestionnaire_localite,
      f.etablissement_gestionnaire_entreprise_raison_sociale,
      f.etablissement_formateur_entreprise_raison_sociale,
      f.intitule_long,
      f.diplome,
      f.niveau,
      f.onisep_url,
      f.code_type_certif,
      f.localite,
      f.modalites_evaluation,
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`);
    csvLines.push(row.join(","));
  }

  const blob = new Blob(["﻿" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "catalogue_formations_apprentissage.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log("✓ CSV téléchargé : catalogue_formations_apprentissage.csv");
})();
