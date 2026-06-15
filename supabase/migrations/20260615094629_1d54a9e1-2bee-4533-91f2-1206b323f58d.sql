
-- =========================================================
-- 1. posts.visibility
-- =========================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','private'));

CREATE INDEX IF NOT EXISTS posts_visibility_idx ON public.posts (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_art_idx ON public.posts (art, created_at DESC);

-- Replace the broad public-read policy with one that hides private posts from
-- everyone except their owner.
DROP POLICY IF EXISTS "posts public read" ON public.posts;
CREATE POLICY "posts read public or own" ON public.posts
  FOR SELECT
  TO public
  USING (visibility = 'public' OR auth.uid() = user_id);

-- =========================================================
-- 2. post_likes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_likes_user_idx ON public.post_likes (user_id, created_at DESC);

GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_likes read all" ON public.post_likes FOR SELECT TO public USING (true);
CREATE POLICY "post_likes insert own" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes delete own" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 3. post_comments (1-level replies via parent_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 2000),
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON public.post_comments (parent_id, created_at ASC);

GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_comments read all" ON public.post_comments FOR SELECT TO public USING (true);
CREATE POLICY "post_comments insert own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments delete by author or post owner" ON public.post_comments
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT p.user_id FROM public.posts p WHERE p.id = post_id)
  );

-- One-level reply enforcement: parent must itself be a top-level comment.
CREATE OR REPLACE FUNCTION public.enforce_comment_one_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.post_comments WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Comments only support one level of replies';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_one_level ON public.post_comments;
CREATE TRIGGER trg_comments_one_level
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_one_level();

-- =========================================================
-- 4. comment_likes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT ON public.comment_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_likes read all" ON public.comment_likes FOR SELECT TO public USING (true);
CREATE POLICY "comment_likes insert own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_likes delete own" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 5. follows
-- =========================================================
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows (following_id);

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows read all" ON public.follows FOR SELECT TO public USING (true);
CREATE POLICY "follows insert own" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows delete own" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- =========================================================
-- 6. user_art_affinity
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_art_affinity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  art text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, art)
);

GRANT SELECT ON public.user_art_affinity TO authenticated;
GRANT ALL ON public.user_art_affinity TO service_role;

ALTER TABLE public.user_art_affinity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affinity read own" ON public.user_art_affinity FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 7. duel_votes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.duel_votes (
  duel_id uuid NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('a','b')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (duel_id, user_id)
);

GRANT SELECT ON public.duel_votes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duel_votes TO authenticated;
GRANT ALL ON public.duel_votes TO service_role;

ALTER TABLE public.duel_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duel_votes read all" ON public.duel_votes FOR SELECT TO public USING (true);
CREATE POLICY "duel_votes insert own" ON public.duel_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "duel_votes update own" ON public.duel_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "duel_votes delete own" ON public.duel_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 8. Counter triggers
-- =========================================================

-- Posts.likes counter + user_art_affinity bump
CREATE OR REPLACE FUNCTION public.on_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_art text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes = likes + 1 WHERE id = NEW.post_id RETURNING art INTO v_art;
    IF v_art IS NOT NULL THEN
      INSERT INTO public.user_art_affinity (user_id, art, score, updated_at)
      VALUES (NEW.user_id, v_art, 1, now())
      ON CONFLICT (user_id, art)
      DO UPDATE SET score = public.user_art_affinity.score + 1, updated_at = now();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes = GREATEST(0, likes - 1) WHERE id = OLD.post_id RETURNING art INTO v_art;
    IF v_art IS NOT NULL THEN
      UPDATE public.user_art_affinity
        SET score = GREATEST(0, score - 1), updated_at = now()
        WHERE user_id = OLD.user_id AND art = v_art;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.on_post_like();

-- Posts.comments counter
CREATE OR REPLACE FUNCTION public.on_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments = comments + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments = GREATEST(0, comments - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_post_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.on_post_comment();

-- Comment likes counter
CREATE OR REPLACE FUNCTION public.on_comment_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET likes = likes + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments SET likes = GREATEST(0, likes - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_likes_count ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.on_comment_like();

-- Duel votes counters
CREATE OR REPLACE FUNCTION public.on_duel_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.side = 'a' THEN
      UPDATE public.duels SET a_votes = a_votes + 1 WHERE id = NEW.duel_id;
    ELSE
      UPDATE public.duels SET b_votes = b_votes + 1 WHERE id = NEW.duel_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.side = 'a' THEN
      UPDATE public.duels SET a_votes = GREATEST(0, a_votes - 1) WHERE id = OLD.duel_id;
    ELSE
      UPDATE public.duels SET b_votes = GREATEST(0, b_votes - 1) WHERE id = OLD.duel_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.side <> OLD.side THEN
    IF OLD.side = 'a' THEN
      UPDATE public.duels SET a_votes = GREATEST(0, a_votes - 1), b_votes = b_votes + 1 WHERE id = OLD.duel_id;
    ELSE
      UPDATE public.duels SET b_votes = GREATEST(0, b_votes - 1), a_votes = a_votes + 1 WHERE id = OLD.duel_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_duel_votes_count ON public.duel_votes;
CREATE TRIGGER trg_duel_votes_count
  AFTER INSERT OR UPDATE OR DELETE ON public.duel_votes
  FOR EACH ROW EXECUTE FUNCTION public.on_duel_vote();

-- =========================================================
-- 9. Feed RPC — affinity + follow + recency, cursor by created_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id uuid,
  p_cursor timestamptz,
  p_limit int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  handle text,
  caption text,
  video text,
  poster text,
  art text,
  level text,
  tags text[],
  likes integer,
  comments integer,
  created_at timestamptz,
  visibility text,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT p.*,
      COALESCE(a.score, 0)::double precision AS affinity,
      CASE WHEN p_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_user_id AND f.following_id = p.user_id
      ) THEN 1.0 ELSE 0.0 END AS follow_bonus,
      -- Half-life ~ 3 days; decays from 1.0 toward 0.
      EXP(-EXTRACT(EPOCH FROM (now() - p.created_at)) / (3 * 86400.0)) AS recency
    FROM public.posts p
    LEFT JOIN public.user_art_affinity a
      ON p_user_id IS NOT NULL AND a.user_id = p_user_id AND a.art = p.art
    WHERE (p.visibility = 'public' OR p.user_id = p_user_id)
      AND (p_cursor IS NULL OR p.created_at < p_cursor)
  )
  SELECT
    id, user_id, handle, caption, video, poster, art, level, tags, likes, comments, created_at, visibility,
    (0.5 * LEAST(affinity / 10.0, 1.0) + 0.3 * follow_bonus + 0.4 * recency) AS score
  FROM base
  ORDER BY score DESC, created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_feed(uuid, timestamptz, int) TO anon, authenticated, service_role;
