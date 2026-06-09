-- 1) profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  primary_art text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) GRANTS — public read so feed can show authors, auth users manage their own
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 3) RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles read all"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles delete own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- 4) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_handle text;
  candidate text;
  suffix int := 0;
BEGIN
  -- Derive a base handle from metadata, email, or fallback
  base_handle := lower(regexp_replace(
    coalesce(
      NEW.raw_user_meta_data->>'handle',
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(coalesce(NEW.email, ''), '@', 1),
      'user'
    ),
    '[^a-z0-9_]', '_', 'g'
  ));
  IF base_handle = '' OR base_handle IS NULL THEN
    base_handle := 'user';
  END IF;

  candidate := base_handle;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_handle || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, handle, display_name, avatar_url)
  VALUES (
    NEW.id,
    candidate,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();