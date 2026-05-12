# MOLECULE INPUT PIPELINE — ARCHITECTURAL FIX

**Date:** 2026-05-09  
**Issue:** Valid SMILES strings failing with "Could not resolve molecule"  
**Status:** ✅ FIXED

---

## ROOT CAUSE

**Problem:** The system **always called PubChem** for every input, regardless of whether it was a SMILES string or molecule name.

**Why this failed:**
1. User provides valid SMILES: `COC1=C(C=C2C(=C1)N=CN=C2NCC3=CC=CC=C3)OCCCN4CCOCC4`
2. System calls PubChem SMILES lookup
3. PubChem returns 404 (structure not in database)
4. System shows: "Could not resolve molecule" ❌

**This is WRONG because:**
- The SMILES is chemically valid
- It just isn't indexed in PubChem
- Novel/generated structures will never be in PubChem
- System should use the SMILES directly

---

## ARCHITECTURAL CONSTRAINT

The platform is **browser-based** with **NO RDKit backend**.

**Cannot do:**
- ❌ `Chem.MolFromSmiles()` (no RDKit)
- ❌ Server-side SMILES validation
- ❌ Server-side canonicalization

**Can do:**
- ✅ Client-side SMILES pattern matching
- ✅ PubChem REST API calls
- ✅ Regex-based validation
- ✅ Heuristic input classification

---

## FIXED ARCHITECTURE

### Before (BROKEN):
```
User Input
    ↓
Call PubChem (always)
    ↓
If 404 → "Could not resolve molecule" ❌
```

### After (FIXED):
```
User Input
    ↓
Classify Input (SMILES vs Name vs CID)
    ↓
┌─────────────┬──────────────┬─────────────┐
│   SMILES    │     NAME     │     CID     │
└─────────────┴──────────────┴─────────────┘
      ↓              ↓              ↓
PubChem SMILES  PubChem Name  PubChem CID
   lookup          lookup        lookup
      ↓              ↓              ↓
  If found      If found       If found
      ↓              ↓              ↓
  Use data      Use data       Use data
      ↓              ↓              ↓
  If NOT found  If NOT found   If NOT found
      ↓              ↓              ↓
  Use SMILES    Show error     Show error
  directly ✅       ❌             ❌
      ↓
  Mark as
  "Novel Structure"
```

---

## IMPLEMENTATION

### Module 1: SMILES Validation (`smiles-validation.ts`)

**Purpose:** Classify user input as SMILES, name, or CID **before** calling PubChem.

**Key Functions:**

#### `classifyMoleculeInput(input: string)`
```typescript
// Returns: { type: "smiles" | "name" | "invalid", confidence: "high" | "medium" | "low" }

// Example 1: Valid SMILES
classifyMoleculeInput("COC1=C(C=C2C(=C1)N=CN=C2NCC3=CC=CC=C3)OCCCN4CCOCC4")
// → { type: "smiles", confidence: "high", reason: "Passes basic SMILES validation" }

// Example 2: Molecule name
classifyMoleculeInput("Gefitinib")
// → { type: "name", confidence: "high", reason: "Matches drug name pattern" }

// Example 3: Invalid input
classifyMoleculeInput("xyz123")
// → { type: "invalid", confidence: "high", reason: "No atoms found" }
```

**Validation Rules:**

1. **Character Set:** Must contain only valid SMILES characters
   - Atoms: `C, N, O, S, P, F, Cl, Br, I, c, n, o, s, p`
   - Bonds: `=, #, -, +`
   - Structure: `[, ], (, ), /, \, @, %, .`
   - Numbers: `0-9` (ring closures)

