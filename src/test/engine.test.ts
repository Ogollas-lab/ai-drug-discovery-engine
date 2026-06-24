import { describe, it, expect } from "vitest";

describe("engine-api types", () => {
  it("exports engine client module", async () => {
    const mod = await import("@/lib/engine-api");
    expect(mod.analyzeMoleculeEngine).toBeTypeOf("function");
    expect(mod.startEngineRun).toBeTypeOf("function");
    expect(mod.subscribeRunEvents).toBeTypeOf("function");
  });
});

describe("honest labeling", () => {
  it("gat-predictor declares heuristic stand-in", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/lib/gat-predictor.ts", "utf8");
    expect(content).toContain("heuristic stand-in");
  });
});
