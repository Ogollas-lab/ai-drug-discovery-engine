const axios = require('axios');

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const CHEMBL_BASE_URL = 'https://www.ebi.ac.uk/chembl/api/data';

class ExternalDataService {
  /**
   * Fetch molecular properties from PubChem by SMILES
   */
  static async fetchPubChemPropertiesBySMILES(smiles) {
    try {
      const encoded = encodeURIComponent(smiles);
      const url = `${PUBCHEM_BASE_URL}/compound/smiles/${encoded}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,MolecularFormula,IUPACName/JSON`;
      const response = await axios.get(url, { timeout: 15000 });

      const props = response.data?.PropertyTable?.Properties?.[0]
        || response.data?.properties?.[0];

      if (!props || !props.CID) {
        return null;
      }

      return {
        pubchemCid: props.CID,
        molecularWeight: props.MolecularWeight,
        molecularFormula: props.MolecularFormula,
        logP: props.XLogP ?? props.XLOGP ?? null,
        hBondDonors: props.HBondDonorCount,
        hBondAcceptors: props.HBondAcceptorCount,
        rotatableBonds: props.RotatableBondCount,
        topologicalPolarSurfaceArea: props.TPSA ?? props.TopoLogicalPolarSurfaceArea,
        iupacName: props.IUPACName,
        source: 'pubchem'
      };
    } catch (error) {
      console.warn(`PubChem lookup failed for SMILES ${smiles}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch compound details including bioassays from PubChem
   */
  static async fetchPubChemCompoundDetails(pubchemCid) {
    try {
      const response = await axios.get(
        `${PUBCHEM_BASE_URL}/compound/cid/${pubchemCid}/JSON`,
        { timeout: 10000 }
      );

      const compound = response.data.PC_Compounds[0];
      return {
        cid: pubchemCid,
        atoms: compound.atoms?.atom?.length || 0,
        bonds: compound.bonds?.bond?.length || 0,
        synonyms: compound.record?.reference?.[0]?.synonym || [],
        iupacName: compound.record?.reference?.[0]?.iupac_name || null
      };
    } catch (error) {
      console.warn(`PubChem detail lookup failed for CID ${pubchemCid}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch InChI and canonical SMILES from PubChem
   */
  static async fetchPubChemIdentifiers(pubchemCid) {
    try {
      const response = await axios.get(
        `${PUBCHEM_BASE_URL}/compound/cid/${pubchemCid}/property/CanonicalSMILES,InChI/JSON`,
        { timeout: 10000 }
      );

      const properties = response.data.properties[0];
      return {
        canonicalSmiles: properties.CanonicalSMILES,
        inchi: properties.InChI
      };
    } catch (error) {
      console.warn(`PubChem identifier lookup failed:`, error.message);
      return null;
    }
  }

  /**
   * Search similar compounds in PubChem
   */
  static async searchSimilarCompounds(smiles, threshold = 0.9) {
    try {
      const response = await axios.get(
        `${PUBCHEM_BASE_URL}/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON?Threshold=${threshold}`,
        { timeout: 10000 }
      );

      return response.data.IdentifierList?.CID || [];
    } catch (error) {
      console.warn(`Similar compound search failed:`, error.message);
      return [];
    }
  }

  /**
   * Fetch bioassay data from PubChem
   */
  static async fetchBioassayData(pubchemCid) {
    try {
      const response = await axios.get(
        `${PUBCHEM_BASE_URL}/compound/cid/${pubchemCid}/assays/JSON`,
        { timeout: 15000 }
      );

      const assays = response.data.InformationList?.Information || [];
      return assays.map(assay => ({
        aid: assay.AID,
        name: assay.AssayName,
        description: assay.Description,
        activeConcentration: assay.ActiveConcentrationMicromolar
      }));
    } catch (error) {
      console.warn(`Bioassay lookup failed:`, error.message);
      return [];
    }
  }

  /**
   * Search ChEMBL for bioactive molecules
   */
  static async searchChEMBL(smiles) {
    try {
      const response = await axios.get(
        `${CHEMBL_BASE_URL}/molecule`,
        {
          params: {
            filters: `smiles__exact:'${smiles}'`,
            format: 'json',
            limit: 50
          },
          timeout: 10000
        }
      );

      return response.data.molecules || [];
    } catch (error) {
      console.warn(`ChEMBL search failed:`, error.message);
      return [];
    }
  }

  /**
   * Fetch activity data from ChEMBL for a molecule
   */
  static async fetchChEMBLActivity(chemblId) {
    try {
      const response = await axios.get(
        `${CHEMBL_BASE_URL}/molecule/${chemblId}/activities`,
        { timeout: 10000 }
      );

      return response.data.activities || [];
    } catch (error) {
      console.warn(`ChEMBL activity lookup failed:`, error.message);
      return [];
    }
  }

  /**
   * Fetch target information from ChEMBL
   */
  static async fetchChEMBLTarget(targetId) {
    try {
      const response = await axios.get(
        `${CHEMBL_BASE_URL}/target/${targetId}`,
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      console.warn(`ChEMBL target lookup failed:`, error.message);
      return null;
    }
  }

  /**
   * Comprehensive molecule lookup combining PubChem and ChEMBL
   */
  static async comprehensiveMoleculeLookup(smiles, { includeBioassays = false } = {}) {
    const [pubChemData, chemblData] = await Promise.all([
      this.fetchPubChemPropertiesBySMILES(smiles),
      this.searchChEMBL(smiles)
    ]);

    let bioassayData = [];
    if (includeBioassays && pubChemData?.pubchemCid) {
      bioassayData = await this.fetchBioassayData(pubChemData.pubchemCid);
    }

    return {
      pubchem: pubChemData,
      chembl: chemblData,
      bioassays: bioassayData,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate molecule SMILES syntax
   */
  static validateSMILES(smiles) {
    // Basic SMILES validation
    const smilesRegex = /^[A-Za-z0-9\[\]\(\)\\\/\-=#+@%]{1,}$/;
    return smilesRegex.test(smiles);
  }

  /**
   * Get drug-like properties check (Lipinski's Rule of Five)
   */
  static checkLipinskiCompliance(molecule) {
    const violations = [];

    if (molecule.molecularWeight > 500) {
      violations.push('Molecular weight > 500 Da');
    }
    if (molecule.logP > 5) {
      violations.push('LogP > 5');
    }
    if (molecule.hBondDonors > 5) {
      violations.push('HBond donors > 5');
    }
    if (molecule.hBondAcceptors > 10) {
      violations.push('HBond acceptors > 10');
    }

    return {
      compliant: violations.length <= 1,
      violations,
      violationCount: violations.length
    };
  }
}

module.exports = ExternalDataService;
