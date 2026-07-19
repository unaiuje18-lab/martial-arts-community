import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TechniqueCategory = Database["public"]["Tables"]["technique_categories"]["Row"];
export type Technique = Database["public"]["Tables"]["techniques"]["Row"];
export type PostRow = Database["public"]["Tables"]["posts"]["Row"];

export async function fetchCategories(art = "bjj"): Promise<TechniqueCategory[]> {
  const { data, error } = await supabase
    .from("technique_categories")
    .select("*")
    .eq("art", art)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllTechniques(art = "bjj"): Promise<
  (Technique & { category: TechniqueCategory })[]
> {
  const { data, error } = await supabase
    .from("techniques")
    .select("*, category:technique_categories!inner(*)")
    .eq("category.art", art)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as (Technique & { category: TechniqueCategory })[];
}

export async function fetchCategoryBySlug(slug: string, art = "bjj") {
  const { data, error } = await supabase
    .from("technique_categories")
    .select("*, techniques(*)")
    .eq("art", art)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as (TechniqueCategory & { techniques: Technique[] }) | null;
}

export async function fetchTechniqueBySlug(slug: string) {
  const { data, error } = await supabase
    .from("techniques")
    .select("*, category:technique_categories(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as (Technique & { category: TechniqueCategory }) | null;
}

export async function fetchPostsForTechnique(techniqueId: string): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("post_techniques")
    .select("post:posts!inner(*)")
    .eq("technique_id", techniqueId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ post: PostRow }>)
    .map((r) => r.post)
    .filter((p) => p.visibility === "public");
}

export async function linkPostTechniques(postId: string, techniqueIds: string[]): Promise<void> {
  if (!techniqueIds.length) return;
  const rows = techniqueIds.map((technique_id) => ({ post_id: postId, technique_id }));
  const { error } = await supabase.from("post_techniques").insert(rows);
  if (error) throw new Error(error.message);
}