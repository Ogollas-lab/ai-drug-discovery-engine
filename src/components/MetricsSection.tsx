import { motion } from "framer-motion";

const benchmarks = [
  { dataset: "ESOL", task: "Solubility", model: "GCN", metric: "RMSE", score: "0.78" },
  { dataset: "ESOL", task: "Solubility", model: "GAT", metric: "RMSE", score: "0.71" },
  { dataset: "HIV", task: "Activity", model: "GAT", metric: "AUC", score: "0.89" },
  { dataset: "PDBbind", task: "Affinity", model: "GCN", metric: "Pearson", score: "0.72" },
];

const MetricsSection = () => {
  return (
    <section className="py-20 md:py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-mono text-primary tracking-[0.3em] uppercase">Benchmarks</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4">
            Performance <span className="text-primary">Metrics</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel rounded-2xl overflow-hidden glow-border"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Dataset", "Task", "Model", "Metric", "Score"].map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-mono text-muted-foreground tracking-wider uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="border-b border-border/50 hover:bg-primary/5 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-mono text-foreground">{row.dataset}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{row.task}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">
                      {row.model}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{row.metric}</td>
                  <td className="px-6 py-4 text-sm font-mono text-primary font-semibold">{row.score}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};

export default MetricsSection;
