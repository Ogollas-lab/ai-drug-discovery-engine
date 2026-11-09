import { afterEach, describe, expect, it, vi } from "vitest";
import { exportPredictionPDF } from "@/lib/export-predictions";
import type { PredictionOutput } from "@/lib/drug-prediction";

const samplePrediction: PredictionOutput = {
  overallScore: 70,
  efficacyScore: 72,
  safetyScore: 68,
  confidence: 80,
  verdict: "Moderate",
  featureContributions: [{ feature: "MW", value: 300, weight: 0.2, impact: "positive", description: "within range" }],
  modelMetrics: { accuracy: 0.8, precision: 0.8, recall: 0.8, f1Score: 0.8, auc: 0.8, dataPoints: 100 },
  riskFlags: [],
  recommendations: ["Review molecule"],
};

describe("prediction report export", () => {
  afterEach(() => vi.restoreAllMocks());

  it("escapes molecule names before embedding them in the printable HTML", async () => {
    let captured: Blob | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        captured = blob;
        return "blob:test-report";
      },
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(window, "open").mockReturnValue(null);

    exportPredictionPDF(`</strong><img src=x onerror=alert(1)>`, samplePrediction);

    const html = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(captured!);
    });
    expect(html).toContain("&lt;/strong&gt;&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("</strong><img src=x onerror=alert(1)>");
  });
});