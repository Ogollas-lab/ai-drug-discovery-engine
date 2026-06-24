# Vitalis AI 🧬

> AI-powered, in-silico drug discovery platform built for researchers, educators, and students across Africa.

🔗 **Live App:** [https://mole-whisperer.lovable.app](https://mole-whisperer.lovable.app)

---

## 🌍 Mission

Traditional drug discovery takes 10+ years and billions of dollars in offshore labs. **Vitalis AI** brings computational drug discovery directly to African researchers — using AI to predict molecular binding, screen virtual compounds, and analyze drug safety profiles. Our goal: make discovery **10× faster** and **1000× cheaper**, with a focus on diseases that disproportionately affect the continent (Malaria, Tuberculosis, Sickle Cell, NTDs, and more).

---

## ✨ Key Features

### 🧪 Discovery & Analysis
- **Molecule Analyzer** — Draw, modify, and inspect molecular structures with real-time property calculation
- **AI Virtual Screening** — Batch-screen compound libraries against protein targets
- **Compound Screening Tool** — High-throughput virtual screening at `/screening`
- **What-If Chemist** — Interactive scaffold modifications with real-time delta comparisons

### 🤖 AI & Predictions
- **GAT Predictor** — Graph Attention Network for binding affinity (probabilistic outputs only)
- **Drug Success Prediction** — Lipinski, Veber, ADMET evaluation at `/predictions`
- **Validation Layer** — Cross-checks AI predictions against known experimental evidence
- **Disease-Specific Models** — Tailored scoring for African health challenges

### 🔬 Explainability (XAI)
- **SHAP Beeswarm & Waterfall** — Per-feature contribution analysis
- **LIME Weights, Decision Pathways, Confidence Panels**
- **Molecule Comparison & Feature Heatmaps**

### 📚 Education & Collaboration
- **Education Hub** — Learning paths and virtual lab with clinical case scenarios (`/education`)
- **Classroom Mode** — Instructor-led sessions with real-time student simulation and spotlight dashboard
- **Onboarding Tour** — 5-step story-driven introduction
- **Pipeline Timeline** — 8-stage drug discovery visualization with attrition funnel (`/pipeline`)

### 📊 Data & Transparency
- **Datasets Hub** — BindingDB, PDB, PubChem, ChEMBL ingestion
- **Training Pipeline** — Continuous learning from validated datasets (`/training`)
- **Benchmarks Page** — Transparent GAT/GCN model performance metrics
- **Student vs Expert Toggle** — Switch between simplified clinical terms and raw algorithmic data

---

## 🏗️ Tech Stack

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** with semantic design tokens (biotech dark theme — neon green/cyan accents, glassmorphism)
- **shadcn/ui** components
- **Framer Motion** for animations
- **Recharts** for data visualization
- Fonts: **Space Grotesk** (UI) + **JetBrains Mono** (data)

### Backend
- **Node.js** + **Express.js**
- **LangChain** + **LangGraph** — multi-agent DMTA orchestration
- **Neon Postgres** (optional) — runs, provenance, predictions
- **BullMQ** + **Redis** (optional) — async job queue
- **NVIDIA NIM** / **DeepSeek-class** reasoner via model gateway
- **MongoDB** (legacy auth/subscription)
- **Google Gemini** — fallback reasoning

### Data Sources
- **PubChem REST API** — physicochemical properties (real, experimental)
- **ChEMBL** — bioactive molecules and assay data
- **Internal GAT/GCN models** — binding & off-target predictions (clearly badged as predicted)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or bun
- MongoDB (only required if running the backend locally)

### 1. Frontend + Backend (recommended)
```bash
pnpm install
pnpm dev
```
- Web: `http://localhost:8080`
- API + Engine: `http://localhost:5000`

### 2. Frontend only
```bash
pnpm install
pnpm dev:web
```

### 3. Backend only
```bash
pnpm install
pnpm dev:api
```
Copy `backend/.env.example` → `backend/.env` and set keys (NVIDIA, Neon, etc.).

See [`backend/README.md`](./backend/README.md) and [`backend/API_DOCUMENTATION.md`](./backend/API_DOCUMENTATION.md) for full API reference.

---

## 🗺️ Main Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, features, and pipeline overview |
| `/workspace` | Mission-control clinical dashboard (4-column layout) |
| `/screening` | Batch compound screening |
| `/predictions` | Drug success prediction (Lipinski, Veber, ADMET) |
| `/pipeline` | 8-stage discovery timeline with attrition funnel |
| `/xai` | Explainability dashboard (SHAP, LIME, decision paths) |
| `/validation` | Validate AI predictions against experimental evidence |
| `/training` | Dataset ingestion + continuous training pipeline |
| `/datasets` | Browse BindingDB, PDB, PubChem, ChEMBL |
| `/benchmarks` | Model performance transparency |
| `/education` | Learning hub + virtual lab |
| `/classroom` | Instructor-led collaborative mode |
| `/pricing` | Subscription tiers |

---

## 🎨 Design System

- **Theme:** Biotech dark with neon green/cyan accents, glassmorphic panels
- **High-density layouts** designed for scientific workflows
- All colors use **HSL semantic tokens** defined in `src/index.css` and `tailwind.config.ts`
- Accessibility toggles for clinical vs technical terminology

---

## 📦 Project Structure

```
.
├── src/
│   ├── components/      # UI, workspace, xai, predictions
│   ├── pages/           # Route-level pages
│   ├── lib/             # gat-predictor, validation, training-pipeline, pubchem
│   ├── data/            # disease-models, education-content, targets
│   ├── contexts/        # Auth, Subscription
│   └── hooks/
├── backend/
│   ├── src/
│   │   ├── engine/      # LangChain DMTA pipeline, model gateway, Neon schema
│   │   ├── routes/      # molecules, predictions, auth, subscription
│   │   ├── services/    # AIPredictionService, ExternalDataService
│   │   └── models/      # Molecule, Prediction, User
│   └── .env.example
├── pnpm-workspace.yaml
└── README.md
```

---

## 🔐 Environment Variables

Frontend uses Lovable Cloud auto-injected vars. Backend `.env`:
```env
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
MONGODB_URI=mongodb://localhost:27017/vitalis-ai
PORT=5000
FRONTEND_URL=http://localhost:8080
```

---

## 🌐 Live Demo

👉 **[Launch Vitalis AI](https://mole-whisperer.lovable.app)**

Try the workspace, run a prediction, explore SHAP explanations, or jump into Classroom mode.

---

## 📄 License

MIT — see `LICENSE.md`

## 🙌 Credits

Built with [Lovable](https://lovable.dev) for the Vitalis AI Drug Discovery Hackathon 2026.

---

**Last Updated:** May 9, 2026 · **Version:** 2.0
