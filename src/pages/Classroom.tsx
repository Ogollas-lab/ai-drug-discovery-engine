import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Plus, Play, MessageSquare, Eye, X, Send, Clock,
  Download, FileText, HelpCircle, Beaker, CheckCircle2, AlertTriangle,
  ChevronRight, Trash2, Copy, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";

/* ── Types ── */
interface StudentWork {
  id: string;
  name: string;
  molecule: string;
  smiles: string;
  mw: number;
  logP: number;
  lipinskiPass: boolean;
  submittedAt: string;
}

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  isInstructor: boolean;
}

interface Session {
  id: string;
  name: string;
  date: string;
  scenario: string;
  students: number;
  status: "active" | "completed" | "draft";
  joinCode: string;
  studentWork: StudentWork[];
  chat: ChatMessage[];
}

/* ── Scenarios ── */
const SCENARIOS = [
  { id: "nsaid", label: "Design a Safer NSAID", description: "Optimise selectivity for COX-2 while minimising GI toxicity" },
  { id: "qt", label: "Avoid QT Prolongation", description: "Modify a lead compound to reduce hERG channel liability" },
  { id: "cns", label: "Brain-Penetrant Drug", description: "Tune lipophilicity and PSA to cross the blood–brain barrier" },
  { id: "antibiotic", label: "Novel Antibiotic Scaffold", description: "Explore modifications to overcome bacterial resistance" },
];

/* ── Mock student data generator ── */
const STUDENT_NAMES = [
  "A. Patel", "B. Nguyen", "C. Johnson", "D. Kim", "E. Müller",
  "F. Santos", "G. Okafor", "H. Yamamoto", "I. Rossi", "J. Chen",
  "K. Eriksen", "L. Dubois", "M. Garcia", "N. Singh", "O. Petrov",
  "P. Ali", "Q. Thompson", "R. Nakamura", "S. Costa", "T. Lee",
  "U. Brown", "V. Schmidt", "W. Tanaka", "X. Lopez"
];

function generateStudentWork(count: number): StudentWork[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `sw-${i}`,
    name: STUDENT_NAMES[i % STUDENT_NAMES.length],
    molecule: ["Compound-A", "Compound-B", "Compound-C", "Compound-D"][i % 4],
    smiles: ["CC(=O)Oc1ccccc1C(=O)O", "CC(C)Cc1ccc(cc1)C(C)C(=O)O", "c1ccc2c(c1)cc1ccc3cccc4ccc2c1c34"][i % 3],
    mw: +(180 + Math.random() * 200).toFixed(1),
    logP: +(0.5 + Math.random() * 4).toFixed(2),
    lipinskiPass: Math.random() > 0.25,
    submittedAt: `${Math.floor(Math.random() * 12) + 1}m ago`,
  }));
}

function generateChat(): ChatMessage[] {
  return [
    { id: "c1", author: "Instructor", text: "Welcome to today's session! Start by loading your scaffold in the Workspace.", time: "10:00", isInstructor: true },
    { id: "c2", author: "A. Patel", text: "Should we focus on LogP first or TPSA?", time: "10:03", isInstructor: false },
    { id: "c3", author: "Instructor", text: "Great question — begin with LogP. We want it between 1–3 for oral bioavailability.", time: "10:04", isInstructor: true },
    { id: "c4", author: "D. Kim", text: "My modified scaffold shows MW > 500. Should I remove the benzyl group?", time: "10:07", isInstructor: false },
    { id: "c5", author: "Instructor", text: "Try replacing it with a smaller heterocycle instead. That may keep affinity while lowering MW.", time: "10:08", isInstructor: true },
  ];
}

/* ── Initial sessions ── */
const INITIAL_SESSIONS: Session[] = [
  { id: "1", name: "PHA301 — NSAID Safety Lab", date: "2026-03-03", scenario: "Design a Safer NSAID", students: 24, status: "active", joinCode: "NSAID-301", studentWork: generateStudentWork(24), chat: generateChat() },
  { id: "2", name: "PHA302 — Cardiac Drug Safety", date: "2026-02-28", scenario: "Avoid QT Prolongation", students: 18, status: "completed", joinCode: "CARD-302", studentWork: generateStudentWork(18), chat: generateChat() },
  { id: "3", name: "PHA301 — CNS Penetration", date: "2026-03-05", scenario: "Brain-Penetrant Drug", students: 0, status: "draft", joinCode: "CNS-301", studentWork: [], chat: [] },
];

