import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, AlertTriangle, Database, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";

const benchmarkTasks = [
  {
    task: "Kinase Hit Finding",
    dataset: "ChEMBL Kinase Subset",
    model: "GAT",
    metric: "Enrichment Factor @1%",
    score: "12.4",
    notes: "Evaluated on 50 kinase targets. EF@1% indicates how many true hits appear in top 1% of ranked compounds vs random.",
  },
  {
    task: "Solubility Prediction",
    dataset: "ESOL (1,128 compounds)",
    model: "GCN",
    metric: "RMSE",
    score: "0.78",
    notes: "Root Mean Square Error in log solubility units. Lower is better. State-of-art is ~0.5.",
  },
  {
    task: "Solubility Prediction",
    dataset: "ESOL",
    model: "GAT",
    metric: "RMSE",
    score: "0.71",
    notes: "Attention mechanism improves accuracy by ~9% over basic GCN on this dataset.",
  },
  {
    task: "HIV Activity Classification",
    dataset: "MoleculeNet HIV",
    model: "GAT",
    metric: "AUC-ROC",
    score: "0.89",
    notes: "Area Under ROC Curve for active/inactive classification. 1.0 = perfect, 0.5 = random.",
  },
  {
    task: "Binding Affinity Regression",
    dataset: "PDBbind v2020",
    model: "GCN",
    metric: "Pearson r",
    score: "0.72",
    notes: "Correlation between predicted and experimental binding free energies. Competitive with published methods.",
  },
  {
    task: "Off-Target Risk (hERG)",
    dataset: "ChEMBL hERG",
    model: "GAT",
    metric: "AUC-ROC",
    score: "0.84",
    notes: "Predicting hERG channel blockade. Critical for cardiac safety assessment early in drug development.",
  },
  {
    task: "ADMET Classification",
    dataset: "TDC Benchmark",
    model: "GAT",
    metric: "Balanced Accuracy",
    score: "0.79",
    notes: "Multi-task prediction across 5 ADMET endpoints: CYP3A4, CYP2D6, BBB, Pgp, hERG.",
  },
];

const overviewCards = [
  { label: "Docking Correlation", value: "r = 0.72", desc: "How well our predicted binding scores match experimental measurements from X-ray crystallography studies.", icon: TrendingUp },
  { label: "Screening Enrichment", value: "EF = 12.4×", desc: "Our model finds 12.4 times more real hits in the top 1% of ranked compounds compared to random selection.", icon: BarChart3 },
  { label: "ADMET Accuracy", value: "79%", desc: "Balanced accuracy across absorption, distribution, metabolism, excretion, and toxicity predictions.", icon: Database },
];

const Benchmarks = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-20 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold">
              Benchmarks & <span className="text-primary">Metrics</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Performance on realistic drug discovery tasks — explained in clinical context</p>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {overviewCards.map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-xl p-5 glow-border"
            >
              <card.icon className="w-5 h-5 text-primary mb-3" />
              <div className="text-2xl font-display font-bold text-primary mb-1">{card.value}</div>
              <div className="text-xs font-display font-semibold mb-2">{card.label}</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Benchmark table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl glow-border overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Dataset</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Model</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Metric</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkTasks.map((b, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/30 hover:bg-primary/5 transition-colors group"
                  >
                    <td className="px-4 py-3 text-sm font-semibold">{b.task}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.dataset}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary">{b.model}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.metric}</td>
                    <td className="px-4 py-3 text-sm font-mono text-primary font-bold">{b.score}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Transparency */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel rounded-xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="font-display font-semibold">Transparency & Limitations</h2>
          </div>
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">Training data:</strong> Models were trained on publicly available datasets from MoleculeNet and ChEMBL. Training data may not represent the full chemical space of interest.</p>
            <p><strong className="text-foreground">Generalization:</strong> Performance may degrade on chemical scaffolds not represented in training data. Always validate predictions experimentally.</p>
            <p><strong className="text-foreground">Not a clinical tool:</strong> This platform is designed for education and research. Predictions should never be used as the sole basis for clinical decisions, drug prescribing, or patient care.</p>
            <p><strong className="text-foreground">Bias:</strong> Training datasets over-represent certain chemical families and therapeutic areas. Predictions for underrepresented regions of chemical space carry higher uncertainty.</p>
          </div>
        </motion.div>
      </div>
    </div>
    <FooterSection />
  </div>
);

export default Benchmarks;