2. **Structural Patterns:**
   - Aromatic rings: `c1ccccc1`
   - Aliphatic rings: `C1CCCCC1`
   - Multiple bonds: `C=C`, `C#N`
   - Branching: `C(C)C`
   - Stereochemistry: `@`, `@@`, `/`, `\`

3. **Balanced Brackets:**
   - `[` must match `]`
   - `(` must match `)`

4. **Minimum Length:** At least 3 characters

**Name Detection:**
- Contains spaces → definitely a name
- Starts with capital + lowercase → likely a name (e.g., "Aspirin")
- Ends with drug suffix → likely a name (e.g., "Gefitinib", "Erlotinib")

---

### Module 2: Enhanced PubChem (`pubchem.ts`)

**New Function:** `fetchMoleculeByInput(input: string)`

**Pipeline:**

```typescript
1. Normalize input (trim whitespace)
2. Check if CID (numeric) → fetchPubChemByCID()
3. Classify input → classifyMoleculeInput()
4. If SMILES:
   a. Try fetchPubChemBySMILES()
   b. If found → return PubChem data
   c. If NOT found → return fallback result:
      {
        cid: 0,
        name: "Novel Structure",
        mw: 0,  // Descriptors unavailable
        error: "Structure not in PubChem database"
      }
5. If name:
   a. Try fetchPubChemByName()
   b. If found → return PubChem data
   c. If NOT found → return null with error
```

**Return Type:**
```typescript
{
  result: PubChemResult | null,
  inputType: "smiles" | "name" | "cid",
  usedFallback: boolean,
  error: string | null
}
```

---

## EXAMPLE SCENARIOS

### Scenario 1: Valid SMILES in PubChem

**Input:** `CC(=O)OC1=CC=CC=C1C(=O)O` (Aspirin)

**Flow:**
```
1. Classify → "smiles" (high confidence)
2. Call PubChem SMILES lookup
3. Found: CID 2244
4. Return: {
     result: { cid: 2244, name: "Aspirin", mw: 180.2, ... },
     inputType: "smiles",
     usedFallback: false,
     error: null
   }
```

**Result:** ✅ Full PubChem data available

---

### Scenario 2: Valid SMILES NOT in PubChem (Novel Structure)

**Input:** `COC1=C(C=C2C(=C1)N=CN=C2NCC3=CC=CC=C3)OCCCN4CCOCC4`

**Flow:**
```
1. Classify → "smiles" (high confidence)
2. Call PubChem SMILES lookup
3. NOT found: HTTP 404
4. FALLBACK: Return minimal result:
   {
     result: {
       cid: 0,
       name: "Novel Structure",
       mw: 0,
       logp: null,
       hDonors: 0,
       hAcceptors: 0,
       rotBonds: 0,
       tpsa: 0
     },
     inputType: "smiles",
     usedFallback: true,
     error: "Structure not in PubChem database (novel/generated compound)"
   }
```

**Result:** ✅ SMILES accepted, but descriptors unavailable

**UI Display:**
```
Molecule: Novel Structure
SMILES: COC1=C(C=C2C(=C1)N=CN=C2NCC3=CC=CC=C3)OCCCN4CCOCC4
Status: ⚠ Not in PubChem database

Descriptors: Unavailable (novel structure)
Recommendation: Use external tools (RDKit, ChemDraw) to calculate descriptors
```

---

### Scenario 3: Molecule Name

**Input:** `Gefitinib`

**Flow:**
```
1. Classify → "name" (high confidence)
2. Call PubChem name lookup
3. Found: CID 123631
4. Return: {
     result: { cid: 123631, name: "Gefitinib", mw: 446.9, ... },
     inputType: "name",
     usedFallback: false,
     error: null
   }
```

**Result:** ✅ Full PubChem data available

---

### Scenario 4: Invalid Name

**Input:** `XYZ123NotARealDrug`

**Flow:**
```
1. Classify → "name" (medium confidence)
2. Call PubChem name lookup
3. NOT found: HTTP 404
4. Return: {
     result: null,
     inputType: "name",
     usedFallback: false,
     error: "Molecule name \"XYZ123NotARealDrug\" not found in PubChem database"
   }
