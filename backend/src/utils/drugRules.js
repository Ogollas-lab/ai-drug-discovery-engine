/**
 * Drug Discovery Rule-Based Validation
 * Enforces hard scientific constraints before AI analysis
 * Prevents hallucination by providing verified chemical rules
 */

/**
 * Apply medicinal chemistry rules to molecular data
 * Returns a structured assessment of drug-likeness criteria
 */
function applyDrugRules(data) {
  const rules = {};

  // 1. BBB PENETRATION RULE
  if (data.tpsa !== undefined) {
    if (data.tpsa < 60) {
      rules.bbb = {
        assessment: "High likelihood of BBB penetration",
        reasoning: `TPSA ${data.tpsa.toFixed(1)} Å² is optimal for CNS drugs`,
        category: "CNS-active"
      };
    } else if (data.tpsa <= 90) {
      rules.bbb = {
        assessment: "Limited or uncertain BBB penetration",
        reasoning: `TPSA ${data.tpsa.toFixed(1)} Å² is borderline; CNS penetration unlikely`,
        category: "CNS-limited"
      };
    } else {
      rules.bbb = {
        assessment: "Poor BBB penetration",
        reasoning: `TPSA ${data.tpsa.toFixed(1)} Å² exceeds optimal threshold; not suitable for CNS targets`,
        category: "peripheral"
      };
    }
  }

  // 2. LIPINSKI'S RULE OF FIVE
  const lipinskiChecks = [];
  let lipinskiPassed = 0;

  if (data.molecularWeight !== undefined) {
    lipinskiChecks.push({
      rule: "Molecular Weight < 500 Da",
      value: data.molecularWeight,
      status: data.molecularWeight < 500 ? "✓" : "✗"
    });
    if (data.molecularWeight < 500) lipinskiPassed++;
  }

  if (data.logP !== undefined) {
    lipinskiChecks.push({
      rule: "LogP < 5",
      value: data.logP,
      status: data.logP < 5 ? "✓" : "✗"
    });
    if (data.logP < 5) lipinskiPassed++;
  }

  if (data.hBondDonors !== undefined) {
    lipinskiChecks.push({
      rule: "H-Bond Donors ≤ 5",
      value: data.hBondDonors,
      status: data.hBondDonors <= 5 ? "✓" : "✗"
    });
    if (data.hBondDonors <= 5) lipinskiPassed++;
  }

  if (data.hBondAcceptors !== undefined) {
    lipinskiChecks.push({
      rule: "H-Bond Acceptors ≤ 10",
      value: data.hBondAcceptors,
      status: data.hBondAcceptors <= 10 ? "✓" : "✗"
    });
    if (data.hBondAcceptors <= 10) lipinskiPassed++;
  }

  rules.lipinski = {
    assessment: `Passes ${lipinskiPassed}/4 Lipinski criteria`,
    status: lipinskiPassed === 4 ? "compliant" : lipinskiPassed >= 3 ? "marginal" : "non-compliant",
    details: lipinskiChecks,
    reasoning: lipinskiPassed === 4 
      ? "Meets all Lipinski criteria; good oral bioavailability expected"
      : lipinskiPassed >= 3
      ? "Violates one Lipinski criterion; may have reduced oral bioavailability"
      : "Violates multiple Lipinski criteria; poor oral bioavailability likely"
  };

  // 3. SOLUBILITY LOGIC
  if (data.solubility !== undefined) {
    rules.solubility = {
      status: data.solubility,
      advice: data.solubility === "high" || data.solubility === "good"
        ? "Solubility is adequate; absorption should not be limiting"
        : data.solubility === "moderate"
        ? "Solubility is acceptable; monitor bioavailability in vivo"
        : "Poor solubility may limit absorption; consider formulation strategies"
    };
  }

  // 4. ROTATABLE BONDS (Flexibility)
  if (data.rotatableBonds !== undefined) {
    rules.flexibility = {
      value: data.rotatableBonds,
      assessment: data.rotatableBonds <= 10 
        ? "Good flexibility; likely to have good bioavailability"
        : "Excessive flexibility; may have reduced cell penetration"
    };
  }

  // 5. AROMATIC RINGS
  if (data.aromaticRings !== undefined) {
    rules.aromaticity = {
      value: data.aromaticRings,
      assessment: data.aromaticRings <= 3
        ? "Optimal aromaticity for target engagement"
        : "High aromaticity; may increase hERG interaction risk"
    };
  }

  // 6. DATA COMPLETENESS CHECK
  const providedFields = Object.keys(data).filter(
    k => data[k] !== undefined && data[k] !== null
  ).length;
  
  rules.dataCompleteness = {
    fieldsProvided: providedFields,
    assessment: providedFields >= 6 
      ? "Complete physicochemical profile provided"
      : providedFields >= 4
      ? "Adequate data for basic assessment"
      : "Incomplete data; interpretation with caution",
    status: "verified"
  };

  return rules;
}

/**
 * Generate context-aware recommendations based on molecular properties
 * Avoids generic advice like "optimize solubility"
 */