/* ── Component ── */
const Classroom = () => {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [showCreate, setShowCreate] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activePanel, setActivePanel] = useState<"spotlight" | "discussion" | null>(null);

  // Create session form
  const [newName, setNewName] = useState("");
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].id);

  // Discussion
  const [chatInput, setChatInput] = useState("");

  const handleCreateSession = useCallback(() => {
    if (!newName.trim()) return;
    const scenario = SCENARIOS.find(s => s.id === selectedScenario)!;
    const session: Session = {
      id: Date.now().toString(),
      name: newName,
      date: new Date().toISOString().slice(0, 10),
      scenario: scenario.label,
      students: 0,
      status: "draft",
      joinCode: `${newName.slice(0, 4).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      studentWork: [],
      chat: [],
    };
    setSessions(prev => [session, ...prev]);
    setNewName("");
    setShowCreate(false);
  }, [newName, selectedScenario]);

  const handleLaunch = useCallback((id: string) => {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, status: "active" as const, students: Math.floor(Math.random() * 20) + 5, studentWork: generateStudentWork(Math.floor(Math.random() * 20) + 5), chat: generateChat() } : s
    ));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) { setActiveSession(null); setActivePanel(null); }
  }, [activeSession]);

  const handleDuplicate = useCallback((session: Session) => {
    const dup: Session = {
      ...session,
      id: Date.now().toString(),
      name: `${session.name} (copy)`,
      status: "draft",
      students: 0,
      joinCode: `DUP-${Math.floor(Math.random() * 900 + 100)}`,
      studentWork: [],
      chat: [],
    };
    setSessions(prev => [dup, ...prev]);
  }, []);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim() || !activeSession) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      author: "Instructor",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isInstructor: true,
    };
    setSessions(prev => prev.map(s =>
      s.id === activeSession.id ? { ...s, chat: [...s.chat, msg] } : s
    ));
    setActiveSession(prev => prev ? { ...prev, chat: [...prev.chat, msg] } : prev);
    setChatInput("");
  }, [chatInput, activeSession]);

  const handleExport = useCallback((type: string) => {
    const data = type === "pipeline"
      ? "Pipeline Diagram Export\n\nScenario → Hit → Lead → Candidate\nGenerated by ISDE Classroom"
      : type === "hits"
      ? sessions.flatMap(s => s.studentWork).map(w => `${w.name}\t${w.molecule}\t${w.mw}\t${w.logP}\t${w.lipinskiPass ? "PASS" : "FAIL"}`).join("\n")
      : "Quiz Questions\n\n1. What is the significance of LogP in oral drug design?\n2. Name three Lipinski Rule of 5 criteria.\n3. How does TPSA affect blood-brain barrier penetration?\n4. Explain why hERG liability matters in cardiac safety.\n5. What structural modification could reduce MW while maintaining potency?";
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isde-${type}-export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  const openSession = (session: Session, panel: "spotlight" | "discussion") => {
    setActiveSession(session);
    setActivePanel(panel);
  };

  const lipinskiPassRate = activeSession
    ? Math.round((activeSession.studentWork.filter(w => w.lipinskiPass).length / Math.max(activeSession.studentWork.length, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
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
            <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" /> New Session
            </Button>
          </div>

          {/* ── Create Session Modal ── */}
          <AnimatePresence>
            {showCreate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel rounded-xl p-6 w-full max-w-lg border border-border glow-border">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-lg">Create New Session</h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground font-mono mb-1 block">Session Name</label>
                      <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. PHA301 — Drug Design Lab" className="bg-secondary border-border" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-mono mb-2 block">Scenario</label>
                      <div className="grid grid-cols-2 gap-2">
                        {SCENARIOS.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedScenario(s.id)}
                            className={`text-left p-3 rounded-lg border transition-all text-xs ${
                              selectedScenario === s.id
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            <div className="font-semibold mb-0.5">{s.label}</div>
                            <div className="text-[10px] opacity-70">{s.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateSession} disabled={!newName.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                      <Beaker className="w-4 h-4" /> Create Session
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Session List ── */}
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
                          : "bg-accent/10 text-accent"
                      }`}>
                        {session.status}
                      </span>
                      {session.status !== "draft" && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          Code: {session.joinCode}
                        </span>
                      )}
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
                        <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary" onClick={() => openSession(session, "spotlight")}>
                          <Eye className="w-3.5 h-3.5" /> Spotlight
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary" onClick={() => openSession(session, "discussion")}>
                          <MessageSquare className="w-3.5 h-3.5" /> Discussion
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => handleDuplicate(session)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => handleDelete(session.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {session.status === "draft" ? (
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5" onClick={() => handleLaunch(session.id)}>
                        <Play className="w-3.5 h-3.5" /> Launch
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5" onClick={() => openSession(session, "spotlight")}>
                        <ChevronRight className="w-3.5 h-3.5" /> Open
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                No sessions yet. Click <span className="text-primary">New Session</span> to get started.
              </div>
            )}
          </div>

          {/* ── Session Detail Panel (Spotlight / Discussion) ── */}
          <AnimatePresence>
            {activeSession && activePanel && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel rounded-xl border border-border glow-border w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">

                  {/* Panel header */}
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <div>
                      <h2 className="font-display font-bold text-base">{activeSession.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-[10px] font-mono">{activeSession.joinCode}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {activeSession.students} students</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Beaker className="w-3 h-3" /> {activeSession.scenario}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setActiveSession(null); setActivePanel(null); }}><X className="w-4 h-4" /></Button>
                  </div>

                  {/* Tabs */}
                  <Tabs defaultValue={activePanel} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-5 pt-3">
                      <TabsList className="bg-secondary">
                        <TabsTrigger value="spotlight" className="text-xs gap-1.5"><Eye className="w-3 h-3" /> Spotlight</TabsTrigger>
                        <TabsTrigger value="discussion" className="text-xs gap-1.5"><MessageSquare className="w-3 h-3" /> Discussion</TabsTrigger>
                        <TabsTrigger value="analytics" className="text-xs gap-1.5"><BarChart3 className="w-3 h-3" /> Analytics</TabsTrigger>
                      </TabsList>
                    </div>

                    {/* ── Spotlight Tab ── */}
                    <TabsContent value="spotlight" className="flex-1 overflow-auto p-5 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Submissions" value={activeSession.studentWork.length} icon={<FileText className="w-4 h-4" />} />
                        <StatCard label="Lipinski Pass" value={`${lipinskiPassRate}%`} icon={<CheckCircle2 className="w-4 h-4" />} color={lipinskiPassRate >= 70 ? "primary" : "destructive"} />
                        <StatCard label="Avg MW" value={activeSession.studentWork.length ? (activeSession.studentWork.reduce((a, w) => a + w.mw, 0) / activeSession.studentWork.length).toFixed(0) : "—"} icon={<Beaker className="w-4 h-4" />} />
                        <StatCard label="Avg LogP" value={activeSession.studentWork.length ? (activeSession.studentWork.reduce((a, w) => a + w.logP, 0) / activeSession.studentWork.length).toFixed(1) : "—"} icon={<BarChart3 className="w-4 h-4" />} />
                      </div>

                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-secondary/50 text-muted-foreground">
                              <th className="text-left p-3 font-mono">Student</th>
                              <th className="text-left p-3 font-mono">Molecule</th>
                              <th className="text-right p-3 font-mono">MW</th>
                              <th className="text-right p-3 font-mono">LogP</th>
                              <th className="text-center p-3 font-mono">Lipinski</th>
                              <th className="text-right p-3 font-mono">Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeSession.studentWork.map(w => (
                              <tr key={w.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                                <td className="p-3 font-medium text-foreground">{w.name}</td>
                                <td className="p-3 text-muted-foreground font-mono">{w.molecule}</td>
                                <td className="p-3 text-right font-mono">{w.mw}</td>
                                <td className="p-3 text-right font-mono">{w.logP}</td>
                                <td className="p-3 text-center">
                                  {w.lipinskiPass
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-primary mx-auto" />
                                    : <AlertTriangle className="w-3.5 h-3.5 text-destructive mx-auto" />}
                                </td>
                                <td className="p-3 text-right text-muted-foreground flex items-center justify-end gap-1"><Clock className="w-3 h-3" />{w.submittedAt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {activeSession.studentWork.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">No submissions yet</div>
                        )}
                      </div>
                    </TabsContent>

                    {/* ── Discussion Tab ── */}
                    <TabsContent value="discussion" className="flex-1 flex flex-col overflow-hidden p-5">
                      <div className="flex-1 overflow-auto space-y-3 mb-4">
                        {activeSession.chat.map(msg => (
                          <div key={msg.id} className={`flex ${msg.isInstructor ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] rounded-lg p-3 text-xs ${
                              msg.isInstructor
                                ? "bg-primary/15 border border-primary/20 text-foreground"
                                : "bg-secondary border border-border text-foreground"
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-semibold ${msg.isInstructor ? "text-primary" : "text-muted-foreground"}`}>{msg.author}</span>
                                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                              </div>
                              <p>{msg.text}</p>
                            </div>
                          </div>
                        ))}
                        {activeSession.chat.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">No messages yet. Start the discussion!</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendChat()}
                          placeholder="Type a message to students..."
                          className="bg-secondary border-border text-xs"
                        />
                        <Button size="sm" onClick={handleSendChat} disabled={!chatInput.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* ── Analytics Tab ── */}
                    <TabsContent value="analytics" className="flex-1 overflow-auto p-5 space-y-4">
                      <h3 className="font-display font-semibold text-sm mb-3">Class Performance Overview</h3>
                      <div className="space-y-3">
                        <AnalyticsBar label="Lipinski Pass Rate" value={lipinskiPassRate} />
                        <AnalyticsBar label="MW within range (150–500)" value={activeSession.studentWork.length ? Math.round(activeSession.studentWork.filter(w => w.mw >= 150 && w.mw <= 500).length / activeSession.studentWork.length * 100) : 0} />
                        <AnalyticsBar label="LogP within range (0–5)" value={activeSession.studentWork.length ? Math.round(activeSession.studentWork.filter(w => w.logP >= 0 && w.logP <= 5).length / activeSession.studentWork.length * 100) : 0} />
                        <AnalyticsBar label="Submission Rate" value={activeSession.students > 0 ? Math.round(activeSession.studentWork.length / activeSession.students * 100) : 0} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {activeSession.studentWork.filter(w => !w.lipinskiPass).slice(0, 3).map(w => (
                          <div key={w.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                            <div className="text-xs font-semibold text-destructive flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" /> Needs Attention</div>
                            <div className="text-xs text-foreground font-medium">{w.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">MW: {w.mw} · LogP: {w.logP}</div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Teaching Export Section ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 glass-panel rounded-xl p-6 glow-border">
            <h2 className="font-display font-semibold mb-3">Exportable Teaching Packs</h2>
            <p className="text-xs text-muted-foreground mb-4">One-click export of figures, hit tables, and SAR examples for lecture slides and OSCE-style exam questions.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="text-xs border-border text-muted-foreground hover:text-foreground gap-1.5" onClick={() => handleExport("pipeline")}>
                <Download className="w-3 h-3" /> Export Pipeline Diagrams
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-border text-muted-foreground hover:text-foreground gap-1.5" onClick={() => handleExport("hits")}>
                <FileText className="w-3 h-3" /> Export Hit Tables
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-border text-muted-foreground hover:text-foreground gap-1.5" onClick={() => handleExport("quiz")}>
                <HelpCircle className="w-3 h-3" /> Generate Quiz Questions
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

/* ── Sub-components ── */
function StatCard({ label, value, icon, color = "primary" }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="glass-panel rounded-lg p-3 border border-border">
      <div className={`flex items-center gap-2 mb-1 ${color === "destructive" ? "text-destructive" : "text-primary"}`}>
        {icon}
        <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-display font-bold">{value}</div>
    </div>
  );
}

function AnalyticsBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export default Classroom;
