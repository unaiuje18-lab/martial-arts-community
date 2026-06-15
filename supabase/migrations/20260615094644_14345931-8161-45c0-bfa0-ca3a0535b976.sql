
REVOKE EXECUTE ON FUNCTION public.enforce_comment_one_level() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_post_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_post_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_comment_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_duel_vote() FROM PUBLIC, anon, authenticated;
