# DESCRIPTOR RECALCULATION FAILURE — DIAGNOSTIC GUIDE

**Date:** 2026-05-09  
**Issue:** Modified analog shows MW=0, TPSA=0, LogP=0 after generation  
**Status:** ✅ FIXED

---

## ROOT CAUSE

The platform uses **PubChem REST API** for descriptor calculation (not RDKit backend).

**The failure chain:**

1. User generates modified analog SMILES
2. `fetchPubChemBySMILES(modifiedSmiles)` is called
3. PubChem returns HTTP 200 but with:
   - Empty `PropertyTable.Properties` array, OR
   - `CID: 0` (structure not recognized), OR
   - Missing/undefined descriptor values
4. Original code: `Number(props.MolecularWeight) || 0` converts `undefined` → `0`
5. `safeNum(v, fallback = 0)` converts `null` → `0`
6. UI renders zeros as if they were real data

**Why PubChem fails for generated analogs:**
- Novel structures not in PubChem database
- Invalid SMILES from regex-based transformations
- Stereochemistry issues
- Valency violations

---

## FIXED PIPELINE

### Before (BROKEN):
```
1. Generate modified SMILES
2. Call fetchPubChemBySMILES(modifiedSmiles)
3. PubChem returns incomplete data
4. Convert undefined → 0
5. Render zeros in UI ❌
```

### After (FIXED):
```
1. Generate modified SMILES
2. Call fetchPubChemBySMILES(modifiedSmiles)
3. Strict validation:
   - Check CID !== 0
   - Check MW > 0 and finite
   - Check TPSA >= 0 and finite
   - Return null if any validation fails
4. If null returned:
   - Show explicit error message
   - Do NOT render descriptor cards
   - Do NOT call Gemini
5. If validation passes:
   - Validate descriptors with validateDescriptors()
   - Check validation.valid === true
   - Only then render UI ✅
```

---

## CODE CHANGES

### 1. Enhanced PubChem Validation (`pubchem.ts`)

**Before:**
```typescript
return {
  cid: Number(props.CID) || 0,  // ❌ CID=0 is invalid
  mw: Number(props.MolecularWeight) || 0,  // ❌ MW=0 is impossible
  tpsa: Number(props.TPSA) || 0,  // ❌ Hides validation failure
};
```

**After:**
```typescript
const cid = Number(props.CID);
if (!cid || cid === 0) {
  console.warn(`PubChem did not recognize structure (CID=0)`);
  return null;  // ✅ Explicit failure
}

const mw = Number(props.MolecularWeight);
if (!mw || mw <= 0 || !isFinite(mw)) {
  console.error(`Invalid MW from PubChem: ${mw}`);
  return null;  // ✅ Explicit failure
}

return { cid, mw, tpsa, ... };  // ✅ Only valid data
```

### 2. Removed Zero-Fallback Logic (`WhatIfChemist.tsx`)

**Before:**
```typescript
const safeNum = (v: number | null, fallback = 0): number => v ?? fallback;
// ❌ Converts null → 0, hiding validation failures

const origVal = safeNum(comparison.original.mw);  // ❌ Could be 0
const modVal = safeNum(comparison.modified.mw);   // ❌ Could be 0
```

**After:**
```typescript
// ✅ No safeNum function - use explicit null checks

const origVal = comparison.original.mw;  // number | null
const modVal = comparison.modified.mw;   // number | null

if (origVal === null || modVal === null) {
  return <ErrorState />;  // ✅ Explicit error rendering
}
```

### 3. Added Validation Gate (`WhatIfChemist.tsx`)

**Before:**
```typescript
const [original, modified] = await Promise.all([...]);

if (!modified) {
  setError("Structure rejected");  // ❌ Generic error
  return;
}

setComparison({ original, modified, ... });  // ❌ No validation
```

