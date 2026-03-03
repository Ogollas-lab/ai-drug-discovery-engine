import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Plus, Play, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";

interface Session {
  id: string;
  name: string;
  date: string;
  scenario: string;
  students: number;
  status: "active" | "completed" | "draft";
}

const MOCK_SESSIONS: Session[] = [
  { id: "1", name: "PHA301 — NSAID Safety Lab", date: "2026-03-03", scenario: "Design a Safer NSAID", students: 24, status: "active" },
  { id: "2", name: "PHA302 — Cardiac Drug Safety", date: "2026-02-28", scenario: "Avoid QT Prolongation", students: 18, status: "completed" },
  { id: "3", name: "PHA301 — CNS Penetration", date: "2026-03-05", scenario: "Brain-Penetrant Drug", students: 0, status: "draft" },
];

const Classroom = () => {
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Classroom <span className="text-primary">Mode</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Create teaching sessions and guide students through drug discovery scenarios</p>
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" /> New Session
            </Button>
          </div>

          <div className="space-y-3">
            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel rounded-xl p-5 glow-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display font-semibold text-sm">{session.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        session.status === "active"
                          ? "bg-primary/20 text-primary"
                          : session.status === "completed"
                          ? "bg-secondary text-muted-foreground"
                          : "bg-yellow-400/10 text-yellow-400"
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono">{session.date}</span>
                      <span>Scenario: {session.scenario}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {session.students} students
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {session.status === "active" && (
                      <>
                        <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
                          <Eye className="w-3.5 h-3.5" /> Spotlight
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
                          <MessageSquare className="w-3.5 h-3.5" /> Discussion
                        </Button>
                      </>
                    )}
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5">
                      <Play className="w-3.5 h-3.5" /> {session.status === "draft" ? "Launch" : "Open"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Teaching export */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 glass-panel rounded-xl p-6 glow-border">
            <h2 className="font-display font-semibold mb-3">Exportable Teaching Packs</h2>
            <p className="text-xs text-muted-foreground mb-4">One-click export of figures, hit tables, and SAR examples for lecture slides and OSCE-style exam questions.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="text-xs border-border text-muted-foreground hover:text-foreground">Export Pipeline Diagrams</Button>
              <Button variant="outline" size="sm" className="text-xs border-border text-muted-foreground hover:text-foreground">Export Hit Tables</Button>
              <Button variant="outline" size="sm" className="text-xs border-border text-muted-foreground hover:text-foreground">Generate Quiz Questions</Button>
            </div>
          </motion.div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Classroom;
