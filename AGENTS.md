# Architecture rules

- Scope landing-page visual refinements through the `landing-page` root and semantic CSS tokens so research tools and other routes retain their existing presentation.- Store reference compounds in the public `compounds` table and have the chat function read it first, falling back to PubChem and caching new results, so answers use real stored values.
- Classroom simulation compounds must use SMILES verified to resolve on PubChem (CID > 0), and failed lookups are skipped rather than retried, because hand-written SMILES often return CID=0 and retrying stalls the simulation.
