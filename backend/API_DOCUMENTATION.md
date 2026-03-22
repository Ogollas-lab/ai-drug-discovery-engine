# Vitalis AI - Drug Discovery Engine API Documentation

## Overview
The Vitalis AI backend provides a comprehensive REST API for in-silico drug discovery with AI-powered molecular predictions, real-time data integration from PubChem and ChEMBL, and educational simulations.

**Base URL:** `http://localhost:5000/api`

## Core Features
- **Molecule Management**: Create, store, and version molecular structures
- **AI Predictions**: Binding affinity, toxicity, ADME, synthesizability using Gemini 2.5 Flash
- **Real-time Data Integration**: PubChem and ChEMBL for validation
- **Interactive Simulations**: What-if analysis and multi-parameter simulations
- **Educational Tools**: Interactive learning with structured explanations
- **Dual-Audience Output**: Detailed reports for researchers, summaries for judges

---

## 1. Health Check

### GET `/health`
Check API and MongoDB connection status.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-18T10:30:00Z",
  "mongodb": "connected"
}
```

---

## 2. Molecule Management

### CREATE: POST `/molecules`
Create and register a new molecule.

**Request Body:**
```json
{
  "smiles": "CC(=O)Oc1ccccc1C(=O)O",
  "commonName": "Aspirin",
  "disease": "Inflammation",
  "createdBy": "researcher@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Molecule created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "commonName": "Aspirin",
    "molecularWeight": 180.157,
    "logP": 1.19,
    "hBondDonors": 1,
    "hBondAcceptors": 4,
    "topologicalPolarSurfaceArea": 63.6,
    "pubchemCid": "2244",
    "pubchemValidation": { ... },
    "chemblValidation": [ ... ],
    "tags": ["drug-like"],
    "createdAt": "2026-03-18T10:30:00Z"
  },
  "externalValidation": {
    "pubchemMatch": true,
    "chemblMatches": 5,
    "bioassays": 12
  }
}
```

### LIST: GET `/molecules`
Retrieve molecules with pagination and filtering.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `disease` - Filter by disease
- `tags` - Comma-separated tags
- `sortBy` - Sort field (e.g., `-createdAt`)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "smiles": "CC(=O)Oc1ccccc1C(=O)O",
      "commonName": "Aspirin",
      "molecularWeight": 180.157,
      "logP": 1.19,
      "simulationCount": 3,
      "createdAt": "2026-03-18T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 125,
    "page": 1,
    "pages": 7,
    "limit": 20
  }
}
```

### GET: GET `/molecules/:id`
Get detailed molecule information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "commonName": "Aspirin",
    "inchi": "InChI=1S/C9H8O4/c1-6(10)9(13)8-5-3-2-4-7(8)11-7...",
    "molecularWeight": 180.157,
    "logP": 1.19,
    "hBondDonors": 1,
    "hBondAcceptors": 4,
    "rotatableBonds": 2,
    "topologicalPolarSurfaceArea": 63.6,
    "predictions": {
      "bindingAffinity": {
        "predicted": true,
        "score": 45,
        "confidence": 0.82,
        "targetProtein": "COX-1",
        "unit": "nM",
        "timestamp": "2026-03-18T11:00:00Z"
      },
      "toxicity": {
        "predicted": true,
        "score": 0.15,
        "confidence": 0.88,
        "categories": ["hepatotoxicity", "GI_irritation"],
        "timestamp": "2026-03-18T11:05:00Z"
      },
      "adme": {
        "predicted": true,
        "absorption": 0.92,
        "distribution": 0.78,
        "metabolism": 0.85,
        "excretion": 0.88,
        "confidence": 0.8,
        "timestamp": "2026-03-18T11:10:00Z"
      }
    },
    "versions": [
      {
        "versionNumber": 1,
        "smiles": "CC(=O)Oc1ccccc1C(=O)O",
        "modifications": "Initial molecule",
        "timestamp": "2026-03-18T10:30:00Z"
      }
    ]
  }
}
```

### UPDATE: PUT `/molecules/:id`
Update molecule metadata.

**Request Body:**
```json
{
  "commonName": "Acetylsalicylic Acid",
  "disease": "Cardiovascular Disease",
  "tags": ["drug-like", "NSAID"],
  "mechanism": "COX inhibitor"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Molecule updated",
  "data": { ... }
}
```

### VERSION: POST `/molecules/:id/version`
Create new version with modifications.

**Request Body:**
```json
{
  "newSmiles": "CC(=O)Oc1ccccc1C(=O)NCCN",
  "modifications": "Added secondary amine group to improve binding",
  "updateMain": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Version created",
  "data": {
    "newVersion": 2,
    "molecule": { ... }
  }
}
```

### HISTORY: GET `/molecules/:id/history`
Get molecule modification and simulation history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "moleculeId": "507f1f77bcf86cd799439011",
    "versions": [
      {
        "versionNumber": 1,
        "smiles": "CC(=O)Oc1ccccc1C(=O)O",
        "modifications": "Initial molecule",
        "timestamp": "2026-03-18T10:30:00Z"
      }
    ],
    "simulationCount": 5,
    "lastUpdated": "2026-03-18T11:30:00Z",
    "predictionsSnapshot": { ... }
  }
}
```

