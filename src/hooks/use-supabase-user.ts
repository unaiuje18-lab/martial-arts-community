import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileRow {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  primary_art: string | null;
}

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Subscribe first so we don't miss the INITIAL_SESSION event
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      if (!data.user) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("profiles" as never)
        .select("id, handle, display_name, avatar_url, bio, primary_art")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setProfile((data as ProfileRow | null) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return { user, profile, loading };
}