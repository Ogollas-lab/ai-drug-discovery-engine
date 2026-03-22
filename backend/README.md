# Vitalis AI - In-Silico Drug Discovery Engine Backend

![Vitalis AI](https://img.shields.io/badge/AI-Drug%20Discovery-blue)
![Status](https://img.shields.io/badge/Status-Active%20Development-green)
![License](https://img.shields.io/badge/License-MIT-black)

## Overview

Vitalis AI is an AI-powered in-silico drug discovery platform designed for researchers, educators, and hackathon judges. It combines:

- **AI-Powered Predictions**: Uses Google Gemini 2.5 Flash to predict molecular properties, binding affinities, toxicity, and ADME profiles
- **Real-time Data Integration**: Fetches live data from PubChem and ChEMBL for validation
- **Interactive Simulations**: "What-if" analysis for molecular modifications
- **Educational Focus**: Structured learning paths with explanations for students
- **Africa-Centric**: Disease relevance and accessibility considerations
- **Dual Audiences**: Detailed reports for researchers, concise summaries for judges

## Features

### 🔬 Core Capabilities

#### Molecular Management
- Create and store molecular structures (SMILES, InChI format)
- Version control for molecular modifications
- Full history tracking with timestamps
- Metadata storage (disease, mechanism, tags)

#### AI Predictions
- **Binding Affinity**: Predict Kd to target proteins
- **Toxicity Assessment**: 6+ toxicity categories with confidence scores
- **ADME Properties**: Absorption, Distribution, Metabolism, Excretion
- **Synthesizability**: Estimated synthesis complexity and cost
- Confidence intervals and uncertainty quantification

#### Real-time Data Integration
- **PubChem**: 120+ million compounds, bioassay data
- **ChEMBL**: 2+ million bioactive molecules, assay data
- Automatic Lipinski's Rule of Five compliance checking
- Similar compound discovery

#### Interactive Simulations
- **What-If Analysis**: Predict effects of molecular modifications
- **Multi-target Binding**: Test against multiple proteins simultaneously
- **ADME Simulations**: Explore pharmacokinetic profiles
- Educational mode with structured explanations

### 👥 Audience-Specific Output

#### For Researchers
- Detailed prediction scores with units (nM, %, etc.)
- Confidence intervals and standard errors
- Raw data and methodology documentation
- References to source databases
- Uncertainty estimates

#### For Judges/Non-Technical
- Key highlights in plain language
- Comparison to manual drug discovery timelines
- Cost and speed metrics
- Clinical/social impact
- Africa-relevant applications

### 🎓 Educational Features
- Structured learning simulations with explanations
- Interactive "what-if" scenarios
- Real-world datasets (PubChem, ChEMBL)
- Student progression tracking
- Public educational resources

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **AI Model**: Google Gemini 2.5 Flash
- **Validation**: Joi
- **HTTP Client**: Axios
- **Security**: Helmet, CORS

### APIs
- Google Generative AI API
- PubChem REST API
- ChEMBL REST API
- RCSB Protein Data Bank (future)
- UniProt (future)

## Installation

### Prerequisites
- Node.js 18+
- MongoDB 5.0+ (local or Atlas)
- Google Gemini API Key
- npm or yarn

### Setup

1. **Clone repository**
```bash
git clone <repo-url>
cd vitalis-ai/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with:
```env
# Gemini API
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash

# MongoDB
MONGODB_URI=mongodb://localhost:27017/vitalis-ai
MONGODB_DEV_URI=mongodb://localhost:27017/vitalis-ai-dev

# Server
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

4. **Start development server**
```bash
npm run dev
```

Server runs on `http://localhost:5000`

5. **Verify health**
```bash
curl http://localhost:5000/api/health
```

## Project Structure

```
backend/
├── src/
│   ├── index.js                          # Main entry point
│   ├── models/
│   │   ├── Molecule.js                   # Molecule schema
│   │   ├── Prediction.js                 # Prediction results
│   │   └── Simulation.js                 # Simulation records
│   ├── routes/
│   │   ├── molecules.js                  # Molecule CRUD endpoints
│   │   ├── predictions.js                # AI prediction endpoints
│   │   ├── pubchem.js                    # External data integration
│   │   └── simulations.js                # Interactive simulation endpoints
│   ├── services/
│   │   ├── AIPredictionService.js        # Gemini integration
│   │   └── ExternalDataService.js        # PubChem/ChEMBL integration
│   └── scripts/
│       └── seedDatabase.js               # Sample data loader
├── .env                                   # Environment variables
├── package.json                          # Dependencies
└── API_DOCUMENTATION.md                  # API reference
```

## API Overview

### Molecule Management
```
POST   /api/molecules                    # Create molecule
GET    /api/molecules                    # List molecules
GET    /api/molecules/:id                # Get molecule details
PUT    /api/molecules/:id                # Update metadata
POST   /api/molecules/:id/version        # Create new version
GET    /api/molecules/:id/history        # Get modification history
DELETE /api/molecules/:id                # Archive molecule
```

### AI Predictions
```
POST   /api/predictions/binding-affinity # Predict Kd
POST   /api/predictions/toxicity         # Predict toxicity
POST   /api/predictions/adme             # Predict ADME
GET    /api/predictions/:moleculeId      # Get all predictions
GET    /api/predictions/comprehensive/:id # Full report
```

### Real-time Data
```
GET    /api/pubchem/properties/:smiles   # Fetch properties
GET    /api/pubchem/compound/:cid        # Get details
GET    /api/pubchem/similar/:smiles      # Find similar
GET    /api/pubchem/bioassays/:cid       # Get bioassays
POST   /api/pubchem/comprehensive        # Combined lookup
```

### Interactive Simulations
```
POST   /api/simulations/what-if          # Molecular modification analysis
POST   /api/simulations/binding-affinity # Multi-target binding
POST   /api/simulations/adme             # ADME simulation
GET    /api/simulations/:moleculeId      # List simulations
GET    /api/simulations/details/:id      # Simulation details
```

## Example Usage

### 1. Create a Molecule
```bash
curl -X POST http://localhost:5000/api/molecules \
  -H "Content-Type: application/json" \
  -d '{
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "commonName": "Aspirin",
    "disease": "Inflammation"
  }'
```

Response includes:
- Molecule ID
- PubChem validation (CID, properties)
- ChEMBL matches
- Bioassay data count
- Lipinski compliance

### 2. Predict Binding Affinity
```bash
curl -X POST http://localhost:5000/api/predictions/binding-affinity \
  -H "Content-Type: application/json" \
  -d '{
    "moleculeId": "507f1f77bcf86cd799439011",
    "targetProtein": "COX-1"
  }'
```

Response includes:
- Predicted Kd (nM)
- Confidence score (0-1)
- Key interactions
- Execution time
- Data sources used

### 3. Run What-If Analysis
```bash
curl -X POST http://localhost:5000/api/simulations/what-if \
  -H "Content-Type: application/json" \
  -d '{
    "moleculeId": "507f1f77bcf86cd799439011",
    "modifications": ["add_methyl_group", "remove_carboxylic_acid"],
    "targetProperty": "binding-affinity",
    "educationalMode": true
  }'
```

Response includes:
- Modified SMILES predictions
- Impact analysis
- Synthesis feasibility
- Educational explanations

### 4. Get Comprehensive Report
```bash
curl http://localhost:5000/api/predictions/comprehensive/507f1f77bcf86cd799439011
```

Response includes:
- Researcher report (detailed)
- Executive summary (judges)
- Key metrics
- All predictions
- Data sources

## Data Models

### Molecule
```javascript
{
  smiles: String,           // SMILES notation
  inchi: String,            // InChI identifier
  commonName: String,       // Drug name
  molecularWeight: Number,  // g/mol
  logP: Number,             // Octanol-water partition
  hBondDonors: Number,
  hBondAcceptors: Number,
  rotatableBonds: Number,
  topologicalPolarSurfaceArea: Number,
  pubchemCid: String,       // External ID
  chemblId: String,         // External ID
  predictions: {
    bindingAffinity: { score, confidence, targetProtein, unit },
    toxicity: { score, confidence, categories },
    adme: { absorption, distribution, metabolism, excretion },
    synthesizability: { score, steps, complexity }
  },
  versions: [{              // Modification history
    versionNumber: Number,
    smiles: String,
    modifications: String,
    timestamp: Date
  }],
  createdBy: String,
  createdAt: Date
}
```

### Prediction
```javascript
{
  moleculeId: ObjectId,
  predictionType: String,   // 'binding-affinity', 'toxicity', 'adme'
  results: {
    bindingAffinity: { ... },
    toxicity: { ... },
    adme: { ... }
  },
  aiModel: {
    name: String,
    type: String,
    version: String
  },
  externalValidation: {     // PubChem/ChEMBL data
    pubchemMatch: { ... },
    chemblMatch: [ ... ]
  },
  summary: {                // Judge-friendly summary
    keyHighlights: [String],
    clinicalRelevance: String
  },
  detailedReport: {         // Researcher details
    methodology: String,
    assumptions: [String],
    limitations: [String],
    references: [String]
  },
  createdAt: Date,
  executionTimeMs: Number
}
```

### Simulation
```javascript
{
  moleculeId: ObjectId,
  simulationType: String,   // 'what-if', 'binding-affinity', 'adme'
  parameters: {
    modifications: [String],
    targetProtein: String,
    constraints: Object
  },
  results: {
    baselineResults: Object,
    modifiedResults: Object,
    improvements: {
      bindingAffinity: Number,
      toxicity: Number,
      overallScore: Number
    }
  },
  educationalMetadata: {
    learningObjectives: [String],
    complexity: String,
    explanations: {
      molecularBasis: String,
      chemistryInsight: String,
      pharmacologicalSignificance: String
    }
  },
  createdBy: String,
  viewCount: Number,
  isPublic: Boolean
}
```

## Performance Metrics

- **Binding Affinity Prediction**: ~2-3 seconds
- **Toxicity Assessment**: ~1-2 seconds
- **ADME Prediction**: ~2-3 seconds
- **Database Queries**: <50ms (with indexes)
- **PubChem Lookup**: ~0.5-1 second
- **ChEMBL Lookup**: ~0.5-1 second

## Key Differentiators

1. **Speed**: Minutes instead of months (vs. experimental screening)
2. **Cost**: Fractions of a cent per prediction
3. **Accessibility**: No expensive software licenses
4. **Explainability**: Gemini-powered AI with reasoning
5. **Educational Value**: Interactive learning platform
6. **Real-world Data**: Live PubChem/ChEMBL integration
7. **Africa-Centric**: Focus on relevant diseases

## Future Enhancements

- [ ] Graph Neural Networks for binding prediction
- [ ] Molecular docking visualization
- [ ] RCSB PDB integration for 3D structures
- [ ] UniProt protein sequence analysis
- [ ] Multi-target optimization
- [ ] Genetic algorithm for lead optimization
- [ ] Batch processing for large libraries
- [ ] Advanced visualization (3D molecular rendering)
- [ ] Collaboration tools
- [ ] Publication export (PDF/Word)

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - See LICENSE.md

## Support

- **Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues**: GitHub Issues
- **Email**: support@vitalisai.com

## Citation

If you use Vitalis AI in your research, please cite:

```
Vitalis AI Backend (2026)
In-Silico Drug Discovery Engine
GitHub: https://github.com/Ogollas-lab/ai-drug-discovery-engine
```

## Team

Developed for the Vitalis AI Drug Discovery Hackathon 2026

---

**Last Updated**: March 18, 2026
**Version**: 1.0.0-beta
**Status**: Active Development
