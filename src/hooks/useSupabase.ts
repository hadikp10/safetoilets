import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync profile details from DB
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })
      .catch((err) => {
        console.error("Error getting initial session:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // 3. Handle bfcache pageshow (reset loading spinner on back button)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("authRedirectPath", window.location.pathname);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google login failed:", err);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Logout failed:", err);
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    loading,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isAdmin: profile?.is_admin ?? false,
    isBanned: profile?.is_banned ?? false,
  };
}