```

**Result:** ❌ Show error: "Could not resolve molecule"

---

### Scenario 5: PubChem CID

**Input:** `2244`

**Flow:**
```
1. Detect CID (numeric)
2. Call PubChem CID lookup
3. Found: Aspirin
4. Return: {
     result: { cid: 2244, name: "Aspirin", mw: 180.2, ... },
     inputType: "cid",
     usedFallback: false,
     error: null
   }
```

**Result:** ✅ Full PubChem data available

---

## VALIDATION RULES

### SMILES Validation Checklist:

- ✅ Contains only valid SMILES characters
- ✅ Has at least one atom (C, N, O, S, P)
- ✅ Balanced square brackets `[` and `]`
- ✅ Balanced parentheses `(` and `)`
- ✅ Minimum length 3 characters
- ✅ No spaces (SMILES never have spaces)

### Name Detection Checklist:

- ✅ Contains spaces → definitely a name
- ✅ Starts with capital + lowercase → likely a name
- ✅ Ends with drug suffix (-mab, -nib, -tinib, etc.) → likely a name
- ✅ Contains hyphens with text → likely a chemical name

---

## ERROR HANDLING

### Error 1: Novel SMILES (Not in PubChem)

**User Input:** Valid SMILES not in PubChem

**System Behavior:**
- ✅ Accept the SMILES
- ✅ Mark as "Novel Structure"
- ✅ Show warning: "Descriptors unavailable"
- ✅ Allow user to proceed with GAT prediction (if graph can be built)

**Error Message:**
```
⚠ Novel Structure Detected

This SMILES is not in the PubChem database. Molecular descriptors 
(MW, LogP, TPSA) are unavailable.

You can:
• Use external tools (RDKit, ChemDraw) to calculate descriptors
• Proceed with structure-based predictions (if supported)
• Verify SMILES is correct
```

---

### Error 2: Invalid Name

**User Input:** Name not found in PubChem

**System Behavior:**
- ❌ Reject the input
- ❌ Show error message

**Error Message:**
```
❌ Molecule Not Found

The molecule name "XYZ123" was not found in PubChem.

Suggestions:
• Check spelling
• Try alternative names or synonyms
• Use SMILES notation instead
• Search PubChem directly: https://pubchem.ncbi.nlm.nih.gov
```

---

### Error 3: Invalid SMILES

**User Input:** Malformed SMILES

**System Behavior:**
- ❌ Reject the input
- ❌ Show validation error

**Error Message:**
```
❌ Invalid SMILES

The input failed SMILES validation:
• Unbalanced parentheses

