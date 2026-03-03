import { motion } from "framer-motion";
import { Target, BarChart3, Shield, Stethoscope, GraduationCap, Users } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Target, title: "Virtual Screening", desc: "Screen and rank compounds by predicted binding affinity using graph neural networks.", link: "/screening" },
  { icon: Shield, title: "ADMET & Lipinski", desc: "Evaluate drug-likeness, solubility, permeability, and toxicity flags in one click.", link: "/workspace" },
  { icon: BarChart3, title: "Multi-Target Profiling", desc: "Predict binding across off-targets like hERG and CYP enzymes to catch safety risks early.", link: "/workspace" },
  { icon: Stethoscope, title: "Mechanism & Pathway View", desc: "Browse protein targets with clinical context — mechanism of action, existing drugs, and indications.", link: "/workspace" },
  { icon: GraduationCap, title: "Education Mode", desc: "Guided virtual lab with clinical case scenarios, concept tooltips, and step-by-step walkthroughs.", link: "/education" },
  { icon: Users, title: "Classroom Tools", desc: "Create teaching sessions, spotlight student results, and export figures for lectures.", link: "/classroom" },
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
              className="glass-panel rounded-xl p-6 glow-border hover:border-primary/30 transition-all duration-500 group cursor-pointer"
            >
              <Link to={f.link} className="block">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <span className="text-xs text-primary font-mono mt-3 inline-block opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
