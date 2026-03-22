# Vitalis AI - Production Roadmap 🗺️

## Executive Summary

**Vision:** Transform drug discovery in Kenya and Africa by making AI-powered, in-silico drug discovery accessible, fast, and cost-effective for researchers and students.

**Current State:** 
- ✅ Backend authentication & subscription system (100% complete)
- ⚠️ Frontend UI (prototype phase - "lovable" design, not mission-aligned)
- ❌ Static data throughout the site
- ❌ Authentication not integrated with frontend
- ❌ No real data integration with backend APIs
- ❌ No user onboarding/education flow aligned with African context

**Blockers to Address:**
1. **Data Architecture** - Remove hardcoded data, connect to backend APIs
2. **Authentication Flow** - Implement JWT login/signup with backend
3. **UI/UX Alignment** - Redesign for clarity and African healthcare context
4. **Real Data Integration** - Connect to scientific databases and prediction models
5. **Onboarding & Education** - Create Africa-focused learning pathway

---

## Phase 1: Data Architecture & Backend Integration (Week 1-2)

### 1.1 Create API Client Layer

**Files to Create:**
- `src/lib/api-client.ts` - Axios instance with auth interceptors
- `src/lib/api-endpoints.ts` - Centralized API route definitions
- `src/hooks/useAuth.ts` - Auth state management hook
- `src/hooks/useApi.ts` - Generic API data fetching hook
- `src/context/AuthContext.tsx` - Global auth state provider

**Tasks:**
```
□ Set up axios client with JWT token management
□ Add request/response interceptors for token refresh
□ Create hook for protected API calls
□ Implement error handling and retry logic
□ Add loading/error states for all data fetching
```

**Backend Integration:**
- Connect signup → `/api/auth/signup`
- Connect login → `/api/auth/login`
- Connect token refresh → `/api/auth/refresh`
- Connect profile fetch → `/api/auth/profile`

---

### 1.2 Remove Hardcoded Data & Create Data Hooks

**Hardcoded Data to Remove:**

1. **`src/data/targets.ts`** (367 lines)
   - `TARGETS` array (6 protein targets)
   - `DISEASES` array (8 disease conditions)
   - `SAMPLE_MOLECULES` 
   - `generateMoleculeResultReal()` function

   **Replace with API calls to:**
   - `GET /api/targets` - List all protein targets
   - `GET /api/targets/{id}` - Get target details
   - `GET /api/diseases` - List all diseases
   - `POST /api/predictions/binding-affinity` - Get real predictions

2. **`src/data/features.ts`** (FeaturesGrid.tsx)
   - Static feature cards
   - **Replace with:** Dynamic feature descriptions from backend or config service

3. **`src/data/benchmarks.ts`** (MetricsSection.tsx)
   - Hardcoded benchmark scores
   - **Replace with:** `GET /api/benchmarks` endpoint

4. **`src/data/pipeline.ts`** (PipelineSection.tsx)
   - Static pipeline phases
   - **Replace with:** Documentation API or static config in backend

**Files to Create:**
- `src/hooks/useTargets.ts` - Fetch targets from API
- `src/hooks/useDiseases.ts` - Fetch diseases from API
- `src/hooks/useBenchmarks.ts` - Fetch benchmarks from API
- `src/hooks/usePredictions.ts` - Submit SMILES for prediction
- `src/hooks/useWorkspaceData.ts` - Combined workspace data hook

**Implementation:**
```tsx
// Example: useTargets hook
export const useTargets = () => {
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/api/targets')
      .then(res => setTargets(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { targets, loading, error };
};
```

---

### 1.3 Create Backend API Endpoints (if missing)

**Backend Endpoints to Create/Verify:**

```
Authentication:
✅ POST /api/auth/signup
✅ POST /api/auth/login
✅ POST /api/auth/refresh
✅ POST /api/auth/password-reset
✅ GET  /api/auth/profile

Targets & Diseases (NEW):
□ GET  /api/targets
□ GET  /api/targets/:id
□ GET  /api/diseases
□ GET  /api/diseases/:id
□ GET  /api/targets/:id/known-drugs

Predictions & Analysis:
□ POST /api/predictions/binding-affinity
□ POST /api/predictions/admet
□ POST /api/predictions/toxicity
□ POST /api/predictions/multi-target

Workspace:
□ GET  /api/workspace/experiments
□ POST /api/workspace/experiments
□ GET  /api/workspace/experiments/:id
□ PUT  /api/workspace/experiments/:id

Benchmarks:
□ GET  /api/benchmarks
□ GET  /api/benchmarks/models

User Data:
□ GET  /api/user/quota
□ GET  /api/user/usage
```