Please check your SMILES string and try again.
```

---

## LOGGING

### Console Output (Success):

```
[PubChem] Input classification: { type: "smiles", confidence: "high", reason: "Passes basic SMILES validation" }
[PubChem] Attempting SMILES lookup: COC1=C(C=C2C(=C1)N=CN=C2NCC3=CC=CC=C3)OCCCN4CCOCC4...
[PubChem] SMILES not in PubChem database, using as novel structure
[Molecule Input] Accepted novel SMILES, descriptors unavailable
```

### Console Output (Name Found):

```
[PubChem] Input classification: { type: "name", confidence: "high", reason: "Matches drug name pattern" }
[PubChem] Attempting name lookup: Gefitinib
[PubChem] Name found in PubChem: CID 123631
[Molecule Input] Resolved to CID 123631
```

### Console Output (Error):

```
[PubChem] Input classification: { type: "name", confidence: "medium", reason: "Not valid SMILES: Contains invalid characters" }
[PubChem] Attempting name lookup: XYZ123
[PubChem] Name not found: XYZ123
[Molecule Input] ERROR: Molecule name "XYZ123" not found in PubChem database
```

---

## TESTING CHECKLIST

### ✅ Test 1: Valid SMILES in PubChem
**Input:** `CC(=O)OC1=CC=CC=C1C(=O)O`  
**Expected:** Full PubChem data (Aspirin, CID 2244)  
**Result:** ✅ PASS

### ✅ Test 2: Valid SMILES NOT in PubChem
**Input:** `COC1=C(C=C2C(=C1)N=CN=C2NCC3=CC=CC=C3)OCCCN4CCOCC4`  
**Expected:** Accepted as "Novel Structure", descriptors unavailable  
**Result:** ✅ PASS

### ✅ Test 3: Molecule Name (Found)
**Input:** `Gefitinib`  
**Expected:** Full PubChem data (CID 123631)  
**Result:** ✅ PASS

### ✅ Test 4: Molecule Name (Not Found)
**Input:** `XYZ123NotARealDrug`  
**Expected:** Error: "Molecule name not found"  
**Result:** ✅ PASS

### ✅ Test 5: PubChem CID
**Input:** `2244`  
**Expected:** Full PubChem data (Aspirin)  
**Result:** ✅ PASS

### ✅ Test 6: Invalid SMILES
**Input:** `C(C(C`  
**Expected:** Error: "Unbalanced parentheses"  
**Result:** ✅ PASS

### ✅ Test 7: Empty Input
**Input:** ` `  
**Expected:** Error: "Empty input"  
**Result:** ✅ PASS

---

## INTEGRATION POINTS

### Frontend Components:

1. **Molecule Input Form** (`WorkspaceAnalyzer.tsx`, `MoleculeAnalyzer.tsx`)
   - Replace direct `fetchPubChemBySMILES()` calls
   - Use `fetchMoleculeByInput()` instead
   - Handle `usedFallback` flag to show warnings

2. **What-If Chemist** (`WhatIfChemist.tsx`)
   - Already uses `fetchPubChemBySMILES()` correctly
   - No changes needed (handles novel structures)

3. **GAT Predictor** (`GATPredictor.tsx`)
   - May need to handle novel structures
   - Graph construction might work without descriptors

---

## LIMITATIONS

### Cannot Do (No RDKit Backend):

1. **Canonicalization:**
   - Cannot convert user SMILES to canonical form
   - Different SMILES for same molecule will be treated as different
   - Example: `C(C)C` vs `CCC` (both propane, but different strings)

2. **Sanitization:**
   - Cannot validate chemical correctness
   - Cannot fix valency errors
   - Cannot detect invalid stereochemistry

3. **Descriptor Calculation:**
   - Cannot calculate MW, LogP, TPSA for novel structures
   - Must rely on PubChem or show "unavailable"

4. **Graph Construction:**
   - Cannot build molecular graph from SMILES
   - GAT predictions may not work for novel structures

### Workarounds:

1. **For Canonicalization:**
   - Use PubChem's canonical SMILES when available
   - For novel structures, accept user SMILES as-is

2. **For Descriptors:**
   - Show "Descriptors unavailable" for novel structures
   - Recommend external tools (RDKit, ChemDraw)

3. **For Graph Construction:**
   - If GAT requires graph, show error for novel structures
   - Or implement client-side SMILES parser (complex)

---

## FUTURE ENHANCEMENTS

### Phase 1 (Current): ✅ COMPLETE
- Client-side SMILES validation
- Input classification
- PubChem fallback for novel structures

### Phase 2 (Future):
- Add RDKit WASM for client-side canonicalization
- Calculate descriptors for novel structures
- Build molecular graphs from SMILES

### Phase 3 (Future):
- Server-side RDKit backend
- Full SMILES sanitization
- Descriptor calculation for all inputs

---

## SUMMARY

**Problem:** Valid SMILES failing because system always called PubChem

**Solution:**
1. ✅ Classify input BEFORE calling PubChem
2. ✅ Accept valid SMILES even if not in PubChem
3. ✅ Show "Novel Structure" warning instead of error
4. ✅ Only show error for invalid names

**Result:** Valid SMILES strings now work correctly, with graceful degradation for novel structures.
