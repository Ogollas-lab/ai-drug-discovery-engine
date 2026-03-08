import { motion } from "framer-motion";
import { FileText, Network, Cpu, Eye, ArrowDown } from "lucide-react";

const phases = [
  {
    icon: FileText,
    phase: "Phase 1",
    title: "SMILES Processing",
    file: "featurizer.py",
    description: "Convert chemical SMILES strings into molecular graph representations using RDKit.",
    features: ["Atomic feature extraction", "Bond graph construction", "2D/3D coordinates", "Molecular properties"],
  },
  {
    icon: Network,
    phase: "Phase 2",
    title: "Neural Networks",
    file: "model.py",
    description: "Three complementary GNN architectures for binding affinity prediction and generation.",
    features: ["GCN — Fast screening", "GAT — Explainable", "VAE — Generative", "Multi-head attention"],
  },
  {
    icon: Cpu,
    phase: "Phase 3",
    title: "Training Pipeline",
    file: "train.py",
    description: "Complete training infrastructure with dataset management and performance tracking.",
    features: ["Auto dataset download", "GPU/CPU support", "Model checkpointing", "Early stopping"],
  },
  {
    icon: Eye,
    phase: "Phase 4",
    title: "Visualization",
    file: "visualize.py",
    description: "Extract and interpret model decisions with attention-based explainability.",
    features: ["Attention weights", "Atom importance", "Structure highlighting", "Batch analysis"],
  },
];

const PipelineSection = () => {
  return (
    <section className="py-20 md:py-24 px-6 relative">
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-mono text-primary tracking-[0.3em] uppercase">Architecture</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4">
            Pipeline <span className="text-primary">Overview</span>
          </h2>
        </motion.div>

        <div className="space-y-4">
          {phases.map((phase, i) => (
            <div key={i}>
              <motion.div
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel rounded-xl p-6 md:p-8 glow-border hover:border-primary/40 transition-all duration-500 group"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex items-start gap-4 md:w-1/3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <phase.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-mono text-primary/70">{phase.phase}</span>
                      <h3 className="text-xl font-display font-semibold text-foreground">{phase.title}</h3>
                      <span className="text-xs font-mono text-muted-foreground">{phase.file}</span>
                    </div>
                  </div>
                  <div className="md:w-1/3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{phase.description}</p>
                  </div>
                  <div className="md:w-1/3">
                    <div className="grid grid-cols-2 gap-2">
                      {phase.features.map((f, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs text-secondary-foreground">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
              {i < phases.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowDown className="w-4 h-4 text-primary/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PipelineSection;
