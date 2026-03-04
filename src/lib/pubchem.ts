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
  logp: number;
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
    if (!response.ok) return null;

    const data = await response.json();
    const props = data?.PropertyTable?.Properties?.[0];
    if (!props) return null;

    return {
      cid: props.CID ?? 0,
      name: props.IUPACName ?? "Unknown",
      formula: props.MolecularFormula ?? "",
      mw: props.MolecularWeight ?? 0,
      logp: props.XLogP ?? 0,
      hDonors: props.HBondDonorCount ?? 0,
      hAcceptors: props.HBondAcceptorCount ?? 0,
      rotBonds: props.RotatableBondCount ?? 0,
      tpsa: props.TPSA ?? 0,
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

    // Return the shortest, most recognizable name (usually first)
    return synonyms[0];
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