---

## Phase 2: Authentication Implementation (Week 2-3)

### 2.1 Frontend Authentication Flow

**Create Auth Pages:**
- `src/pages/Login.tsx` - Login form with email/password
- `src/pages/Signup.tsx` - Registration form with institution validation
- `src/pages/ForgotPassword.tsx` - Password reset flow
- `src/pages/Dashboard.tsx` - User dashboard (new landing for authenticated users)

**Auth Context Provider:**
```tsx
// src/context/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => void;
}
```

**Protected Routes:**
```tsx
// src/components/ProtectedRoute.tsx
- Check auth status
- Redirect to login if not authenticated
- Check subscription tier for feature access
```

**Tasks:**
```
□ Create login/signup pages
□ Implement auth context provider
□ Add protected route wrapper
□ Implement token storage (httpOnly cookies preferred)
□ Add logout functionality
□ Create "Remember Me" functionality
□ Implement password reset email flow
□ Add email verification flow
□ Create role-based access control (RBAC)
□ Add team member invitation system
```

### 2.2 User Dashboard

**Create Dashboard Pages:**
- Overview of user's quota and usage
- List of saved experiments
- Recent activity
- Subscription status
- Team management interface

---

## Phase 3: UI/UX Redesign (Week 3-4)

### 3.1 Reframe Mission & Messaging

**Current Problem:** UI is "lovable" but doesn't convey the actual mission

**Solution:** Redesign to explicitly communicate:

```
"Discover life-saving drugs in Kenya — AI-powered, 10x faster, 1000x cheaper"

Key Points to Highlight:
1. Kenya/Africa Focus (not generic global)
2. Speed: Days instead of 10+ years
3. Cost: Millions instead of billions
4. Impact: Local researchers can participate
5. Real Data: Based on actual scientific datasets
6. Education: Learn while discovering
```

### 3.2 Redesign Page Components

**Landing Page (Index.tsx):**

**1. Hero Section - REDESIGNED**
```
Current: Generic "lovable" design
New: Show real impact

Visual:
- Split screen: "Traditional Drug Discovery" (10 years, $$$$) vs "AI-Powered" (days, $)
- Map of Africa with Kenya highlighted
- Real researcher testimonial from Kenyan institution
- CTA: "Start Free Trial" | "Watch 5-Min Demo"

Copy:
"In Kenya, researchers wait 10+ years for drug discovery research done elsewhere.
With Vitalis AI, discover promising drug candidates in days—right here in Kenya.
No expensive lab. No waiting. Just AI and data."
```

**2. Features Grid - ALIGNED WITH MISSION**
```
Instead of generic technical features:

1. Virtual Screening → "Screen 1M compounds in hours"
2. Molecule Modification → "Design compounds locally" 
3. Safety Analysis → "Catch risks before lab testing"
4. Team Collaboration → "Your entire research team, together"
5. Education Mode → "Train students on real problems"
6. Export & Publish → "Publish research, share globally"
```

**3. Workflow Section - STORY-DRIVEN**
```
Show actual research workflow:

Step 1: "Choose a disease affecting Kenya" (Malaria, TB, etc.)
Step 2: "Find protein targets in that disease"
Step 3: "Design molecules to hit that target"
Step 4: "Analyze drug-likeness and safety"
Step 5: "Validate in lab" → "Publish results"

Each step shows real data/interface screenshots
```

**4. Metrics Section - REAL IMPACT**
```
Instead of benchmark scores:

"Research Institute in Nairobi just discovered 3 novel malaria inhibitors
using Vitalis AI in 4 weeks (would have taken 2 years)"

"Students in Kampala learned drug discovery through 40 AI-guided simulations
instead of waiting for real lab access"

"Cost per drug candidate: $2,500 vs $500 million industry average"
```

