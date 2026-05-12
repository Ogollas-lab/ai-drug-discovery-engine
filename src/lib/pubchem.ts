import { classifyMoleculeInput, normalizeSMILES, isPubChemCID } from "./smiles-validation";

const BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

export interface PubChemProperties {
  MolecularWeight: number;
  XLogP: number | null;
  HBondDonorCount: number;
  HBondAcceptorCount: number;
  RotatableBondCount: number;
  TPSA: number;
  MolecularFormula: string;
  IUPACName?: string;
  CID?: number;
}

export interface PubChemResult {
  cid: number;
  name: string;
  formula: string;
  mw: number;
  logp: number | null;  // null when PubChem has no XLogP value for this compound
  hDonors: number;
  hAcceptors: number;
  rotBonds: number;
  tpsa: number;
}

/**
 * Fetch real molecular properties from PubChem PUG REST API.
 * PubChem supports CORS, so this works from the browser.
 */
export async function fetchPubChemBySMILES(smiles: string): Promise<PubChemResult | null> {
  try {
    const encoded = encodeURIComponent(smiles);
    const propsUrl = `${BASE}/compound/smiles/${encoded}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,MolecularFormula,IUPACName/JSON`;

    const response = await fetch(propsUrl);
    if (!response.ok) {
      console.warn(`PubChem lookup failed for SMILES: ${smiles.substring(0, 50)}... (HTTP ${response.status})`);
      return null;
    }

    const data = await response.json();
    const props = data?.PropertyTable?.Properties?.[0];
    
    // CRITICAL: PubChem returns 200 but empty properties for unrecognized structures
    if (!props) {
      console.warn(`PubChem returned no properties for SMILES: ${smiles.substring(0, 50)}...`);
      return null;
    }

    // CRITICAL: CID = 0 or undefined means PubChem didn't recognize the structure
    const cid = Number(props.CID);
    if (!cid || cid === 0) {
      console.warn(`PubChem did not recognize structure (CID=0): ${smiles.substring(0, 50)}...`);
      return null;
    }

    // CRITICAL: Validate that essential descriptors are present and finite
    const mw = Number(props.MolecularWeight);
    const tpsa = Number(props.TPSA);
    
    if (!mw || mw <= 0 || !isFinite(mw)) {
      console.error(`Invalid MW from PubChem for CID ${cid}: ${mw}`);
      return null;
    }
    
    if (tpsa == null || tpsa < 0 || !isFinite(tpsa)) {
      console.error(`Invalid TPSA from PubChem for CID ${cid}: ${tpsa}`);
      return null;
    }

    // XLogP can legitimately be null for some compounds (salts, inorganics)
    const logp = props.XLogP != null ? Number(props.XLogP) : null;
    if (logp !== null && !isFinite(logp)) {
      console.warn(`Invalid LogP from PubChem for CID ${cid}: ${logp}`);
    }

    return {
      cid,
      name: props.IUPACName ?? "Unknown",
      formula: props.MolecularFormula ?? "",
      mw,
      logp,
      hDonors: Number(props.HBondDonorCount) ?? 0,
      hAcceptors: Number(props.HBondAcceptorCount) ?? 0,
      rotBonds: Number(props.RotatableBondCount) ?? 0,
      tpsa,
    };
  } catch (error) {
    console.error(`PubChem fetch error for SMILES ${smiles.substring(0, 50)}...:`, error);
    return null;
  }
}

/**
 * Unified molecule lookup with intelligent input classification.
 * 
 * Pipeline:
 * 1. Classify input (SMILES vs name vs CID)
 * 2. If SMILES: Try PubChem SMILES lookup, fallback to direct use
 * 3. If name: Try PubChem name lookup
 * 4. If CID: Try PubChem CID lookup
 * 
 * CRITICAL: Valid SMILES should NEVER fail just because PubChem doesn't have them.
 */
export async function fetchMoleculeByInput(
  input: string
): Promise<{
  result: PubChemResult | null;
  inputType: "smiles" | "name" | "cid";
  usedFallback: boolean;
  error: string | null;
}> {
  const normalized = normalizeSMILES(input);
  
  // Check if input is a CID
  if (isPubChemCID(normalized)) {
    console.log(`[PubChem] Input detected as CID: ${normalized}`);
    const result = await fetchPubChemByCID(parseInt(normalized));
    return {
      result,
      inputType: "cid",
      usedFallback: false,
      error: result ? null : "PubChem CID not found",
    };
  }
  
  // Classify input
  const classification = classifyMoleculeInput(normalized);
  console.log(`[PubChem] Input classification:`, classification);
  
  if (classification.type === "smiles") {
    // Try PubChem SMILES lookup first
    console.log(`[PubChem] Attempting SMILES lookup: ${normalized.substring(0, 50)}...`);
    const result = await fetchPubChemBySMILES(normalized);
    
    if (result) {
      console.log(`[PubChem] SMILES found in PubChem: CID ${result.cid}`);
      return {
        result,
        inputType: "smiles",
        usedFallback: false,
        error: null,
      };
    }
    
    // CRITICAL: If PubChem doesn't have this SMILES, it's still valid!
    // Return a minimal result with the SMILES itself
    console.warn(`[PubChem] SMILES not in PubChem database, using as novel structure`);
    return {
      result: {
        cid: 0, // 0 indicates novel/unindexed structure
        name: "Novel Structure",
        formula: "Unknown",
        mw: 0, // Will need to be calculated elsewhere
        logp: null,
        hDonors: 0,
        hAcceptors: 0,
        rotBonds: 0,
        tpsa: 0,
      },
      inputType: "smiles",
      usedFallback: true,
      error: "Structure not in PubChem database (novel/generated compound). Descriptors unavailable.",
    };
  }
  
  // Input is a name
  console.log(`[PubChem] Attempting name lookup: ${normalized}`);
  const result = await fetchPubChemByName(normalized);
  
  if (result) {
    console.log(`[PubChem] Name found in PubChem: CID ${result.cid}`);
    return {
      result,
      inputType: "name",
      usedFallback: false,
      error: null,
    };
  }
  
  // Name not found
  console.error(`[PubChem] Name not found: ${normalized}`);
  return {
    result: null,
    inputType: "name",
    usedFallback: false,
    error: `Molecule name "${normalized}" not found in PubChem database`,
  };
}

