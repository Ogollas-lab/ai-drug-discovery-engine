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
import { predictForDisease, type DiseasePredictionOutput } from "@/lib/disease-prediction";
import { type DiseaseModel } from "@/data/disease-models";
import PredictionGauge from "@/components/predictions/PredictionGauge";
import FeatureWaterfall from "@/components/predictions/FeatureWaterfall";
import ModelMetricsPanel from "@/components/predictions/ModelMetricsPanel";
import RiskPanel from "@/components/predictions/RiskPanel";
import BatchRunner from "@/components/predictions/BatchRunner";
import MoleculeComparison from "@/components/predictions/MoleculeComparison";
import DiseaseSelector from "@/components/predictions/DiseaseSelector";
import DiseaseContextPanel from "@/components/predictions/DiseaseContextPanel";
import {
  Search, FlaskConical, Loader2, Sparkles, TrendingUp, Shield,
  Download, FileText, Globe, Target, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Info
} from "lucide-react";
import { exportPredictionCSV, exportPredictionPDF } from "@/lib/export-predictions";

const SAMPLE_MOLECULES = [
  { name: "Aspirin",     smiles: "CC(=O)OC1=CC=CC=C1C(=O)O" },
  { name: "Ibuprofen",   smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O" },
  { name: "Caffeine",    smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" },
  { name: "Metformin",   smiles: "CN(C)C(=N)NC(=N)N" },
  { name: "Celecoxib",   smiles: "CC1=CC=C(C=C1)C2=CC(=NN2C3=CC=C(C=C3)S(=O)(=O)N)C(F)(F)F" },
  { name: "Artemisinin", smiles: "CC1CCC2C(C(=O)OC3OC4(C)CCC1C23)OO4" },
];

// Detect if input looks like a SMILES string vs a name
function looksLikeSMILES(s: string): boolean {
  return /[=#()\[\]\\\/]/.test(s) || /[A-Z][a-z]?[0-9]/.test(s) || s.length > 30;
}

const Predictions = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [diseasePrediction, setDiseasePrediction] = useState<DiseasePredictionOutput | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseModel | null>(null);
  const [moleculeName, setMoleculeName] = useState("");
  const [showDiseaseDetail, setShowDiseaseDetail] = useState(false);
  const { toast } = useToast();

  const runPrediction = useCallback(async (nameOrSmiles: string) => {
    setLoading(true);
    setPrediction(null);
    setDiseasePrediction(null);

    try {
      // Smart lookup: try SMILES first if it looks like one, otherwise try name first
      let result = null;
      if (looksLikeSMILES(nameOrSmiles)) {
        result = await fetchPubChemBySMILES(nameOrSmiles);
        if (!result) result = await fetchPubChemByName(nameOrSmiles);
      } else {
        result = await fetchPubChemByName(nameOrSmiles);
        if (!result) result = await fetchPubChemBySMILES(nameOrSmiles);
      }

      if (!result) {
        toast({
          title: "Molecule not found",
          description: `"${nameOrSmiles}" could not be resolved in PubChem. Try a common drug name (e.g. Aspirin) or a valid SMILES string.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Use the resolved IUPAC name if available, otherwise keep what the user typed
      const resolvedName = result.name && result.name !== "Unknown" ? result.name : nameOrSmiles;
      setMoleculeName(resolvedName);

      const input: PredictionInput = { molecule: result };

      if (selectedDisease) {
        const dp = predictForDisease({ ...input, disease: selectedDisease });
        setDiseasePrediction(dp);
        setPrediction(dp);
        toast({
          title: "Disease-specific prediction complete",
          description: `${resolvedName} for ${selectedDisease.name}: ${dp.verdict} (${dp.overallScore}%)`,
        });
      } else {
        const pred = predictDrugSuccess(input);
        setPrediction(pred);
        toast({
          title: "Prediction complete",
          description: `${resolvedName}: ${pred.verdict} (${pred.overallScore}%)`,
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch molecular data from PubChem.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedDisease]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) runPrediction(query.trim());
  };

  const activePrediction = prediction;
  const verdictColor =
    activePrediction?.verdict === "High Potential" ? "text-emerald-400" :
    activePrediction?.verdict === "Fail" ? "text-destructive" :
    activePrediction?.verdict === "Moderate" ? "text-yellow-400" :
    "text-muted-foreground";

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
              {selectedDisease && (
                <Badge variant="default" className="text-xs">
                  {selectedDisease.icon} {selectedDisease.name} Model
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">
              {selectedDisease
                ? `Disease-specific prediction for ${selectedDisease.name} using ${selectedDisease.datasets.reduce((s, d) => s + d.compounds, 0).toLocaleString()} curated compounds from ${selectedDisease.region}.`
                : "Enter a molecule name or SMILES string to predict its probability of clinical success. Select a disease context for targeted African health insights."}
            </p>
          </div>

          {/* Disease selector + Search */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 mb-6">
            <Card className="border-primary/20">
              <CardContent className="pt-5 pb-4">
                <DiseaseSelector selected={selectedDisease} onSelect={(d) => {
                  setSelectedDisease(d);
                  setPrediction(null);
                  setDiseasePrediction(null);
                }} />
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="pt-5">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={selectedDisease
                        ? `Search molecule for ${selectedDisease.name} analysis...`
                        : "Enter molecule name (e.g. Aspirin) or SMILES..."}
                      className="pl-10 text-foreground"
                    />
                  </div>
                  <Button type="submit" disabled={loading || !query.trim()}>
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <FlaskConical className="h-4 w-4 mr-2" />}
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

                {/* Provenance note */}
                <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                  <Info className="h-3 w-3 shrink-0" />
                  Physicochemical properties from PubChem (experimental). Scores are rule-based predictions — not experimental assay data.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">
                {selectedDisease
                  ? `Running ${selectedDisease.name}-specific prediction model...`
                  : "Fetching PubChem data & running prediction model..."}
              </p>
            </div>
          )}

          {/* Results */}
          {activePrediction && !loading && (
            <div className="space-y-6">

              {/* Export */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportPredictionCSV(moleculeName, activePrediction)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPredictionPDF(moleculeName, activePrediction)}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Export PDF
                </Button>
              </div>

              {/* Score gauges */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PredictionGauge label="Overall Score"  value={activePrediction.overallScore}  icon={<TrendingUp className="h-4 w-4" />} color="primary" />
                <PredictionGauge label="Efficacy"       value={activePrediction.efficacyScore} icon={<FlaskConical className="h-4 w-4" />} color="accent" />
                <PredictionGauge label="Safety"         value={activePrediction.safetyScore}   icon={<Shield className="h-4 w-4" />} color="green" />
                <Card className="flex flex-col items-center justify-center p-6">
                  <Badge
                    variant={activePrediction.verdict === "High Potential" ? "default" : activePrediction.verdict === "Fail" ? "destructive" : "secondary"}
                    className="text-lg px-4 py-1.5 mb-3"
                  >
                    {activePrediction.verdict}
                  </Badge>
                  <p className="text-xs text-muted-foreground text-center">
                    Confidence: {activePrediction.confidence.toFixed(1)}%
                  </p>
                  <Progress value={activePrediction.confidence} className="mt-2 h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1 text-center truncate max-w-full px-2">
                    {moleculeName}{selectedDisease ? ` · ${selectedDisease.name}` : ""}
                  </p>
                </Card>
              </div>

              {/* ── Inline disease summary — shown immediately below gauges ── */}
              {diseasePrediction && selectedDisease && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-xl">{selectedDisease.icon}</span>
                        {selectedDisease.name} — Disease Context Summary
                        <Badge variant="outline" className="text-[10px] ml-1">{selectedDisease.region}</Badge>
                      </CardTitle>
                      <button
                        onClick={() => setShowDiseaseDetail(!showDiseaseDetail)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        {showDiseaseDetail ? <><ChevronUp className="h-3.5 w-3.5" /> Less</> : <><ChevronDown className="h-3.5 w-3.5" /> More detail</>}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* Score summary row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background/60 rounded-lg p-3 border border-border">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Overall</p>
                        <p className={`text-xl font-bold font-mono ${verdictColor}`}>{diseasePrediction.overallScore}%</p>
                        <p className="text-[10px] text-muted-foreground">{diseasePrediction.verdict}</p>
                      </div>
                      <div className="bg-background/60 rounded-lg p-3 border border-border">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Efficacy</p>
                        <p className="text-xl font-bold font-mono text-accent">{diseasePrediction.efficacyScore}%</p>
                        <p className="text-[10px] text-muted-foreground">for {selectedDisease.name}</p>
                      </div>
                      <div className="bg-background/60 rounded-lg p-3 border border-border">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Safety</p>
                        <p className="text-xl font-bold font-mono text-emerald-400">{diseasePrediction.safetyScore}%</p>
                        <p className="text-[10px] text-muted-foreground">predicted profile</p>
                      </div>
                      <div className="bg-background/60 rounded-lg p-3 border border-border">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Confidence</p>
                        <p className="text-xl font-bold font-mono text-primary">{diseasePrediction.confidence.toFixed(0)}%</p>
                        <p className="text-[10px] text-muted-foreground">model confidence</p>
                      </div>
                    </div>

                    {/* Epidemiology */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Epidemiology
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">{selectedDisease.epidemiology}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedDisease.prevalence}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Target className="h-3 w-3" /> Key Molecular Targets
                        </p>
                        <div className="space-y-1">
                          {diseasePrediction.diseaseContext.relevantTargets.slice(0, 3).map((t, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <span className="text-foreground">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Disease-specific risk flags — always visible */}
                    {diseasePrediction.diseaseContext.diseaseSpecificFlags.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-destructive" /> Disease-Specific Risk Flags
                        </p>
                        <div className="space-y-1.5">
                          {diseasePrediction.diseaseContext.diseaseSpecificFlags.map((flag, i) => {
                            const isCritical = flag.startsWith("[CRITICAL]");
                            const isWarning  = flag.startsWith("[WARNING]");
                            return (
                              <div key={i} className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-xs border ${
                                isCritical ? "bg-destructive/10 border-destructive/20 text-destructive/90" :
                                isWarning  ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-300/90" :
                                "bg-secondary border-border text-muted-foreground"
                              }`}>
                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                <span>{flag.replace(/^\[(CRITICAL|WARNING|INFO)\]\s*/, "")}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top recommendations — always visible */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        Top Recommendations for {selectedDisease.name}
                      </p>
                      <div className="space-y-1.5">
                        {diseasePrediction.recommendations.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expandable: datasets + full targets */}
                    {showDiseaseDetail && (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                            Training Datasets Referenced
                          </p>
                          <div className="space-y-1">
                            {diseasePrediction.diseaseContext.datasetsCited.map((d, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                                {d}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                            All Recommendations
                          </p>
                          <div className="space-y-1.5">
                            {diseasePrediction.recommendations.map((r, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                                <span className="text-muted-foreground">{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tabs for detailed analysis */}
              <Tabs defaultValue="features" className="w-full">
                <TabsList className={`grid w-full max-w-3xl ${diseasePrediction ? "grid-cols-6" : "grid-cols-5"}`}>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                  {diseasePrediction && <TabsTrigger value="disease">Full Disease</TabsTrigger>}
                  <TabsTrigger value="model">Model</TabsTrigger>
                  <TabsTrigger value="batch">Batch</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                </TabsList>

                <TabsContent value="features">
                  <FeatureWaterfall contributions={activePrediction.featureContributions} />
                </TabsContent>

                <TabsContent value="risks">
                  <RiskPanel riskFlags={activePrediction.riskFlags} recommendations={activePrediction.recommendations} />
                </TabsContent>

                {diseasePrediction && (
                  <TabsContent value="disease">
                    <DiseaseContextPanel result={diseasePrediction} />
                  </TabsContent>
                )}

                <TabsContent value="model">
                  <ModelMetricsPanel metrics={activePrediction.modelMetrics} />
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
          {!activePrediction && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FlaskConical className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">No prediction yet</h3>
              <p className="text-sm text-muted-foreground/70 max-w-md">
                {selectedDisease
                  ? `Type a molecule name or SMILES above and click Predict to run a ${selectedDisease.name}-specific analysis.`
                  : "Select a disease context (Malaria, TB, HIV, etc.) and search for a molecule to see disease-specific drug success predictions."}
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