---

## 3. AI Predictions

### BINDING AFFINITY: POST `/predictions/binding-affinity`
Predict binding affinity to target protein.

**Request Body:**
```json
{
  "moleculeId": "507f1f77bcf86cd799439011",
  "targetProtein": "COX-1",
  "targetUniprotId": "P23677"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Binding affinity prediction completed",
  "data": {
    "prediction": {
      "_id": "507f1f77bcf86cd799439012",
      "moleculeId": "507f1f77bcf86cd799439011",
      "predictionType": "binding-affinity",
      "results": {
        "bindingAffinity": {
          "score": 45,
          "confidence": 0.82,
          "unit": "nM",
          "targetProteins": [
            {
              "name": "COX-1",
              "uniprotId": "P23677",
              "predictedKd": 45,
              "confidence": 0.82
            }
          ]
        }
      },
      "summary": {
        "keyHighlights": [
          "Predicted Kd: 45 nM",
          "Confidence: 82.0%",
          "Target: COX-1"
        ]
      }
    },
    "summary": {
      "keyHighlights": ["Predicted Kd: 45 nM", "Confidence: 82.0%", "Target: COX-1"]
    }
  },
  "stats": {
    "executionTimeMs": 2340,
    "dataSources": ["PubChem", "ChEMBL"]
  }
}
```

### TOXICITY: POST `/predictions/toxicity`
Predict toxicity profile.

**Request Body:**
```json
{
  "moleculeId": "507f1f77bcf86cd799439011"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Toxicity prediction completed",
  "data": {
    "prediction": {
      "predictionType": "toxicity",
      "results": {
        "toxicity": {
          "overallScore": 0.15,
          "confidence": 0.88,
          "categories": [
            { "name": "hepatotoxicity", "score": 0.12 },
            { "name": "cardiotoxicity", "score": 0.08 },
            { "name": "GI_irritation", "score": 0.25 }
          ]
        }
      },
      "summary": {
        "keyHighlights": [
          "Toxicity Risk: 15.0%",
          "Confidence: 88.0%",
          "Categories Assessed: 3"
        ]
      }
    }
  }
}
```

### ADME: POST `/predictions/adme`
Predict ADME properties (Absorption, Distribution, Metabolism, Excretion).

**Request Body:**
```json
{
  "moleculeId": "507f1f77bcf86cd799439011"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "ADME prediction completed",
  "data": {
    "prediction": {
      "predictionType": "adme",
      "results": {
        "adme": {
          "absorption": { "value": 0.92, "confidence": 0.8 },
          "distribution": { "value": 0.78, "confidence": 0.8 },
          "metabolism": { "value": 0.85, "confidence": 0.75 },
          "excretion": { "value": 0.88, "confidence": 0.8 },
          "bloodBrainBarrier": { "value": false, "confidence": 0.85 }
        }
      },
      "summary": {
        "keyHighlights": [
          "BBB Penetration: No",
          "Absorption: 92.0%",
          "Overall PK Profile: Favorable"
        ]
      }
    }
  }
}
```

### COMPREHENSIVE: GET `/predictions/comprehensive/:moleculeId`
Get comprehensive prediction report with researcher details and judge summary.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "molecule": {
      "id": "507f1f77bcf86cd799439011",
      "smiles": "CC(=O)Oc1ccccc1C(=O)O",
      "commonName": "Aspirin",
      "properties": {
        "mw": 180.157,
        "logp": 1.19,
        "tpsa": 63.6
      }
    },
    "predictions": [
      {
        "type": "binding-affinity",
        "results": { ... },
        "confidence": 0.82,
        "timestamp": "2026-03-18T11:00:00Z"
      },
      {
        "type": "toxicity",
        "results": { ... },
        "confidence": 0.88,
        "timestamp": "2026-03-18T11:05:00Z"
      }
    ],
    "researcherReport": "## Binding Affinity Analysis\n\n...",
    "executiveSummary": "Aspirin is a well-known NSAID that inhibits cyclooxygenase (COX-1) with a predicted Kd of 45 nM...",
    "keyMetrics": [
      "Binding Affinity: 45 nM (Strong)",
      "Toxicity Risk: 15% (Low)",
      "Oral Bioavailability: 92%"
    ]
  }
}
```

### LIST: GET `/predictions/:moleculeId`
Get all predictions for a molecule.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "predictionType": "binding-affinity",
      "results": { ... },
      "createdAt": "2026-03-18T11:00:00Z"
    }
  ],
  "count": 3
}
```

