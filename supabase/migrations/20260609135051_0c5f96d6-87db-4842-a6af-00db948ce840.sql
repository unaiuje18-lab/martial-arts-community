
-- posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  caption TEXT NOT NULL,
  video TEXT NOT NULL,
  poster TEXT NOT NULL,
  video_path TEXT,
  poster_path TEXT,
  art TEXT NOT NULL,
  level TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  likes INT NOT NULL DEFAULT 0,
  comments INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO anon, authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts public read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts public insert" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "posts public update" ON public.posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "posts public delete" ON public.posts FOR DELETE USING (true);

-- duels
CREATE TABLE public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  technique TEXT NOT NULL,
  a_handle TEXT NOT NULL,
  a_poster TEXT NOT NULL,
  a_poster_path TEXT,
  a_votes INT NOT NULL DEFAULT 0,
  b_handle TEXT NOT NULL,
  b_poster TEXT NOT NULL,
  b_poster_path TEXT,
  b_votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duels TO anon, authenticated;
GRANT ALL ON public.duels TO service_role;
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duels public read" ON public.duels FOR SELECT USING (true);
CREATE POLICY "duels public insert" ON public.duels FOR INSERT WITH CHECK (true);
CREATE POLICY "duels public update" ON public.duels FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "duels public delete" ON public.duels FOR DELETE USING (true);

-- storage policies for media bucket (allow anon RW since app has no auth)
CREATE POLICY "media public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "media public insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'media');
CREATE POLICY "media public update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');
CREATE POLICY "media public delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'media');
