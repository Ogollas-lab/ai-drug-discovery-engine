# Vitalis AI - Analysis System Architecture

## Overview

Vitalis AI is a **million-dollar AI drug discovery platform** that combines real-time molecular data from public databases with advanced AI analysis through Google Gemini to provide actionable insights for pharmaceutical researchers.

## System Architecture

### 1. **Data Flow Pipeline**

```
User Input (SMILES) 
    ↓
PubChem API (Fetch molecular properties)
    ↓
Gemini AI (Analyze and contextualize)
    ↓
UI Display (Real-time insights)
```

### 2. **Key Components**

#### **A. Data Fetching Layer** (`src/lib/pubchem.ts`)
- Queries PubChem public API for molecular properties
- Returns: MW, LogP, H-bond donors/acceptors, TPSA, rotatable bonds, aromatic rings
- Used for: Drug-likeness assessment, ADME prediction
- No authentication required (public API)

#### **B. Analysis Service** (`src/lib/analysis.ts`)
- Orchestrates molecule analysis workflow
- Handles PubChem data → Gemini processing pipeline
- Features:
  - `analyzeMolecule()` - Single molecule analysis
  - `analyzeTargetInteraction()` - Target-molecule docking potential
  - `analyzeModification()` - Comparative structural SAR analysis
- Returns structured insights with loading stages

#### **C. Gemini Prompt Templates** (`src/lib/gemini-prompts.ts`)
- Strategic system prompts for different analysis types
- Ensures Gemini provides focused, actionable insights
- Prompt types:
  - **Molecular Analysis**: Drug-likeness, bioavailability potential
  - **Target Interaction**: Binding mode prediction, selectivity
  - **Safety Assessment**: Toxicity flags, hERG blocking risk
  - **Structure Modification**: SAR insights, optimization suggestions
  - **Drug Discovery Insight**: Strategic positioning, development priorities

#### **D. UI Components**
- **AIInsights** (`src/components/workspace/AIInsights.tsx`): Real-time analysis display
- **WhatIfChemist** (`src/components/workspace/WhatIfChemist.tsx`): Structural modifications
- **Workspace** (`src/pages/Workspace.tsx`): Main orchestration

### 3. **Analysis Workflow**

#### **Stage 1: Data Acquisition**
```
User enters SMILES → PubChem API call → Extract molecular properties
```
- Fetches: MW, LogP, H-bond donors, H-bond acceptors, TPSA, rotatable bonds
- Error handling for invalid SMILES

#### **Stage 2: AI Analysis**
```
Molecular properties + Context (target info) → Gemini → Structured insight
```
- Sends formatted prompt to backend endpoint: `POST /api/predictions/analyze`
- Backend calls Gemini API with contextual system prompt
- Returns focused, 2-3 sentence analysis suitable for UI display

#### **Stage 3: UI Presentation**
```
Insights + Properties → Real-time display with visual indicators
```
- Shows Gemini analysis paragraph
- Displays key molecular properties (MW, LogP, TPSA, HBD/HBA)
- Lipinski's Rule of Five status
- Loading states for UX transparency

## Gemini Prompt Strategy

### Why This Approach?

**Problem:** Without proper prompting, AI can produce verbose, non-actionable outputs unsuitable for real-time UI.

**Solution:** Strategic system prompts that:
1. Define Gemini's role as an expert medicinal chemist
2. Specify the analysis context (drug discovery, specific target)
3. Enforce brevity (2-3 sentences max)
4. Guide output format for UI consumption
5. Emphasize actionable insights over academic verbosity

### Prompt Structure

Each prompt includes:
```
[EXPERT ROLE DEFINITION]
Your role is to [specific analysis task] at Vitalis AI.

[SPECIFIC INSTRUCTIONS]
1. [analyze X]
2. [predict Y]
3. [flag Z]

[OUTPUT CONSTRAINTS]
- SHORT analysis (2-3 sentences)
- Focus on [key metrics]
- Format as [specific structure]

[CONTEXT]
[User's specific molecule + properties + target info]
```

### Example: Molecular Analysis Prompt