---

## 4. Real-time Data Integration (PubChem & ChEMBL)

### PROPERTIES: GET `/pubchem/properties/:smiles`
Fetch molecular properties from PubChem.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "pubchemCid": "2244",
    "molecularWeight": 180.157,
    "molecularFormula": "C9H8O4",
    "logP": 1.19,
    "hBondDonors": 1,
    "hBondAcceptors": 4,
    "rotatableBonds": 2,
    "topologicalPolarSurfaceArea": 63.6,
    "source": "pubchem"
  },
  "drugLikeness": {
    "compliant": true,
    "violations": [],
    "violationCount": 0
  }
}
```

### COMPOUND: GET `/pubchem/compound/:cid`
Get detailed compound information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cid": "2244",
    "atoms": 21,
    "bonds": 21,
    "synonyms": ["Aspirin", "Acetylsalicylic acid", "2-Acetoxybenzoic acid"],
    "iupacName": "2-acetyloxybenzoic acid"
  }
}
```

### IDENTIFIERS: GET `/pubchem/identifiers/:cid`
Get canonical SMILES and InChI.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "canonicalSmiles": "CC(=O)Oc1ccccc1C(=O)O",
    "inchi": "InChI=1S/C9H8O4/c1-6(10)9(13)8-5-3-2-4-7(8)11-7..."
  }
}
```

### SIMILAR: GET `/pubchem/similar/:smiles`
Find structurally similar compounds.

**Query Parameters:**
- `threshold` (default: 0.9) - Similarity threshold

**Response (200):**
```json
{
  "success": true,
  "data": {
    "query": "CC(=O)Oc1ccccc1C(=O)O",
    "threshold": 0.9,
    "similarCompounds": [2244, 2146, 2157, 2158],
    "count": 4
  }
}
```

### BIOASSAYS: GET `/pubchem/bioassays/:cid`
Get bioassay data for compound.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cid": "2244",
    "assays": [
      {
        "aid": "1234567",
        "name": "COX-1 Inhibition",
        "description": "Cyclooxygenase-1 enzyme inhibition",
        "activeConcentration": 0.045
      }
    ],
    "count": 1
  }
}
```

### COMPREHENSIVE: POST `/pubchem/comprehensive`
Combined lookup from PubChem, ChEMBL, and bioassays.

**Request Body:**
```json
{
  "smiles": "CC(=O)Oc1ccccc1C(=O)O",
  "requireValidation": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "pubchem": { ... },
    "chembl": {
      "matches": 45,
      "compounds": [ ... ]
    },
    "bioassays": {
      "count": 123,
      "examples": [ ... ]
    },
    "drugLikeness": {
      "compliant": true,
      "violations": [],
      "violationCount": 0
    },
    "timestamp": "2026-03-18T10:30:00Z",
    "dataSources": ["PubChem", "ChEMBL"]
  }
}
```

---

## 5. Interactive Simulations

### WHAT-IF: POST `/simulations/what-if`
Run what-if analysis on molecular modifications.

**Request Body:**
```json
{
  "moleculeId": "507f1f77bcf86cd799439011",
  "modifications": [
    "add_methyl_group_at_position_4",
    "replace_carboxylic_acid_with_amide"
  ],
  "targetProperty": "binding-affinity",
  "targetProtein": "COX-1",
  "educationalMode": true,
  "createdBy": "student@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "What-if analysis completed",
  "data": {
    "simulation": "507f1f77bcf86cd799439013",
    "moleculeId": "507f1f77bcf86cd799439011",
    "modifications": [
      "add_methyl_group_at_position_4",
      "replace_carboxylic_acid_with_amide"
    ],
    "targetProperty": "binding-affinity",
    "results": {
      "suggestions": [
        "Addition of methyl group may increase lipophilicity...",
        "Amide replacement could improve metabolic stability..."
      ]
    },
    "executionTimeMs": 3245,
    "educationalMetadata": {
      "learningObjectives": [
        "Understand structure-activity relationships",
        "Explore effects of molecular modifications",
        "Predict clinical outcomes of chemical changes"
      ],
      "complexity": "intermediate",
      "explanations": {
        "molecularBasis": "Analysis pending",
        "chemistryInsight": "Modifications affect binding affinity and ADME properties",
        "pharmacologicalSignificance": "Proposed changes may improve binding-affinity"
      }
    }
  }
}
```

