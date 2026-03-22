/**
 * Database Seeding Script
 * Loads sample molecules and predictions for testing
 * Run with: node src/scripts/seedDatabase.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Molecule = require('../models/Molecule');
const Prediction = require('../models/Prediction');
const Simulation = require('../models/Simulation');

// Sample molecules (real SMILES)
const SAMPLE_MOLECULES = [
  {
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    commonName: 'Aspirin',
    iupacName: '2-acetyloxybenzoic acid',
    disease: 'Inflammation',
    mechanism: 'COX inhibitor',
    molecularWeight: 180.157,
    logP: 1.19,
    hBondDonors: 1,
    hBondAcceptors: 4,
    rotatableBonds: 2,
    topologicalPolarSurfaceArea: 63.6,
    pubchemCid: '2244'
  },
  {
    smiles: 'c1ccc2c(c1)ccc3c2cccc3',
    commonName: 'Anthracene',
    disease: 'Cancer',
    mechanism: 'PAH compound',
    molecularWeight: 178.23,
    logP: 4.54,
    hBondDonors: 0,
    hBondAcceptors: 0,
    rotatableBonds: 0,
    topologicalPolarSurfaceArea: 0,
    pubchemCid: '7924'
  },
  {
    smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    commonName: 'Ibuprofen',
    iupacName: '2-(4-isobutylphenyl)propionic acid',
    disease: 'Pain/Inflammation',
    mechanism: 'NSAID/COX inhibitor',
    molecularWeight: 206.28,
    logP: 3.97,
    hBondDonors: 1,
    hBondAcceptors: 2,
    rotatableBonds: 3,
    topologicalPolarSurfaceArea: 37.3,
    pubchemCid: '3672'
  },
  {
    smiles: 'CN1CCC[C@H]1c2cccnc2',
    commonName: 'Nicotine',
    disease: 'Addiction',
    mechanism: 'Acetylcholine receptor agonist',
    molecularWeight: 162.23,
    logP: 1.17,
    hBondDonors: 0,
    hBondAcceptors: 2,
    rotatableBonds: 2,
    topologicalPolarSurfaceArea: 14.8,
    pubchemCid: '89594'
  },
  {
    smiles: 'c1ccc(cc1)c2ccccc2',
    commonName: 'Biphenyl',
    disease: 'Industrial',
    mechanism: 'Organic compound',
    molecularWeight: 154.21,
    logP: 4.01,
    hBondDonors: 0,
    hBondAcceptors: 0,
    rotatableBonds: 0,
    topologicalPolarSurfaceArea: 0,
    pubchemCid: '8084'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalis-ai', {
    
    });
    console.log('✓ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Molecule.deleteMany({});
    await Prediction.deleteMany({});
    await Simulation.deleteMany({});
    console.log('✓ Database cleared\n');

    // Seed molecules
    console.log('📊 Seeding molecules...');
    const createdMolecules = await Molecule.insertMany(
      SAMPLE_MOLECULES.map(mol => ({
        ...mol,
        createdBy: 'seed-script',
        tags: ['sample', 'educational'],
        versions: [{
          versionNumber: 1,
          smiles: mol.smiles,
          modifications: 'Initial molecule',
          timestamp: new Date()
        }]
      }))
    );
    console.log(`✓ Created ${createdMolecules.length} molecules\n`);

    // Create sample predictions
    console.log('🔮 Creating sample predictions...');
    const predictions = [];

    for (const molecule of createdMolecules) {
      // Binding affinity prediction
      predictions.push({
        moleculeId: molecule._id,
        predictionType: 'binding-affinity',
        results: {
          bindingAffinity: {
            score: Math.random() * 500 + 10, // 10-510 nM
            confidence: Math.random() * 0.2 + 0.7, // 0.7-0.9
            unit: 'nM',
            targetProteins: [{
              name: 'COX-1',
              uniprotId: 'P23677',
              predictedKd: Math.random() * 500 + 10,
              confidence: Math.random() * 0.2 + 0.7
            }]
          }
        },
        aiModel: {
          name: 'Gemini 2.5 Flash',
          type: 'gemini-2.5-flash',
          version: '1.0'
        },
        summary: {
          keyHighlights: [
            `Predicted Kd: ${(Math.random() * 500 + 10).toFixed(1)} nM`,
            `Confidence: ${((Math.random() * 0.2 + 0.7) * 100).toFixed(1)}%`,
            'Target: COX-1'
          ]
        },
        executionTimeMs: Math.random() * 2000 + 1000,
        status: 'completed'
      });

      // Toxicity prediction
      predictions.push({
        moleculeId: molecule._id,
        predictionType: 'toxicity',
        results: {
          toxicity: {
            overallScore: Math.random() * 0.3,
            confidence: Math.random() * 0.2 + 0.75,
            categories: [
              { name: 'hepatotoxicity', score: Math.random() * 0.2 },
              { name: 'cardiotoxicity', score: Math.random() * 0.15 },
              { name: 'neurotoxicity', score: Math.random() * 0.1 }
            ]
          }
        },
        aiModel: {
          name: 'Gemini 2.5 Flash',
          type: 'gemini-2.5-flash'
        },
        summary: {
          keyHighlights: [
            `Toxicity Risk: ${(Math.random() * 30).toFixed(1)}%`,
            `Confidence: ${((Math.random() * 0.2 + 0.75) * 100).toFixed(1)}%`,
            'Categories: 3'
          ]
        },
        executionTimeMs: Math.random() * 1500 + 500,
        status: 'completed'
      });

      // ADME prediction
      predictions.push({
        moleculeId: molecule._id,
        predictionType: 'adme',
        results: {
          adme: {
            absorption: { value: Math.random() * 0.4 + 0.5, confidence: 0.8 },
            distribution: { value: Math.random() * 0.4 + 0.5, confidence: 0.8 },
            metabolism: { value: Math.random() * 0.3 + 0.6, confidence: 0.75 },
            excretion: { value: Math.random() * 0.4 + 0.5, confidence: 0.8 },
            bloodBrainBarrier: { value: Math.random() > 0.6, confidence: 0.85 }
          }
        },
        aiModel: {
          name: 'Gemini 2.5 Flash',
          type: 'gemini-2.5-flash'
        },
        summary: {
          keyHighlights: [
            `BBB Penetration: ${Math.random() > 0.6 ? 'Yes' : 'No'}`,
            `Absorption: ${(Math.random() * 40 + 50).toFixed(1)}%`,
            'PK: Favorable'
          ]
        },
        executionTimeMs: Math.random() * 1500 + 500,
        status: 'completed'
      });
    }

    const createdPredictions = await Prediction.insertMany(predictions);
    console.log(`✓ Created ${createdPredictions.length} predictions\n`);

    // Update molecules with prediction references
    console.log('🔗 Linking predictions to molecules...');
    for (const molecule of createdMolecules) {
      const molPredictions = predictions.filter(p => p.moleculeId.equals(molecule._id));
      
      const bindingPred = molPredictions.find(p => p.predictionType === 'binding-affinity');
      const toxPred = molPredictions.find(p => p.predictionType === 'toxicity');
      const admePred = molPredictions.find(p => p.predictionType === 'adme');

      molecule.predictions.bindingAffinity = {
        predicted: true,
        score: bindingPred.results.bindingAffinity.score,
        confidence: bindingPred.results.bindingAffinity.confidence,
        targetProtein: 'COX-1',
        unit: 'nM',
        timestamp: new Date()
      };

      molecule.predictions.toxicity = {
        predicted: true,
        score: toxPred.results.toxicity.overallScore,
        confidence: toxPred.results.toxicity.confidence,
        categories: toxPred.results.toxicity.categories.map(c => c.name),
        timestamp: new Date()
      };

      molecule.predictions.adme = {
        predicted: true,
        absorption: admePred.results.adme.absorption.value,
        distribution: admePred.results.adme.distribution.value,
        metabolism: admePred.results.adme.metabolism.value,
        excretion: admePred.results.adme.excretion.value,
        confidence: 0.8,
        timestamp: new Date()
      };

      await molecule.save();
    }
    console.log('✓ Predictions linked\n');

    // Create sample simulations
    console.log('🎬 Creating sample simulations...');
    const simulations = createdMolecules.slice(0, 3).map((mol, idx) => ({
      moleculeId: mol._id,
      name: `Educational Simulation ${idx + 1}: ${mol.commonName}`,
      simulationType: ['what-if', 'binding-affinity', 'adme'][idx % 3],
      parameters: {
        modifications: ['add_methyl_group', 'increase_hydrophobicity'],
        targetProtein: 'COX-1',
        disease: mol.disease
      },
      results: {
        baselineResults: { score: 50 },
        modifiedResults: { score: 65, improvement: 30 }
      },
      educationalMetadata: {
        learningObjectives: [
          'Understand structure-activity relationships',
          'Explore drug design principles',
          'Predict compound efficacy'
        ],
        complexity: 'intermediate',
        explanations: {
          molecularBasis: 'Modifications affect binding affinity through hydrophobic interactions',
          chemistryInsight: 'Adding methyl groups increases lipophilicity',
          pharmacologicalSignificance: 'Improved binding could enhance therapeutic efficacy'
        }
      },
      createdBy: 'seed-script',
      isPublic: true,
      viewCount: Math.floor(Math.random() * 100)
    }));

    const createdSimulations = await Simulation.insertMany(simulations);
    console.log(`✓ Created ${createdSimulations.length} simulations\n`);

    // Summary
    console.log('═══════════════════════════════════════════════');
    console.log('✨ Database seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   • Molecules: ${createdMolecules.length}`);
    console.log(`   • Predictions: ${createdPredictions.length}`);
    console.log(`   • Simulations: ${createdSimulations.length}`);
    console.log('\n📝 Sample Data:');
    createdMolecules.forEach(mol => {
      console.log(`   • ${mol.commonName} (${mol.smiles.substring(0, 30)}...)`);
    });
    console.log('\n🚀 Ready to start development!');
    console.log('═══════════════════════════════════════════════\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
