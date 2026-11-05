import { describe, it, expect } from "vitest";
import { COMPOUND_POOL, pickScenarioCompound } from "@/lib/classroom-compounds";

describe("pickScenarioCompound", () => {
  it("skips compounds that already failed on PubChem instead of retrying them", () => {
    const badSmiles = "Clc1ccc(c1)C(c1ccc(Cl)cc1)C(Cl)(Cl)Cl";
    const failed = new Set([badSmiles]);
    const { candidates, reset } = pickScenarioCompound(COMPOUND_POOL, "antibiotic", failed);
    expect(reset).toBe(false);
    expect(candidates).not.toHaveLength(0);
    expect(candidates.some(c => c.smiles === badSmiles)).toBe(false);
  });

  it("every pool SMILES is unique, so a skip can never hide a duplicate", () => {
    const smiles = COMPOUND_POOL.map(c => c.smiles);
    expect(new Set(smiles).size).toBe(smiles.length);
  });

  it("resets the exclusion set once every candidate has failed, so the simulation keeps running", () => {
    const pool = [
      { smiles: "AAA", scenarioTags: ["qt"] },
      { smiles: "BBB", scenarioTags: ["qt"] },
    ];
    const first = pickScenarioCompound(pool, "qt", new Set(["AAA"]));
    expect(first.candidates.map(c => c.smiles)).toEqual(["BBB"]);
    expect(first.reset).toBe(false);

    const second = pickScenarioCompound(pool, "qt", new Set(["AAA", "BBB"]));
    expect(second.reset).toBe(true);
    expect(second.candidates).toHaveLength(2);
  });

  it("returns no candidates for an unknown scenario", () => {
    const { candidates, reset } = pickScenarioCompound(COMPOUND_POOL, "nonexistent", new Set());
    expect(candidates).toHaveLength(0);
    expect(reset).toBe(false);
  });
});