/**
 * Fetch molecular properties from PubChem by CID.
 */
export async function fetchPubChemByCID(cid: number): Promise<PubChemResult | null> {
  try {
    const propsUrl = `${BASE}/compound/cid/${cid}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,MolecularFormula,IUPACName/JSON`;

    const response = await fetch(propsUrl);
    if (!response.ok) {
      console.warn(`PubChem CID lookup failed: ${cid} (HTTP ${response.status})`);
      return null;
    }

    const data = await response.json();
    const props = data?.PropertyTable?.Properties?.[0];
    
    if (!props) {
      console.warn(`PubChem returned no properties for CID: ${cid}`);
      return null;
    }

    const mw = Number(props.MolecularWeight);
    const tpsa = Number(props.TPSA);
    
    if (!mw || mw <= 0 || !isFinite(mw)) {
      console.error(`Invalid MW from PubChem for CID ${cid}: ${mw}`);
      return null;
    }
    
    if (tpsa == null || tpsa < 0 || !isFinite(tpsa)) {
      console.error(`Invalid TPSA from PubChem for CID ${cid}: ${tpsa}`);
      return null;
    }

    const logp = props.XLogP != null ? Number(props.XLogP) : null;
    if (logp !== null && !isFinite(logp)) {
      console.warn(`Invalid LogP from PubChem for CID ${cid}: ${logp}`);
    }

    return {
      cid,
      name: props.IUPACName ?? "Unknown",
      formula: props.MolecularFormula ?? "",
      mw,
      logp,
      hDonors: Number(props.HBondDonorCount) ?? 0,
      hAcceptors: Number(props.HBondAcceptorCount) ?? 0,
      rotBonds: Number(props.RotatableBondCount) ?? 0,
      tpsa,
    };
  } catch (error) {
    console.error(`PubChem CID fetch error for ${cid}:`, error);
    return null;
  }
}

/**
 * Fetch real molecular properties from PubChem by common Name/Formula (e.g., Aspirin, H2O).
 */
export async function fetchPubChemByName(name: string): Promise<PubChemResult | null> {
  try {
    const encoded = encodeURIComponent(name);
    const propsUrl = `${BASE}/compound/name/${encoded}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,MolecularFormula,IUPACName/JSON`;

    const response = await fetch(propsUrl);
    if (!response.ok) return null;

    const data = await response.json();
    const props = data?.PropertyTable?.Properties?.[0];
    if (!props) return null;

    return {
      cid: Number(props.CID) || 0,
      name: props.IUPACName ?? name,
      formula: props.MolecularFormula ?? "",
      mw: Number(props.MolecularWeight) || 0,
      logp: props.XLogP != null ? Number(props.XLogP) : null,
      hDonors: Number(props.HBondDonorCount) || 0,
      hAcceptors: Number(props.HBondAcceptorCount) || 0,
      rotBonds: Number(props.RotatableBondCount) || 0,
      tpsa: Number(props.TPSA) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a friendlier compound name from PubChem synonyms.
 */
export async function fetchPubChemName(smiles: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(smiles);
    const url = `${BASE}/compound/smiles/${encoded}/synonyms/JSON`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const synonyms = data?.InformationList?.Information?.[0]?.Synonym;
    if (!synonyms || synonyms.length === 0) return null;

    // Prefer the shortest synonym that isn't a CAS number, InChI, or SMILES string.
    // CAS numbers look like "50-78-2", InChI starts with "InChI=", SMILES contain = or ( etc.
    const preferred = synonyms.find((s: string) =>
      s.length <= 50 &&
      !/^\d+-\d+-\d+$/.test(s) &&       // not a CAS number
      !s.startsWith("InChI") &&
      !s.startsWith("DTXSID") &&
      !/[=\(\)\[\]#@\/\\]/.test(s) &&   // not a SMILES string
      !/^\d/.test(s)                      // doesn't start with a digit
    );
    return preferred ?? synonyms[0];
  } catch {
    return null;
  }
}

/**
 * Fetch compound description/summary from PubChem.
 */
export async function fetchPubChemDescription(cid: number): Promise<string | null> {
  try {
    const url = `${BASE}/compound/cid/${cid}/description/JSON`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const descriptions = data?.InformationList?.Information;
    if (!descriptions) return null;

    // Find a meaningful description (skip the title ones)
    const desc = descriptions.find((d: any) => d.Description && d.Description.length > 50);
    return desc?.Description ?? null;
  } catch {
    return null;
  }
}

/**
 * Full compound lookup: properties + name + description
 */
export async function fetchFullCompound(smiles: string): Promise<{
  properties: PubChemResult;
  commonName: string;
  description: string | null;
} | null> {
  const properties = await fetchPubChemBySMILES(smiles);
  if (!properties) return null;

  const [commonName, description] = await Promise.all([
    fetchPubChemName(smiles),
    properties.cid ? fetchPubChemDescription(properties.cid) : Promise.resolve(null),
  ]);

  return {
    properties,
    commonName: commonName ?? properties.name,
    description,
  };
}
