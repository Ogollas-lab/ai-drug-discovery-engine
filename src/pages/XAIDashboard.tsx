import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Search, Activity, Shield, AlertTriangle, ChevronDown,
  BarChart3, Eye, Lightbulb, TrendingUp, Atom, Info
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, Tooltip as RechartsTooltip
} from "recharts";

// --- Mock XAI Data ---

interface SHAPFeature {
  feature: string;
  shapValue: number;
  actualValue: string;
  direction: "positive" | "negative";
  category: "physicochemical" | "structural" | "pharmacokinetic" | "toxicity";
  explanation: string;
}

interface XAIPrediction {
  molecule: string;
  smiles: string;
  overallScore: number;
  confidence: number;
  verdict: string;
  reasoning: string;
  shapFeatures: SHAPFeature[];
  limeWeights: { feature: string; weight: number; }[];
  confidenceBreakdown: { aspect: string; value: number; max: number; }[];
  decisionPath: { node: string; condition: string; result: string; passed: boolean; }[];
}

const MOCK_PREDICTIONS: Record<string, XAIPrediction> = {
  aspirin: {
    molecule: "Aspirin",
    smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
    overallScore: 82,
    confidence: 91,
    verdict: "High Potential",
    reasoning: "Aspirin demonstrates favorable drug-likeness with a molecular weight of 180.16 Da (well within Lipinski limits), appropriate LogP of 1.2, and excellent oral bioavailability. Its COX-1/COX-2 inhibition mechanism is well-characterized. Low toxicity flags with decades of clinical validation support high confidence. The acetyl group enables irreversible binding to serine residue, a key pharmacological advantage.",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: 0.18, actualValue: "180.16 Da", direction: "positive", category: "physicochemical", explanation: "Optimal range for oral absorption (< 500 Da Lipinski)" },
      { feature: "LogP", shapValue: 0.14, actualValue: "1.2", direction: "positive", category: "physicochemical", explanation: "Ideal hydrophobicity for membrane permeation" },
      { feature: "H-Bond Donors", shapValue: 0.09, actualValue: "1", direction: "positive", category: "physicochemical", explanation: "Low donor count favors oral bioavailability" },
      { feature: "TPSA", shapValue: 0.11, actualValue: "63.6 Å²", direction: "positive", category: "physicochemical", explanation: "Below 140 Å² threshold for CNS penetration" },
      { feature: "Aromatic Rings", shapValue: 0.06, actualValue: "1", direction: "positive", category: "structural", explanation: "Single ring reduces metabolic liability" },
      { feature: "Rotatable Bonds", shapValue: 0.05, actualValue: "3", direction: "positive", category: "structural", explanation: "Low flexibility aids target binding" },
      { feature: "CYP2D6 Inhibition", shapValue: -0.03, actualValue: "Low risk", direction: "negative", category: "pharmacokinetic", explanation: "Minimal drug-drug interaction potential" },
      { feature: "hERG Liability", shapValue: -0.02, actualValue: "Negative", direction: "negative", category: "toxicity", explanation: "No cardiac ion channel risk detected" },
      { feature: "Ames Mutagenicity", shapValue: -0.04, actualValue: "Negative", direction: "negative", category: "toxicity", explanation: "No genotoxicity signal from structural alerts" },
      { feature: "GI Irritation", shapValue: -0.08, actualValue: "Moderate", direction: "negative", category: "toxicity", explanation: "COX-1 inhibition may cause gastric effects" },
    ],
    limeWeights: [
      { feature: "MW < 500", weight: 0.22 },
      { feature: "LogP ∈ [0,5]", weight: 0.19 },
      { feature: "HBD ≤ 5", weight: 0.15 },
      { feature: "TPSA < 140", weight: 0.14 },
      { feature: "No PAINS alerts", weight: 0.12 },
      { feature: "Ro5 compliant", weight: 0.10 },
      { feature: "Low CYP risk", weight: 0.05 },
      { feature: "Ames negative", weight: 0.03 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 95, max: 100 },
      { aspect: "Model Certainty", value: 88, max: 100 },
      { aspect: "Feature Coverage", value: 92, max: 100 },
      { aspect: "External Validation", value: 90, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No pan-assay interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Ames neg, hERG neg, LD50 > threshold", result: "PASS (caution: GI)", passed: true },
      { node: "ADMET Profile", condition: "Bioavailability > 30%, CL < 20 mL/min/kg", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "Predicted IC50 < 1 µM", result: "PASS", passed: true },
    ],
  },
  caffeine: {
    molecule: "Caffeine",
    smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
    overallScore: 61,
    confidence: 78,
    verdict: "Moderate",
    reasoning: "Caffeine has a well-known adenosine A2A receptor antagonist profile. Its moderate drug-likeness score reflects acceptable physicochemical properties but limited selectivity and a narrow therapeutic window. The xanthine scaffold passes basic filters, but CNS effects and cardiovascular stimulation reduce its overall therapeutic index for novel drug development.",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: 0.12, actualValue: "194.19 Da", direction: "positive", category: "physicochemical", explanation: "Within oral drug range" },
      { feature: "LogP", shapValue: -0.04, actualValue: "-0.07", direction: "negative", category: "physicochemical", explanation: "Very hydrophilic, may limit membrane permeation" },
      { feature: "H-Bond Acceptors", shapValue: 0.06, actualValue: "6", direction: "positive", category: "physicochemical", explanation: "Within acceptable Lipinski range" },
      { feature: "TPSA", shapValue: -0.05, actualValue: "58.4 Å²", direction: "negative", category: "physicochemical", explanation: "Low TPSA suggests high CNS penetration (risk)" },
      { feature: "N-Methyl Groups", shapValue: -0.07, actualValue: "3", direction: "negative", category: "structural", explanation: "Multiple N-methyls increase metabolic burden" },
      { feature: "Selectivity", shapValue: -0.11, actualValue: "Low", direction: "negative", category: "pharmacokinetic", explanation: "Broad receptor binding reduces specificity" },
      { feature: "Half-life", shapValue: 0.04, actualValue: "5h", direction: "positive", category: "pharmacokinetic", explanation: "Moderate duration of action" },
      { feature: "Cardiac Risk", shapValue: -0.09, actualValue: "Moderate", direction: "negative", category: "toxicity", explanation: "Tachycardia at high doses" },
    ],
    limeWeights: [
      { feature: "MW < 500", weight: 0.20 },
      { feature: "LogP ∈ [0,5]", weight: -0.08 },
      { feature: "HBA ≤ 10", weight: 0.12 },
      { feature: "TPSA < 140", weight: 0.10 },
      { feature: "Low selectivity", weight: -0.15 },
      { feature: "CNS penetrant", weight: -0.06 },
      { feature: "Cardiac flag", weight: -0.12 },
      { feature: "Ro5 compliant", weight: 0.09 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 85, max: 100 },
      { aspect: "Model Certainty", value: 72, max: 100 },
      { aspect: "Feature Coverage", value: 80, max: 100 },
      { aspect: "External Validation", value: 75, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Cardiac safety profile", result: "CAUTION", passed: false },
      { node: "ADMET Profile", condition: "Bioavailability, clearance metrics", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "Predicted activity < threshold", result: "MARGINAL", passed: false },
    ],
  },
};

