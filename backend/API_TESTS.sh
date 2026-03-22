#!/bin/bash

# 🧬 Vitalis AI - API Test & Example Calls
# Run these curl commands to test the backend
# Make sure the server is running: npm run dev

API_URL="http://localhost:5000/api"
MOLECULE_ID=""

echo "🧬 Vitalis AI Backend - API Testing Suite"
echo "==========================================="
echo ""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}[1/12] Testing Health Check...${NC}"
curl -s "${API_URL}/health" | jq . || echo "Health check failed"
echo ""

# Test 2: Create Molecule (Aspirin)
echo -e "${BLUE}[2/12] Creating Molecule (Aspirin)...${NC}"
RESPONSE=$(curl -s -X POST "${API_URL}/molecules" \
  -H "Content-Type: application/json" \
  -d '{
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "commonName": "Aspirin",
    "iupacName": "2-acetyloxybenzoic acid",
    "disease": "Inflammation",
    "mechanism": "COX inhibitor",
    "createdBy": "test-script"
  }')

echo "$RESPONSE" | jq .
MOLECULE_ID=$(echo "$RESPONSE" | jq -r '.data._id // empty')
echo "Molecule ID: $MOLECULE_ID"
echo ""

if [ -z "$MOLECULE_ID" ]; then
  echo -e "${RED}ERROR: Failed to create molecule${NC}"
  exit 1
fi

# Test 3: List Molecules
echo -e "${BLUE}[3/12] Listing Molecules...${NC}"
curl -s "${API_URL}/molecules?limit=5" | jq .
echo ""

# Test 4: Get Molecule Details
echo -e "${BLUE}[4/12] Getting Molecule Details...${NC}"
curl -s "${API_URL}/molecules/${MOLECULE_ID}" | jq .
echo ""

# Test 5: PubChem Properties Lookup
echo -e "${BLUE}[5/12] Fetching PubChem Properties...${NC}"
curl -s "${API_URL}/pubchem/properties/CC(=O)Oc1ccccc1C(=O)O" | jq .
echo ""

# Test 6: Comprehensive External Data Lookup
echo -e "${BLUE}[6/12] Comprehensive External Data Lookup...${NC}"
curl -s -X POST "${API_URL}/pubchem/comprehensive" \
  -H "Content-Type: application/json" \
  -d '{
    "smiles": "CC(=O)Oc1ccccc1C(=O)O"
  }' | jq .
echo ""

# Test 7: Binding Affinity Prediction
echo -e "${BLUE}[7/12] Predicting Binding Affinity...${NC}"
BINDING_RESPONSE=$(curl -s -X POST "${API_URL}/predictions/binding-affinity" \
  -H "Content-Type: application/json" \
  -d "{
    \"moleculeId\": \"${MOLECULE_ID}\",
    \"targetProtein\": \"COX-1\",
    \"targetUniprotId\": \"P23677\"
  }")

echo "$BINDING_RESPONSE" | jq .
echo ""

# Test 8: Toxicity Prediction
echo -e "${BLUE}[8/12] Predicting Toxicity...${NC}"
TOXICITY_RESPONSE=$(curl -s -X POST "${API_URL}/predictions/toxicity" \
  -H "Content-Type: application/json" \
  -d "{
    \"moleculeId\": \"${MOLECULE_ID}\"
  }")

echo "$TOXICITY_RESPONSE" | jq .
echo ""

# Test 9: ADME Prediction
echo -e "${BLUE}[9/12] Predicting ADME Properties...${NC}"
ADME_RESPONSE=$(curl -s -X POST "${API_URL}/predictions/adme" \
  -H "Content-Type: application/json" \
  -d "{
    \"moleculeId\": \"${MOLECULE_ID}\"
  }")

echo "$ADME_RESPONSE" | jq .
echo ""

# Test 10: Get All Predictions
echo -e "${BLUE}[10/12] Getting All Predictions...${NC}"
curl -s "${API_URL}/predictions/${MOLECULE_ID}" | jq .
echo ""

# Test 11: What-If Simulation
echo -e "${BLUE}[11/12] Running What-If Simulation...${NC}"
WHATIF_RESPONSE=$(curl -s -X POST "${API_URL}/simulations/what-if" \
  -H "Content-Type: application/json" \
  -d "{
    \"moleculeId\": \"${MOLECULE_ID}\",
    \"modifications\": [
      \"add_methyl_group_at_position_3\",
      \"replace_carboxylic_acid_with_ester\"
    ],
    \"targetProperty\": \"binding-affinity\",
    \"targetProtein\": \"COX-1\",
    \"educationalMode\": true,
    \"createdBy\": \"test-script\"
  }")

echo "$WHATIF_RESPONSE" | jq .
echo ""

# Test 12: Comprehensive Report
echo -e "${BLUE}[12/12] Getting Comprehensive Report...${NC}"
curl -s "${API_URL}/predictions/comprehensive/${MOLECULE_ID}" | jq .
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "📊 Test Summary:"
echo "✓ Health check"
echo "✓ Molecule creation"
echo "✓ Molecule listing"
echo "✓ Molecule details"
echo "✓ External data lookup (PubChem)"
echo "✓ Comprehensive data integration"
echo "✓ Binding affinity prediction"
echo "✓ Toxicity prediction"
echo "✓ ADME prediction"
echo "✓ Prediction retrieval"
echo "✓ What-if simulation"
echo "✓ Comprehensive report generation"
echo ""
echo "📝 API Documentation: http://localhost:5000/api/docs"
echo "🔗 Molecule ID for future tests: ${MOLECULE_ID}"

# Additional useful curl commands for manual testing

echo ""
echo "═════════════════════════════════════════════════════════"
echo "🧪 Additional Manual Test Commands"
echo "═════════════════════════════════════════════════════════"
echo ""

echo "# Create another molecule (Ibuprofen)"
echo "curl -X POST http://localhost:5000/api/molecules \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"smiles\": \"CC(C)Cc1ccc(cc1)C(C)C(=O)O\", \"commonName\": \"Ibuprofen\"}'"
echo ""

echo "# Find similar molecules"
echo "curl http://localhost:5000/api/pubchem/similar/CC(=O)Oc1ccccc1C(=O)O"
echo ""

echo "# Update molecule metadata"
echo "curl -X PUT http://localhost:5000/api/molecules/${MOLECULE_ID} \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"disease\": \"Cardiovascular Disease\", \"tags\": [\"nsaid\", \"drug-like\"]}'"
echo ""

echo "# Get molecule modification history"
echo "curl http://localhost:5000/api/molecules/${MOLECULE_ID}/history"
echo ""

echo "# Create new molecule version"
echo "curl -X POST http://localhost:5000/api/molecules/${MOLECULE_ID}/version \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"newSmiles\": \"CC(=O)Oc1ccccc1C(=O)NCCN\", \"modifications\": \"Added secondary amine\"}'"
echo ""

echo "# Get all simulations for molecule"
echo "curl http://localhost:5000/api/simulations/${MOLECULE_ID}"
echo ""

echo "# Get educational simulations"
echo "curl http://localhost:5000/api/simulations/public/educational"
echo ""

echo "# Validate SMILES"
echo "curl -X POST http://localhost:5000/api/pubchem/validate \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"smiles\": \"CC(=O)Oc1ccccc1C(=O)O\"}'"
echo ""

echo "═════════════════════════════════════════════════════════"