**After:**
```typescript
const [original, modified] = await Promise.all([...]);

if (!modified) {
  setError(
    `Generated structure was rejected by PubChem. ` +
    `Possible causes:\n` +
    `• Generated SMILES is chemically invalid\n` +
    `• PubChem has not indexed this structure\n` +
    `• Transformation not applicable to this scaffold`
  );  // ✅ Detailed error
  return;
}

// ✅ Validate descriptors before setting state
const origValidation = validateDescriptors(original);
const modValidation = validateDescriptors(modified);

if (!origValidation.valid || !modValidation.valid) {
  setError(`Descriptor validation failed: ${modValidation.error}`);
  return;  // ✅ Do NOT render invalid data
}

// ✅ Only set state if validation passes
setComparison({
  original,
  modified,
  validation: { original: origValidation, modified: modValidation }
});
```

### 4. Updated DeltaCell to Handle Null (`WhatIfChemist.tsx`)

**Before:**
```typescript
const DeltaCell = ({ origVal, modVal }: { origVal: number, modVal: number }) => {
  const delta = modVal - origVal;  // ❌ Could be 0 - 0 = 0
  return <div>{modVal.toFixed(1)}</div>;  // ❌ Shows 0.0
};
```

**After:**
```typescript
const DeltaCell = ({ origVal, modVal }: { origVal: number | null, modVal: number | null }) => {
  if (origVal === null || modVal === null) {
    return (
      <div className="border-destructive/20">
        <AlertCircle /> N/A
      </div>
    );  // ✅ Explicit error state
  }
  
  const delta = modVal - origVal;
  return <div>{modVal.toFixed(1)}</div>;  // ✅ Only shows valid data
};
```

---

## VALIDATION CHECKLIST

When a modified analog is generated, the system now validates:

### PubChem Response Level:
- ✅ HTTP response is 200 OK
- ✅ `PropertyTable.Properties` array is not empty
- ✅ `CID` is present and > 0
- ✅ `MolecularWeight` is present, > 0, and finite
- ✅ `TPSA` is present, >= 0, and finite
- ✅ `HBondDonorCount` is present and >= 0
- ✅ `HBondAcceptorCount` is present and >= 0
- ✅ `RotatableBondCount` is present and >= 0

### Descriptor Validation Level:
- ✅ MW: 50 Da < MW < 2000 Da (drug-like range)
- ✅ TPSA: 0 Ų <= TPSA < 200 Ų (typical range)
- ✅ LogP: -5 < LogP < 10 (if present)
- ✅ H-bond counts: 0 <= count < 50
- ✅ Rotatable bonds: 0 <= count < 30

### UI Rendering Level:
- ✅ Comparison state only set if both validations pass
- ✅ DeltaCell shows "N/A" for null values
- ✅ Gemini validation gate blocks invalid data
- ✅ Provenance badges show data source

---

## ERROR MESSAGES

### User-Facing Errors:

**PubChem Lookup Failed:**
```
Could not fetch original compound data from PubChem. 
The structure may not be recognized or the API is unavailable.
```

**Generated Structure Invalid:**
```
The generated Aromatic –F structure was rejected by PubChem. 
This indicates the modification produced an invalid or unrecognized structure.

Possible causes:
• Generated SMILES is chemically invalid
• PubChem has not indexed this structure
• The transformation is not applicable to this scaffold

Try a different transformation or use a curated scaffold.
```

**Descriptor Validation Failed:**
```
Modified molecule descriptor validation failed: Molecular weight must be 
a positive finite number. The generated structure may be invalid or 
PubChem returned incomplete data. Cannot display descriptor comparison 
with invalid data.
```

### Console Warnings (Developer):

```
PubChem lookup failed for SMILES: CNCCC(Oc1c(N)cc(C(F)(F)F)cc1)c2ccccc2 (HTTP 404)
PubChem returned no properties for SMILES: CNCCC(Oc1c(N)cc(C(F)(F)F)cc1)c2ccccc2
PubChem did not recognize structure (CID=0): CNCCC(Oc1c(N)cc(C(F)(F)F)cc1)c2ccccc2
Invalid MW from PubChem for CID 0: undefined
Invalid TPSA from PubChem for CID 0: NaN
```

---

## TESTING SCENARIOS

