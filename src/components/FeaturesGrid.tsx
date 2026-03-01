import { motion } from "framer-motion";
import { Target, BarChart3, ListFilter, Lightbulb, ScanEye, Sparkles } from "lucide-react";

const features = [
  { icon: Target, title: "Binding Affinity", desc: "Predict how well a drug binds to a protein target using graph neural networks." },
  { icon: BarChart3, title: "Property Analysis", desc: "Evaluate drug-likeness via Lipinski's Rule of Five with full molecular profiling." },
  { icon: ListFilter, title: "Compound Screening", desc: "Screen and rank thousands of compounds by predicted affinity score." },
  { icon: Lightbulb, title: "Explainable AI", desc: "Understand why the model makes predictions with attention-based explanations." },
  { icon: ScanEye, title: "Attention Visualization", desc: "Visualize which atoms and bonds the network focuses on for each prediction." },
  { icon: Sparkles, title: "Generative Models", desc: "Generate novel drug-like molecules using variational autoencoders." },
];

const FeaturesGrid = () => {
  return (
    <section className="py-32 px-6 relative">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-primary tracking-[0.3em] uppercase">Capabilities</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4">
            Core <span className="text-primary">Features</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-xl p-6 glow-border hover:border-primary/30 transition-all duration-500 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
