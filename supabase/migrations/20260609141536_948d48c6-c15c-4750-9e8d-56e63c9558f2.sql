-- POSTS
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);

DROP POLICY IF EXISTS "posts public insert" ON public.posts;
DROP POLICY IF EXISTS "posts public update" ON public.posts;
DROP POLICY IF EXISTS "posts public delete" ON public.posts;

CREATE POLICY "posts insert own"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts update own"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts delete own"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- DUELS
ALTER TABLE public.duels ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS duels_user_id_idx ON public.duels(user_id);

DROP POLICY IF EXISTS "duels public insert" ON public.duels;
DROP POLICY IF EXISTS "duels public update" ON public.duels;
DROP POLICY IF EXISTS "duels public delete" ON public.duels;

CREATE POLICY "duels insert own"
  ON public.duels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "duels update own"
  ON public.duels FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "duels delete own"
  ON public.duels FOR DELETE TO authenticated
  USING (auth.uid() = user_id);