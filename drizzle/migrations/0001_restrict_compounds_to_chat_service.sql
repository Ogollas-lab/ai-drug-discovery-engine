DROP POLICY IF EXISTS "Compounds are publicly readable" ON public.compounds;
REVOKE ALL ON TABLE public.compounds FROM anon, authenticated;
GRANT ALL ON TABLE public.compounds TO service_role;
ALTER TABLE public.compounds ENABLE ROW LEVEL SECURITY;