**5. Call-to-Action**
```
"Ready to discover? Start free."
- For students: "Education Mode"
- For researchers: "Workspace"
- For teams: "Team Plan"
```

### 3.3 Create New Design System Components

**New Components Needed:**
- `Hero.tsx` - Redesigned hero with split layout
- `TestimonialCard.tsx` - Researcher quotes from Africa
- `StatsCard.tsx` - Impact metrics
- `FeatureShowcase.tsx` - Feature + live demo combo
- `WorkflowStep.tsx` - Step-by-step workflow visualization
- `CTASection.tsx` - Multiple CTA variants

**Styling:**
- Update color scheme to reflect "scientific + African innovation"
- Add data visualization charts (Chart.js / Recharts)
- Implement loading skeletons for API-driven content
- Add micro-interactions for data feedback

---

## Phase 4: Integration & Real Data (Week 4-5)

### 4.1 Connect Workspace to Real Predictions

**Replace in `WorkspaceAnalyzer.tsx`:**

```tsx
// OLD: generateMoleculeResultReal (mock)
// NEW: Real API prediction

const analyze = async () => {
  setAnalyzing(true);
  try {
    const result = await apiClient.post('/api/predictions/binding-affinity', {
      smiles: smiles,
      targetId: selectedTarget.id,
      includeAdmet: true,
      includeToxicity: true
    });
    setResult(result.data);
    onResult(result.data);
  } catch (error) {
    toast.error('Prediction failed: ' + error.message);
  }
  setAnalyzing(false);
};
```

### 4.2 Integrate Molecule Database

**Options:**
1. **PubChem API** (free, public) - Already partially integrated
2. **ChEMBL** (free, curated) - Add integration
3. **DrugBank** (free academic) - Add integration
4. **Custom Backend Database** - Extend backend to store/cache data

**Create Hook:**
```tsx
const useMoleculeSearch = (query: string) => {
  // Search across multiple databases
  // Return: SMILES, name, structure, existing data
};
```

### 4.3 User Quota & Usage Tracking

**Display in UI:**
- Sidebar quota indicator
- Quota warning before limit
- Upgrade prompt on quota exhaustion
- Usage dashboard with charts

```tsx
// In Navbar or Sidebar
const { user } = useAuth();
const quota = user?.subscription.dailyQuota;
const used = user?.usage.todaySimulations;

<div>
  {used}/{quota} analyses remaining today
  <ProgressBar value={used / quota} />
</div>
```

---

## Phase 5: Education & Onboarding (Week 5-6)

### 5.1 Create Africa-Focused Tutorial Flow

**Replace generic onboarding with contextual learning:**

**Scenario 1: Student Mode**
```
"You're a bioinformatics student at University of Nairobi.
Your professor asks: 'Can you find novel compounds against TB?'"

Step 1: "TB is caused by Mycobacterium tuberculosis"
  → Show real TB pathogen image
  → Show existing TB drugs (Rifampicin, Isoniazid)
  → Interactive: "Which existing drugs work fastest?"

Step 2: "Proteins are the target"
  → Highlight: Mycobacterium InhA protein
  → Show 3D structure
  → Explain: "InhA is why Isoniazid works"

Step 3: "Now find new compounds"
  → Guided molecule design
  → Live prediction feedback
  → Interactive: "Why is this compound better?"

Step 4: "Share your findings"
  → Export as report
  → Submit to professor's classroom
  → See peer findings
```

**Scenario 2: Researcher Mode**
```
"You're leading a malaria research project.
Target: Plasmodium falciparum PfDHFR"

Step 1: "Load your compounds from lab synthesis"
Step 2: "Screen against known parasite proteins"
Step 3: "Predict ADMET properties"
Step 4: "Find the top 10 candidates for validation"
Step 5: "Generate report for your team"
```

### 5.2 Create "Learn" Page

**New Page: `/education`** (Enhanced)

Content Sections:
1. **"What is Drug Discovery?"**
   - Video + interactive explanation
   - Traditional vs AI approach
   - Real timeline comparison

2. **"How to Use Vitalis AI"**
   - 5-minute interactive tutorial
   - Real demo with actual data
   - Common mistakes & how to avoid