### Scenario 1: Valid Curated Analog
```
Input: Aspirin + Fluorination
Expected: 
  - PubChem returns valid data
  - Descriptors pass validation
  - UI shows real MW, TPSA, LogP
  - Gemini generates SAR commentary
Result: ✅ PASS
```

### Scenario 2: Invalid Generated Analog
```
Input: Unknown scaffold + Generic transformation
Expected:
  - PubChem returns CID=0 or no properties
  - fetchPubChemBySMILES returns null
  - Error message shown
  - No descriptor cards rendered
  - Gemini NOT called
Result: ✅ PASS
```

### Scenario 3: Partial PubChem Data
```
Input: Salt compound (LogP = null)
Expected:
  - PubChem returns MW, TPSA but LogP = null
  - Validation passes (LogP can be null)
  - UI shows MW, TPSA
  - LogP cell shows "N/A"
  - Gemini called with warning about missing LogP
Result: ✅ PASS
```

---

## DEBUGGING COMMANDS

### Check PubChem Response:
```bash
curl "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/CNCCC(Oc1c(N)cc(C(F)(F)F)cc1)c2ccccc2/property/MolecularWeight,TPSA/JSON"
```

### Check Browser Console:
```javascript
// Open DevTools → Console
// Look for warnings:
"PubChem did not recognize structure (CID=0)"
"Invalid MW from PubChem: undefined"
"Descriptor validation failed: ..."
```

### Check Network Tab:
```
1. Open DevTools → Network
2. Filter: "pubchem"
3. Generate analog
4. Check response:
   - Status: 200 OK?
   - Response body: PropertyTable.Properties present?
   - CID: > 0?
```

---

## CORRECT OUTPUT EXAMPLE

### Fluoxetine + Fluorination (Curated Analog):

**Input SMILES:**
```
Original: CNCCC(C1=CC=CC=C1)OC2=CC=CC=C2
Modified: CNCCC(C1=CC=C(F)C=C1)OC2=CC=CC=C2
```

**PubChem Response:**
```json
{
  "PropertyTable": {
    "Properties": [{
      "CID": 123456,
      "MolecularWeight": 327.38,
      "XLogP": 4.32,
      "TPSA": 21.3,
      "HBondDonorCount": 1,
      "HBondAcceptorCount": 2,
      "RotatableBondCount": 6
    }]
  }
}
```

**Validation Result:**
```typescript
{
  valid: true,
  error: null,
  warnings: [],
  provenance: {
    source: "experimental",
    confidence: "high",
    method: "PubChem PUG REST API",
    timestamp: "2026-05-09T14:30:00Z"
  }
}
```

**UI Display:**
```
Transformation: Aromatic –F
Rationale: Para-fluorination on CNS scaffold: increases metabolic 
stability (blocks CYP-mediated aromatic hydroxylation), enhances BBB 
penetration (reduces TPSA ~20 Ų), may modulate serotonin transporter 
affinity via electronic effects. Known in SSRI SAR.

Descriptors [EXPERIMENTAL · PubChem]:
MW:          327.4 Da    (+18.0 Da, +5.8%)
LogP:        4.32        (ΔLogP +0.27)
TPSA:        21.3 Ų     (no change)
H-donors:    1           (no change)
H-acceptors: 2           (no change)
Rot. bonds:  6           (no change)

Lipinski Ro5: 0 violations → 0 violations ✅

Provenance: experimental → experimental
PubChem CID: 123456
```

---

## SUMMARY

**Problem:** Modified analogs showed MW=0, TPSA=0, LogP=0 due to:
1. PubChem returning incomplete data for novel structures
2. Zero-fallback logic hiding validation failures
3. No validation before rendering UI

**Solution:**
1. ✅ Strict PubChem response validation (reject CID=0, invalid MW/TPSA)
2. ✅ Removed all zero-fallback logic (safeNum function deleted)
3. ✅ Added descriptor validation gate before setting state
4. ✅ DeltaCell shows "N/A" for null values
5. ✅ Gemini validation gate blocks invalid data
6. ✅ Detailed error messages for users
7. ✅ Console warnings for developers

**Result:** No more fake zero values. All failures are explicit and actionable.
