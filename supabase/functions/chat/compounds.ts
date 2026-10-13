import { createClient } from "npm:@supabase/supabase-js@2";

export interface Compound {
  name: string;
  synonyms: string[];
  pubchem_cid: number | null;
  smiles: string;
  molecular_formula: string | null;
  molecular_weight: number | null;
  xlogp: number | null;
  hbd: number | null;
  hba: number | null;
  rotatable_bonds: number | null;
  tpsa: number | null;
  drug_class: string | null;
  indication: string | null;
}

const db = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

let cache: { at: number; rows: Compound[] } | null = null;
async function allCompounds(): Promise<Compound[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  const { data } = await db().from("compounds").select("*").limit(2000);
  cache = { at: Date.now(), rows: (data ?? []) as Compound[] };
  return cache.rows;
}

/** Find every database compound mentioned in text (by name, synonym, or CID). */
export async function findCompoundsInText(text: string): Promise<Compound[]> {
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9\-\s]/g, " ")} `;
  const cids = [...text.matchAll(/\bcid\s*:?\s*(\d{2,10})\b/gi)].map((m) => Number(m[1]));
  const found: Compound[] = [];
  for (const c of await allCompounds()) {
    const names = [c.name.toLowerCase(), ...c.synonyms].filter((s) => s.length >= 4 && !/^\d/.test(s));
    if ((c.pubchem_cid && cids.includes(c.pubchem_cid)) || names.some((n) => lower.includes(` ${n} `))) {
      found.push(c);
    }
  }
  return found;
}

const PROPS = "MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,MolecularFormula,SMILES,ConnectivitySMILES";

/** Look up an unknown name/CID/SMILES on PubChem and save it to the database. */
export async function fetchAndStore(kind: "name" | "cid" | "smiles", value: string): Promise<Compound | null> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${kind}/${encodeURIComponent(value)}/property/${PROPS}/JSON`,
    );
    if (!res.ok) return null;
    const p = (await res.json())?.PropertyTable?.Properties?.[0];
    if (!p?.CID) return null;
    let synonyms: string[] = [];
    const sr = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${p.CID}/synonyms/JSON`);
    if (sr.ok) {
      synonyms = ((await sr.json())?.InformationList?.Information?.[0]?.Synonym ?? [])
        .slice(0, 8).map((s: string) => s.toLowerCase()).filter((s: string) => s.length < 40);
    }
    const row: Compound = {
      name: kind === "name" ? value.charAt(0).toUpperCase() + value.slice(1) : synonyms[0] ?? `CID ${p.CID}`,
      synonyms,
      pubchem_cid: p.CID,
      smiles: p.SMILES ?? p.ConnectivitySMILES ?? value,
      molecular_formula: p.MolecularFormula ?? null,
      molecular_weight: p.MolecularWeight != null ? Number(p.MolecularWeight) : null,
      xlogp: p.XLogP ?? null,
      hbd: p.HBondDonorCount ?? null,
      hba: p.HBondAcceptorCount ?? null,
      rotatable_bonds: p.RotatableBondCount ?? null,
      tpsa: p.TPSA ?? null,
      drug_class: null,
      indication: null,
    };
    await db().from("compounds").upsert({ ...row, source: "pubchem-on-demand" }, { onConflict: "pubchem_cid" });
    cache = null;
    return row;
  } catch {
    return null;
  }
}

export function lipinski(c: Compound) {
  const v: string[] = [];
  if ((c.molecular_weight ?? 0) > 500) v.push("MW>500");
  if ((c.xlogp ?? 0) > 5) v.push("logP>5");
  if ((c.hbd ?? 0) > 5) v.push("HBD>5");
  if ((c.hba ?? 0) > 10) v.push("HBA>10");
  return v.length === 0 ? "PASS" : `${v.length} violation(s): ${v.join(", ")}`;
}

export function describe(c: Compound) {
  return `- ${c.name} (CID ${c.pubchem_cid}${c.drug_class ? `, ${c.drug_class}` : ""}${c.indication ? `, used for ${c.indication}` : ""}): ` +
    `formula ${c.molecular_formula}, MW ${c.molecular_weight} Da, XLogP ${c.xlogp}, HBD ${c.hbd}, HBA ${c.hba}, ` +
    `rotatable bonds ${c.rotatable_bonds}, TPSA ${c.tpsa}, Lipinski ${lipinski(c)}, SMILES ${c.smiles}`;
}
