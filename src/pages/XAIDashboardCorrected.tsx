/**
 * XAI DASHBOARD — CORRECTED (Zero State Leakage)
 * 
 * CRITICAL FIXES:
 * 1. NO fallback to MOCK_PREDICTIONS
 * 2. NO shared state between analyses
 * 3. UI MUST match analysis.identityProof.moleculeId
 * 4. Complete cleanup on unmount
 * 5. Strict validation before rendering
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, Activity, AlertTriangle, Lightbulb, FlaskConical, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Eye, Shield, TrendingUp, GitCompare, Download, Atom } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { SHAPWaterfall } from "@/components/xai/SHAPWaterfall";
import { SHAPBeeswarm } from "@/components/xai/SHAPBeeswarm";
import { LIMEWeights } from "@/components/xai/LIMEWeights";
import { ConfidencePanel } from "@/components/xai/ConfidencePanel";
import { DecisionPathway } from "@/components/xai/DecisionPathway";
import { FeatureHeatmap } from "@/components/xai/FeatureHeatmap";
import { MoleculeComparisonPanel } from "@/components/xai/MoleculeComparisonPanel";
import { ExportButton } from "@/components/xai/ExportButton";

import { analyzeMoleculeStrict, cleanupAnalysis } from "@/lib/stateless-pipeline";
import { validateAnalysis, logAnalysisAudit, type MoleculeAnalysis } from "@/lib/strict-analysis";

const XAIDashboardCorrected = () => {
  // CRITICAL: Single source of truth (NO fallback to mock data)
  const [currentAnalysis, setCurrentAnalysis] = useState<MoleculeAnalysis | null>(null);
  const [query, setQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  
  // Track current molecule ID to prevent stale renders
  const currentMoleculeIdRef = useRef<string | null>(null);
  
  // CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAnalysis) {
        cleanupAnalysis(currentAnalysis);
      }
    };
  }, [currentAnalysis]);
  
  // CRITICAL: Strict analysis with NO fallback
  const handleAnalyze = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty Input",
        description: "Please enter a SMILES string",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      console.log('\n[XAI Dashboard] ========================================');
      console.log('[XAI Dashboard] Starting STRICT analysis');
      console.log(`[XAI Dashboard] Input: ${query.trim().substring(0, 50)}...`);
      console.log('[XAI Dashboard] ========================================\n');
      
      // CRITICAL: Cleanup previous analysis
      if (currentAnalysis) {
        console.log('[XAI Dashboard] Cleaning up previous analysis...');
        cleanupAnalysis(currentAnalysis);
        setCurrentAnalysis(null);
        currentMoleculeIdRef.current = null;
      }
      
      // Run STRICT analysis (NO fallback)
      const analysis = await analyzeMoleculeStrict(query.trim());
      
      if (!analysis) {
        console.error('[XAI Dashboard] Analysis failed - invalid SMILES');
        toast({
          title: "Invalid SMILES",
          description: "Could not parse molecule structure. Please check your input.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      
      // CRITICAL: Validate analysis before rendering
      console.log('[XAI Dashboard] Validating analysis...');
      const validation = validateAnalysis(analysis);
      
      if (!validation.valid) {
        console.error('[XAI Dashboard] Analysis validation FAILED');
        validation.errors.forEach(err => console.error(`[XAI Dashboard]   ${err}`));
        
        toast({
          title: "Analysis Validation Failed",
          description: validation.errors.join("; "),
          variant: "destructive",
        });
        
        cleanupAnalysis(analysis);
        setIsAnalyzing(false);
        return;
      }
      
      console.log('[XAI Dashboard] ✓ Analysis validation PASSED');
      
      // Show warnings if any
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warn => {
          toast({
            title: "Warning",
            description: warn,
            variant: "default",
          });
        });
      }
      
      // CRITICAL: Set current molecule ID
      currentMoleculeIdRef.current = analysis.identityProof.moleculeId;
      
      // Set analysis (UI will render from this ONLY)
      setCurrentAnalysis(analysis);
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis Complete",
        description: `${analysis.prediction.verdict} (Score: ${analysis.prediction.score}%)`,
      });
      
      console.log('\n[XAI Dashboard] ========================================');
      console.log('[XAI Dashboard] ✓ Analysis complete and validated');
      console.log(`[XAI Dashboard]   Molecule ID: ${analysis.identityProof.moleculeId}`);
      console.log(`[XAI Dashboard]   Score: ${analysis.prediction.score}`);
      console.log(`[XAI Dashboard]   Verdict: ${analysis.prediction.verdict}`);
      console.log('[XAI Dashboard] ========================================\n');
      
    } catch (error) {
      console.error('[XAI Dashboard] Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };
  
  // CRITICAL: Render ONLY if analysis exists and is valid
  if (!currentAnalysis) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold">Explainable AI Dashboard</h1>
                <p className="text-xs text-muted-foreground">Transparent, interpretable predictions — SHAP & LIME analysis</p>
              </div>
            </div>
            
            <div className="max-w-xl">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter SMILES string..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="h-9 text-xs font-mono"
                />
                <Button size="sm" onClick={handleAnalyze} disabled={isAnalyzing || !query.trim()} className="h-9 px-4 gap-1.5">
                  {isAnalyzing ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Analyze
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Enter any valid SMILES string for molecular analysis
              </p>
            </div>
          </motion.div>
          
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
          
          {!isAnalyzing && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Enter a SMILES string above to begin analysis</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }
  
  // CRITICAL: Verify molecule ID before rendering
  if (currentMoleculeIdRef.current !== currentAnalysis.identityProof.moleculeId) {
    console.error('[XAI Dashboard] CRITICAL: Molecule ID mismatch detected!');
    console.error(`[XAI Dashboard]   Expected: ${currentMoleculeIdRef.current}`);
    console.error(`[XAI Dashboard]   Got: ${currentAnalysis.identityProof.moleculeId}`);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Critical Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Molecule identity mismatch detected. This indicates a serious state corruption bug.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // CRITICAL: Render from currentAnalysis ONLY (no fallback)
  const analysis = currentAnalysis;
  
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
                <p className="text-xs text-muted-foreground">Molecule ID: {analysis.identityProof.moleculeId.substring(0, 16)}...</p>
              </div>
            </div>
          </div>
          
          {/* Search */}
          <div className="mt-4 max-w-xl">
            <div className="flex gap-2">
              <Input
                placeholder="Enter SMILES string..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="h-9 text-xs font-mono"
              />
              <Button size="sm" onClick={handleAnalyze} disabled={isAnalyzing || !query.trim()} className="h-9 px-4 gap-1.5">
                {isAnalyzing ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Analyze
              </Button>
            </div>
          </div>
        </motion.div>
        
        {/* Score Overview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Overall Score</div>
              <div className="text-2xl font-bold text-primary mt-1">{analysis.prediction.score}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Confidence</div>
              <div className="text-2xl font-bold mt-1">{analysis.prediction.confidence}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Verdict</div>
              <Badge variant={analysis.prediction.verdictColor === "green" ? "default" : analysis.prediction.verdictColor === "yellow" ? "secondary" : "destructive"} className="mt-2">
                {analysis.prediction.verdict}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Formula</div>
              <div className="text-sm font-bold mt-1">{analysis.rdkit.descriptors.molecularFormula}</div>
              <div className="text-[8px] text-muted-foreground">{analysis.rdkit.descriptors.molecularWeight.toFixed(2)} Da</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">PubChem</div>
              <div className="text-sm font-bold mt-1">{analysis.pubchem.status === 'found' ? `CID ${analysis.pubchem.cid}` : 'Not Found'}</div>
              <div className="text-[8px] text-muted-foreground">{analysis.pubchem.status}</div>
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
          </TabsList>
          
          <TabsContent value="shap">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">SHAP Waterfall</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.shap.features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-xs">{f.name}</span>
                        <span className={`text-xs font-mono ${f.direction === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
                          {f.shapValue > 0 ? '+' : ''}{f.shapValue.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Feature Values</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.shap.features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-xs">{f.name}</span>
                        <span className="text-xs font-mono">{f.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="lime">
            <Card className="max-w-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">LIME Weights</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.lime.weights.map((w, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-xs">{w.feature}</span>
                    <span className={`text-xs font-mono ${w.weight > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {w.weight > 0 ? '+' : ''}{w.weight.toFixed(3)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="properties">
            <Card className="max-w-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Molecular Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>MW:</span>
                  <span className="font-mono">{analysis.rdkit.descriptors.molecularWeight.toFixed(2)} Da</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>LogP:</span>
                  <span className="font-mono">{analysis.rdkit.descriptors.logP.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>HBD:</span>
                  <span className="font-mono">{analysis.rdkit.descriptors.hBondDonors}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>HBA:</span>
                  <span className="font-mono">{analysis.rdkit.descriptors.hBondAcceptors}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>TPSA:</span>
                  <span className="font-mono">{analysis.rdkit.descriptors.tpsa.toFixed(2)} Å²</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Rotatable Bonds:</span>
                  <span className="font-mono">{analysis.rdkit.descriptors.rotatableBonds}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Audit Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-start gap-2 px-4 py-3 rounded-lg bg-secondary/30 border border-border/50 text-[10px] text-muted-foreground"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div>
            <div>Request ID: {analysis.audit.requestId}</div>
            <div>Molecule ID: {analysis.identityProof.moleculeId}</div>
            <div>Pipeline Version: {analysis.audit.pipelineVersion}</div>
            <div>Feature Hash: {analysis.features.hash}</div>
            <div>SHAP Hash: {analysis.shap.hash}</div>
            <div>LIME Hash: {analysis.lime.hash}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default XAIDashboardCorrected;
