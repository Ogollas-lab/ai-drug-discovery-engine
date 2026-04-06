import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { fetchPubChemByName, fetchPubChemBySMILES } from "@/lib/pubchem";
import { predictDrugSuccess, type PredictionInput, type PredictionOutput } from "@/lib/drug-prediction";
import PredictionGauge from "@/components/predictions/PredictionGauge";
import FeatureWaterfall from "@/components/predictions/FeatureWaterfall";
import ModelMetricsPanel from "@/components/predictions/ModelMetricsPanel";
import RiskPanel from "@/components/predictions/RiskPanel";
import BatchRunner from "@/components/predictions/BatchRunner";
import MoleculeComparison from "@/components/predictions/MoleculeComparison";
import { Search, FlaskConical, Loader2, Sparkles, TrendingUp, Shield, AlertTriangle, Download, FileText } from "lucide-react";
import { exportPredictionCSV, exportPredictionPDF } from "@/lib/export-predictions";

const SAMPLE_MOLECULES = [
  { name: "Aspirin", smiles: "CC(=O)OC1=CC=CC=C1C(=O)O" },
  { name: "Ibuprofen", smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O" },
  { name: "Caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" },
  { name: "Metformin", smiles: "CN(C)C(=N)NC(=N)N" },
  { name: "Celecoxib", smiles: "CC1=CC=C(C=C1)C2=CC(=NN2C3=CC=C(C=C3)S(=O)(=O)N)C(F)(F)F" },
  { name: "Erlotinib", smiles: "COCCOC1=CC2=C(C=C1OCCOC)C(=NC=N2)NC3=CC=CC(=C3)C#C" },
];

const Predictions = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [moleculeName, setMoleculeName] = useState("");
  const { toast } = useToast();

  const runPrediction = useCallback(async (nameOrSmiles: string) => {
    setLoading(true);
    setPrediction(null);
    try {
      // Try name first, then SMILES
      let result = await fetchPubChemByName(nameOrSmiles);
      if (!result) result = await fetchPubChemBySMILES(nameOrSmiles);
      if (!result) {
        toast({ title: "Not found", description: "Could not find molecule in PubChem. Try a different name or SMILES.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setMoleculeName(nameOrSmiles);
      const input: PredictionInput = { molecule: result };
      const pred = predictDrugSuccess(input);
      setPrediction(pred);
      toast({ title: "Prediction complete", description: `${nameOrSmiles}: ${pred.verdict} (${pred.overallScore}%)` });
    } catch {
      toast({ title: "Error", description: "Failed to fetch molecular data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) runPrediction(query.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-7 w-7 text-primary" />
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                AI Drug Success Predictor
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Enter a molecule name or SMILES string to predict its probability of clinical success.
              Powered by real PubChem data and Lipinski/Veber/ADMET scoring models.
            </p>
          </div>

          {/* Search */}
          <Card className="mb-6 border-primary/20">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter molecule name (e.g. Aspirin) or SMILES..."
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={loading || !query.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                  Predict
                </Button>
              </form>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Try:</span>
                {SAMPLE_MOLECULES.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => { setQuery(m.name); runPrediction(m.name); }}
                    className="px-2 py-0.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Fetching PubChem data & running prediction model...</p>
            </div>
          )}

          {/* Results */}
          {prediction && !loading && (
            <div className="space-y-6">
              {/* Export buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportPredictionCSV(moleculeName, prediction)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPredictionPDF(moleculeName, prediction)}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Export PDF
                </Button>
              </div>
              {/* Top row: 3 gauges + verdict */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PredictionGauge
                  label="Overall Score"
                  value={prediction.overallScore}
                  icon={<TrendingUp className="h-4 w-4" />}
                  color="primary"
                />
                <PredictionGauge
                  label="Efficacy"
                  value={prediction.efficacyScore}
                  icon={<FlaskConical className="h-4 w-4" />}
                  color="accent"
                />
                <PredictionGauge
                  label="Safety"
                  value={prediction.safetyScore}
                  icon={<Shield className="h-4 w-4" />}
                  color="green"
                />
                <Card className="flex flex-col items-center justify-center p-6">
                  <Badge
                    variant={prediction.verdict === "High Potential" ? "default" : prediction.verdict === "Fail" ? "destructive" : "secondary"}
                    className="text-lg px-4 py-1.5 mb-3"
                  >
                    {prediction.verdict}
                  </Badge>
                  <p className="text-xs text-muted-foreground text-center">
                    Confidence: {prediction.confidence.toFixed(1)}%
                  </p>
                  <Progress value={prediction.confidence} className="mt-2 h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Molecule: {moleculeName}
                  </p>
                </Card>
              </div>

              {/* Tabs for details */}
              <Tabs defaultValue="features" className="w-full">
                <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                  <TabsTrigger value="model">Model</TabsTrigger>
                  <TabsTrigger value="batch">Batch</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                </TabsList>

                <TabsContent value="features">
                  <FeatureWaterfall contributions={prediction.featureContributions} />
                </TabsContent>

                <TabsContent value="risks">
                  <RiskPanel
                    riskFlags={prediction.riskFlags}
                    recommendations={prediction.recommendations}
                  />
                </TabsContent>

                <TabsContent value="model">
                  <ModelMetricsPanel metrics={prediction.modelMetrics} />
                </TabsContent>

                <TabsContent value="batch">
                  <BatchRunner sampleMolecules={SAMPLE_MOLECULES} />
                </TabsContent>

                <TabsContent value="compare">
                  <MoleculeComparison sampleMolecules={SAMPLE_MOLECULES} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Empty state */}
          {!prediction && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FlaskConical className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">No prediction yet</h3>
              <p className="text-sm text-muted-foreground/70 max-w-md">
                Search for a molecule above or click a sample to see its predicted drug success probability with detailed feature analysis.
              </p>
            </div>
          )}
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Predictions;
