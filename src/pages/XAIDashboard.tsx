import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Search, Activity, AlertTriangle, Lightbulb, Atom, Info, FlaskConical, Sparkles
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Eye, Shield, TrendingUp, GitCompare, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { SHAPWaterfall } from "@/components/xai/SHAPWaterfall";
import { LIMEWeights } from "@/components/xai/LIMEWeights";
import { ConfidencePanel } from "@/components/xai/ConfidencePanel";
import { DecisionPathway } from "@/components/xai/DecisionPathway";
import { FeatureHeatmap } from "@/components/xai/FeatureHeatmap";
import { MoleculeComparisonPanel } from "@/components/xai/MoleculeComparisonPanel";
import { MolecularPropertiesCard } from "@/components/xai/MolecularPropertiesCard";
import { ExportButton } from "@/components/xai/ExportButton";

import {
  MOCK_PREDICTIONS, AVAILABLE_MOLECULES,
  generateCustomPrediction, validateSMILES,
  type XAIPrediction
} from "@/data/xai-molecules";

const XAIDashboard = () => {
  const [query, setQuery] = useState("");
  const [selectedMolecule, setSelectedMolecule] = useState<string>("aspirin");
  const [customPrediction, setCustomPrediction] = useState<XAIPrediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const prediction = customPrediction && selectedMolecule === "__custom__"
    ? customPrediction
    : MOCK_PREDICTIONS[selectedMolecule];

  const handleSearch = () => {
    const q = query.toLowerCase().trim();

    // Check if it's a known molecule name
    if (AVAILABLE_MOLECULES.includes(q)) {
      setSelectedMolecule(q);
      setCustomPrediction(null);
      return;
    }

    // Check by molecule name
    const byName = AVAILABLE_MOLECULES.find(
      m => MOCK_PREDICTIONS[m]?.molecule.toLowerCase() === q
    );
    if (byName) {
      setSelectedMolecule(byName);
      setCustomPrediction(null);
      return;
    }

    // Try as SMILES
    const validation = validateSMILES(query.trim());
    if (!validation.valid) {
      toast({
        title: "Invalid Input",
        description: validation.error || "Could not parse molecule. Enter a valid name or SMILES string.",
        variant: "destructive",
      });
      return;
    }

    // Check if SMILES matches a known molecule
    const bySmiles = AVAILABLE_MOLECULES.find(
      m => MOCK_PREDICTIONS[m]?.smiles === query.trim()
    );
    if (bySmiles) {
      setSelectedMolecule(bySmiles);
      setCustomPrediction(null);
      return;
    }

    // Generate custom prediction
    setIsAnalyzing(true);
    setTimeout(() => {
      const pred = generateCustomPrediction(query.trim());
      setCustomPrediction(pred);
      setSelectedMolecule("__custom__");
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: `Custom molecule analyzed: ${pred.verdict} (Score: ${pred.overallScore}%)`,
      });
    }, 1500);
  };

  if (!prediction) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold">Explainable AI Dashboard</h1>
                <p className="text-xs text-muted-foreground">Transparent, interpretable predictions — SHAP & LIME analysis</p>
              </div>
            </div>
            <ExportButton prediction={prediction} />
          </div>

          {/* Search / SMILES Input */}
          <div className="mt-4 max-w-xl">
            <div className="flex gap-2">
              <Input
                placeholder="Enter molecule name or SMILES string..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 text-xs font-mono"
              />
              <Button size="sm" onClick={handleSearch} disabled={isAnalyzing || !query.trim()} className="h-9 px-4 gap-1.5">
                {isAnalyzing ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Analyze
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Try a known drug (e.g. Ibuprofen, Metformin) or paste any SMILES string for custom analysis
            </p>
          </div>

          {/* Quick select pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {AVAILABLE_MOLECULES.map(m => (
              <Button
                key={m}
                variant={selectedMolecule === m ? "default" : "outline"}
                size="sm"
                className="h-6 text-[9px] px-2.5"
                onClick={() => { setSelectedMolecule(m); setCustomPrediction(null); }}
              >
                {MOCK_PREDICTIONS[m]?.molecule || m}
              </Button>
            ))}
            {customPrediction && (
              <Button
                variant={selectedMolecule === "__custom__" ? "default" : "outline"}
                size="sm"
                className="h-6 text-[9px] px-2.5 gap-1"
                onClick={() => setSelectedMolecule("__custom__")}
              >
                <FlaskConical className="w-3 h-3" /> Custom
              </Button>
            )}
          </div>
        </motion.div>

        {/* Analyzing spinner */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-center gap-3 py-16"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-primary"
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground font-mono">Running XAI analysis pipeline...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!isAnalyzing && prediction && (
          <>
            {/* Score Overview */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardContent className="p-4">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Overall Score</div>
                  <div className="text-2xl font-bold text-primary mt-1">{prediction.overallScore}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Confidence</div>
                  <div className="text-2xl font-bold mt-1">{prediction.confidence}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Verdict</div>
                  <Badge variant={prediction.verdictColor === "green" ? "default" : prediction.verdictColor === "yellow" ? "secondary" : "destructive"} className="mt-2">
                    {prediction.verdict}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Molecule</div>
                  <div className="text-sm font-bold mt-1">{prediction.molecule}</div>
                  <div className="text-[8px] text-muted-foreground font-mono truncate">{prediction.smiles}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Formula</div>
                  <div className="text-sm font-bold mt-1">{prediction.descriptors.molecularFormula}</div>
                  <div className="text-[8px] text-muted-foreground">{prediction.descriptors.molecularWeight} Da</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Natural Language Explanation */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="mb-6 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    AI Explanation Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg" />
                    <p className="text-xs leading-relaxed text-foreground/90 pl-3">{prediction.naturalLanguageExplanation}</p>
                  </div>
                  <details className="group">
                    <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                      <Info className="w-3 h-3" /> Detailed Scientific Reasoning
                    </summary>
                    <p className="text-[10px] text-muted-foreground mt-2 pl-4 leading-relaxed">{prediction.reasoning}</p>
                  </details>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tabs for XAI methods */}
            <Tabs defaultValue="shap" className="space-y-4">
              <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="shap" className="text-xs gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> SHAP
                </TabsTrigger>
                <TabsTrigger value="lime" className="text-xs gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> LIME
                </TabsTrigger>
                <TabsTrigger value="properties" className="text-xs gap-1.5">
                  <Atom className="w-3.5 h-3.5" /> Properties
                </TabsTrigger>
                <TabsTrigger value="confidence" className="text-xs gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Confidence
                </TabsTrigger>
                <TabsTrigger value="pathway" className="text-xs gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Decision Path
                </TabsTrigger>
                <TabsTrigger value="compare" className="text-xs gap-1.5">
                  <GitCompare className="w-3.5 h-3.5" /> Compare
                </TabsTrigger>
              </TabsList>

              <TabsContent value="shap">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <SHAPWaterfall features={prediction.shapFeatures} />
                  </div>
                  <div>
                    <FeatureHeatmap features={prediction.shapFeatures} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lime">
                <div className="max-w-2xl">
                  <LIMEWeights weights={prediction.limeWeights} />
                </div>
              </TabsContent>

              <TabsContent value="properties">
                <div className="max-w-md">
                  <MolecularPropertiesCard
                    descriptors={prediction.descriptors}
                    biologicalActivity={prediction.biologicalActivity}
                    therapeuticClass={prediction.therapeuticClass}
                  />
                </div>
              </TabsContent>

              <TabsContent value="confidence">
                <div className="max-w-3xl">
                  <ConfidencePanel breakdown={prediction.confidenceBreakdown} overall={prediction.confidence} />
                </div>
              </TabsContent>

              <TabsContent value="pathway">
                <div className="max-w-2xl">
                  <DecisionPathway path={prediction.decisionPath} />
                </div>
              </TabsContent>

              <TabsContent value="compare">
                <div className="max-w-lg">
                  <MoleculeComparisonPanel currentMolecule={selectedMolecule} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Methodology note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-start gap-2 px-4 py-3 rounded-lg bg-secondary/30 border border-border/50 text-[10px] text-muted-foreground"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                SHAP values derived from molecular fingerprint analysis. LIME weights from local linear approximation around the prediction instance.
                Decision pathways trace the sequential filter cascade. Custom molecule predictions use descriptor-based heuristics.
                All results should be experimentally validated before clinical decisions.
              </span>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default XAIDashboard;