const AVAILABLE_MOLECULES = ["aspirin", "caffeine"];

// --- Components ---

const SHAPWaterfall = ({ features }: { features: SHAPFeature[] }) => {
  const sorted = [...features].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
  const data = sorted.map(f => ({
    name: f.feature,
    value: Math.round(f.shapValue * 100),
    actual: f.actualValue,
    explanation: f.explanation,
    category: f.category,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          SHAP Feature Importance
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          SHapley Additive exPlanations — each bar shows the marginal contribution of a feature to the prediction
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 130, right: 30, top: 5, bottom: 5 }}>
              <XAxis
                type="number"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
              />
              <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} width={120} />
              <RechartsTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(_: any, __: string, entry: any) => [
                  `${entry.payload.explanation}`,
                  `Value: ${entry.payload.actual}`
                ]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.value >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2 justify-center text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Increases score
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive" /> Decreases score
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const LIMEWeights = ({ weights }: { weights: { feature: string; weight: number }[] }) => {
  const sorted = [...weights].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          LIME Local Interpretability
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Local Interpretable Model-agnostic Explanations — feature weights from a local linear surrogate model
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((w, i) => (
          <motion.div
            key={w.feature}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <span className="text-[10px] font-mono w-28 truncate text-muted-foreground">{w.feature}</span>
            <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.abs(w.weight) * 100}%` }}
                transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                className={`h-full rounded-full ${w.weight >= 0 ? 'bg-primary/70' : 'bg-destructive/70'}`}
              />
            </div>
            <span className={`text-[10px] font-mono w-12 text-right ${w.weight >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {w.weight >= 0 ? '+' : ''}{(w.weight * 100).toFixed(0)}%
            </span>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};

const ConfidencePanel = ({ breakdown, overall }: { breakdown: { aspect: string; value: number; max: number }[]; overall: number }) => {
  const radarData = breakdown.map(b => ({ subject: b.aspect, value: b.value, fullMark: b.max }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Confidence Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Radar */}
          <div className="h-[200px] w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Confidence" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bars */}
          <div className="flex-1 space-y-3">
            {breakdown.map((b, i) => (
              <div key={b.aspect} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{b.aspect}</span>
                  <span className="font-mono text-foreground">{b.value}%</span>
                </div>
                <Progress value={b.value} className="h-1.5" />
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Overall Confidence</span>
              <Badge variant={overall >= 85 ? "default" : overall >= 70 ? "secondary" : "destructive"} className="font-mono">
                {overall}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DecisionPathway = ({ path }: { path: XAIPrediction["decisionPath"] }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Decision Pathway
      </CardTitle>
      <p className="text-[10px] text-muted-foreground">Step-by-step model reasoning trace</p>
    </CardHeader>
    <CardContent>
      <div className="space-y-0">
        {path.map((step, i) => (
          <motion.div
            key={step.node}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            {i < path.length - 1 && (
              <div className={`absolute left-[11px] top-[28px] w-px h-[calc(100%-4px)] ${step.passed ? 'bg-primary/30' : 'bg-destructive/30'}`} />
            )}
            <div className="flex items-start gap-3 py-2.5">
              <div className={`w-[23px] h-[23px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                step.passed ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'
              }`}>
                <span className="text-[8px] font-mono font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{step.node}</span>
                  <Badge variant={step.passed ? "default" : "destructive"} className="text-[8px] h-4 px-1.5">
                    {step.result}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.condition}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const FeatureHeatmap = ({ features }: { features: SHAPFeature[] }) => {
  const categories = ["physicochemical", "structural", "pharmacokinetic", "toxicity"] as const;
  const categoryLabels: Record<string, string> = {
    physicochemical: "Physicochemical",
    structural: "Structural",
    pharmacokinetic: "Pharmacokinetic",
    toxicity: "Toxicity",
  };
  const categoryColors: Record<string, string> = {
    physicochemical: "bg-primary",
    structural: "bg-accent",
    pharmacokinetic: "hsl(45, 80%, 50%)",
    toxicity: "bg-destructive",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          Feature Category Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => {
            const catFeatures = features.filter(f => f.category === cat);
            const avgImpact = catFeatures.length > 0
              ? catFeatures.reduce((s, f) => s + f.shapValue, 0) / catFeatures.length
              : 0;
            const intensity = Math.min(Math.abs(avgImpact) * 500, 100);

            return (
              <TooltipProvider key={cat}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-3 rounded-lg border border-border/50 cursor-pointer transition-colors hover:border-primary/30"
                      style={{
                        background: avgImpact >= 0
                          ? `hsla(160, 100%, 45%, ${intensity / 100 * 0.2})`
                          : `hsla(0, 72%, 51%, ${intensity / 100 * 0.2})`,
                      }}
                    >
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        {categoryLabels[cat]}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-bold ${avgImpact >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {avgImpact >= 0 ? '+' : ''}{(avgImpact * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">{catFeatures.length} features</div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <div className="space-y-1">
                      {catFeatures.map(f => (
                        <div key={f.feature} className="flex items-center justify-between text-[10px]">
                          <span>{f.feature}</span>
                          <span className={f.shapValue >= 0 ? 'text-primary' : 'text-destructive'}>
                            {f.shapValue >= 0 ? '+' : ''}{(f.shapValue * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Dashboard ---

const XAIDashboard = () => {
  const [query, setQuery] = useState("");
  const [selectedMolecule, setSelectedMolecule] = useState<string>("aspirin");

  const prediction = MOCK_PREDICTIONS[selectedMolecule];

  const handleSearch = () => {
    const q = query.toLowerCase().trim();
    if (AVAILABLE_MOLECULES.includes(q)) {
      setSelectedMolecule(q);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Explainable AI Dashboard</h1>
              <p className="text-xs text-muted-foreground">Transparent, interpretable predictions — SHAP & LIME analysis</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 mt-4 max-w-md">
            <Input
              placeholder="Search molecule (aspirin, caffeine)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 text-xs"
            />
            <Button size="sm" onClick={handleSearch} className="h-9 px-4">
              <Search className="w-3.5 h-3.5 mr-1.5" /> Analyze
            </Button>
          </div>

          {/* Quick select */}
          <div className="flex gap-2 mt-3">
            {AVAILABLE_MOLECULES.map(m => (
              <Button
                key={m}
                variant={selectedMolecule === m ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px] capitalize"
                onClick={() => setSelectedMolecule(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Score Overview Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
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
              <Badge variant={prediction.verdict === "High Potential" ? "default" : "secondary"} className="mt-2">
                {prediction.verdict}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Molecule</div>
              <div className="text-sm font-bold mt-1">{prediction.molecule}</div>
              <div className="text-[9px] text-muted-foreground font-mono truncate">{prediction.smiles}</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Reasoning */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                AI Scientific Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg" />
                <p className="text-xs leading-relaxed text-foreground/90 pl-3">{prediction.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for XAI methods */}
        <Tabs defaultValue="shap" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="shap" className="text-xs gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> SHAP Analysis
            </TabsTrigger>
            <TabsTrigger value="lime" className="text-xs gap-1.5">
              <Eye className="w-3.5 h-3.5" /> LIME Weights
            </TabsTrigger>
            <TabsTrigger value="confidence" className="text-xs gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Confidence
            </TabsTrigger>
            <TabsTrigger value="pathway" className="text-xs gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Decision Path
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
        </Tabs>

        {/* Methodology note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/30 border border-border/50 text-[10px] text-muted-foreground"
        >
          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
          SHAP values derived from molecular fingerprint analysis. LIME weights from local linear approximation around the prediction instance. Decision pathways trace the sequential filter cascade used in the ensemble model.
        </motion.div>
      </div>
    </div>
  );
};

export default XAIDashboard;
