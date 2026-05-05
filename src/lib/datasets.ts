/**
 * Enhanced Dataset Integration Layer
 *
 * Browser-callable wrappers around public scientific databases used to
 * strengthen accuracy of the in-silico drug discovery engine.
 *
 *  - RCSB Protein Data Bank (PDB)  — 3D structures + bound ligands
 *  - BindingDB                     — experimental binding affinities
 *  - DrugBank                      — approved drugs metadata (public open-data subset)
 *  - UniProt                       — protein sequences & functional annotations
 *  - ZINC20                        — purchasable compound library for VS
 *
 * All endpoints below are CORS-enabled. DrugBank has no fully open API,
 * so we link to its public OpenData JSON / web pages.
 */

// ---------- Types ----------
export interface PDBStructure {
  pdbId: string;
  title: string;
  resolution?: number | null;
  method?: string;
  organism?: string;
  ligands: { id: string; name?: string }[];
  releaseDate?: string;
  url: string;
}

export interface BindingDBRecord {
  ligandName?: string;
  targetName?: string;
  affinityType: "IC50" | "Ki" | "Kd" | "EC50" | string;
  value: number | null;
  units: string;
  source: string;
}

export interface DrugBankEntry {
  id: string;
  name: string;
  description?: string;
  groups?: string[];
  targets?: string[];
  url: string;
}

export interface UniProtEntry {
  accession: string;
  name: string;
  organism?: string;
  sequenceLength?: number;
  function?: string;
  keywords?: string[];
  url: string;
}

export interface ZincCompound {
  zincId: string;
  smiles?: string;
  mwt?: number;
  logp?: number;
  purchasable?: string;
  url: string;
}

// ---------- RCSB PDB ----------
// Search API: https://search.rcsb.org/  | Data API: https://data.rcsb.org/
export async function searchPDB(query: string, limit = 8): Promise<PDBStructure[]> {
  const body = {
    query: {
      type: "terminal",
      service: "full_text",
      parameters: { value: query },
    },
    return_type: "entry",
    request_options: { paginate: { start: 0, rows: limit } },
  };
  const res = await fetch("https://search.rcsb.org/rcsbsearch/v2/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const ids: string[] = (data.result_set || []).map((r: { identifier: string }) => r.identifier);
  const entries = await Promise.all(ids.map(fetchPDBEntry));
  return entries.filter(Boolean) as PDBStructure[];
}

export async function fetchPDBEntry(pdbId: string): Promise<PDBStructure | null> {
  try {
    const res = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${pdbId}`);
    if (!res.ok) return null;
    const d = await res.json();
    const ligIds: string[] = d.rcsb_entry_container_identifiers?.non_polymer_entity_ids || [];
    const ligands = await Promise.all(
      ligIds.slice(0, 6).map(async (eid) => {
        try {
          const r = await fetch(
            `https://data.rcsb.org/rest/v1/core/nonpolymer_entity/${pdbId}/${eid}`
          );
          if (!r.ok) return { id: eid };
          const e = await r.json();
          return {
            id: e.pdbx_entity_nonpoly?.comp_id || eid,
            name: e.pdbx_entity_nonpoly?.name,
          };
        } catch {
          return { id: eid };
        }
      })
    );
    return {
      pdbId,
      title: d.struct?.title || pdbId,
      resolution: d.rcsb_entry_info?.resolution_combined?.[0] ?? null,
      method: d.exptl?.[0]?.method,
      organism: d.rcsb_entry_container_identifiers?.entry_id,
      releaseDate: d.rcsb_accession_info?.initial_release_date,
      ligands,
      url: `https://www.rcsb.org/structure/${pdbId}`,
    };
  } catch {
    return null;
  }
}