### BINDING-AFFINITY SIM: POST `/simulations/binding-affinity`
Run multi-target binding affinity simulation.

**Request Body:**
```json
{
  "moleculeId": "507f1f77bcf86cd799439011",
  "targetProteins": [
    { "name": "COX-1", "uniprotId": "P23677" },
    { "name": "COX-2", "uniprotId": "P35355" }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Binding affinity simulation completed",
  "data": {
    "simulation": "507f1f77bcf86cd799439014",
    "targetResults": [
      {
        "target": "COX-1",
        "score": 45,
        "confidence": 0.82,
        "executionTimeMs": 2100
      },
      {
        "target": "COX-2",
        "score": 52,
        "confidence": 0.79,
        "executionTimeMs": 2150
      }
    ],
    "executionTimeMs": 4250
  }
}
```

### ADME SIM: POST `/simulations/adme`
Run ADME simulation with educational content.

**Request Body:**
```json
{
  "moleculeId": "507f1f77bcf86cd799439011"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "ADME simulation completed",
  "data": {
    "simulation": "507f1f77bcf86cd799439015",
    "results": {
      "absorption": 0.92,
      "distribution": 0.78,
      "metabolism": 0.85,
      "excretion": 0.88,
      "bbb": false
    },
    "executionTimeMs": 2800
  }
}
```

### LIST: GET `/simulations/:moleculeId`
Get all simulations for a molecule.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "simulationType": "what-if",
      "createdAt": "2026-03-18T11:30:00Z",
      "viewCount": 5
    }
  ],
  "count": 3
}
```

### DETAILS: GET `/simulations/details/:simulationId`
Get full simulation details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "moleculeId": { ... },
    "name": "What-if: add_methyl_group_at_position_4, ...",
    "simulationType": "what-if",
    "parameters": {
      "modifications": [ ... ],
      "targetProtein": "COX-1"
    },
    "results": {
      "baselineResults": { ... },
      "modifiedResults": { ... }
    },
    "educationalMetadata": { ... },
    "viewCount": 5,
    "createdAt": "2026-03-18T11:30:00Z"
  }
}
```

### EDUCATIONAL: GET `/simulations/public/educational`
Get public educational simulations for learning.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "name": "ADME: Understanding Drug Kinetics",
      "simulationType": "adme",
      "viewCount": 245,
      "educationalMetadata": {
        "learningObjectives": [ ... ],
        "complexity": "intermediate"
      }
    }
  ],
  "count": 15
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (invalid input)
- `404` - Not found
- `409` - Conflict (e.g., molecule already exists)
- `500` - Server error

---

## Example Workflow: Drug Discovery

### 1. Create Molecule
```bash
curl -X POST http://localhost:5000/api/molecules \
  -H "Content-Type: application/json" \
  -d '{
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "commonName": "Aspirin",
    "disease": "Inflammation"
  }'
```

### 2. Predict Binding Affinity
```bash
curl -X POST http://localhost:5000/api/predictions/binding-affinity \
  -H "Content-Type: application/json" \
  -d '{
    "moleculeId": "507f1f77bcf86cd799439011",
    "targetProtein": "COX-1"
  }'
```

### 3. Predict Toxicity
```bash
curl -X POST http://localhost:5000/api/predictions/toxicity \
  -H "Content-Type: application/json" \
  -d '{
    "moleculeId": "507f1f77bcf86cd799439011"
  }'
```

### 4. Run What-If Analysis
```bash
curl -X POST http://localhost:5000/api/simulations/what-if \
  -H "Content-Type: application/json" \
  -d '{
    "moleculeId": "507f1f77bcf86cd799439011",
    "modifications": ["add_methyl_group", "increase_hydrophobicity"],
    "targetProperty": "binding-affinity"
  }'
```

### 5. Get Comprehensive Report
```bash
curl http://localhost:5000/api/predictions/comprehensive/507f1f77bcf86cd799439011
```

---

## Response Formatters

### For Researchers
- Detailed binding affinity with Kd estimates
- Confidence intervals and uncertainty ranges
- Comparison to known compounds
- Methodology documentation
- References to PubChem/ChEMBL data

### For Judges/Non-Technical
- Key highlights (e.g., "Strong binding to target")
- Execution speed (seconds vs. months)
- Cost metrics
- Africa-centric clinical relevance
- Next steps for development

---

## Installation & Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Gemini API key and MongoDB URI

# Start server
npm start

# Development (with auto-reload)
npm run dev

# Run tests
npm test
```

---

## Rate Limiting

- PubChem API: 300 requests/minute
- ChEMBL API: 100 requests/minute
- Gemini API: Follow Google's quotas

---

## Support
For issues or questions, refer to the README.md or create an issue in the repository.