function generateRecommendations(data, rules) {
  const recommendations = [];

  // BBB-based recommendations
  if (rules.bbb) {
    if (rules.bbb.category === "CNS-active" && data.targetType !== "CNS") {
      recommendations.push({
        type: "off-target-risk",
        severity: "medium",
        text: "High BBB penetration may cause unintended CNS effects; consider structural modifications to increase TPSA if targeting peripheral tissues"
      });
    } else if (rules.bbb.category === "peripheral" && data.targetType === "CNS") {
      recommendations.push({
        type: "insufficient-penetration",
        severity: "high",
        text: "Poor BBB penetration incompatible with CNS target; reduce TPSA through structural optimization"
      });
    }
  }

  // hERG risk
  if (data.hERGInhibition) {
    if (data.hERGInhibition > 0.6) {
      recommendations.push({
        type: "cardiac-risk",
        severity: "high",
        text: "Strong hERG inhibition (>0.6); high risk of QT prolongation and cardiac toxicity. Urgent medicinal chemistry optimization required"
      });
    } else if (data.hERGInhibition > 0.3) {
      recommendations.push({
        type: "cardiac-risk",
        severity: "medium",
        text: "Moderate hERG interaction; recommend cardiac safety assessment in preclinical studies"
      });
    }
  }

  // CYP3A4 metabolism
  if (data.cyp3a4Inhibition) {
    if (data.cyp3a4Inhibition > 0.5) {
      recommendations.push({
        type: "metabolism",
        severity: "medium",
        text: "Strong CYP3A4 inhibition; high drug-drug interaction potential. Monitor for pharmacokinetic interactions"
      });
    } else if (data.cyp3a4Inhibition > 0.2) {
      recommendations.push({
        type: "metabolism",
        severity: "low",
        text: "Moderate CYP3A4 interaction; evaluate metabolic stability and drug-drug interaction profile"
      });
    }
  }

  // Lipinski violations
  if (rules.lipinski && rules.lipinski.status === "non-compliant") {
    const violations = rules.lipinski.details
      .filter(d => d.status === "✗")
      .map(d => d.rule);
    recommendations.push({
      type: "druggability",
      severity: "high",
      text: `Violates Lipinski criteria (${violations.join(", ")}); expect poor oral bioavailability. Consider structural redesign`
    });
  }

  // Solubility-based recommendations
  if (rules.solubility && rules.solubility.status === "poor") {
    recommendations.push({
      type: "formulation",
      severity: "medium",
      text: "Poor aqueous solubility; recommend solubilization strategies (salt formation, lipophilic prodrugs, or nanoparticulate formulation)"
    });
  }

  // Flexibility analysis
  if (rules.flexibility && data.rotatableBonds > 10) {
    recommendations.push({
      type: "conformational",
      severity: "low",
      text: `High rotatable bond count (${data.rotatableBonds}); consider ring closure or conformational constraint to improve potency`
    });
  }

  return recommendations;
}

/**
 * Generate a structured chemistry context for Gemini
 * Provides factual constraints that LLM must respect
 */
function generateChemistryContext(data, rules) {
  return {
    moleculeData: {
      name: data.molecularName || "Unknown",
      smiles: data.smiles || "Not provided",
      physicalProperties: {
        molecularWeight: data.molecularWeight ? `${data.molecularWeight.toFixed(1)} Da` : "Not provided",
        logP: data.logP ? `${data.logP.toFixed(2)}` : "Not provided",
        tpsa: data.tpsa ? `${data.tpsa.toFixed(1)} Ų` : "Not provided",
        rotatableBonds: data.rotatableBonds ?? "Not provided",
        hBondDonors: data.hBondDonors ?? "Not provided",
        hBondAcceptors: data.hBondAcceptors ?? "Not provided",
        aromaticRings: data.aromaticRings ?? "Not provided"
      },
      dataSource: "PubChem (experimentally verified)"
    },
    derivedRules: {
      bbbPenetration: rules.bbb || {},
      lipinskiCompliance: rules.lipinski || {},
      solubilityAssessment: rules.solubility || {},
      flexibilityAnalysis: rules.flexibility || {},
      dataCompleteness: rules.dataCompleteness || {}
    },
    scientificConstraints: [
      "TPSA < 60 Ų → good BBB penetration; TPSA > 90 Ų → poor BBB penetration",
      "MW < 500 Da, LogP < 5, HBD ≤ 5, HBA ≤ 10 → Lipinski compliance",
      "Only reference provided values; do NOT claim missing data if values are given",
      "Distinguish between experimental (PubChem) and predicted (AI) data in analysis"
    ],
    userTarget: data.targetName || "Unknown"
  };
}

/**
 * Post-process Gemini response to correct hallucinations
 * Acts as a final validation layer
 */
function validateAnalysisOutput(text, data, rules) {
  let corrected = text;

  // BBB penetration correction
  if (rules.bbb && data.tpsa > 70) {
    const bbbPatterns = [
      "good blood-brain barrier penetration",
      "strong BBB penetration",
      "likely crosses the blood-brain barrier",
      "excellent CNS penetration"
    ];
    
    for (const pattern of bbbPatterns) {
      const regex = new RegExp(pattern, "gi");
      if (regex.test(corrected)) {
        corrected = corrected.replace(
          regex,
          "limited blood-brain barrier penetration"
        );
        console.log(`🔧 Corrected BBB statement (TPSA=${data.tpsa})`);
      }
    }
  }

  // Data availability correction
  if (data.molecularWeight && corrected.includes("molecular weight is missing")) {
    corrected = corrected.replace(
      "molecular weight is missing",
      `molecular weight is ${data.molecularWeight.toFixed(1)} Da`
    );
    console.log(`🔧 Corrected missing MW claim`);
  }

  if (data.logP !== undefined && corrected.includes("LogP data is not available")) {
    corrected = corrected.replace(
      "LogP data is not available",
      `LogP is ${data.logP.toFixed(2)}`
    );
    console.log(`🔧 Corrected missing LogP claim`);
  }

  return corrected;
}

module.exports = {
  applyDrugRules,
  generateRecommendations,
  generateChemistryContext,
  validateAnalysisOutput
};