3. **"Understand the Science"**
   - Binding affinity explained
   - ADMET properties explained
   - Why certain molecules work
   - Interactive: "Build your own molecule"

4. **"Case Studies from Africa"**
   - Real stories: Malaria, TB, etc.
   - What Kenyan researchers discovered
   - Timeline: lab prediction → validation

5. **"Glossary & Concepts"**
   - SMILES notation
   - Graph neural networks (simplified)
   - Protein structures
   - Drug likeness (Lipinski's rule)

### 5.3 Interactive Tutorials

Create `<Tutorial />` component system:

```tsx
// Example: Molecule builder tutorial
<InteractiveTutorial
  title="Build Your First Molecule"
  steps={[
    {
      title: "Start with Benzene",
      description: "Benzene is a basic chemical ring...",
      action: "Draw benzene ring",
      feedback: "Great! You've drawn the core structure"
    },
    {
      title: "Add a Side Chain",
      description: "Side chains modify how drugs work...",
      action: "Add -CH3 group",
      feedback: "Good! Now predict affinity..."
    }
  ]}
/>
```

---

## Phase 6: Screening & Analysis Features (Week 6-7)

### 6.1 Virtual Screening Module

**Enhance `/screening` page:**

```
Current: Unknown/placeholder
New: Full screening pipeline

1. Upload or design compounds
2. Select target protein
3. Run batch predictions
4. Rank by binding affinity
5. Filter by ADMET/toxicity
6. Export top hits
```

**Features:**
- Batch upload (CSV/SDF format)
- Real-time prediction streaming
- Interactive results table with sorting
- Visualization: Affinity ranking chart
- Export: Top compounds, full report

### 6.2 Classroom Tools

**Enhance `/classroom` page:**

```
Teacher Features:
- Create virtual lab sessions
- Assign compound design tasks
- See student submissions in real-time
- Spotlight interesting results
- Grade based on "best binding" or "most creative"

Student Features:
- Join class session
- See live leaderboard
- Submit molecules
- Get instant feedback
- Compare your design with peers
```

---

## Phase 7: User Dashboard & Team Collaboration (Week 7-8)

### 7.1 User Dashboard

**New Route: `/dashboard`**

Sections:
1. **Quick Stats**
   - Analyses this month
   - Molecules designed
   - Team members
   - Subscription status

2. **Recent Experiments**
   - Table of saved experiments
   - Quick actions: view, edit, share, delete
   - Filter by target/disease

3. **Team Management**
   - List team members
   - Invite new members
   - Manage permissions
   - Activity log

4. **Subscription & Billing**
   - Current plan details
   - Usage vs quota
   - Upgrade options
   - Billing history

5. **Settings**
   - Profile info
   - Email preferences
   - API keys
   - Data privacy

### 7.2 Team Collaboration

**Features:**
- Shared experiments (read/write/comment)
- Comments on molecules
- Version history
- Change tracking
- Collaboration in real-time (optional: WebSocket sync)

---

## Phase 8: Advanced Features (Week 8-9)

### 8.1 What-If Chemist (Molecule Designer)

**Enhance `WhatIfChemist.tsx`:**

Currently: Limited functionality
New: Full interactive molecule editor with:
- Drag-and-drop functional groups
- Real-time affinity prediction
- Highlight: "Which atoms matter most?"
- Undo/redo
- Save variations
- Compare side-by-side

### 8.2 ADMET & Toxicity Deep Dive

**Create Detailed Analysis:**
- Property breakdown
- Lipinski's rule violations
- Drug-likeness score
- Toxicity flags (hepatotoxic, mutagenic, etc.)
- Comparison with known drugs

### 8.3 Molecule Generation (VAE)

**If backend supports:**
- Generate novel compounds
- Guided generation: "Generate binders for this target"
- Diversity sampling
- Constraint-based generation

---

## Phase 9: Analytics & Monitoring (Week 9-10)

### 9.1 User Analytics

Track:
- Feature usage (which tools most used)
- Prediction accuracy over time
- User engagement metrics
- Institution/team statistics

### 9.2 Admin Dashboard

For Vitalis AI team:
- Total users, institutions
- Popular targets/diseases
- Prediction statistics
- System health
- Error monitoring

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Timeline |
|-------|----------|--------|--------|----------|
| 1: Backend Integration | 🔴 CRITICAL | High | High | Week 1-2 |
| 2: Authentication | 🔴 CRITICAL | High | High | Week 2-3 |
| 3: UI/UX Redesign | 🔴 CRITICAL | High | Very High | Week 3-4 |
| 4: Real Data | 🟠 HIGH | Medium | High | Week 4-5 |
| 5: Onboarding | 🟠 HIGH | Medium | Very High | Week 5-6 |
| 6: Screening | 🟡 MEDIUM | Medium | Medium | Week 6-7 |
| 7: Dashboard | 🟡 MEDIUM | Medium | Medium | Week 7-8 |
| 8: Advanced Features | 🟢 LOW | High | Medium | Week 8-9 |
| 9: Analytics | 🟢 LOW | Medium | Low | Week 9-10 |

---

## Architecture Diagram

```
Frontend (React/TypeScript)
├── Pages (Index, Workspace, Screening, Education, Classroom, Dashboard)
├── Components
│   ├── Auth (Login, Signup, ProtectedRoute)
│   ├── Workspace (Analyzer, Safety, WhatIfChemist, Results)
│   ├── Education (Tutorials, Concepts, CaseStudies)
│   ├── Classroom (Sessions, Leaderboard, Submissions)
│   └── Dashboard (Stats, Experiments, Team, Billing)
├── Hooks
│   ├── useAuth() → Backend /auth endpoints
│   ├── useTargets() → Backend /targets endpoints
│   ├── usePredictions() → Backend /predictions endpoints
│   ├── useWorkspace() → Backend /workspace endpoints
│   └── useQuota() → Backend /user/quota
├── Context
│   ├── AuthContext (user, token, login/logout)
│   └── SubscriptionContext (quota, limits, tier)
└── Lib
    ├── api-client.ts (axios with auth interceptors)
    └── api-endpoints.ts (centralized routes)

Backend (Express.js - Already 95% Complete)
├── Routes
│   ├── /api/auth/* ✅
│   ├── /api/subscription/* ✅
│   ├── /api/targets/* (needs implementation)
│   ├── /api/diseases/* (needs implementation)
│   ├── /api/predictions/* (needs implementation)
│   └── /api/workspace/* (needs implementation)
├── Models
│   ├── User ✅
│   ├── Subscription ✅
│   ├── Target (needs creation)
│   ├── Disease (needs creation)
│   ├── Experiment (needs creation)
│   └── Prediction (needs creation)
├── Services
│   ├── EmailService ✅
│   ├── PredictionService (needs creation)
│   └── DataService (needs creation)
└── Middleware
    ├── auth ✅
    ├── quota ✅
    └── errorHandling ✅

External APIs
├── PubChem (molecule data)
├── ChEMBL (compound database)
├── Stripe (payments) ✅
├── SendGrid/Gmail (email) ✅
└── TensorFlow/PyTorch (predictions - backend)
```

---

## Success Criteria

### Phase 1 Complete ✅
- [ ] API client created with auth interceptors
- [ ] All data hooks implemented
- [ ] Backend API endpoints documented
- [ ] Zero hardcoded data in frontend

### Phase 2 Complete ✅
- [ ] Login/signup flow working
- [ ] JWT tokens stored securely
- [ ] Auth context provides user data
- [ ] Protected routes block unauthenticated access

### Phase 3 Complete ✅
- [ ] Landing page redesigned with Africa focus
- [ ] All components rebranded
- [ ] Messaging aligned with mission
- [ ] Testimonials/case studies visible

### Phase 4 Complete ✅
- [ ] Predictions work against real backend
- [ ] Quota tracking visible
- [ ] Error handling for failed predictions
- [ ] Molecule database integration working

### Phase 5 Complete ✅
- [ ] Education page has interactive tutorials
- [ ] Student and researcher onboarding flows
- [ ] Glossary complete
- [ ] Case studies from Africa displayed

### All Phases Complete ✅
- [ ] Platform is production-ready
- [ ] All critical blockers resolved
- [ ] Performance optimized
- [ ] Security audit completed
- [ ] Deployed to production

---

## File Checklist

### To Create:
```
Frontend:
□ src/lib/api-client.ts
□ src/lib/api-endpoints.ts
□ src/context/AuthContext.tsx
□ src/context/SubscriptionContext.tsx
□ src/hooks/useAuth.ts
□ src/hooks/useApi.ts
□ src/hooks/useTargets.ts
□ src/hooks/useDiseases.ts
□ src/hooks/usePredictions.ts
□ src/hooks/useQuota.ts
□ src/pages/Login.tsx
□ src/pages/Signup.tsx
□ src/pages/Dashboard.tsx
□ src/pages/ForgotPassword.tsx
□ src/components/ProtectedRoute.tsx
□ src/components/TutorialWizard.tsx
□ src/components/InteractiveMoleculeBuilder.tsx
□ src/data/tutorials.ts
□ src/data/case-studies.ts

Backend:
□ src/models/Target.js
□ src/models/Disease.js
□ src/models/Experiment.js
□ src/models/Prediction.js
□ src/routes/targets.js
□ src/routes/diseases.js
□ src/routes/predictions.js
□ src/routes/workspace.js
□ src/services/PredictionService.js
□ src/services/DataService.js
```

### To Update:
```
Frontend:
□ src/App.tsx - Add auth routes
□ src/data/targets.ts - Convert to hook-based
□ src/components/FeaturesGrid.tsx - Redesign
□ src/components/MetricsSection.tsx - Real data
□ src/components/PipelineSection.tsx - Africa focus
□ src/components/HeroSection.tsx - Mission messaging
□ src/pages/Education.tsx - Interactive tutorials
□ src/pages/Classroom.tsx - Team features
□ src/pages/Screening.tsx - Real screening
□ src/pages/Index.tsx - New flow after login

Backend:
□ src/index.js - Add new routes
□ package.json - Add missing dependencies
```

---

## Quick Start Commands

```bash
# Frontend Setup
cd ai-drug-discovery-engine
npm install
npm run dev

# Backend Setup  
cd ../backend
npm install
npm start

# Testing
npm test  # Run test suite
npm run build  # Build for production
```

---

## Notes & Considerations

### Security
- Use httpOnly cookies for JWT storage (not localStorage)
- Implement CSRF protection
- Rate limit API endpoints
- Validate all inputs on backend
- Use HTTPS in production

### Performance
- Implement pagination for large data sets
- Add caching for static data (targets, diseases)
- Optimize re-renders with React.memo
- Implement lazy loading for routes
- Use service workers for offline support

### Scalability
- Database indexes for frequently queried fields
- Queue system for long-running predictions
- Cache prediction results
- Use CDN for static assets
- Horizontal scaling for backend

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Mobile responsiveness

### Analytics & Monitoring
- Sentry for error tracking
- GA for user behavior
- Prometheus for system metrics
- CloudWatch/DataDog for logs
- Slack alerts for critical errors

---

## Timeline Summary

- **Week 1-2:** Backend integration (API client, hooks, data migration)
- **Week 2-3:** Authentication (login, signup, protected routes)
- **Week 3-4:** UI redesign (landing, features, messaging)
- **Week 4-5:** Real data integration (predictions, molecules, database)
- **Week 5-6:** Education & onboarding (tutorials, case studies)
- **Week 6-7:** Screening & analysis (batch predictions, results)
- **Week 7-8:** Dashboard & teams (user hub, collaboration)
- **Week 8-9:** Advanced features (what-if chemist, molecule generation)
- **Week 9-10:** Analytics, testing, deployment

**Total Timeline:** 10 weeks to production-ready

---

## Next Steps

1. **Immediately:**
   - [ ] Review this roadmap with team
   - [ ] Assign owners for each phase
   - [ ] Set up project tracking (Jira/Linear)
   - [ ] Create feature branches for each phase

2. **This Week:**
   - [ ] Start Phase 1 (backend integration)
   - [ ] Begin UI/UX redesign mockups
   - [ ] Create API documentation

3. **Next Week:**
   - [ ] Complete Phase 1 implementation
   - [ ] Start Phase 2 (authentication)
   - [ ] Begin user research for Africa focus

---

**Version:** 1.0  
**Last Updated:** March 18, 2026  
**Status:** Ready for Implementation
