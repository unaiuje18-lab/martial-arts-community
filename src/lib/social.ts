import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Browser-side social layer. Uses the user's session via the RLS-aware
 * supabase client — no need for server functions for these flows.
 * Server-only privileged work (cron, admin) would still live in createServerFn.
 */

export type FeedItem = Database["public"]["Functions"]["get_feed"]["Returns"][number];
export type CommentRow = Database["public"]["Tables"]["post_comments"]["Row"];
export type PostRow = Database["public"]["Tables"]["posts"]["Row"];

export const FEED_PAGE_SIZE = 6;

function isDuplicate(msg: string | undefined | null) {
  return !!msg && /duplicate|unique/i.test(msg);
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("AUTH_REQUIRED");
  return data.user.id;
}

export async function fetchFeedPage(cursor: string | null): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc("get_feed", {
    p_cursor: (cursor ?? null) as unknown as string,
    p_limit: FEED_PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedItem[];
}

export async function fetchMyLikedSet(postIds: string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Set();
  const { data } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", auth.user.id)
    .in("post_id", postIds);
  return new Set((data ?? []).map((r) => r.post_id));
}

export async function fetchMyFollowingSet(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Set();
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", auth.user.id)
    .in("following_id", userIds);
  return new Set((data ?? []).map((r) => r.following_id));
}

export async function toggleLike(postId: string, liked: boolean): Promise<void> {
  const uid = await requireUserId();
  if (liked) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", uid);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: uid });
    if (error && !isDuplicate(error.message)) throw new Error(error.message);
  }
}

export async function toggleFollow(targetUserId: string, following: boolean): Promise<void> {
  const uid = await requireUserId();
  if (uid === targetUserId) throw new Error("Cannot follow yourself");
  if (following) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", uid)
      .eq("following_id", targetUserId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: uid, following_id: targetUserId });
    if (error && !isDuplicate(error.message)) throw new Error(error.message);
  }
}

export async function voteDuel(
  duelId: string,
  side: "a" | "b",
  current: "a" | "b" | null,
): Promise<"a" | "b" | null> {
  const uid = await requireUserId();
  if (current === side) {
    const { error } = await supabase
      .from("duel_votes")
      .delete()
      .eq("duel_id", duelId)
      .eq("user_id", uid);
    if (error) throw new Error(error.message);
    return null;
  }
  const { error } = await supabase
    .from("duel_votes")
    .upsert({ duel_id: duelId, user_id: uid, side });
  if (error) throw new Error(error.message);
  return side;
}

export async function fetchMyDuelVotes(duelIds: string[]): Promise<Record<string, "a" | "b">> {
  if (!duelIds.length) return {};
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {};
  const { data } = await supabase
    .from("duel_votes")
    .select("duel_id, side")
    .eq("user_id", auth.user.id)
    .in("duel_id", duelIds);
  const out: Record<string, "a" | "b"> = {};
  (data ?? []).forEach((r) => {
    out[r.duel_id] = r.side as "a" | "b";
  });
  return out;
}

export interface CommentAuthor {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CommentNode extends CommentRow {
  author?: CommentAuthor;
  replies: CommentNode[];
  likedByMe: boolean;
}

export async function fetchComments(postId: string): Promise<CommentNode[]> {
  const { data: rows, error } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const list = (rows ?? []) as CommentRow[];
  const userIds = Array.from(new Set(list.map((r) => r.user_id)));
  const profilesRes = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", userIds)
    : { data: [] as Array<{ id: string } & CommentAuthor> };
  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      { handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url },
    ]),
  );

  const { data: me } = await supabase.auth.getUser();
  const liked = new Set<string>();
  if (me.user && list.length) {
    const { data: cl } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", me.user.id)
      .in("comment_id", list.map((r) => r.id));
    (cl ?? []).forEach((r) => liked.add(r.comment_id));
  }

  const nodes: CommentNode[] = list.map((r) => ({
    ...r,
    author: profileById.get(r.user_id),
    replies: [],
    likedByMe: liked.has(r.id),
  }));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const top: CommentNode[] = [];
  for (const n of nodes) {
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id)!.replies.unshift(n); // oldest reply first under parent
    } else {
      top.push(n);
    }
  }
  return top;
}

export async function addComment(
  postId: string,
  text: string,
  parentId: string | null,
): Promise<CommentRow> {
  const uid = await requireUserId();
  const clean = text.trim();
  if (!clean) throw new Error("Empty comment");
  if (clean.length > 2000) throw new Error("Comment too long");
  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: uid, parent_id: parentId, text: clean })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not post comment");
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("post_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleCommentLike(commentId: string, liked: boolean): Promise<void> {
  const uid = await requireUserId();
  if (liked) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", uid);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .insert({ comment_id: commentId, user_id: uid });
    if (error && !isDuplicate(error.message)) throw new Error(error.message);
  }
}

export async function fetchMyPosts(): Promise<PostRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PostRow[];
}

export async function updatePostVisibility(
  postId: string,
  visibility: "public" | "private",
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ visibility })
    .eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function deletePost(
  postId: string,
  videoPath?: string | null,
  posterPath?: string | null,
): Promise<void> {
  const paths: string[] = [];
  if (videoPath) paths.push(videoPath);
  if (posterPath) paths.push(posterPath);
  if (paths.length) {
    // Storage failure shouldn't block the row delete; users can still re-upload.
    await supabase.storage.from("media").remove(paths).catch(() => {});
  }
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function fetchFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [a, b] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}