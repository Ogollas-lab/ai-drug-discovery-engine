/**
 * Classroom Mode compound pool for PubChem-backed student simulations.
 *
 * Every SMILES here must resolve on PubChem's `/compound/smiles/...` endpoint.
 * Hand-written SMILES often return HTTP 200 with CID=0 (PubChem can't
 * standardize them), so entries below use PubChem canonical/isomeric forms
 * verified by round-trip lookup.
 */
export const COMPOUND_POOL: { smiles: string; scenarioTags: string[] }[] = [
  // NSAIDs & analgesics
  { smiles: "CC(=O)Oc1ccccc1C(=O)O", scenarioTags: ["nsaid"] },                    // Aspirin
  { smiles: "CC(C)Cc1ccc(cc1)[C@@H](C)C(=O)O", scenarioTags: ["nsaid"] },           // Ibuprofen
  { smiles: "OC(=O)Cc1ccccc1Nc1c(Cl)cccc1Cl", scenarioTags: ["nsaid"] },            // Diclofenac
  { smiles: "Cc1ccc(cc1)S(=O)(=O)NC(=O)c1cc2ccccc2o1", scenarioTags: ["nsaid"] },   // Celecoxib-like
  { smiles: "OC(=O)c1ccccc1O", scenarioTags: ["nsaid"] },                           // Salicylic acid
  // Cardiac / hERG
  { smiles: "CCOc1ccc(cc1)C(=O)c1ccc(cc1)OCC", scenarioTags: ["qt"] },              // Amiodarone-like
  { smiles: "O=C1CN=C(c2ccccc2)c2cc(Cl)ccc2N1", scenarioTags: ["qt"] },             // Chlordiazepoxide
  { smiles: "CC(C)(C)C1=CC=C(C=C1)C(CCCN2CCC(CC2)C(C3=CC=CC=C3)(C4=CC=CC=C4)O)O", scenarioTags: ["qt"] }, // Terfenadine (hERG blocker)
  { smiles: "CC(=O)Nc1ccc(O)cc1", scenarioTags: ["qt"] },                           // Acetaminophen
  { smiles: "OC(=O)CCc1ccc(cc1)N(CCCl)CCCl", scenarioTags: ["qt"] },                // Chlorambucil
  // CNS / BBB
  { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", scenarioTags: ["cns"] },               // Caffeine
  { smiles: "c1ccc2c(c1)[nH]c1ccccc12", scenarioTags: ["cns"] },                     // Carbazole
  { smiles: "CN(C)CCCN1c2ccccc2Sc2ccc(Cl)cc21", scenarioTags: ["cns"] },            // Chlorpromazine
  { smiles: "CNCCC(Oc1ccc(cc1)C(F)(F)F)c1ccccc1", scenarioTags: ["cns"] },          // Fluoxetine
  { smiles: "c1cc(ccc1C(=O)CCCN1CCC(CC1)(c1ccc(F)cc1)O)F", scenarioTags: ["cns"] }, // Haloperidol
  // Antibiotics
  { smiles: "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O", scenarioTags: ["antibiotic"] }, // Penicillin G
  { smiles: "Nc1ccc(cc1)S(=O)(=O)Nc1ccccn1", scenarioTags: ["antibiotic"] },         // Sulfapyridine
  { smiles: "OC(=O)c1cn(C2CC2)c2cc(N3CCNCC3)c(F)cc2c1=O", scenarioTags: ["antibiotic"] }, // Ciprofloxacin
  { smiles: "ClC(Cl)(Cl)C(c1ccc(Cl)cc1)c1ccc(Cl)cc1", scenarioTags: ["antibiotic"] }, // DDT (toxic control)
  { smiles: "CC1(C)S[C@@H]2[C@H](NC(=O)[C@@H](N)c3ccc(O)cc3)C(=O)N2[C@@H]1C(=O)O", scenarioTags: ["antibiotic"] }, // Amoxicillin
];

/**
 * Select the candidate compounds for a scenario, excluding structures that
 * already failed to resolve on PubChem this session.
 *
 * Rule: a failed compound must be skipped, never retried on the next cycle —
 * otherwise one unresolvable SMILES stalls the whole simulation. When every
 * candidate has failed once, the exclusion set resets so the simulation can
 * make a fresh round of attempts instead of stalling forever.
 */
export function pickScenarioCompound(
  pool: { smiles: string; scenarioTags: string[] }[],
  scenarioId: string,
  failed: Set<string>
): { candidates: { smiles: string; scenarioTags: string[] }[]; reset: boolean } {
  const candidates = pool.filter(
    c => c.scenarioTags.includes(scenarioId) && !failed.has(c.smiles)
  );
  if (candidates.length === 0 && failed.size > 0) {
    return {
      candidates: pool.filter(c => c.scenarioTags.includes(scenarioId)),
      reset: true,
    };
  }
  return { candidates, reset: false };
}
