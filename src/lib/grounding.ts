/**
 * Computational Chemistry Data Grounding Engine
 *
 * Queries trusted public databases (PubChem, ChEMBL, UniProt) to validate
 * known biological evidence for a molecule–target pair BEFORE prediction.
 *
 * All endpoints below support CORS and are callable directly from the browser.
 */

import { fetchPubChemBySMILES, fetchPubChemByName, type PubChemResult } from "./pubchem";

const CHEMBL = "https://www.ebi.ac.uk/chembl/api/data";
const UNIPROT = "https://rest.uniprot.org";

export type GroundingStatus = "GROUNDED" | "PARTIALLY GROUNDED" | "UNGROUNDED";
export type Confidence = "High" | "Medium" | "Low";

export interface BioactivityRecord {
  type: string; // IC50, Ki, EC50, Kd
  value: number | null;
  units: string | null;
  assayDescription?: string;
  targetChemblId?: string;
  targetName?: string;
  documentChemblId?: string;
  pchembl?: number | null;
}

export interface SimilarLigand {
  chemblId: string;
  name?: string;
  smiles?: string;
  similarity: number;
}

export interface TargetInfo {
  uniprotId?: string;
  chemblTargetId?: string;
  name: string;
  organism?: string;
  function?: string;
  source: "uniprot" | "chembl" | "input";
}

export interface GroundingReport {
  molecule: {
    query: string;
    resolvedAs: "smiles" | "name";
    pubchemCid?: number;
    chemblId?: string;
    properties?: PubChemResult;
  };
  target: TargetInfo;
  knownInteraction: boolean;
  experimentalEvidence: BioactivityRecord[];
  similarLigands: SimilarLigand[];
  confidence: Confidence;
  status: GroundingStatus;
  notes: string[];
  sources: string[];
}

// ---------- Helpers ----------

