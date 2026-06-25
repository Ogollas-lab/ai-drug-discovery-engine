# Pawanax AI — Drug Discovery Platform

**Last verified:** 2026-06-24 · **Production score:** ~6.0/10

## Stack
- **Frontend:** React + Vite + TypeScript (`pnpm dev:web` → :8080)
- **Backend:** Express + LangChain/LangGraph (`pnpm dev:api` → :5000)
- **Science:** PubChem descriptors, QED/PAINS/Veber/hERG rules, NVIDIA MolMIM + DeepSeek reasoning
- **Package manager:** pnpm workspace (root + `backend/`)

## Research workflow

1. Enter SMILES in **Workspace** → sync PubChem analysis + scientific assessment
2. Engine runs **DMTA**: discovery → MolMIM optimization → docking → analysis → safety → LLM report
3. **HITL** gates high-risk compounds before completion
4. Export SAR report for publication drafts

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/engine/health` | Engine + DB + queue + models |
| POST | `/api/engine/analyze` | Sync PubChem + QED/PAINS/Veber |
| POST | `/api/engine/runs` | Async DMTA workflow |
| POST | `/api/engine/runs/:id/approve` | HITL approve |
| POST | `/api/engine/runs/:id/reject` | HITL reject |
| GET | `/api/engine/runs/:id/events` | SSE progress |

## Environment

```env
DATABASE_URL=     # Neon or local Postgres
REDIS_URL=        # BullMQ (optional)
NVIDIA_API_KEY=   # MolMIM + DeepSeek via integrate.api.nvidia.com
GEMINI_API_KEY=   # Fallback reasoning
```

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:integration   # requires NVIDIA_API_KEY
pnpm db:migrate
pnpm build
```

## Scientific honesty

- Engagement scores labeled as **heuristic proxy** unless from curated literature
- Demo pages (`/xai`, `/gat`, `/training`) show **DemoBanner** disclaimers
- All LLM reports require experimental validation before synthesis decisions
