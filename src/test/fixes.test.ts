import { describe, it, expect } from "vitest";

describe("analyze-molecule unified entry", () => {
  it("exports analyzeMoleculeUnified", async () => {
    const mod = await import("@/lib/analyze-molecule");
    expect(mod.analyzeMoleculeUnified).toBeTypeOf("function");
    expect(mod.engineAnalysisToMoleculeResult).toBeTypeOf("function");
  });
});

describe("DemoBanner", () => {
  it("exports demo banner component", async () => {
    const mod = await import("@/components/DemoBanner");
    expect(mod.default).toBeTypeOf("function");
  });
});

describe("BrandLogo", () => {
  it("exports brand logo component", async () => {
    const mod = await import("@/components/BrandLogo");
    expect(mod.default).toBeTypeOf("function");
  });
});
