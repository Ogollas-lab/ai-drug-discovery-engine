CREATE TABLE public.compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  pubchem_cid INT UNIQUE,
  smiles TEXT NOT NULL,
  molecular_formula TEXT,
  molecular_weight REAL,
  xlogp REAL,
  hbd INT,
  hba INT,
  rotatable_bonds INT,
  tpsa REAL,
  drug_class TEXT,
  indication TEXT,
  source TEXT NOT NULL DEFAULT 'pubchem',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compounds TO anon, authenticated;
GRANT ALL ON public.compounds TO service_role;
ALTER TABLE public.compounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Compounds are publicly readable" ON public.compounds FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_compounds_name ON public.compounds (lower(name));
CREATE INDEX idx_compounds_synonyms ON public.compounds USING GIN (synonyms);