// ---------- BindingDB ----------
// BindingDB REST: https://bindingdb.org/rest
// Returns affinities for a UniProt target id within a cutoff (nM).
export async function fetchBindingDBByUniProt(
  uniprotId: string,
  cutoffNM = 10000
): Promise<BindingDBRecord[]> {
  try {
    const res = await fetch(
      `https://bindingdb.org/rest/getLigandsByUniprot?uniprot=${uniprotId}&cutoff=${cutoffNM}&response=application/json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list =
      data?.getLindsByUniprotResponse?.affinities ||
      data?.getLigandsByUniprotResponse?.affinities ||
      [];
    return (Array.isArray(list) ? list : [list]).slice(0, 30).map((a: Record<string, unknown>) => ({
      ligandName: (a.query as string) || (a.monomerid as string),
      targetName: uniprotId,
      affinityType: (a.affinity_type as string) || "Ki",
      value: a.affinity ? Number(a.affinity) : null,
      units: "nM",
      source: "BindingDB",
    }));
  } catch {
    return [];
  }
}

// ---------- DrugBank (open data subset via Wikidata fallback) ----------
// DrugBank's full API requires license. We use their public Open Data
// search page links and a Wikidata SPARQL fallback for structured info.
export async function searchDrugBank(name: string): Promise<DrugBankEntry[]> {
  // Wikidata SPARQL: drugs with DrugBank ID matching label
  const sparql = `
    SELECT ?item ?itemLabel ?dbid ?desc WHERE {
      ?item wdt:P715 ?dbid.
      ?item rdfs:label ?itemLabel.
      OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc)="en") }
      FILTER(LANG(?itemLabel)="en")
      FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${name.replace(/"/g, "")}")))
    } LIMIT 10`;
  try {
    const res = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
      { headers: { Accept: "application/sparql-results+json" } }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return (d.results?.bindings || []).map((b: Record<string, { value: string }>) => ({
      id: b.dbid.value,
      name: b.itemLabel.value,
      description: b.desc?.value,
      url: `https://go.drugbank.com/drugs/${b.dbid.value}`,
    }));
  } catch {
    return [];
  }
}

// ---------- UniProt ----------
export async function searchUniProt(query: string, limit = 8): Promise<UniProtEntry[]> {
  try {
    const res = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(
        query
      )}&format=json&size=${limit}&fields=accession,id,protein_name,organism_name,length,cc_function,keyword`
    );
    if (!res.ok) return [];
    const d = await res.json();
    return (d.results || []).map((r: Record<string, unknown>) => {
      const proteinDesc = r.proteinDescription as
        | { recommendedName?: { fullName?: { value?: string } } }
        | undefined;
      const orgEl = r.organism as { scientificName?: string } | undefined;
      const seq = r.sequence as { length?: number } | undefined;
      const comments = (r.comments as Array<Record<string, unknown>>) || [];
      const fnComment = comments.find((c) => c.commentType === "FUNCTION");
      const texts = (fnComment?.texts as Array<{ value: string }>) || [];
      const kws = (r.keywords as Array<{ name: string }>) || [];
      const acc = (r.primaryAccession as string) || "";
      return {
        accession: acc,
        name: proteinDesc?.recommendedName?.fullName?.value || (r.uniProtkbId as string) || acc,
        organism: orgEl?.scientificName,
        sequenceLength: seq?.length,
        function: texts[0]?.value,
        keywords: kws.map((k) => k.name).slice(0, 6),
        url: `https://www.uniprot.org/uniprotkb/${acc}`,
      };
    });
  } catch {
    return [];
  }
}

// ---------- ZINC ----------
// ZINC20 substructure/text search via their public endpoint.
export async function searchZinc(smilesOrName: string, limit = 10): Promise<ZincCompound[]> {
  try {
    const res = await fetch(
      `https://zinc20.docking.org/substances.json?q=${encodeURIComponent(smilesOrName)}&count=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.substances || [];
    return list.slice(0, limit).map((c: Record<string, unknown>) => ({
      zincId: (c.zinc_id as string) || (c.id as string) || "",
      smiles: c.smiles as string,
      mwt: c.mwt as number,
      logp: c.logp as number,
      purchasable: c.purchasability as string,
      url: `https://zinc20.docking.org/substances/${c.zinc_id || c.id}/`,
    }));
  } catch {
    return [];
  }
}

// ---------- Aggregate helper ----------
export interface AggregatedDatasetReport {
  query: string;
  pdb: PDBStructure[];
  uniprot: UniProtEntry[];
  bindingdb: BindingDBRecord[];
  drugbank: DrugBankEntry[];
  zinc: ZincCompound[];
  generatedAt: string;
}

export async function aggregateDatasetEvidence(
  query: string
): Promise<AggregatedDatasetReport> {
  const [pdb, uniprot, drugbank, zinc] = await Promise.all([
    searchPDB(query, 6),
    searchUniProt(query, 6),
    searchDrugBank(query),
    searchZinc(query, 8),
  ]);
  const bindingdb = uniprot[0]
    ? await fetchBindingDBByUniProt(uniprot[0].accession)
    : [];
  return {
    query,
    pdb,
    uniprot,
    bindingdb,
    drugbank,
    zinc,
    generatedAt: new Date().toISOString(),
  };
}