const looksLikeSMILES = (q: string) =>
  /[=#\(\)\[\]\\\/]/.test(q) || (/[A-Z]/.test(q) && /[a-z0-9]/.test(q) === false && q.length < 60);

async function safeJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ---------- ChEMBL: molecule lookup ----------

async function chemblMoleculeBySmiles(smiles: string): Promise<string | null> {
  const url = `${CHEMBL}/molecule.json?molecule_structures__canonical_smiles__flexmatch=${encodeURIComponent(smiles)}&limit=1`;
  const data = await safeJson(url);
  return data?.molecules?.[0]?.molecule_chembl_id ?? null;
}

async function chemblMoleculeByName(name: string): Promise<string | null> {
  const url = `${CHEMBL}/molecule/search.json?q=${encodeURIComponent(name)}&limit=1`;
  const data = await safeJson(url);
  return data?.molecules?.[0]?.molecule_chembl_id ?? null;
}

// ---------- ChEMBL: target lookup ----------

async function chemblTargetSearch(query: string): Promise<{ chemblId: string; name: string; organism?: string } | null> {
  const url = `${CHEMBL}/target/search.json?q=${encodeURIComponent(query)}&limit=1`;
  const data = await safeJson(url);
  const t = data?.targets?.[0];
  if (!t) return null;
  return {
    chemblId: t.target_chembl_id,
    name: t.pref_name ?? query,
    organism: t.organism,
  };
}

// ---------- UniProt: target function ----------

async function uniprotSearch(query: string): Promise<TargetInfo | null> {
  const url = `${UNIPROT}/uniprotkb/search?query=${encodeURIComponent(query)}+AND+reviewed:true&size=1&format=json&fields=accession,protein_name,organism_name,cc_function`;
  const data = await safeJson(url);
  const r = data?.results?.[0];
  if (!r) return null;
  const fnText = r?.comments?.find?.((c: any) => c.commentType === "FUNCTION")?.texts?.[0]?.value;
  return {
    uniprotId: r.primaryAccession,
    name: r?.proteinDescription?.recommendedName?.fullName?.value ?? query,
    organism: r?.organism?.scientificName,
    function: fnText,
    source: "uniprot",
  };
}

// ---------- ChEMBL: bioactivities for molecule × target ----------

async function chemblActivities(moleculeChemblId: string, targetChemblId: string): Promise<BioactivityRecord[]> {
  const url = `${CHEMBL}/activity.json?molecule_chembl_id=${moleculeChemblId}&target_chembl_id=${targetChemblId}&limit=25`;
  const data = await safeJson(url);
  const acts: any[] = data?.activities ?? [];
  return acts
    .filter((a) => ["IC50", "Ki", "EC50", "Kd"].includes(a.standard_type))
    .map((a) => ({
      type: a.standard_type,
      value: a.standard_value != null ? Number(a.standard_value) : null,
      units: a.standard_units,
      assayDescription: a.assay_description,
      targetChemblId: a.target_chembl_id,
      targetName: a.target_pref_name,
      documentChemblId: a.document_chembl_id,
      pchembl: a.pchembl_value != null ? Number(a.pchembl_value) : null,
    }));
}

// ---------- ChEMBL: similar ligands acting on the target ----------

async function chemblSimilarLigands(smiles: string, targetChemblId: string, similarity = 70): Promise<SimilarLigand[]> {
  // Step 1: similarity search on the molecule
  const simUrl = `${CHEMBL}/similarity/${encodeURIComponent(smiles)}/${similarity}.json?limit=25`;
  const simData = await safeJson(simUrl);
  const sims: any[] = simData?.molecules ?? [];
  if (sims.length === 0) return [];

  // Step 2: filter to those with measured activity on the target
  const ids = sims.map((m) => m.molecule_chembl_id).filter(Boolean).slice(0, 25);
  if (ids.length === 0) return [];
  const actUrl = `${CHEMBL}/activity.json?molecule_chembl_id__in=${ids.join(",")}&target_chembl_id=${targetChemblId}&limit=200`;
  const actData = await safeJson(actUrl);
  const activeIds = new Set<string>((actData?.activities ?? []).map((a: any) => a.molecule_chembl_id));

  return sims
    .filter((m) => activeIds.has(m.molecule_chembl_id))
    .slice(0, 10)
    .map((m) => ({
      chemblId: m.molecule_chembl_id,
      name: m.pref_name ?? undefined,
      smiles: m.molecule_structures?.canonical_smiles,
      similarity: Number(m.similarity ?? 0),
    }));
}

// ---------- Main entry ----------

export async function groundMoleculeTarget(moleculeQuery: string, targetQuery: string): Promise<GroundingReport> {
  const sources: string[] = [];
  const notes: string[] = [];

  // 1) Resolve molecule via PubChem (real properties)
  const isSmiles = looksLikeSMILES(moleculeQuery);
  const props =
    (isSmiles ? await fetchPubChemBySMILES(moleculeQuery) : await fetchPubChemByName(moleculeQuery)) ??
    // fallback the other way
    (isSmiles ? await fetchPubChemByName(moleculeQuery) : await fetchPubChemBySMILES(moleculeQuery));
  if (props) sources.push("PubChem");
  else notes.push("PubChem could not resolve the molecule from the input.");

  // 2) Resolve molecule in ChEMBL (for activities)
  let chemblMolId: string | null = null;
  if (isSmiles) chemblMolId = await chemblMoleculeBySmiles(moleculeQuery);
  if (!chemblMolId) chemblMolId = await chemblMoleculeByName(moleculeQuery);
  if (chemblMolId) sources.push("ChEMBL (molecule)");

  // 3) Resolve target in UniProt + ChEMBL
  const [uniprot, chemblTarget] = await Promise.all([uniprotSearch(targetQuery), chemblTargetSearch(targetQuery)]);
  if (uniprot) sources.push("UniProt");
  if (chemblTarget) sources.push("ChEMBL (target)");

  const target: TargetInfo = uniprot
    ? { ...uniprot, chemblTargetId: chemblTarget?.chemblId }
    : chemblTarget
      ? { name: chemblTarget.name, organism: chemblTarget.organism, chemblTargetId: chemblTarget.chemblId, source: "chembl" }
      : { name: targetQuery, source: "input" };

  // 4) Bioactivities
  let evidence: BioactivityRecord[] = [];
  if (chemblMolId && chemblTarget?.chemblId) {
    evidence = await chemblActivities(chemblMolId, chemblTarget.chemblId);
    if (evidence.length > 0) sources.push("ChEMBL bioactivities (BindingDB-aggregated)");
  } else {
    notes.push("Could not query ChEMBL activities — molecule and/or target ChEMBL IDs unresolved.");
  }

  // 5) Similar ligands for this target
  let similar: SimilarLigand[] = [];
  if (isSmiles && chemblTarget?.chemblId) {
    similar = await chemblSimilarLigands(moleculeQuery, chemblTarget.chemblId);
  }

  // 6) Decide confidence + status (no inference from structure alone)
  const known = evidence.length > 0;
  let status: GroundingStatus = "UNGROUNDED";
  let confidence: Confidence = "Low";

  if (known) {
    status = "GROUNDED";
    confidence = evidence.length >= 3 ? "High" : "Medium";
  } else if (similar.length > 0) {
    status = "PARTIALLY GROUNDED";
    confidence = "Medium";
    notes.push(
      "No direct experimental record for this molecule–target pair. Indirect evidence: structurally similar ligands have measured activity on the target.",
    );
  } else {
    notes.push("No known validated interaction. Do NOT infer binding from structure alone.");
  }

  return {
    molecule: {
      query: moleculeQuery,
      resolvedAs: isSmiles ? "smiles" : "name",
      pubchemCid: props?.cid,
      chemblId: chemblMolId ?? undefined,
      properties: props ?? undefined,
    },
    target,
    knownInteraction: known,
    experimentalEvidence: evidence,
    similarLigands: similar,
    confidence,
    status,
    notes,
    sources: Array.from(new Set(sources)),
  };
}
