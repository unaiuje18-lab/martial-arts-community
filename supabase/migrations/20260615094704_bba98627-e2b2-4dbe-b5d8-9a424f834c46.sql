
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Recreate get_feed as SECURITY INVOKER reading the caller via auth.uid().
DROP FUNCTION IF EXISTS public.get_feed(uuid, timestamptz, int);

CREATE OR REPLACE FUNCTION public.get_feed(
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
SECURITY INVOKER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  base AS (
    SELECT p.*,
      COALESCE(a.score, 0)::double precision AS affinity,
      CASE WHEN (SELECT uid FROM me) IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = (SELECT uid FROM me) AND f.following_id = p.user_id
      ) THEN 1.0 ELSE 0.0 END AS follow_bonus,
      EXP(-EXTRACT(EPOCH FROM (now() - p.created_at)) / (3 * 86400.0)) AS recency
    FROM public.posts p
    LEFT JOIN public.user_art_affinity a
      ON a.user_id = (SELECT uid FROM me) AND a.art = p.art
    WHERE (p.visibility = 'public' OR p.user_id = (SELECT uid FROM me))
      AND (p_cursor IS NULL OR p.created_at < p_cursor)
  )
  SELECT
    id, user_id, handle, caption, video, poster, art, level, tags, likes, comments, created_at, visibility,
    (0.5 * LEAST(affinity / 10.0, 1.0) + 0.3 * follow_bonus + 0.4 * recency) AS score
  FROM base
  ORDER BY score DESC, created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_feed(timestamptz, int) TO anon, authenticated, service_role;