```
You are an expert medicinal chemist and pharmacologist analyzing molecular structures 
for drug development at Vitalis AI.

Your role is to:
1. Analyze molecular properties against Lipinski's Rule of Five
2. Assess drug-likeness and bioavailability potential
3. Identify property concerns
4. Suggest optimization directions

IMPORTANT: Provide SHORT analysis (2-3 sentences max) suitable for display in UI.
Include specific concerns like "High LogP suggests poor solubility" or 
"Good TPSA for BBB penetration".

[MOLECULE DATA]
...
```

## Backend Integration

### API Endpoint: `/api/predictions/analyze`

**Method:** POST  
**Auth:** Bearer token required  
**Body:**
```json
{
  "prompt": "Full analysis prompt with molecule data",
  "type": "analysis"
}
```

**Response:**
```json
{
  "analysis": "The AI-generated insight paragraph..."
}
```

### Expected Backend Implementation

```javascript
app.post('/api/predictions/analyze', authenticateToken, async (req, res) => {
  const { prompt } = req.body;
  
  try {
    const response = await gemini.generateContent(prompt);
    const analysis = response.response.text();
    
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Data Removal Strategy

### What Was Removed
- ✅ Static hardcoded molecules (SAMPLE_MOLECULES)
- ✅ Mock prediction data (generateMoleculeResultFake)
- ✅ Hardcoded target properties
- ✅ Pre-filled analysis results

### What Stays Dynamic
- ✅ Real PubChem data queries
- ✅ Live Gemini analysis
- ✅ User-entered SMILES queries
- ✅ Target selection from database
- ✅ Real modification calculations

## User Journey

### Step 1: Select Target
```
User picks drug target (EGFR, ACE2, etc.) → Loads target mechanism/drugs
```

### Step 2: Enter Molecule
```
User enters SMILES (e.g., "CC(=O)Oc1c(C)cccc1C(=O)O") 
→ Validates against regex
```

### Step 3: Analyze
```
System fetches PubChem data → Shows loading "Fetching molecular data..."
→ Sends to Gemini → Shows loading "Analyzing with Gemini..."
→ Displays insights
```

### Step 4: Explore Modifications
```
User clicks "Add -F" or other modification
→ System calculates modified SMILES
→ Fetches new PubChem data
→ Compares with original
→ Shows SAR insights from Gemini
```

## Performance Considerations

### Caching Strategy
```typescript
// Cache PubChem results for 24 hours
const PUBCHEM_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Only call Gemini on first analysis
// Reuse for same SMILES + target combo
```

### Loading States
- **Fetching**: 1-3 seconds (PubChem API)
- **Analyzing**: 2-5 seconds (Gemini processing)
- **Display**: Instant (pre-rendered)

### Rate Limiting
```
PubChem: ~5-10 requests/sec (public)
Gemini: ~60 requests/minute (depends on plan)
Backend quota: Enforce on predictions endpoint
```

## Error Handling

### Invalid SMILES
```
User enters bad SMILES
→ PubChem returns error
→ UI shows: "Invalid SMILES - please check structure"
→ Suggests SMILES checker tools
```

### API Failures
```
Gemini timeout
→ Show partial results (molecular properties only)
→ Offer "Retry Analysis" button
```

### Missing Data
```
PubChem missing property
→ Estimate from available properties
→ Mark as "Predicted" vs "Measured"
```

## Future Enhancements

### Phase 2
- [ ] Structure drawing canvas (instead of SMILES entry)
- [ ] 3D visualization of molecules
- [ ] Docking score predictions
- [ ] ADMET property estimation without PubChem

### Phase 3
- [ ] Multi-molecule comparison
- [ ] Library screening
- [ ] SAR table generation
- [ ] Report generation (PDF export)

### Phase 4
- [ ] Custom ML models for property prediction
- [ ] Federated learning with partner labs
- [ ] Integration with ELN systems
- [ ] Real-time market data on compounds

## System Benefits

1. **Real-Time Intelligence**: No static data, always current
2. **AI-Powered Insights**: Context-aware analysis from Gemini
3. **Research-Grade**: Based on public, validated data
4. **Scalable**: Handles high volume of queries
5. **Accessible**: No licensing required for public data
6. **Strategic**: Focused prompts yield actionable insights

---

**Last Updated:** March 18, 2026  
**Version:** 1.0 - Initial AI Integration  
**Status:** Production Ready
